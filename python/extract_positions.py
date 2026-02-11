#!/usr/bin/env python3
"""
Extract player positions from soccer match video using YOLO object detection.
Outputs position data as JSON for heatmap generation.
"""

import cv2
import json
import argparse
import sys
from pathlib import Path
import numpy as np

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed. Run: pip install ultralytics", file=sys.stderr)
    sys.exit(1)


def estimate_team(x, y, frame_width, frame_height):
    """
    Estimate team based on field position.
    Simple heuristic: left half = Team A, right half = Team B
    
    Args:
        x, y: Player position in pixels
        frame_width, frame_height: Video dimensions
    
    Returns:
        'A' or 'B'
    """
    # Normalize x position (0-100)
    x_normalized = (x / frame_width) * 100
    
    # Simple split: left half vs right half
    return 'A' if x_normalized < 50 else 'B'


def extract_positions(video_path, output_path, frame_skip=5, confidence_threshold=0.5, start_time=0, end_time=None):
    """
    Extract player positions from video using YOLO detection.
    
    Args:
        video_path: Path to input video file
        output_path: Path to output JSON file
        frame_skip: Process every Nth frame (default: 5 for speed)
        confidence_threshold: Minimum detection confidence (default: 0.5)
        start_time: Start time in seconds (default: 0)
        end_time: End time in seconds (default: None, meaning end of video)
    
    Returns:
        List of position dictionaries
    """
    print(f"Loading video: {video_path}")
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        print(f"ERROR: Could not open video file: {video_path}", file=sys.stderr)
        sys.exit(1)
    
    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps
    
    print(f"Video info: {total_frames} frames, {fps:.2f} FPS, {frame_width}x{frame_height}")
    print(f"Duration: {duration:.2f}s")
    
    # Calculate start and end frames
    start_frame = int(start_time * fps)
    end_frame = int(end_time * fps) if end_time is not None else total_frames
    
    # Validate range
    if start_frame >= total_frames:
        print(f"WARNING: Start time {start_time}s is beyond video duration {duration:.2f}s", file=sys.stderr)
        start_frame = 0
    
    if end_frame > total_frames:
        end_frame = total_frames
        
    # Handle single timestamp case (start_time == end_time)
    if start_frame == end_frame:
        end_frame = start_frame + 1
        print(f"Single timestamp requested. Processing frame {start_frame}")
    elif start_frame > end_frame:
        print(f"ERROR: Start time {start_time}s must be less than end time {end_time}s", file=sys.stderr)
        sys.exit(1)
    
    # Auto-adjust frame skip for short durations
    requested_duration = (end_frame - start_frame) / fps
    if requested_duration < 1.0:
        print(f"Short duration ({requested_duration:.2f}s) detected. Disabling frame skip.")
        frame_skip = 1
        
    print(f"Processing range: {start_time}s to {end_time if end_time else duration:.2f}s (Frames {start_frame}-{end_frame})")
    print(f"Processing every {frame_skip} frames...")
    
    # Set starting position
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    frame_count = start_frame
    
    # Load YOLO model (using YOLOv8n for speed)
    print("Loading YOLO model...")
    model = YOLO('yolov8n.pt')  # Nano model for speed
    
    positions = []
    processed_count = 0
    
    while frame_count < end_frame:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Only process every Nth frame
        if frame_count % frame_skip != 0:
            frame_count += 1
            continue
        
        # Calculate timestamp
        timestamp = frame_count / fps
        
        # Run YOLO detection
        results = model(frame, classes=[0], verbose=False)  # class 0 = person
        
        # Extract detections
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get confidence
                conf = float(box.conf[0])
                if conf < confidence_threshold:
                    continue
                
                # Get bounding box center
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                
                # Normalize to 0-100 scale
                x_norm = float((center_x / frame_width) * 100)
                y_norm = float((center_y / frame_height) * 100)
                
                # Estimate team
                team = estimate_team(center_x, center_y, frame_width, frame_height)
                
                # Add position data
                positions.append({
                    'frame': frame_count,
                    'timestamp': round(timestamp, 2),
                    'x': round(x_norm, 2),
                    'y': round(y_norm, 2),
                    'team': team,
                    'confidence': round(conf, 2)
                })
        
        processed_count += 1
        
        # Progress update every 100 processed frames
        if processed_count % 100 == 0:
            progress = ((frame_count - start_frame) / (end_frame - start_frame)) * 100
            print(f"Progress: {progress:.1f}% ({frame_count}/{end_frame} frames)", file=sys.stderr)
        
        frame_count += 1
    
    cap.release()
    
    print(f"\nExtracted {len(positions)} player positions from {processed_count} frames")
    
    # Save to JSON
    output_data = {
        'video_info': {
            'total_frames': total_frames,
            'fps': fps,
            'width': frame_width,
            'height': frame_height,
            'duration': duration,
            'analysis_start': start_time,
            'analysis_end': end_time if end_time else duration
        },
        'positions': positions
    }
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Saved position data to: {output_path}")
    
    return positions


def main():
    parser = argparse.ArgumentParser(description='Extract player positions from soccer video')
    parser.add_argument('--video', required=True, help='Path to input video file')
    parser.add_argument('--output', required=True, help='Path to output JSON file')
    parser.add_argument('--frame-skip', type=int, default=5, help='Process every Nth frame (default: 5)')
    parser.add_argument('--confidence', type=float, default=0.5, help='Minimum detection confidence (default: 0.5)')
    parser.add_argument('--start-time', type=float, default=0, help='Start time in seconds (default: 0)')
    parser.add_argument('--end-time', type=float, default=None, help='End time in seconds (default: end of video)')
    
    args = parser.parse_args()
    
    # Validate input file
    video_path = Path(args.video)
    if not video_path.exists():
        print(f"ERROR: Video file not found: {video_path}", file=sys.stderr)
        sys.exit(1)
    
    # Extract positions
    try:
        extract_positions(
            video_path=video_path,
            output_path=args.output,
            frame_skip=args.frame_skip,
            confidence_threshold=args.confidence,
            start_time=args.start_time,
            end_time=args.end_time
        )
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
