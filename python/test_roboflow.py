import os
import cv2
import numpy as np
from dotenv import load_dotenv
from soccer_analysis_processor import SoccerMatchAnalyzer, AnalysisConfig

def test_inference():
    # Load environment variables
    load_dotenv()
    
    # Initialize analyzer
    config = AnalysisConfig(confidence_threshold=0.3)
    analyzer = SoccerMatchAnalyzer(config)
    
    # Load Roboflow model
    print("Loading Roboflow model...")
    analyzer.load_roboflow_model()
    
    if analyzer.roboflow_model is None:
        print("FAILED: Roboflow model not loaded. Check ROBOFLOW_API_KEY in .env")
        return

    # Create a dummy frame (green pitch)
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    frame[:, :, 1] = 120 # Dark green
    
    # Draw some "players" (white circles)
    cv2.circle(frame, (640, 360), 10, (255, 255, 255), -1)
    cv2.circle(frame, (100, 100), 10, (255, 255, 255), -1)
    
    # Draw a "ball" (orange circle)
    cv2.circle(frame, (600, 400), 5, (0, 165, 255), -1)

    print("Running inference...")
    detections = analyzer.roboflow_model.get_detections(frame)
    
    print(f"Detected {len(detections)} objects.")
    for i in range(len(detections)):
        print(f"Object {i}: Class={detections.class_id[i]}, Conf={detections.confidence[i]:.2f}, BBox={detections.xyxy[i]}")

    print("Running keypoints inference...")
    k_detections, keypoints = analyzer.roboflow_model.get_keypoints_detections(frame)
    if keypoints is not None:
        print(f"Detected {keypoints.shape[1]} keypoints.")
    else:
        print("No keypoints detected.")

if __name__ == "__main__":
    test_inference()
