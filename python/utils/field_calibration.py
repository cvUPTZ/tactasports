import cv2
import numpy as np

class FieldCalibrator:
    def __init__(self, field_dims=(105, 68)):
        self.field_width = field_dims[0] # meters
        self.field_height = field_dims[1] # meters
        self.homography = None
        
        # Standard pitch keypoints (normalized 0-1)
        # Top-Left, Top-Right, Bottom-Right, Bottom-Left
        self.src_pts = np.float32([[0, 0], [1, 0], [1, 1], [0, 1]])
        
    def calibrate_manual(self, image_points):
        """
        Compute homography from 4 manually selected points corresponding to field corners.
        image_points: list of [x, y] for TL, TR, BR, BL corners of the pitch in the image
        """
        if len(image_points) != 4:
            print("Error: Need exactly 4 points for calibration")
            return False
            
        dst_pts = np.float32([
            [0, 0],
            [self.field_width, 0],
            [self.field_width, self.field_height],
            [0, self.field_height]
        ])
        
        self.homography = cv2.getPerspectiveTransform(np.float32(image_points), dst_pts)
        return True
        
    def transform(self, tracks):
        """
        Transform tracks from pixel coordinates to field coordinates.
        tracks: list of [x1, y1, x2, y2, ...]
        Returns: list of [field_x, field_y]
        """
        if self.homography is None:
            return []
            
        field_coords = []
        for track in tracks:
            # Use bottom-center of bounding box as player position
            x1, y1, x2, y2 = track[:4]
            foot_x = (x1 + x2) / 2
            foot_y = y2
            
            # Apply homography
            pt = np.array([[[foot_x, foot_y]]], dtype=np.float32)
            dst = cv2.perspectiveTransform(pt, self.homography)
            
            field_coords.append(dst[0][0])
            
        return np.array(field_coords)
        
    def pixel_to_field(self, x, y):
        if self.homography is None:
            return None
        pt = np.array([[[x, y]]], dtype=np.float32)
        dst = cv2.perspectiveTransform(pt, self.homography)
        return dst[0][0]
