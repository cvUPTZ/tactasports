import cv2
import numpy as np
import torch
from ultralytics import YOLO
import supervision as sv
from soccer_analysis_processor import SoccerMatchAnalyzer, AnalysisConfig
from keypoint_detection.homography import HomographyTransformer

class TacticalPipeline:
    def __init__(self, keypoint_model_path, detection_model_path):
        self.keypoint_model_path = keypoint_model_path
        self.detection_model_path = detection_model_path
        self.analyzer = SoccerMatchAnalyzer(AnalysisConfig())
        self.transformer = HomographyTransformer()
        
    def initialize_models(self):
        self.analyzer.load_model()
        self.analyzer.load_roboflow_model()
        
    def detect_frame_objects(self, frame):
        # detection_model_path is likely yolov8m.pt
        results = self.analyzer.model.predict(frame, conf=0.3, verbose=False)[0]
        
        # Filter players (0) and ball (32)
        # Referees are also class 0 in many datasets, or 32 is ball
        # In this project, 0=person, 32=ball
        
        detections = sv.Detections.from_ultralytics(results)
        player_mask = detections.class_id == 0
        ball_mask = detections.class_id == 32
        
        # We don't have a separate referee class, so we might treat some persons as referees
        # For now, let's just return players and ball
        player_dets = detections[player_mask]
        ball_dets = detections[ball_mask]
        ref_dets = sv.Detections.empty() # Placeholder
        
        return player_dets, ball_dets, ref_dets

    def detect_frame_keypoints(self, frame):
        if self.analyzer.roboflow_model:
            _, keypoints = self.analyzer.roboflow_model.get_keypoints_detections(frame)
            return keypoints
        return None

    def process_detections_for_tactical_analysis(self, player_dets, ball_dets, ref_dets, keypoints, **kwargs):
        # Create a blank tactical pitch
        pitch_w, pitch_h = 1050, 680
        tactical_frame = np.zeros((pitch_h, pitch_w, 3), dtype=np.uint8)
        tactical_frame[:, :, 1] = 150 # Green
        
        # Draw pitch lines if we have keypoints/homography
        if keypoints is not None:
             vt = self.transformer.transform_to_pitch_keypoints(keypoints)
             # Draw players on tactical frame
             if vt and hasattr(vt, 'transform'):
                 def transform_point(p):
                     # vt.transform expects (x, y)
                     # Returns (xm, ym) in meters
                     return vt.transform(p)
                 
                 for i, bbox in enumerate(player_dets.xyxy):
                     # Use bottom center
                     x, y = (bbox[0] + bbox[2]) / 2, bbox[3]
                     xm, ym = transform_point((x, y))
                     # Map to tactical pixels (10px per meter)
                     px, py = int(xm * 10), int(ym * 10)
                     if 0 <= px < pitch_w and 0 <= py < pitch_h:
                         color = kwargs.get('team1_color') if player_dets.class_id[i] == 0 else kwargs.get('team2_color')
                         cv2.circle(tactical_frame, (px, py), 8, color, -1)
        
        return tactical_frame, {"success": True}

    def create_side_by_side_frame(self, annotated_frame, tactical_frame, metadata, frame_height=480):
        # Resize both to same height
        h1, w1 = annotated_frame.shape[:2]
        h2, w2 = tactical_frame.shape[:2]
        
        annotated_small = cv2.resize(annotated_frame, (int(w1 * (frame_height / h1)), frame_height))
        tactical_small = cv2.resize(tactical_frame, (int(w2 * (frame_height / h2)), frame_height))
        
        combined = np.hstack((annotated_small, tactical_small))
        return combined

class DepthPipeline:
    def initialize_model(self):
        pass
    def estimate_depth(self, frame):
        return np.zeros(frame.shape[:2], dtype=np.float32)
    def visualize_depth(self, depth_map):
        return np.zeros((depth_map.shape[0], depth_map.shape[1], 3), dtype=np.uint8)
