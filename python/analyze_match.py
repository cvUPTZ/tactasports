import argparse
import cv2
import json
import sys
import os
import numpy as np
from tqdm import tqdm

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python.models.fusion_detector import FusionDetector
from python.trackers.hybrid_tracker import HybridTracker
from python.utils.scene_analyzer import SceneAnalyzer
from python.utils.optical_flow import OpticalFlowEngine
from python.utils.field_calibration import FieldCalibrator
from python.analytics.tactical_analytics import TacticalAnalytics

def analyze_match(video_path, output_path, calibration_points=None):
    print(f"Starting Elite Analysis for: {video_path}")
    
    # 1. Initialize Pipeline Components
    detector = FusionDetector()
    tracker = HybridTracker()
    scene_analyzer = SceneAnalyzer()
    optical_flow = OpticalFlowEngine()
    calibrator = FieldCalibrator()
    analytics = TacticalAnalytics()
    
    # Set manual calibration if provided
    if calibration_points:
        calibrator.calibrate_manual(calibration_points)
    else:
        # Default fallback (approximate for demo)
        # Assuming 1920x1080 video looking at full pitch
        calibrator.calibrate_manual([[200, 200], [1720, 200], [1920, 1080], [0, 1080]])

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    results = {
        "metadata": {
            "fps": fps,
            "width": width,
            "height": height,
            "total_frames": total_frames
        },
        "tracks": [],
        "analytics": {
            "speeds": {},
            "distances": {}
        }
    }
    
    # 2. Process Video
    frame_idx = 0
    pbar = tqdm(total=total_frames, desc="Processing Frames")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # A. Scene Analysis
        scene_info = scene_analyzer.analyze(frame)
        
        # B. Multi-Model Detection
        detections = detector.detect(frame, scene_info)
        
        # C. Hybrid Tracking
        tracks = tracker.update(detections, frame)
        
        # D. Optical Flow Stabilization
        tracks = optical_flow.stabilize(tracks, frame)
        
        # E. Field Calibration
        field_coords = calibrator.transform(tracks)
        
        # F. Analytics Update
        analytics.update(frame_idx, tracks, field_coords)
        
        # Store frame results
        frame_data = {
            "frame": frame_idx,
            "timestamp": frame_idx / fps,
            "scene": {
                "is_crowded": bool(scene_info.is_crowded),
                "is_shaky": bool(scene_info.is_shaky)
            },
            "objects": []
        }
        
        for i, track in enumerate(tracks):
            track_id = int(track[4])
            x1, y1, x2, y2 = map(int, track[:4])
            
            obj_data = {
                "id": track_id,
                "box": [x1, y1, x2, y2],
                "score": float(track[5]),
                "class": int(track[6])
            }
            
            if i < len(field_coords):
                fx, fy = field_coords[i]
                obj_data["field_pos"] = [float(fx), float(fy)]
                obj_data["speed"] = analytics.calculate_speed(track_id)
                
            frame_data["objects"].append(obj_data)
            
        results["tracks"].append(frame_data)
        
        frame_idx += 1
        pbar.update(1)
        
    pbar.close()
    cap.release()
    
    # 3. Save Results
    print(f"Saving results to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(results, f)
        
    print("Analysis Complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path", help="Path to input video")
    parser.add_argument("--output", default="analysis_results.json", help="Path to output JSON")
    args = parser.parse_args()
    
    analyze_match(args.video_path, args.output)
