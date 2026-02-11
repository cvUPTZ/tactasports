import sys
from pathlib import Path
import numpy as np

# Adjust project path to allow imports from other packages
PROJECT_DIR = Path(__file__).resolve().parent.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.append(str(PROJECT_DIR))

try:
    import supervision as sv
except ImportError:
    # Fallback/Mock for ByteTrack if supervision is not installed
    class MockByteTrack:
        def __init__(self):
            self.match_thresh = 0.5
            self.track_buffer = 120
        def update_with_detections(self, detections):
            if hasattr(detections, 'xyxy'):
                # Simple pass-through if no tracker is available
                if not hasattr(detections, 'tracker_id') or detections.tracker_id is None:
                    detections.tracker_id = np.arange(len(detections.xyxy))
            return detections
            
    class sv:
        ByteTrack = MockByteTrack


class TrackerManager:
    """
    Manager class for player tracking functionality.
    Handles initialization and configuration of tracking models.
    """
    
    def __init__(self, match_thresh=0.5, track_buffer=120):
        """
        Initialize the tracker with configurable parameters.
        
        Args:
            match_thresh (float): Matching threshold for tracking
            track_buffer (int): Number of frames to keep tracking buffer
        """
        self.tracker = sv.ByteTrack()
        self.tracker.match_thresh = match_thresh
        self.tracker.track_buffer = track_buffer
    
    def get_tracker(self):
        """Get the configured tracker instance."""
        return self.tracker
    
    def update_player_detections(self, player_detections):
        """
        Update the player detections with the tracker.
        
        Args:
            player_detections: Detection results from YOLO
            
        Returns:
            Updated detections with tracker IDs
        """
        # Note: In supervision, update_with_detections is the standard way to advance the tracker
        player_detections = self.tracker.update_with_detections(player_detections)
        return player_detections
    
    def process_tracking_for_frame(self, player_detections):
        """
        Process tracking for a single frame.
        
        Args:
            player_detections: Player detections for the frame
            
        Returns:
            Updated player detections with tracking information
        """
        if player_detections is not None and len(player_detections.xyxy) > 0:
            player_detections = self.update_player_detections(player_detections)
        return player_detections
