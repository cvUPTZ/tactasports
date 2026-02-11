import cv2
import numpy as np
from dataclasses import dataclass

@dataclass
class SceneInfo:
    is_crowded: bool
    is_shaky: bool
    lighting_condition: str  # 'good', 'low', 'glare'
    occlusion_level: float  # 0.0 to 1.0
    motion_intensity: float # 0.0 to 1.0

class SceneAnalyzer:
    def __init__(self):
        self.prev_frame = None
        self.prev_gray = None
        
    def analyze(self, frame) -> SceneInfo:
        """
        Analyze the current frame to determine scene characteristics.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        height, width = frame.shape[:2]
        
        # 1. Detect Camera Motion / Shake using Optical Flow on background
        motion_intensity = 0.0
        is_shaky = False
        
        if self.prev_gray is not None:
            # Calculate dense optical flow (Farneback) on a downscaled frame for speed
            small_curr = cv2.resize(gray, (width // 4, height // 4))
            small_prev = cv2.resize(self.prev_gray, (width // 4, height // 4))
            
            flow = cv2.calcOpticalFlowFarneback(small_prev, small_curr, None, 0.5, 3, 15, 3, 5, 1.2, 0)
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            motion_intensity = np.mean(mag)
            
            # Threshold for shaky camera (heuristic)
            if motion_intensity > 2.0:
                is_shaky = True
                
        self.prev_gray = gray
        
        # 2. Analyze Lighting
        avg_brightness = np.mean(gray)
        if avg_brightness < 50:
            lighting = 'low'
        elif avg_brightness > 200:
            lighting = 'glare'
        else:
            lighting = 'good'
            
        # 3. Estimate Crowding / Occlusion (Simple Edge Density)
        # More edges often means more texture/objects in a soccer context (players, crowd)
        # This is a rough proxy; true crowding comes from detection count
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.count_nonzero(edges) / (width * height)
        
        is_crowded = edge_density > 0.05  # Heuristic threshold
        occlusion_level = min(edge_density * 10, 1.0) # Normalize
        
        return SceneInfo(
            is_crowded=is_crowded,
            is_shaky=is_shaky,
            lighting_condition=lighting,
            occlusion_level=occlusion_level,
            motion_intensity=motion_intensity
        )
