#!/usr/bin/env python3
"""
Production Soccer Analysis - Processing Methods
Part 2: Core analysis algorithms
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict
import time
from dataclasses import asdict
import supervision as sv

from soccer_analysis_core import (
    SoccerMatchAnalyzer as BaseSoccerMatchAnalyzer,
    TrackPoint, PlayerStats, PressingEvent, PassEvent, PassingNetworkMetrics,
    VideoMetadata, TeamColor, VideoError, ProcessingError, logger,
    AnalysisConfig, TeamClassifier
)

# Import new modules
try:
    from camera_movement_estimator.camera_movement_estimator import CameraMovementEstimator
    from view_transformer.view_transformer import ViewTransformer
    from team_assigner.team_assigner import TeamAssigner
    from player_ball_assigner.player_ball_assigner import PlayerBallAssigner
    from speed_and_distance_estimator.speed_and_distance_estimator import SpeedAndDistance_Estimator
except ImportError as e:
    logger.warning(f"Could not import advanced modules: {e}")
    CameraMovementEstimator = None
    ViewTransformer = None
    TeamAssigner = None
    PlayerBallAssigner = None
    SpeedAndDistance_Estimator = None


# === Pass Detection ===
class PassDetector:
    """Detects passes from player tracking data using proximity heuristics"""
    
    def __init__(self, config):
        self.config = config
        self.potential_passes = []  # Track ongoing pass attempts
    
    def detect_passes(self, tracks: Dict[int, List[TrackPoint]], 
                     fps: float) -> List[PassEvent]:
        """
        Detect passes using proximity and movement heuristics
        
        Algorithm:
        1. For each frame, find same-team players within proximity
        2. Track when players separate (potential pass)
        3. Validate pass based on distance, receiver movement, duration
        """
        if not tracks:
            return []
        
        passes = []
        frames_data = self._index_by_frame(tracks)
        
        for frame in sorted(frames_data.keys()):
            players = frames_data[frame]
            
            # Detect potential pass starts (players in proximity)
            self._detect_pass_starts(players, frame)
            
            # Update ongoing passes and complete validated ones
            completed = self._update_and_complete_passes(players, frame, fps)
            passes.extend(completed)
        
        # Clean up any remaining potential passes
        self.potential_passes.clear()
        
        logger.info(f"Pass detection complete: {len(passes)} passes found")
        return passes
    
    def _index_by_frame(self, tracks: Dict[int, List[TrackPoint]]) -> Dict[int, List[Tuple[int, TrackPoint]]]:
        """Index tracks by frame for efficient lookup"""
        frames_data = defaultdict(list)
        for player_id, track in tracks.items():
            for point in track:
                if point.xm_smooth is not None:  # Only use smoothed coordinates
                    frames_data[point.frame].append((player_id, point))
        return frames_data
    
    def _detect_pass_starts(self, players: List[Tuple[int, TrackPoint]], frame: int):
        """Find same-team players in proximity (potential pass start)"""
        for i, (pid1, p1) in enumerate(players):
            for pid2, p2 in players[i+1:]:
                # Same team check
                if p1.team != p2.team or p1.team == TeamColor.UNKNOWN.value:
                    continue
                
                # Calculate distance
                dist = np.sqrt(
                    (p1.xm_smooth - p2.xm_smooth)**2 +
                    (p1.ym_smooth - p2.ym_smooth)**2
                )
                
                # Check if within proximity threshold
                if dist < self.config.pass_proximity_threshold_m:
                    # Check if this is a new potential pass
                    existing = any(
                        pp['passer'] == pid1 and pp['receiver'] == pid2 and pp['active']
                        for pp in self.potential_passes
                    )
                    
                    if not existing:
                        self.potential_passes.append({
                            'passer': pid1,
                            'receiver': pid2,
                            'team': p1.team,
                            'start_frame': frame,
                            'start_time': p1.timestamp,
                            'start_pos': (p1.xm_smooth, p1.ym_smooth),
                            'start_xthreat': p1.xthreat,
                            'active': True,
                            'min_distance': dist
                        })
    
    def _update_and_complete_passes(self, players: List[Tuple[int, TrackPoint]], 
                                   frame: int, fps: float) -> List[PassEvent]:
        """Update ongoing passes and complete validated ones"""
        completed_passes = []
        players_dict = {pid: p for pid, p in players}
        
        for potential in self.potential_passes:
            if not potential['active']:
                continue
            
            passer_id = potential['passer']
            receiver_id = potential['receiver']
            
            # Check if both players still in frame
            if passer_id not in players_dict or receiver_id not in players_dict:
                potential['active'] = False
                continue
            
            passer = players_dict[passer_id]
            receiver = players_dict[receiver_id]
            
            # Calculate current distance
            dist = np.sqrt(
                (passer.xm_smooth - receiver.xm_smooth)**2 +
                (passer.ym_smooth - receiver.ym_smooth)**2
            )
            
            # Update minimum distance
            potential['min_distance'] = min(potential['min_distance'], dist)
            
            # Check if players have separated (pass completed)
            if dist > self.config.pass_proximity_threshold_m:
                duration = passer.timestamp - potential['start_time']
                
                # Validate pass
                if self._validate_pass(potential, receiver, dist, duration):
                    # Calculate pass distance (from start to receiver current position)
                    pass_distance = np.sqrt(
                        (receiver.xm_smooth - potential['start_pos'][0])**2 +
                        (receiver.ym_smooth - potential['start_pos'][1])**2
                    )
                    
                    # Create pass event
                    pass_event = PassEvent(
                        frame=frame,
                        timestamp=round(receiver.timestamp, 3),
                        passer_id=passer_id,
                        receiver_id=receiver_id,
                        team=potential['team'],
                        distance=round(pass_distance, 2),
                        duration=round(duration, 2),
                        pass_type=self._classify_pass_type(pass_distance),
                        success=receiver.velocity > self.config.pass_velocity_threshold_ms,
                        start_position=potential['start_pos'],
                        end_position=(receiver.xm_smooth, receiver.ym_smooth),
                        xthreat_delta=round(receiver.xthreat - potential['start_xthreat'], 3)
                    )
                    
                    completed_passes.append(pass_event)
                
                # Mark as inactive
                potential['active'] = False
            
            # Timeout check
            elif (passer.timestamp - potential['start_time']) > self.config.pass_max_duration_s:
                potential['active'] = False
        
        return completed_passes
    
    def _validate_pass(self, potential: Dict, receiver: TrackPoint, 
                      dist: float, duration: float) -> bool:
        """Validate if this is a real pass"""
        # Check minimum distance traveled
        pass_distance = np.sqrt(
            (receiver.xm_smooth - potential['start_pos'][0])**2 +
            (receiver.ym_smooth - potential['start_pos'][1])**2
        )
        
        if pass_distance < self.config.pass_min_distance_m:
            return False
        
        # Check maximum distance
        if pass_distance > self.config.pass_max_distance_m:
            return False
        
        # Check duration
        if duration <= 0 or duration > self.config.pass_max_duration_s:
            return False
        
        # Check receiver movement (should be moving away)
        if receiver.velocity < 0.5:  # Receiver should be moving
            return False
        
        return True
    
    def _classify_pass_type(self, distance: float) -> str:
        """Classify pass as short/medium/long"""
        if distance < 10:
            return 'short'
        elif distance < 25:
            return 'medium'
        else:
            return 'long'


# === Network Analysis ===
class PassingNetworkAnalyzer:
    """Analyzes passing networks and team connectivity"""
    
    def __init__(self, config):
        self.config = config
    
    def analyze_network(self, passes: List[PassEvent], 
                       team: str) -> PassingNetworkMetrics:
        """Build passing network and calculate metrics"""
        team_passes = [p for p in passes if p.team == team]
        
        if not team_passes:
            return self._empty_metrics(team)
        
        # Build passing graph
        graph = self._build_graph(team_passes)
        
        # Calculate metrics
        total = len(team_passes)
        successful = sum(1 for p in team_passes if p.success)
        completion_rate = (successful / total) if total > 0 else 0.0
        
        metrics = PassingNetworkMetrics(
            team=team,
            total_passes=total,
            successful_passes=successful,
            pass_completion_rate=round(completion_rate, 3),
            avg_pass_distance=round(np.mean([p.distance for p in team_passes]), 2),
            key_passers=self._find_key_players(team_passes, 'passer'),
            key_receivers=self._find_key_players(team_passes, 'receiver'),
            passing_triangles=self._find_triangles(graph),
            network_centrality=self._calculate_centrality(graph)
        )
        
        return metrics
    
    def _empty_metrics(self, team: str) -> PassingNetworkMetrics:
        """Return empty metrics for team with no passes"""
        return PassingNetworkMetrics(
            team=team,
            total_passes=0,
            successful_passes=0,
            pass_completion_rate=0.0,
            avg_pass_distance=0.0,
            key_passers=[],
            key_receivers=[],
            passing_triangles=[],
            network_centrality={}
        )
    
    def _build_graph(self, passes: List[PassEvent]) -> Dict[int, Dict[int, int]]:
        """Build directed graph from passes (adjacency list with counts)"""
        graph = defaultdict(lambda: defaultdict(int))
        
        for pass_event in passes:
            graph[pass_event.passer_id][pass_event.receiver_id] += 1
        
        return dict(graph)
    
    def _find_key_players(self, passes: List[PassEvent], 
                         role: str) -> List[Tuple[int, int]]:
        """Find top passers or receivers by volume"""
        counts = defaultdict(int)
        
        for pass_event in passes:
            player_id = pass_event.passer_id if role == 'passer' else pass_event.receiver_id
            counts[player_id] += 1
        
        # Sort by count and return top 5
        sorted_players = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_players[:5]
    
    def _find_triangles(self, graph: Dict[int, Dict[int, int]]) -> List[Tuple[int, int, int]]:
        """Find passing triangles (3-player combinations)"""
        triangles = []
        players = list(graph.keys())
        
        # Check all combinations of 3 players
        for i, p1 in enumerate(players):
            for j, p2 in enumerate(players[i+1:], i+1):
                for p3 in players[j+1:]:
                    # Check if triangle exists (all 3 connections)
                    if (p2 in graph.get(p1, {}) and 
                        p3 in graph.get(p2, {}) and 
                        p1 in graph.get(p3, {})):
                        triangles.append((p1, p2, p3))
        
        return triangles[:10]  # Return top 10 triangles
    
    def _calculate_centrality(self, graph: Dict[int, Dict[int, int]]) -> Dict[int, float]:
        """Calculate degree centrality for each player"""
        centrality = {}
        all_players = set(graph.keys())
        
        # Add receivers to player set
        for receivers in graph.values():
            all_players.update(receivers.keys())
        
        # Calculate degree centrality (normalized)
        max_degree = len(all_players) - 1 if len(all_players) > 1 else 1
        
        for player in all_players:
            # Out-degree (passes made)
            out_degree = len(graph.get(player, {}))
            
            # In-degree (passes received)
            in_degree = sum(1 for passers in graph.values() if player in passers)
            
            # Total degree
            total_degree = out_degree + in_degree
            
            # Normalize
            centrality[player] = round(total_degree / max_degree, 3) if max_degree > 0 else 0.0
        
        return centrality



    @staticmethod
    def get_team_brightness(crops):
        """Calculate average brightness of team crops."""
        if not crops:
            return 128
        brightnesses = [np.mean(crop) for crop in crops]
        return np.mean(brightnesses)

    @staticmethod
    def assign_high_contrast_colors(team0_crops, team1_crops):
        """
        Assign guaranteed high-contrast colors based on brightness.
        WHITE team → Light gray
        COLORED team → Bright red
        """
        team0_bright = SoccerMatchAnalyzer.get_team_brightness(team0_crops)
        team1_bright = SoccerMatchAnalyzer.get_team_brightness(team1_crops)
        
        logger.info(f"High-contrast color assignment: Team 0 bright={team0_bright:.1f}, Team 1 bright={team1_bright:.1f}")
        
        if team0_bright > team1_bright:
            return (230, 230, 230), (50, 50, 220)  # Light gray, Bright red
        else:
            return (50, 50, 220), (230, 230, 230)  # Bright red, Light gray


class SoccerMatchAnalyzer(BaseSoccerMatchAnalyzer):
    """Extended analyzer with processing methods"""
    
    def track_players(self, video_path: Path, processing_ranges: List[Tuple[int, int]], 
                     metadata: VideoMetadata,
                     camera_estimator=None,
                     view_transformer=None,
                     team_assigner=None) -> Dict[int, List[TrackPoint]]:
        """
        Track players across video frames
        Returns: Dict mapping player_id -> list of TrackPoints
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VideoError(f"Failed to reopen video: {video_path}")
        
        tracks = defaultdict(list)
        total_frames_to_process = sum(end - start for start, end in processing_ranges)
        processed = 0
        
        try:
            for range_idx, (start_frame, end_frame) in enumerate(processing_ranges):
                logger.info(f"Processing range {range_idx + 1}/{len(processing_ranges)}: "
                          f"frames {start_frame}-{end_frame}")
                
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
                frame_idx = start_frame
                
                while frame_idx < end_frame:
                    ret, frame = cap.read()
                    if not ret:
                        logger.warning(f"Failed to read frame {frame_idx}")
                        break
                    
                    # Skip frames if configured
                    if (frame_idx - start_frame) % self.config.frame_skip != 0:
                        frame_idx += 1
                        continue
                    
                    timestamp = frame_idx / metadata.fps
                    
                    # Camera movement
                    camera_movement = [0, 0]
                    if camera_estimator:
                        camera_movement = camera_estimator.step(frame)
                    
                    # Run tracking
                    try:
                        if self.roboflow_model:
                            # Use Roboflow for detection + manual ByteTrack
                            detections = self.roboflow_model.get_detections(frame, confidence=self.config.confidence_threshold)
                            
                            if not hasattr(self, 'sv_tracker'):
                                self.sv_tracker = sv.ByteTrack()
                            
                            # Update tracker
                            tracked_detections = self.sv_tracker.update_with_detections(detections)
                            
                            boxes = tracked_detections.xyxy
                            ids = tracked_detections.tracker_id
                            confs = tracked_detections.confidence
                            cls_ids = tracked_detections.class_id
                            
                            # For the ball
                            ball_mask = detections.class_id == 32
                            ball_boxes = detections.xyxy[ball_mask]
                            ball_confs = detections.confidence[ball_mask]
                            ball_cls_ids = detections.class_id[ball_mask]
                            
                            final_results = []
                            for i in range(len(tracked_detections)):
                                final_results.append({
                                    'bbox': boxes[i],
                                    'id': ids[i],
                                    'conf': confs[i],
                                    'cls': cls_ids[i]
                                })
                            for i in range(len(ball_boxes)):
                                final_results.append({
                                    'bbox': ball_boxes[i],
                                    'id': None,
                                    'conf': ball_confs[i],
                                    'cls': ball_cls_ids[i]
                                })
                        else:
                            yolo_results = self.model.track(
                                frame,
                                persist=True,
                                verbose=False,
                                classes=[0, 32],
                                conf=self.config.confidence_threshold,
                                tracker="bytetrack.yaml"
                            )
                            
                            final_results = []
                            for result in yolo_results:
                                if result.boxes.id is None:
                                    ball_indices = result.boxes.cls == 32
                                    bboxes = result.boxes.xyxy[ball_indices].cpu().numpy()
                                    confs = result.boxes.conf[ball_indices].cpu().numpy()
                                    for i in range(len(bboxes)):
                                        final_results.append({
                                            'bbox': bboxes[i],
                                            'id': None,
                                            'conf': confs[i],
                                            'cls': 32
                                        })
                                    continue
                                
                                boxes_xyxy = result.boxes.xyxy.cpu().numpy()
                                ids = result.boxes.id.cpu().numpy().astype(int)
                                confs = result.boxes.conf.cpu().numpy()
                                cls_ids = result.boxes.cls.cpu().numpy().astype(int)
                                
                                for bbox, track_id, conf, cls_id in zip(boxes_xyxy, ids, confs, cls_ids):
                                    final_results.append({
                                        'bbox': bbox,
                                        'id': track_id,
                                        'conf': conf,
                                        'cls': cls_id
                                    })

                    except Exception as e:
                        logger.error(f"Tracking failed at frame {frame_idx}: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                        frame_idx += 1
                        continue
                    
                    # Process detections
                    current_frame_players = {} # For team assignment
                    
                    # High-contrast color buffers
                    team0_color = (230, 230, 230) # Light gray (white team)
                    team1_color = (50, 50, 220)   # Bright red (colored team)
                    colors_assigned = False

                    for detection in final_results:
                        bbox = detection['bbox']
                        track_id = detection['id']
                        conf = detection['conf']
                        cls_id = detection['cls']
                        
                        x1, y1, x2, y2 = bbox
                        w, h = x2 - x1, y2 - y1
                        x, y = (x1 + x2) / 2, (y1 + y2) / 2
                        
                        # Use bottom-center for ground plane
                        foot_x, foot_y = float(x), float(y + h/2)
                        
                        # Adjust for camera movement (simplified accumulation)
                        x_adj = foot_x - camera_movement[0]
                        y_adj = foot_y - camera_movement[1]
                        
                        # Transform to meters
                        xm, ym = None, None
                        if view_transformer:
                            # ViewTransformer expects point as list/array
                            pt = np.array([x_adj, y_adj])
                            transformed = view_transformer.transform_point(pt)
                            if transformed is not None:
                                xm, ym = float(transformed[0][0]), float(transformed[0][1])
                        elif self.homography:
                            xm, ym = self.homography.transform(foot_x, foot_y)
                        
                        # Classify team or ball
                        team = "Unknown"
                        if cls_id == 32:
                            team = "BALL"
                        elif team_assigner:
                            # Use TeamAssigner if initialized
                            if hasattr(team_assigner, 'kmeans') and team_assigner.kmeans:
                                team_id = team_assigner.get_player_team(frame, bbox, track_id)
                                team = "A" if team_id == 1 else "B"
                            else:
                                # Will be assigned retroactively for first frame
                                team = "Unknown"
                        else:
                            team = self.team_classifier.classify(
                                frame, x, y,
                                bbox=tuple(bbox.astype(int)) if isinstance(bbox, np.ndarray) else tuple(map(int, bbox)),
                                width=metadata.width,
                                height=metadata.height
                            )
                        
                        # Create track point
                        point = TrackPoint(
                            frame=frame_idx,
                            timestamp=round(timestamp, 3),
                            x=float(x),
                            y=float(y),
                            xm=xm,
                            ym=ym,
                            team=team,
                            confidence=float(conf),
                            bbox=tuple(map(float, bbox))
                        )
                        
                        # Use track_id if available, otherwise use a temporary id for ball
                        obj_id = track_id if track_id is not None else f"ball_{frame_idx}"
                        tracks[obj_id].append(point)
                        
                        if cls_id != 32:
                            current_frame_players[track_id] = {'bbox': bbox}

                    # Update team assigner colors if needed (first frame)
                    if team_assigner and frame_idx == start_frame and current_frame_players:
                        if self.config.use_high_contrast_colors:
                            # Extract crops to determine brightness
                            from player_clustering import EmbeddingExtractor
                            extractor = EmbeddingExtractor()
                            
                            player_crops = []
                            for track_id, info in current_frame_players.items():
                                bbox = info['bbox']
                                x1, y1, x2, y2 = map(int, bbox)
                                crop = frame[max(0, y1):min(frame.shape[0], y2), 
                                             max(0, x1):min(frame.shape[1], x2)]
                                if crop.size > 0:
                                    player_crops.append(crop)
                            
                            if player_crops:
                                # We need to cluster them into two teams first to assign colors
                                from sklearn.cluster import KMeans
                                features = extractor.extract(player_crops)
                                labels = KMeans(n_clusters=2, n_init=10).fit_predict(features)
                                
                                team0_crops = [player_crops[i] for i, l in enumerate(labels) if l == 0]
                                team1_crops = [player_crops[i] for i, l in enumerate(labels) if l == 1]
                                
                                c1, c2 = self.assign_high_contrast_colors(team0_crops, team1_crops)
                                team_assigner.set_fixed_team_colors(c1, c2)
                                logger.info(f"High-contrast colors applied: Team 0={c1}, Team 1={c2}")
                        else:
                            team_assigner.assign_team_color(frame, current_frame_players)
                        
                        # Retroactively assign teams for this first frame
                        for track_id, points in tracks.items():
                            if points and points[-1].frame == start_frame and points[-1].team == "Unknown":
                                # Get the point we just added
                                point = points[-1]
                                if point.bbox:
                                    team_id = team_assigner.get_player_team(frame, point.bbox, track_id)
                                    point.team = "A" if team_id == 1 else "B"
                    
                    frame_idx += 1
                    processed += 1
                    
                    # Progress reporting
                    if processed % 30 == 0:  # Every ~1 second at 30fps
                        self._report_progress(
                            processed,
                            total_frames_to_process,
                            f"Tracking frame {frame_idx}/{end_frame}"
                        )
        
        finally:
            cap.release()
        
        logger.info(f"Tracking complete. Found {len(tracks)} players")
        return dict(tracks)
    
    def compute_metrics(self, tracks: Dict[int, List[TrackPoint]], 
                       fps: float) -> Dict[int, List[TrackPoint]]:
        """
        Compute physical metrics (velocity, acceleration, sprints)
        Modifies track points in-place and returns updated tracks
        """
        min_track_length = int(self.config.min_track_length_seconds * fps)
        
        for player_id, track in list(tracks.items()):
            # Filter short tracks
            if len(track) < min_track_length:
                logger.debug(f"Removing short track {player_id}: {len(track)} points")
                del tracks[player_id]
                continue
            
            # Check if we have meter coordinates
            if track[0].xm is None:
                logger.warning(f"Player {player_id}: No meter coordinates, skipping metrics")
                continue
            
            # Extract coordinates
            coords = np.array([[p.xm, p.ym] for p in track])
            timestamps = np.array([p.timestamp for p in track])
            
            # Smooth coordinates
            coords_smooth = self._smooth_trajectory(coords)
            
            # Compute velocity
            velocity = self._compute_velocity(coords_smooth, timestamps, fps)
            
            # Compute acceleration
            acceleration = self._compute_acceleration(velocity, timestamps)
            
            # Detect sprints
            is_sprinting = velocity > self.config.sprint_threshold_ms
            
            # Update track points
            for i, point in enumerate(track):
                point.xm_smooth = float(coords_smooth[i, 0])
                point.ym_smooth = float(coords_smooth[i, 1])
                point.velocity = float(velocity[i])
                point.acceleration = float(acceleration[i])
                point.is_sprinting = bool(is_sprinting[i])
                
                # Compute xThreat
                point.xthreat = self.xthreat_grid.get_value(
                    point.xm_smooth,
                    point.ym_smooth
                )
        
        logger.info(f"Metrics computed for {len(tracks)} players")
        return tracks
    
    def _smooth_trajectory(self, coords: np.ndarray) -> np.ndarray:
        """Apply Savitzky-Golay smoothing"""
        from scipy.signal import savgol_filter
        
        window = min(len(coords), self.config.smoothing_window)
        if window % 2 == 0:
            window -= 1
        
        if window < 3:
            return coords
        
        try:
            return savgol_filter(coords, window, 2, axis=0)
        except Exception as e:
            logger.warning(f"Smoothing failed: {e}")
            return coords
    
    def _compute_velocity(self, coords: np.ndarray, timestamps: np.ndarray, 
                         fps: float) -> np.ndarray:
        """Compute velocity with outlier filtering"""
        dt = np.diff(timestamps)
        dt[dt == 0] = 1.0 / fps  # Avoid division by zero
        
        dist = np.linalg.norm(np.diff(coords, axis=0), axis=1)
        
        # Filter impossible movements
        valid_moves = (dist < self.config.max_distance_jump_m) & \
                     (dt < self.config.max_frame_gap_seconds)
        
        velocity = np.zeros(len(dist))
        velocity[valid_moves] = dist[valid_moves] / dt[valid_moves]
        
        # Cap at maximum human speed
        velocity = np.clip(velocity, 0, self.config.max_speed_ms)
        
        # Pad to match original length
        return np.insert(velocity, 0, 0.0)
    
    def _compute_acceleration(self, velocity: np.ndarray, 
                            timestamps: np.ndarray) -> np.ndarray:
        """Compute acceleration"""
        dt = np.diff(timestamps)
        dt[dt == 0] = 0.033  # ~30fps
        
        accel = np.diff(velocity) / dt
        
        # Cap extreme accelerations (±10 m/s²)
        accel = np.clip(accel, -10.0, 10.0)
        
        return np.insert(accel, 0, 0.0)
    
    def compute_player_stats(self, tracks: Dict[int, List[TrackPoint]], 
                           fps: float) -> Dict[int, PlayerStats]:
        """Aggregate player statistics"""
        stats = {}
        
        for player_id, track in tracks.items():
            if not track or track[0].xm is None:
                continue
            
            # Total distance (using smoothed coordinates)
            coords = np.array([[p.xm_smooth or p.xm, p.ym_smooth or p.ym] 
                             for p in track])
            distances = np.linalg.norm(np.diff(coords, axis=0), axis=1)
            
            # Filter valid movements
            valid = distances < self.config.max_distance_jump_m
            total_dist = float(np.sum(distances[valid]))
            
            # Velocity stats
            velocities = np.array([p.velocity for p in track])
            max_speed = float(np.max(velocities))
            avg_speed = float(np.mean(velocities[velocities > 0])) if np.any(velocities > 0) else 0.0
            
            # Count sprint events
            sprint_count = 0
            in_sprint = False
            for p in track:
                if p.is_sprinting and not in_sprint:
                    sprint_count += 1
                    in_sprint = True
                elif not p.is_sprinting:
                    in_sprint = False
            
            # Track duration
            duration = (track[-1].timestamp - track[0].timestamp)
            
            stats[player_id] = PlayerStats(
                player_id=player_id,
                total_distance=round(total_dist, 2),
                max_speed=round(max_speed, 2),
                avg_speed=round(avg_speed, 2),
                sprints=sprint_count,
                team=track[0].team,
                track_duration=round(duration, 2),
                frames_tracked=len(track)
            )
        
        logger.info(f"Stats computed for {len(stats)} players")
        return stats
    
    def detect_pressing_events(self, tracks: Dict[int, List[TrackPoint]]) -> List[PressingEvent]:
        """Detect pressing events between players"""
        # Index tracks by frame
        frames_data = defaultdict(list)
        for pid, track in tracks.items():
            for point in track:
                if point.xm_smooth is not None:
                    frames_data[point.frame].append((pid, point))
        
        events = []
        
        for frame in sorted(frames_data.keys()):
            players = frames_data[frame]
            
            # Separate by team
            team_a = [(pid, p) for pid, p in players if p.team == TeamColor.TEAM_A.value]
            team_b = [(pid, p) for pid, p in players if p.team == TeamColor.TEAM_B.value]
            
            # Check A pressing B
            for def_id, def_p in team_a:
                for att_id, att_p in team_b:
                    dist = np.sqrt(
                        (def_p.xm_smooth - att_p.xm_smooth)**2 +
                        (def_p.ym_smooth - att_p.ym_smooth)**2
                    )
                    
                    if dist < self.config.pressing_distance_m and \
                       def_p.velocity > self.config.pressing_speed_threshold_ms:
                        events.append(PressingEvent(
                            frame=frame,
                            timestamp=round(def_p.timestamp, 3),
                            defender_id=def_id,
                            attacker_id=att_id,
                            distance=round(dist, 2),
                            defender_speed=round(def_p.velocity, 2)
                        ))
            
            # Check B pressing A (symmetric)
            for def_id, def_p in team_b:
                for att_id, att_p in team_a:
                    dist = np.sqrt(
                        (def_p.xm_smooth - att_p.xm_smooth)**2 +
                        (def_p.ym_smooth - att_p.ym_smooth)**2
                    )
                    
                    if dist < self.config.pressing_distance_m and \
                       def_p.velocity > self.config.pressing_speed_threshold_ms:
                        events.append(PressingEvent(
                            frame=frame,
                            timestamp=round(def_p.timestamp, 3),
                            defender_id=def_id,
                            attacker_id=att_id,
                            distance=round(dist, 2),
                            defender_speed=round(def_p.velocity, 2)
                        ))
        
        # Deduplicate events (same players within 1 second)
        events = self._deduplicate_events(events)
        
        logger.info(f"Detected {len(events)} pressing events")
        return events
    
    def _deduplicate_events(self, events: List[PressingEvent], 
                          time_window: float = 1.0) -> List[PressingEvent]:
        """Remove duplicate events within time window"""
        if not events:
            return events
        
        events.sort(key=lambda e: e.timestamp)
        unique = [events[0]]
        
        for event in events[1:]:
            last = unique[-1]
            
            # Same players within time window
            if (event.defender_id == last.defender_id and
                event.attacker_id == last.attacker_id and
                event.timestamp - last.timestamp < time_window):
                continue
            
            unique.append(event)
        
        return unique
    
    def analyze(self, video_path: str, clips: Optional[List[Dict]] = None,
               homography_matrix: Optional[str] = None,
               generate_annotated_video: bool = False) -> Dict[str, Any]:
        """
        Main analysis pipeline
        
        Args:
            video_path: Path to video file
            clips: Optional list of {start, end} time ranges in seconds
            homography_matrix: Optional comma-separated 3x3 matrix string
            generate_annotated_video: If True, generate MP4 with annotations
        
        Returns:
            Complete analysis results dictionary
        """
        start_time = time.time()
        video_path = Path(video_path)
        
        try:
            # Initialize
            if self.model is None:
                self.load_model()
            
            if self.roboflow_model is None:
                self.load_roboflow_model()

            # Initialize modules
            camera_estimator = CameraMovementEstimator(None) if CameraMovementEstimator else None
            view_transformer = ViewTransformer() if ViewTransformer else None
            team_assigner = TeamAssigner() if TeamAssigner else None
            player_assigner = PlayerBallAssigner() if PlayerBallAssigner else None
            
            # Setup homography
            if homography_matrix:
                from soccer_analysis_core import HomographyTransform
                self.homography = HomographyTransform.from_string(homography_matrix)
                if self.homography.enabled:
                    logger.info("Homography transform enabled")
                else:
                    logger.warning("Homography parsing failed, using pixel coordinates")
            elif self.roboflow_model:
                # Attempt auto-calibration on the first frame of the first clip
                try:
                    cap = cv2.VideoCapture(str(video_path))
                    if cap.isOpened():
                        ret, first_frame = cap.read()
                        cap.release()
                        
                        if ret:
                            logger.info("Running auto-calibration on first frame...")
                            detections, keypoints = self.roboflow_model.get_keypoints_detections(first_frame)
                            
                            if keypoints is not None:
                                from keypoint_detection.homography import HomographyTransformer
                                transformer = HomographyTransformer()
                                view_transformer = transformer.transform_to_pitch_keypoints(keypoints)
                                
                                if view_transformer:
                                    from soccer_analysis_core import HomographyTransform
                                    # Convert sports.ViewTransformer to our HomographyTransform
                                    # sports.ViewTransformer has .m attribute for homography matrix
                                    if hasattr(view_transformer, 'm'):
                                        self.homography = HomographyTransform(view_transformer.m)
                                        logger.info("Auto-calibration successful")
                                    else:
                                        logger.warning("Auto-calibration failed: ViewTransformer missing matrix")
                                else:
                                    logger.warning("Auto-calibration failed: Insufficient keypoints")
                    else:
                        logger.warning("Could not open video for auto-calibration")
                except Exception as e:
                    logger.error(f"Auto-calibration error: {e}")
            
            # Validate video
            metadata = self.validate_video(video_path)
            
            # Parse clips
            processing_ranges = self.parse_clips(clips, metadata.fps, metadata.total_frames)
            
            # Track players
            self._report_progress(0, 100, "Starting player tracking...")
            tracks = self.track_players(video_path, processing_ranges, metadata,
                                      camera_estimator, view_transformer, team_assigner)
            
            if not tracks:
                raise ProcessingError("No players detected in video")
            
            # Compute metrics
            self._report_progress(50, 100, "Computing metrics...")
            tracks = self.compute_metrics(tracks, metadata.fps)
            
            # Player stats
            stats = self.compute_player_stats(tracks, metadata.fps)
            
            # Detect events
            self._report_progress(80, 100, "Detecting events...")
            events = self.detect_pressing_events(tracks)

            # Assign ball possession
            if player_assigner:
                self._report_progress(82, 100, "Assigning ball possession...")
                # Index tracks by frame
                frames_data = defaultdict(dict) # frame -> {player_id: track_point}
                ball_data = {} # frame -> track_point
                
                for pid, track in tracks.items():
                    for point in track:
                        if point.team == "BALL":
                            ball_data[point.frame] = point
                        else:
                            frames_data[point.frame][pid] = point
                
                for frame, players in frames_data.items():
                    if frame in ball_data:
                        ball_point = ball_data[frame]
                        if ball_point.bbox:
                            # Construct players dict for assigner
                            players_dict = {}
                            for pid, p in players.items():
                                if p.bbox:
                                    players_dict[pid] = {'bbox': p.bbox}
                            
                            if players_dict:
                                assigned_id = player_assigner.assign_ball_to_player(players_dict, ball_point.bbox)
                                if assigned_id != -1:
                                    # Update track point
                                    frames_data[frame][assigned_id].has_ball = True
            
            # Detect passes
            passes = []
            network_metrics = {}
            
            if self.config.enable_pass_detection:
                self._report_progress(85, 100, "Detecting passes...")
                
                pass_detector = PassDetector(self.config)
                passes = pass_detector.detect_passes(tracks, metadata.fps)
                
                logger.info(f"Detected {len(passes)} passes")
                
                # Network analysis
                self._report_progress(90, 100, "Analyzing passing networks...")
                network_analyzer = PassingNetworkAnalyzer(self.config)
                network_metrics['A'] = network_analyzer.analyze_network(passes, 'A')
                network_metrics['B'] = network_analyzer.analyze_network(passes, 'B')
            
            # Advanced analysis (NEW)
            passing_predictions = []
            tactical_alerts = []
            
            try:
                from advanced_engines import PassingEngine, TacticalEngine
                
                self._report_progress(92, 100, "Computing passing predictions...")
                
                # Index tracks by frame
                frames_data = defaultdict(list)
                ball_track = []
                for pid, track in tracks.items():
                    for point in track:
                        if point.xm_smooth is not None:
                            if point.team == "BALL":
                                ball_track.append(point)
                            else:
                                frames_data[point.frame].append((pid, point))
                
                # Passing predictions
                passing_engine = PassingEngine(self.config)
                passing_predictions = passing_engine.predict_passes(frames_data, ball_track)
                logger.info(f"Generated {len(passing_predictions)} passing predictions")
                
                # Tactical alerts
                self._report_progress(94, 100, "Detecting tactical events...")
                tactical_engine = TacticalEngine(self.config)
                tactical_alerts = tactical_engine.detect_events(frames_data)
                logger.info(f"Detected {len(tactical_alerts)} tactical alerts")
                
            except ImportError as e:
                logger.warning(f"Advanced engines not available: {e}")
            
            # Video generation (NEW)
            annotated_video_path = None
            if generate_annotated_video:
                self._report_progress(96, 100, "Generating annotated video...")
                try:
                    annotated_video_path = self._generate_annotated_video(
                        video_path, tracks, metadata, processing_ranges
                    )
                    logger.info(f"Annotated video saved: {annotated_video_path}")
                except Exception as e:
                    logger.error(f"Video generation failed: {e}")
            
            # Flatten positions for compatibility
            positions = self._flatten_tracks(tracks)
            
            # Build output
            result = {
                'success': True,
                'metadata': {
                    'video_path': str(video_path),
                    'duration': round(metadata.duration_seconds, 2),
                    'fps': metadata.fps,
                    'resolution': f"{metadata.width}x{metadata.height}",
                    'processing_time': round(time.time() - start_time, 2),
                    'annotated_video': annotated_video_path
                },
                'stats': {str(k): asdict(v) for k, v in stats.items()},
                'tracks': {str(k): [asdict(p) for p in v] for k, v in tracks.items()},
                'events': [asdict(e) for e in events],
                'passes': [asdict(p) for p in passes],
                'network_metrics': {k: asdict(v) for k, v in network_metrics.items()},
                'passing_predictions': [asdict(p) for p in passing_predictions],  # NEW
                'tactical_alerts': [asdict(a) for a in tactical_alerts],  # NEW
                'positions': positions
            }
            
            self._report_progress(100, 100, "Analysis complete")
            logger.info(f"Analysis completed in {result['metadata']['processing_time']:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }
    
    
    def _generate_annotated_video(self, video_path: Path, tracks: Dict[int, List[TrackPoint]],
                                  metadata: VideoMetadata, processing_ranges: List[Tuple[int, int]]) -> str:
        """Generate annotated video with tracking overlays"""
        output_path = str(video_path.parent / f"{video_path.stem}_annotated.mp4")
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VideoError(f"Failed to open video for annotation: {video_path}")
        
        # Video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, metadata.fps, 
                             (metadata.width, metadata.height))
        
        try:
            # Index tracks by frame for fast lookup
            frames_data = defaultdict(list)
            for pid, track in tracks.items():
                for point in track:
                    frames_data[point.frame].append((pid, point))
            
            # Process frames
            for start_frame, end_frame in processing_ranges:
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
                frame_idx = start_frame
                
                while frame_idx < end_frame:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Draw annotations
                    if frame_idx in frames_data:
                        for pid, point in frames_data[frame_idx]:
                            # Skip ball for now
                            if point.team == "BALL":
                                # Draw ball as yellow circle
                                cv2.circle(frame, (int(point.x), int(point.y)), 8, (0, 255, 255), -1)
                                continue
                            
                            # Player marker
                            color = (0, 0, 255) if point.team == "A" else (255, 0, 0)  # Red=A, Blue=B
                            cv2.circle(frame, (int(point.x), int(point.y)), 10, color, 2)
                            
                            # Player ID
                            cv2.putText(frame, str(pid), (int(point.x) - 10, int(point.y) - 15),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                            
                            # Speed label
                            if point.velocity > 2.0:
                                speed_kmh = point.velocity * 3.6
                                cv2.putText(frame, f"{speed_kmh:.1f} km/h", 
                                          (int(point.x) - 20, int(point.y) + 25),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                            
                            # Sprint indicator
                            if point.is_sprinting:
                                cv2.circle(frame, (int(point.x), int(point.y)), 15, (0, 255, 0), 2)
                    
                    out.write(frame)
                    frame_idx += 1
        
        finally:
            cap.release()
            out.release()
        
        return output_path
    
    def _flatten_tracks(self, tracks: Dict[int, List[TrackPoint]]) -> List[Dict]:
        """Flatten tracks for backward compatibility"""
        positions = []
        for player_id, track in tracks.items():
            for point in track:
                positions.append({
                    'frame': point.frame,
                    'timestamp': point.timestamp,
                    'x': point.x,
                    'y': point.y,
                    'team': point.team,
                    'confidence': point.confidence,
                    'id': player_id,
                    'speed': point.velocity,
                    'sprinting': point.is_sprinting
                })
        return positions


# Export main class
__all__ = ['SoccerMatchAnalyzer', 'AnalysisConfig', 'HomographyTransform']
