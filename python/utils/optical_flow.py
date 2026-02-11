import cv2
import numpy as np

class OpticalFlowEngine:
    def __init__(self):
        self.prev_gray = None
        self.feature_params = dict(maxCorners=100,
                                   qualityLevel=0.3,
                                   minDistance=7,
                                   blockSize=7)
        self.lk_params = dict(winSize=(15, 15),
                              maxLevel=2,
                              criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03))
                              
    def stabilize(self, tracks, frame):
        """
        Use optical flow to adjust/predict track positions if detection was shaky or missing.
        tracks: list of [x1, y1, x2, y2, id, score, cls]
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        if self.prev_gray is None:
            self.prev_gray = gray
            return tracks
            
        # If we have no tracks, just update prev_gray
        if len(tracks) == 0:
            self.prev_gray = gray
            return tracks
            
        # For each track, calculate optical flow of its center or features
        stabilized_tracks = []
        
        for track in tracks:
            x1, y1, x2, y2 = track[:4]
            center = np.array([[(x1+x2)/2, (y1+y2)/2]], dtype=np.float32)
            
            # Calculate flow for the center point
            p1, st, err = cv2.calcOpticalFlowPyrLK(self.prev_gray, gray, center, None, **self.lk_params)
            
            if st[0][0] == 1:
                # Flow vector
                dx = p1[0][0] - center[0][0]
                dy = p1[0][1] - center[0][1]
                
                # Apply flow to box (simple stabilization)
                # In a full implementation, we would weight this against the detection
                # Here we just return the track, but in a real scenario we'd use this 
                # to fill in gaps if detection was missing (which is handled by Kalman Filter in HybridTracker)
                # So this module is mainly for smoothing or camera motion compensation
                pass
                
            stabilized_tracks.append(track)
            
        self.prev_gray = gray
        return np.array(stabilized_tracks)
        
    def estimate_camera_motion(self, frame):
        """
        Estimate global camera motion using background features
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if self.prev_gray is None:
            return np.array([0.0, 0.0])
            
        # Detect features in previous frame
        p0 = cv2.goodFeaturesToTrack(self.prev_gray, mask=None, **self.feature_params)
        
        if p0 is not None:
            p1, st, err = cv2.calcOpticalFlowPyrLK(self.prev_gray, gray, p0, None, **self.lk_params)
            
            # Select good points
            good_new = p1[st==1]
            good_old = p0[st==1]
            
            # Average motion
            if len(good_new) > 0:
                motion = np.mean(good_new - good_old, axis=0)
                return motion
                
        return np.array([0.0, 0.0])
