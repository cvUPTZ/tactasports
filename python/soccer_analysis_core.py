#!/usr/bin/env python3
"""
Production-Grade Soccer Match Analysis System
Core module with proper error handling, logging, and architecture
"""

import os
import cv2
import json
import logging
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from collections import defaultdict
from enum import Enum
import time

try:
    from ultralytics import YOLO
    from scipy.signal import savgol_filter
    from sklearn.cluster import KMeans
except ImportError as e:
    raise ImportError(f"Missing required dependency: {e}. Install with: pip install ultralytics scipy scikit-learn roboflow supervision")

from utils.roboflow_utils import RoboflowInference


# === Configuration ===
@dataclass
class AnalysisConfig:
    """Configuration for analysis with validation"""
    confidence_threshold: float = 0.3
    min_track_length_seconds: float = 1.0
    max_speed_ms: float = 12.5  # Usain Bolt's top speed
    sprint_threshold_ms: float = 7.0  # 25.2 km/h
    pressing_distance_m: float = 3.5
    pressing_speed_threshold_ms: float = 2.5
    smoothing_window: int = 15
    max_frame_gap_seconds: float = 0.5
    max_distance_jump_m: float = 10.0
    field_length_m: float = 105.0
    field_width_m: float = 68.0
    max_video_size_mb: int = 2000
    frame_skip: int = 1  # Process every Nth frame
    
    # Pass Detection
    enable_pass_detection: bool = True
    pass_proximity_threshold_m: float = 3.0  # Max distance for pass
    pass_min_distance_m: float = 2.0  # Min distance to count as pass
    pass_max_distance_m: float = 40.0  # Max realistic pass distance
    pass_max_duration_s: float = 3.0  # Max time for pass completion
    pass_velocity_threshold_ms: float = 1.5  # Min receiver velocity
    
    # Roboflow Configuration
    roboflow_api_key: Optional[str] = None
    roboflow_workspace: str = "hacenbarb"
    roboflow_project: str = "pitch-keypoints-detection"
    roboflow_version: int = 2
    
    # High Contrast Mode
    use_high_contrast_colors: bool = False
    
    def __post_init__(self):
        """Validate configuration"""
        if not 0 < self.confidence_threshold <= 1:
            raise ValueError("confidence_threshold must be between 0 and 1")
        if self.max_speed_ms <= 0:
            raise ValueError("max_speed_ms must be positive")
        if self.min_track_length_seconds <= 0:
            raise ValueError("min_track_length_seconds must be positive")


class TeamColor(Enum):
    """Team identification"""
    TEAM_A = "A"
    TEAM_B = "B"
    UNKNOWN = "Unknown"


class AnalysisError(Exception):
    """Base exception for analysis errors"""
    pass


class VideoError(AnalysisError):
    """Video-related errors"""
    pass


class ProcessingError(AnalysisError):
    """Processing-related errors"""
    pass


# === Logger Setup ===
def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Setup structured logger"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger


logger = setup_logger(__name__)


# === Data Classes ===
@dataclass
class VideoMetadata:
    """Video file metadata"""
    path: str
    width: int
    height: int
    fps: float
    total_frames: int
    duration_seconds: float
    size_mb: float
    
    @classmethod
    def from_video(cls, video_path: Path, cap: cv2.VideoCapture) -> 'VideoMetadata':
        """Extract metadata from video capture"""
        return cls(
            path=str(video_path),
            width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            fps=cap.get(cv2.CAP_PROP_FPS) or 30.0,
            total_frames=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            duration_seconds=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) / (cap.get(cv2.CAP_PROP_FPS) or 30.0),
            size_mb=video_path.stat().st_size / (1024 * 1024)
        )


@dataclass
class TrackPoint:
    """Single tracking point"""
    frame: int
    timestamp: float
    x: float  # Pixel coordinates
    y: float
    xm: Optional[float] = None  # Meter coordinates
    ym: Optional[float] = None
    xm_smooth: Optional[float] = None
    ym_smooth: Optional[float] = None
    velocity: float = 0.0
    acceleration: float = 0.0
    is_sprinting: bool = False
    xthreat: float = 0.0
    team: str = TeamColor.UNKNOWN.value
    confidence: float = 0.0
    bbox: Optional[Tuple[float, float, float, float]] = None  # x1, y1, x2, y2
    has_ball: bool = False


@dataclass
class PlayerStats:
    """Aggregated player statistics"""
    player_id: int
    total_distance: float
    max_speed: float
    avg_speed: float
    sprints: int
    team: str
    track_duration: float
    frames_tracked: int


@dataclass
class PressingEvent:
    """Pressing event detection"""
    frame: int
    timestamp: float
    defender_id: int
    attacker_id: int
    distance: float
    defender_speed: float


@dataclass
class PassEvent:
    """Detected pass between players"""
    frame: int
    timestamp: float
    passer_id: int
    receiver_id: int
    team: str
    distance: float  # meters
    duration: float  # seconds
    pass_type: str  # 'short', 'medium', 'long'
    success: bool  # Did receiver control the ball?
    start_position: Tuple[float, float]  # (x, y) in meters
    end_position: Tuple[float, float]
    xthreat_delta: float  # Change in xThreat


@dataclass
class PassingNetworkMetrics:
    """Network analysis metrics for a team"""
    team: str
    total_passes: int
    successful_passes: int
    pass_completion_rate: float
    avg_pass_distance: float
    key_passers: List[Tuple[int, int]]  # [(player_id, pass_count), ...]
    key_receivers: List[Tuple[int, int]]
    passing_triangles: List[Tuple[int, int, int]]  # Groups of 3 players
    network_centrality: Dict[int, float]  # Player centrality scores


# === Homography Transform ===
class HomographyTransform:
    """Handles coordinate transformation from pixels to meters"""
    
    def __init__(self, matrix: Optional[np.ndarray] = None):
        self.matrix = matrix
        self.enabled = matrix is not None
        
        if self.enabled:
            self._validate_matrix()
    
    def _validate_matrix(self):
        """Validate homography matrix"""
        if self.matrix.shape != (3, 3):
            raise ValueError("Homography matrix must be 3x3")
        if np.allclose(self.matrix, 0):
            raise ValueError("Homography matrix is all zeros")
    
    @classmethod
    def from_string(cls, matrix_str: str) -> 'HomographyTransform':
        """Parse matrix from comma-separated string"""
        try:
            values = [float(x.strip()) for x in matrix_str.split(',')]
            if len(values) != 9:
                raise ValueError(f"Expected 9 values, got {len(values)}")
            matrix = np.array(values).reshape(3, 3)
            return cls(matrix)
        except Exception as e:
            logger.error(f"Failed to parse homography matrix: {e}")
            return cls(None)
    
    def transform(self, x: float, y: float) -> Tuple[float, float]:
        """Transform point from pixels to meters"""
        if not self.enabled:
            return x, y
        
        try:
            v = np.array([x, y, 1.0])
            v_prime = np.dot(self.matrix, v)
            
            if abs(v_prime[2]) < 1e-10:
                logger.warning(f"Near-zero denominator in homography transform")
                return x, y
            
            return float(v_prime[0] / v_prime[2]), float(v_prime[1] / v_prime[2])
        except Exception as e:
            logger.error(f"Transform error: {e}")
            return x, y


# === Team Classification ===
class TeamClassifier:
    """Improved team classification using jersey colors"""
    
    def __init__(self, method: str = "position"):
        """
        Initialize classifier
        method: 'position' (simple L/R split) or 'color' (jersey color clustering)
        """
        self.method = method
        self.team_colors = None
    
    def classify_by_position(self, x: float, y: float, width: int, height: int) -> str:
        """Simple position-based classification"""
        return TeamColor.TEAM_A.value if x < width / 2 else TeamColor.TEAM_B.value
    
    def classify_by_color(self, frame: np.ndarray, bbox: Tuple[int, int, int, int]) -> str:
        """Color-based classification using jersey region"""
        try:
            x1, y1, x2, y2 = bbox
            
            # Extract jersey region (upper 40% of bbox)
            height = y2 - y1
            jersey_region = frame[y1:int(y1 + height * 0.4), x1:x2]
            
            if jersey_region.size == 0:
                return TeamColor.UNKNOWN.value
            
            # Get dominant color
            pixels = jersey_region.reshape(-1, 3)
            dominant_color = np.median(pixels, axis=0)
            
            # Initialize team colors on first detection
            if self.team_colors is None:
                self.team_colors = {TeamColor.TEAM_A.value: dominant_color}
                return TeamColor.TEAM_A.value
            
            # Compare with known team colors
            min_dist = float('inf')
            closest_team = TeamColor.UNKNOWN.value
            
            for team, color in self.team_colors.items():
                dist = np.linalg.norm(dominant_color - color)
                if dist < min_dist:
                    min_dist = dist
                    closest_team = team
            
            # If color is very different, assign to team B
            if min_dist > 100 and len(self.team_colors) == 1:
                self.team_colors[TeamColor.TEAM_B.value] = dominant_color
                return TeamColor.TEAM_B.value
            
            return closest_team
            
        except Exception as e:
            logger.warning(f"Color classification failed: {e}")
            return TeamColor.UNKNOWN.value
    
    def classify(self, frame: np.ndarray, x: float, y: float, 
                 bbox: Optional[Tuple[int, int, int, int]] = None,
                 width: int = 0, height: int = 0) -> str:
        """Classify player team"""
        if self.method == "color" and bbox is not None:
            return self.classify_by_color(frame, bbox)
        return self.classify_by_position(x, y, width, height)


# === xThreat Grid ===
class XThreatGrid:
    """Expected Threat grid implementation"""
    
    def __init__(self, field_length: float = 105.0, field_width: float = 68.0):
        self.field_length = field_length
        self.field_width = field_width
        
        # Simplified 12x8 grid (more granular)
        # Values increase towards goal (attacking left->right)
        self.grid = np.array([
            [0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.12, 0.18, 0.25, 0.35],
            [0.008, 0.015, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.22, 0.30, 0.40, 0.50],
            [0.010, 0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65],
            [0.012, 0.025, 0.04, 0.07, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75],
            [0.012, 0.025, 0.04, 0.07, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75],
            [0.010, 0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.45, 0.55, 0.65],
            [0.008, 0.015, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.22, 0.30, 0.40, 0.50],
            [0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.06, 0.08, 0.12, 0.18, 0.25, 0.35]
        ])
    
    def get_value(self, x: float, y: float) -> float:
        """Get xThreat value for field coordinates (meters)"""
        try:
            # Map to grid indices
            col = int(np.clip(x / (self.field_length / 12), 0, 11))
            row = int(np.clip(y / (self.field_width / 8), 0, 7))
            return float(self.grid[row, col])
        except Exception as e:
            logger.warning(f"xThreat calculation failed: {e}")
            return 0.0


# === Main Analyzer (Part 1) ===
class SoccerMatchAnalyzer:
    """Production-grade soccer match analyzer"""
    
    def __init__(self, config: Optional[AnalysisConfig] = None):
        self.config = config or AnalysisConfig()
        self.model = None
        self.roboflow_model = None
        self.homography = None
        self.team_classifier = TeamClassifier(method="position")
        self.xthreat_grid = XThreatGrid(
            self.config.field_length_m,
            self.config.field_width_m
        )
        self.progress_callback = None
        
    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback
    
    def _report_progress(self, current: int, total: int, message: str = ""):
        """Report progress to callback"""
        if self.progress_callback:
            self.progress_callback(current, total, message)
    
    def load_model(self, model_path: str = 'yolov8n.pt'):
        """Load YOLO model with error handling"""
        try:
            logger.info(f"Loading YOLO model: {model_path}")
            
            # Fix for PyTorch 2.6+ security changes
            # Option 2: Force weights_only=False since we trust the standard YOLO model
            import torch
            original_load = torch.load
            try:
                # Monkey patch torch.load to force weights_only=False
                torch.load = lambda *args, **kwargs: original_load(*args, **{**kwargs, 'weights_only': False})
                self.model = YOLO(model_path)
            finally:
                # Restore original torch.load
                torch.load = original_load
                
            logger.info("Model loaded successfully")
        except Exception as e:
            raise ProcessingError(f"Failed to load YOLO model: {e}")
            
    def load_roboflow_model(self, api_key: Optional[str] = None):
        """Load Roboflow model for inference"""
        api_key = api_key or self.config.roboflow_api_key or os.getenv("ROBOFLOW_API_KEY")
        
        if not api_key:
            logger.warning("No Roboflow API key provided. Roboflow inference will be unavailable.")
            return

        try:
            logger.info(f"Connecting to Roboflow: {self.config.roboflow_workspace}/{self.config.roboflow_project} v{self.config.roboflow_version}")
            self.roboflow_model = RoboflowInference(
                api_key=api_key,
                workspace_id=self.config.roboflow_workspace,
                project_id=self.config.roboflow_project,
                version=self.config.roboflow_version
            )
            logger.info("Roboflow model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to load Roboflow model: {e}")
            # Don't raise error, just keep as None
    
    def validate_video(self, video_path: Path) -> VideoMetadata:
        """Validate video file and extract metadata"""
        if not video_path.exists():
            raise VideoError(f"Video file not found: {video_path}")
        
        if not video_path.is_file():
            raise VideoError(f"Path is not a file: {video_path}")
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VideoError(f"Cannot open video file: {video_path}")
        
        metadata = VideoMetadata.from_video(video_path, cap)
        cap.release()
        
        # Validate constraints
        if metadata.size_mb > self.config.max_video_size_mb:
            raise VideoError(
                f"Video size ({metadata.size_mb:.1f}MB) exceeds limit "
                f"({self.config.max_video_size_mb}MB)"
            )
        
        if metadata.fps <= 0 or metadata.total_frames <= 0:
            raise VideoError("Invalid video metadata")
        
        logger.info(
            f"Video validated: {metadata.width}x{metadata.height}, "
            f"{metadata.fps:.1f}fps, {metadata.duration_seconds:.1f}s"
        )
        
        return metadata
    
    def parse_clips(self, clips_data: Any, fps: float, total_frames: int) -> List[Tuple[int, int]]:
        """Parse and validate clip ranges"""
        if not clips_data:
            return [(0, total_frames)]
        
        ranges = []
        for clip in clips_data:
            try:
                start = max(0, int(clip['start'] * fps))
                end = min(total_frames, int(clip['end'] * fps))
                
                if start >= end:
                    logger.warning(f"Invalid clip range: {start}-{end}, skipping")
                    continue
                
                ranges.append((start, end))
                logger.info(f"Added clip: frames {start}-{end} ({(end-start)/fps:.1f}s)")
            except (KeyError, TypeError, ValueError) as e:
                logger.error(f"Invalid clip format: {e}")
                continue
        
        return ranges if ranges else [(0, total_frames)]
