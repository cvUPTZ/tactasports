import numpy as np
from python.models.reid_model import ReIDModel
# We'll use a simplified ByteTrack implementation or wrapper
# For this "Elite" system, we assume we have a ByteTrack implementation available
# or we implement the core logic here.
# Since we can't easily pip install bytetrack in this environment without potential issues,
# I'll implement a robust Kalman Filter + IoU/ReID association tracker (Hybrid) directly.

from filterpy.kalman import KalmanFilter
from scipy.optimize import linear_sum_assignment

class Track:
    def __init__(self, track_id, box, score, feature=None):
        self.track_id = track_id
        self.box = box # [x1, y1, x2, y2]
        self.score = score
        self.features = [feature] if feature is not None else []
        self.max_features = 100
        self.hits = 1
        self.age = 1
        self.time_since_update = 0
        self.state = 'active' # active, lost
        
        # Initialize Kalman Filter
        self.kf = KalmanFilter(dim_x=7, dim_z=4)
        self.kf.F = np.array([[1,0,0,0,1,0,0],
                              [0,1,0,0,0,1,0],
                              [0,0,1,0,0,0,1],
                              [0,0,0,1,0,0,0],
                              [0,0,0,0,1,0,0],
                              [0,0,0,0,0,1,0],
                              [0,0,0,0,0,0,1]])
        self.kf.H = np.array([[1,0,0,0,0,0,0],
                              [0,1,0,0,0,0,0],
                              [0,0,1,0,0,0,0],
                              [0,0,0,1,0,0,0]])
        self.kf.R[2:,2:] *= 10.
        self.kf.P[4:,4:] *= 1000.
        self.kf.P *= 10.
        self.kf.Q[-1,-1] *= 0.01
        self.kf.Q[4:,4:] *= 0.01
        
        # Initialize state
        self.update_kf(box)

    def update_kf(self, box):
        # Convert [x1,y1,x2,y2] to [cx,cy,s,r]
        w = box[2] - box[0]
        h = box[3] - box[1]
        x = box[0] + w/2.
        y = box[1] + h/2.
        s = w * h
        r = w / float(h)
        
        self.kf.x[:4] = np.array([x, y, s, r]).reshape((4, 1))

    def predict(self):
        if((self.kf.x[6]+self.kf.x[2])<=0):
            self.kf.x[6] *= 0.0
        self.kf.predict()
        self.age += 1
        self.time_since_update += 1
        return self.get_box()

    def update(self, box, score, feature=None):
        self.hits += 1
        self.time_since_update = 0
        self.score = score
        self.box = box
        
        # Update KF
        w = box[2] - box[0]
        h = box[3] - box[1]
        x = box[0] + w/2.
        y = box[1] + h/2.
        s = w * h
        r = w / float(h)
        
        self.kf.update(np.array([x, y, s, r]).reshape((4, 1)))
        
        if feature is not None:
            self.features.append(feature)
            if len(self.features) > self.max_features:
                self.features.pop(0)

    def get_box(self):
        """
        Get current bounding box estimate from Kalman Filter
        """
        x = self.kf.x[0]
        y = self.kf.x[1]
        s = self.kf.x[2]
        r = self.kf.x[3]
        
        w = np.sqrt(s * r)
        h = s / w
        
        return np.array([x-w/2., y-h/2., x+w/2., y+h/2.]).reshape((4,))

class HybridTracker:
    def __init__(self, frame_rate=30):
        self.reid = ReIDModel()
        self.tracks = []
        self.next_id = 1
        self.frame_rate = frame_rate
        self.max_age = frame_rate * 2 # Keep lost tracks for 2 seconds
        
        # Thresholds
        self.conf_thresh = 0.5
        self.iou_thresh = 0.3
        self.reid_thresh = 0.4 # Cosine distance threshold

    def update(self, detections, frame):
        """
        detections: list of [x1, y1, x2, y2, score, class_id]
        frame: current video frame
        """
        # 1. Filter low confidence detections
        dets = [d for d in detections if d[4] >= self.conf_thresh]
        dets = np.array(dets)
        
        # 2. Extract ReID features for all detections
        features = []
        if len(dets) > 0:
            features = self.reid.extract_features(frame, dets[:, :4])
            
        # 3. Predict new locations of existing tracks
        for track in self.tracks:
            track.predict()
            
        # 4. Association: First by ReID (DeepSORT style)
        # Separate tracks into active and lost
        active_tracks = [t for t in self.tracks if t.time_since_update <= 1]
        lost_tracks = [t for t in self.tracks if t.time_since_update > 1]
        
        unmatched_dets_idx = list(range(len(dets)))
        unmatched_tracks_idx = list(range(len(self.tracks)))
        
        matches = []
        
        # --- Stage 1: ReID Association for all tracks ---
        if len(dets) > 0 and len(self.tracks) > 0:
            dists = np.zeros((len(self.tracks), len(dets)))
            
            for i, track in enumerate(self.tracks):
                if len(track.features) > 0:
                    # Compute min distance to any of the track's past features
                    # (Simplified: use mean feature or last feature for speed)
                    track_feat = np.mean(track.features, axis=0).reshape(1, -1)
                    dists[i] = self.reid.compute_distance(track_feat, features)[0]
                else:
                    dists[i] = 1.0 # Max distance if no features
            
            # Solve assignment
            row_idxs, col_idxs = linear_sum_assignment(dists)
            
            for r, c in zip(row_idxs, col_idxs):
                if dists[r, c] < self.reid_thresh:
                    matches.append((r, c))
                    if c in unmatched_dets_idx: unmatched_dets_idx.remove(c)
                    if r in unmatched_tracks_idx: unmatched_tracks_idx.remove(r)

        # --- Stage 2: IoU Association for remaining (ByteTrack style) ---
        # (Simplified: Standard IoU matching for now)
        if len(unmatched_dets_idx) > 0 and len(unmatched_tracks_idx) > 0:
            iou_dists = np.zeros((len(unmatched_tracks_idx), len(unmatched_dets_idx)))
            
            for i, t_idx in enumerate(unmatched_tracks_idx):
                track = self.tracks[t_idx]
                track_box = track.get_box()
                
                for j, d_idx in enumerate(unmatched_dets_idx):
                    det_box = dets[d_idx][:4]
                    iou_dists[i, j] = 1.0 - self._iou(track_box, det_box)
            
            row_idxs, col_idxs = linear_sum_assignment(iou_dists)
            
            for r, c in zip(row_idxs, col_idxs):
                if iou_dists[r, c] < (1.0 - self.iou_thresh):
                    t_idx = unmatched_tracks_idx[r]
                    d_idx = unmatched_dets_idx[c]
                    matches.append((t_idx, d_idx))
                    
                    # Remove from unmatched lists (careful with indices)
                    # We rebuild unmatched lists at end of loop or use sets, 
                    # but here we just track what's matched in 'matches'
                    pass

        # 5. Update Tracks
        matched_track_indices = set(m[0] for m in matches)
        matched_det_indices = set(m[1] for m in matches)
        
        # Update matched tracks
        for t_idx, d_idx in matches:
            track = self.tracks[t_idx]
            det = dets[d_idx]
            feat = features[d_idx] if len(features) > 0 else None
            track.update(det[:4], det[4], feat)
            
        # Create new tracks for unmatched detections
        for i in range(len(dets)):
            if i not in matched_det_indices:
                feat = features[i] if len(features) > 0 else None
                new_track = Track(self.next_id, dets[i][:4], dets[i][4], feat)
                self.tracks.append(new_track)
                self.next_id += 1
                
        # Remove dead tracks
        self.tracks = [t for t in self.tracks if t.time_since_update < self.max_age]
        
        # Return active tracks
        ret_tracks = []
        for t in self.tracks:
            if t.time_since_update < 1 and t.hits >= 3: # Min hits to confirm
                box = t.get_box()
                ret_tracks.append([*box, t.track_id, t.score, 0]) # Class 0 for player
                
        return np.array(ret_tracks)

    def _iou(self, box1, box2):
        xx1 = max(box1[0], box2[0])
        yy1 = max(box1[1], box2[1])
        xx2 = min(box1[2], box2[2])
        yy2 = min(box1[3], box2[3])
        
        w = max(0, xx2 - xx1)
        h = max(0, yy2 - yy1)
        inter = w * h
        
        area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])
        area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])
        
        return inter / (area1 + area2 - inter + 1e-6)
