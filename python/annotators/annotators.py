import sys
from pathlib import Path
import numpy as np
import cv2

# Adjust project path to allow imports from other packages if needed
PROJECT_DIR = Path(__file__).resolve().parent.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.append(str(PROJECT_DIR))

try:
    import supervision as sv
except ImportError:
    # Fallback to prevent crash if supervision is not installed
    class MockAnnotator:
        def annotate(self, frame, detections, labels=None, **kwargs): return frame
    
    class sv:
        class Color:
            GREEN = (0, 255, 0)
            BLUE = (255, 0, 0)
        
        class Detections:
            def __init__(self, xyxy, class_id=None, tracker_id=None, confidence=None):
                self.xyxy = xyxy
                self.class_id = class_id
                self.tracker_id = tracker_id
                self.confidence = confidence
            def __len__(self): return len(self.xyxy)
            
        EllipseAnnotator = TriangleAnnotator = LabelAnnotator = BoxAnnotator = VertexAnnotator = EdgeAnnotator = MockAnnotator


class AnnotatorManager:
    """
    Manager class for all annotation functionality.
    Provides a unified interface for annotating players, ball, referees, and keypoints.
    """

    def __init__(self, edges=None):
        """Initialize all annotation tools."""
        # Basic annotators
        self.ellipse_annotator = sv.EllipseAnnotator()
        self.triangle_annotator = sv.TriangleAnnotator()
        self.label_annotator = sv.LabelAnnotator()
        self.box_annotator = sv.BoxAnnotator()

        # Keypoint annotators
        try:
            self.vertex_annotator = sv.VertexAnnotator(color=sv.Color.GREEN, radius=8)
            self.edge_annotator = sv.EdgeAnnotator(color=sv.Color.BLUE, thickness=3, edges=edges)
        except:
            self.vertex_annotator = sv.VertexAnnotator()
            self.edge_annotator = sv.EdgeAnnotator()

    def annotate_players(self, frame: np.ndarray, player_detections: 'sv.Detections') -> np.ndarray:
        """
        Annotate only players on the frame.
        """
        if player_detections is None or len(player_detections.xyxy) == 0:
            return frame

        if getattr(player_detections, 'tracker_id', None) is None:
            player_detections.tracker_id = np.arange(len(player_detections.xyxy))
        
        player_labels = [f'#{tracker_id}' for tracker_id in player_detections.tracker_id]
        frame = self.ellipse_annotator.annotate(frame, player_detections)
        frame = self.label_annotator.annotate(frame, detections=player_detections, labels=player_labels)

        return frame

    def annotate_ball(self, frame: np.ndarray, ball_detections: 'sv.Detections') -> np.ndarray:
        """
        Annotate ball detections on frame.
        """
        if ball_detections is not None and len(ball_detections.xyxy) > 0:
            return self.triangle_annotator.annotate(frame, ball_detections)
        return frame

    def annotate_referees(self, frame: np.ndarray, referee_detections: 'sv.Detections') -> np.ndarray:
        """
        Annotate referee detections on frame.
        """
        if referee_detections is not None and len(referee_detections.xyxy) > 0:
            if getattr(referee_detections, 'tracker_id', None) is None:
                referee_detections.tracker_id = np.arange(len(referee_detections.xyxy))
            return self.ellipse_annotator.annotate(frame, referee_detections)
        return frame

    def annotate_all(self, frame: np.ndarray, player_detections, ball_detections, referee_detections) -> np.ndarray:
        """
        Annotate players, ball, and referees on the frame using separate methods.
        """
        target_frame = frame.copy()

        # Annotate each type separately
        target_frame = self.annotate_players(target_frame, player_detections)
        target_frame = self.annotate_ball(target_frame, ball_detections)
        target_frame = self.annotate_referees(target_frame, referee_detections)

        return target_frame

    def annotate_bboxes(self, frame: np.ndarray, detections: 'sv.Detections', class_names: dict = None) -> np.ndarray:
        """
        Annotate frame with object detections bboxes.
        """
        if detections is None or len(detections.xyxy) == 0:
            return frame

        annotated_frame = frame.copy()

        # Annotate with boxes
        annotated_frame = self.box_annotator.annotate(annotated_frame, detections)

        # Add labels if class_names provided
        if class_names is not None:
            labels = []
            for class_id, conf in zip(detections.class_id, detections.confidence):
                class_name = class_names.get(class_id, f'Class {class_id}')
                labels.append(f"{class_name} {conf:.2f}")
            annotated_frame = self.label_annotator.annotate(annotated_frame, detections, labels)

        return annotated_frame

    def annotate_keypoints(self, frame: np.ndarray, keypoints: np.ndarray, confidence_threshold: float = 0.5,
                          draw_vertices: bool = True, draw_edges = None, draw_labels: bool = True,
                          KEYPOINT_CONNECTIONS=[], KEYPOINT_NAMES={}, 
                          KEYPOINT_COLOR=(0, 255, 0), CONNECTION_COLOR=(255, 0, 0), TEXT_COLOR=(255, 255, 255)) -> np.ndarray:
        """
        Annotate frame with detected keypoints using Vertex and Edge annotators.
        """
        for kpts in keypoints:
            # Draw keypoint connections
            if draw_edges:
                for connection in KEYPOINT_CONNECTIONS:
                    pt1_idx, pt2_idx = connection
                    if pt1_idx < len(kpts) and pt2_idx < len(kpts):
                        pt1 = kpts[pt1_idx]
                        pt2 = kpts[pt2_idx]
                        if pt1[2] > confidence_threshold and pt2[2] > confidence_threshold:
                            cv2.line(frame,
                                (int(pt1[0]), int(pt1[1])),
                                (int(pt2[0]), int(pt2[1])),
                                CONNECTION_COLOR, 2)

            # Draw keypoints
            for kpt_idx, kpt in enumerate(kpts):
                if kpt[2] > confidence_threshold:
                    x, y = int(kpt[0]), int(kpt[1])
                    cv2.circle(frame, (x, y), 5, KEYPOINT_COLOR, -1)
                    if draw_labels:
                        label = f"{kpt_idx}: {KEYPOINT_NAMES.get(kpt_idx, 'Unknown')}"
                        cv2.putText(frame, label, (x + 10, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, TEXT_COLOR, 1)

        return frame

    def convert_tracks_to_detections(self, player_tracks, ball_tracks, referee_tracks, player_classids=None):
        """
        Convert tracking data back to supervision detections format.
        """
        # Get the player detections
        if player_tracks is not None:
            if player_classids is not None:
                class_ids = [player_classids[tracker_id] for tracker_id in player_tracks.keys()]
            else:
                class_ids = [0] * len(player_tracks)
            
            player_detections = sv.Detections(
                xyxy=np.array(list(player_tracks.values())),
                class_id=np.array(class_ids),
                tracker_id=np.array(list(player_tracks.keys()))
            )
        else:
            player_detections = None

        # Get the ball detections
        if ball_tracks is not None:
            ball_detections = sv.Detections(
                xyxy=np.array([ball_tracks]),
                class_id=np.array([2]),
            )
        else:
            ball_detections = None

        # Get the referee detections
        if referee_tracks is not None:
            referee_detections = sv.Detections(
                xyxy=np.array(list(referee_tracks.values())),
                class_id=np.array([3] * len(referee_tracks)),
                tracker_id=np.array(list(referee_tracks.keys()))
            )
        else:
            referee_detections = None

        return player_detections, ball_detections, referee_detections
