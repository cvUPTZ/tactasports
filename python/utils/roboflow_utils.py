import os
import time
import numpy as np
from typing import List, Dict, Union, Tuple
from roboflow import Roboflow
import supervision as sv

class RoboflowInference:
    """Helper class to run inference using Roboflow API."""
    
    def __init__(self, api_key: str, workspace_id: str, project_id: str, version: int):
        """
        Initialize Roboflow client.
        
        Args:
            api_key: Roboflow Private API Key
            workspace_id: Roboflow Workspace ID
            project_id: Roboflow Project ID
            version: Project Version number
        """
        self.rf = Roboflow(api_key=api_key)
        self.project = self.rf.workspace(workspace_id).project(project_id)
        self.model = self.project.version(version).model

    def infer(self, image: Union[np.ndarray, str], confidence: float = 0.4, overlap: float = 0.3) -> dict:
        """
        Run inference on an image.
        
        Args:
            image: Numpy array (BGR) or path to image file
            confidence: Confidence threshold
            overlap: IoU threshold
            
        Returns:
            Raw JSON response from Roboflow API
        """
        import uuid
        import os
        
        # Use unique temp file to avoid race conditions in threads
        temp_path = f"temp_inference_{uuid.uuid4()}.jpg"
        
        try:
            if isinstance(image, np.ndarray):
                import cv2
                
                # Optimization: Resize image to reduce upload time
                h, w = image.shape[:2]
                target_size = 640
                scale = target_size / max(h, w)
                if scale < 1:
                    new_w, new_h = int(w * scale), int(h * scale)
                    resized_image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
                else:
                    resized_image = image

                cv2.imwrite(temp_path, resized_image)
                
                # Keypoint models might not support overlap/IoU
                try:
                    prediction = self.model.predict(temp_path, confidence=confidence*100, overlap=overlap*100).json()
                except TypeError:
                    prediction = self.model.predict(temp_path, confidence=confidence*100).json()

                # Helper to scale back coordinates
                if scale < 1:
                     self._scale_predictions(prediction, 1/scale)

            else:
                # If path provided
                try:
                    prediction = self.model.predict(image, confidence=confidence*100, overlap=overlap*100).json()
                except TypeError:
                    prediction = self.model.predict(image, confidence=confidence*100).json()
        
        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            
        return prediction

    def _scale_predictions(self, result: dict, scale_factor: float):
        """
        Scale prediction coordinates back to original image size.
        Modifies result dict in-place.
        """
        predictions = result.get('predictions', [])
        for pred in predictions:
            if 'x' in pred: pred['x'] *= scale_factor
            if 'y' in pred: pred['y'] *= scale_factor
            if 'width' in pred: pred['width'] *= scale_factor
            if 'height' in pred: pred['height'] *= scale_factor
            
            if 'keypoints' in pred:
                for kp in pred['keypoints']:
                    if 'x' in kp: kp['x'] *= scale_factor
                    if 'y' in kp: kp['y'] *= scale_factor

    def _parse_roboflow_response(self, result: dict) -> sv.Detections:
        """
        Manually parse Roboflow JSON response to sv.Detections.
        
        Args:
            result: JSON response from Roboflow model.predict().json()
            
        Returns:
            sv.Detections object
        """
        predictions = result.get('predictions', [])
        
        if not predictions:
            return sv.Detections.empty()
            
        xyxy = []
        confidence = []
        class_id = []
        
        for pred in predictions:
            # Use .get() to avoid KeyError if keys are missing
            x = pred.get('x', 0)
            y = pred.get('y', 0)
            w = pred.get('width', 0)
            h = pred.get('height', 0)
            
            # Convert center-xywh to xyxy
            x_min = x - w / 2
            y_min = y - h / 2
            x_max = x + w / 2
            y_max = y + h / 2
            
            xyxy.append([x_min, y_min, x_max, y_max])
            confidence.append(pred.get('confidence', 0))
            class_id.append(pred.get('class_id', 0)) # Default to 0 if missing
            
        return sv.Detections(
            xyxy=np.array(xyxy),
            confidence=np.array(confidence),
            class_id=np.array(class_id)
        )

    def get_detections(self, image: np.ndarray, confidence: float = 0.4) -> sv.Detections:
        """
        Get detections in Supervision format.
        
        Args:
            image: Input image (numpy array)
            confidence: Confidence threshold
            
        Returns:
            sv.Detections object
        """
        result = self.infer(image, confidence=confidence)
        
        # Convert Roboflow JSON to Supervision Detections manually
        return self._parse_roboflow_response(result)

    def get_keypoints_detections(self, image: np.ndarray, confidence: float = 0.4) -> Tuple[sv.Detections, np.ndarray]:
        """
        Get keypoint detections.
        
        Args:
            image: Input image
            confidence: Confidence threshold
            
        Returns:
             Tuple of (detections, keypoints array)
        """
        # Note: Roboflow Keypoint response structure differs slightly.
        # Check if project type is keypoint-detection.
        
        result = self.infer(image, confidence=confidence)
        detections = self._parse_roboflow_response(result)
        
        # Extract keypoints manually from the JSON response
        predictions = result.get('predictions', [])
        all_kpts = []
        
        for pred in predictions:
            kpts = []
            if 'keypoints' in pred:
                for kp in pred['keypoints']:
                    # Roboflow keypoints: list of dicts {'x':, 'y':, 'confidence':}
                    x = kp.get('x', 0)
                    y = kp.get('y', 0)
                    # confidence key might vary or be absent
                    conf = kp.get('confidence', 0) 
                    kpts.append([x, y, conf])
                all_kpts.append(kpts)
            else:
                pass
                
        if len(all_kpts) > 0:
            # Check consistency of keypoints count
            # Use max length or truncate? Assuming uniform keypoint count for valid model.
            try:
                keypoints_array = np.array(all_kpts) # Shape (N, K, 3)
                return detections, keypoints_array
            except ValueError:
                 # Ragged array if keypoint counts differ (unlikely for standard model)
                 return detections, None
        else:
            return detections, None
