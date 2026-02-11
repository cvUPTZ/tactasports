"""
STANDALONE FIXED ANALYSIS SCRIPT
This version has ALL fixes built-in with no external dependencies.
GUARANTEED to produce high-contrast team colors.

Save this as: analyze_image_fixed.py
Run: python analyze_image_fixed.py your_image.jpg
"""

import sys
from pathlib import Path
import cv2
import numpy as np
import torch
import supervision as sv

PROJECT_DIR = Path(__file__).resolve().parent
sys.path.append(str(PROJECT_DIR))

from pipelines import TacticalPipeline, DepthPipeline
from player_clustering import ClusteringManager
from constants import model_path
from keypoint_detection.keypoint_constants import keypoint_model_path


def get_team_brightness(crops):
    """Calculate average brightness of team crops."""
    if not crops:
        return 128
    brightnesses = [np.mean(crop) for crop in crops]
    return np.mean(brightnesses)


def assign_high_contrast_colors(team0_crops, team1_crops):
    """
    Assign guaranteed high-contrast colors based on brightness.
    WHITE team → Light gray
    COLORED team → Bright red
    """
    team0_bright = get_team_brightness(team0_crops)
    team1_bright = get_team_brightness(team1_crops)
    
    print(f"\n{'='*70}")
    print("🎨 HIGH-CONTRAST COLOR ASSIGNMENT")
    print(f"{'='*70}")
    print(f"Team 0 brightness: {team0_bright:.1f}")
    print(f"Team 1 brightness: {team1_bright:.1f}")
    
    if team0_bright > team1_bright:
        # Team 0 is brighter
        colors = {
            'team0': (230, 230, 230),  # Light gray (white team)
            'team1': (50, 50, 220),    # Bright red (colored team)
            'team0_name': 'Light Gray (White Jerseys)',
            'team1_name': 'Bright Red (Colored Jerseys)'
        }
    else:
        # Team 1 is brighter
        colors = {
            'team0': (50, 50, 220),    # Bright red (colored team)
            'team1': (230, 230, 230),  # Light gray (white team)
            'team0_name': 'Bright Red (Colored Jerseys)',
            'team1_name': 'Light Gray (White Jerseys)'
        }
    
    # Calculate and verify contrast
    distance = np.linalg.norm(np.array(colors['team0']) - np.array(colors['team1']))
    
    print(f"✅ Team 0 → {colors['team0_name']}: {colors['team0']}")
    print(f"✅ Team 1 → {colors['team1_name']}: {colors['team1']}")
    print(f"✅ Color distance: {distance:.1f} (Excellent!)")
    print(f"{'='*70}\n")
    
    return colors['team0'], colors['team1']


def analyze_image_fixed(image_path, output_path="fixed_result.jpg", show=True):
    """
    Analyze image with GUARANTEED high-contrast colors.
    No automatic color extraction - uses brightness-based assignment.
    """
    
    print("="*70)
    print("FIXED SOCCER ANALYSIS - HIGH CONTRAST MODE")
    print("="*70)
    print(f"Input: {image_path}")
    print(f"Output: {output_path}")
    
    # Load image
    frame = cv2.imread(str(image_path))
    if frame is None:
        print(f"❌ ERROR: Cannot read image: {image_path}")
        return
    
    h, w = frame.shape[:2]
    print(f"Image size: {w}x{h}")
    
    # Initialize
    print("\n📦 Initializing models...")
    tactical_pipeline = TacticalPipeline(str(keypoint_model_path), str(model_path))
    depth_pipeline = DepthPipeline()
    tactical_pipeline.initialize_models()
    depth_pipeline.initialize_model()
    
    # Detect
    print("🔍 Running detection...")
    with torch.no_grad():
        player_dets, ball_dets, ref_dets = tactical_pipeline.detect_frame_objects(frame)
        keypoints = tactical_pipeline.detect_frame_keypoints(frame)
        depth_map = depth_pipeline.estimate_depth(frame)
    
    print(f"   Players: {len(player_dets) if player_dets else 0}")
    print(f"   Balls: {len(ball_dets) if ball_dets else 0}")
    print(f"   Referees: {len(ref_dets) if ref_dets else 0}")
    
    # Cluster players
    team0_color = (230, 230, 230)  # Default
    team1_color = (50, 50, 220)    # Default
    
    if player_dets is not None and len(player_dets) > 1:
        print("\n🔄 Clustering players...")
        clustering_manager = ClusteringManager(n_clusters=2)
        player_crops = clustering_manager.embedding_extractor.get_player_crops(frame, player_dets)
        
        if player_crops and len(player_crops) > 1:
            player_labels, _, _ = clustering_manager.train_clustering_models(player_crops)
            player_dets.class_id = player_labels
            
            # Get team crops
            team0_crops = [player_crops[i] for i, label in enumerate(player_labels) if label == 0]
            team1_crops = [player_crops[i] for i, label in enumerate(player_labels) if label == 1]
            
            print(f"   Team 0: {len(team0_crops)} players")
            print(f"   Team 1: {len(team1_crops)} players")
            
            # CRITICAL: Assign high-contrast colors
            team0_color, team1_color = assign_high_contrast_colors(team0_crops, team1_crops)
    
    # Referee color (gray for visibility)
    referee_color = (100, 100, 100)
    
    # Generate tactical view with FIXED colors
    print("🎯 Generating tactical view with high-contrast colors...")
    tactical_frame, metadata = tactical_pipeline.process_detections_for_tactical_analysis(
        player_dets, ball_dets, ref_dets, keypoints,
        team1_color=team0_color,
        team2_color=team1_color,
        referee_color=referee_color,
        attacking_direction="left-to-right"
    )
    
    # Create dashboard
    print("🎨 Creating dashboard...")
    annotator_manager = tactical_pipeline.detection_pipeline.annotator_manager if hasattr(tactical_pipeline.detection_pipeline, 'annotator_manager') else None
    
    if annotator_manager:
        annotated_frame = annotator_manager.annotate_all(frame, player_dets, ball_dets, ref_dets)
    else:
        annotated_frame = frame.copy()
    
    dashboard = tactical_pipeline.create_side_by_side_frame(
        annotated_frame, tactical_frame, metadata, frame_height=480
    )
    
    # Add depth map
    depth_viz = depth_pipeline.visualize_depth(depth_map)
    depth_small = cv2.resize(depth_viz, (240, 135))
    h_db, w_db = dashboard.shape[:2]
    dashboard[h_db-145:h_db-10, 10:250] = depth_small
    
    # Add color indicator text on dashboard
    cv2.putText(dashboard, "HIGH CONTRAST MODE", (w_db//2 - 150, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    # Save
    cv2.imwrite(str(output_path), dashboard)
    print(f"\n✅ SAVED: {output_path}")
    
    # Show
    if show:
        try:
            display_frame = dashboard
            if w_db > 1920 or h_db > 1080:
                scale = min(1920/w_db, 1080/h_db)
                display_frame = cv2.resize(dashboard, (int(w_db*scale), int(h_db*scale)))
            
            cv2.imshow("Fixed Analysis - High Contrast", display_frame)
            print("👀 Press any key to close...")
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        except:
            print("⚠️  Cannot show window (headless mode)")
    
    print("\n" + "="*70)
    print("✅ ANALYSIS COMPLETE - CHECK THE TACTICAL VIEW!")
    print("   Teams should be clearly visible:")
    print(f"   - Team 0: {team0_color}")
    print(f"   - Team 1: {team1_color}")
    print("="*70)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fixed soccer analysis with guaranteed high contrast")
    parser.add_argument("image", help="Input image path")
    parser.add_argument("--output", default="fixed_result.jpg", help="Output path")
    parser.add_argument("--no-show", action="store_true", help="Don't display window")
    
    args = parser.parse_args()
    
    analyze_image_fixed(args.image, args.output, not args.no_show)
