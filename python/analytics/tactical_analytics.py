import numpy as np
from collections import defaultdict

class TacticalAnalytics:
    def __init__(self, fps=30):
        self.fps = fps
        self.player_histories = defaultdict(list) # id -> list of (frame, x, y)
        self.team_centroids = defaultdict(list) # frame -> (x, y)
        
    def update(self, frame_idx, tracks, field_coords):
        """
        Update analytics with new frame data.
        tracks: [x1, y1, x2, y2, id, score, cls]
        field_coords: [x, y] corresponding to tracks
        """
        if len(tracks) != len(field_coords):
            return
            
        current_positions = {}
        
        for i, track in enumerate(tracks):
            track_id = int(track[4])
            x, y = field_coords[i]
            
            # Store history
            self.player_histories[track_id].append((frame_idx, x, y))
            current_positions[track_id] = (x, y)
            
        # Calculate Team Centroid (assuming we know teams, here just all players)
        if len(field_coords) > 0:
            centroid = np.mean(field_coords, axis=0)
            self.team_centroids[frame_idx] = centroid
            
    def calculate_speed(self, track_id, window_frames=15):
        """
        Calculate current speed in m/s (or km/h)
        """
        history = self.player_histories[track_id]
        if len(history) < 2:
            return 0.0
            
        # Get recent history
        recent = history[-window_frames:]
        if len(recent) < 2:
            return 0.0
            
        # Calculate distance traveled
        start_pos = np.array(recent[0][1:])
        end_pos = np.array(recent[-1][1:])
        dist = np.linalg.norm(end_pos - start_pos)
        
        # Calculate time
        time_sec = (recent[-1][0] - recent[0][0]) / self.fps
        
        if time_sec == 0: return 0.0
        
        speed_mps = dist / time_sec
        speed_kmh = speed_mps * 3.6
        
        return speed_kmh
        
    def get_heatmap(self, track_id, grid_size=(105, 68)):
        """
        Generate 2D histogram for player position
        """
        history = self.player_histories[track_id]
        if not history:
            return np.zeros(grid_size)
            
        x_coords = [p[1] for p in history]
        y_coords = [p[2] for p in history]
        
        heatmap, _, _ = np.histogram2d(x_coords, y_coords, bins=grid_size, range=[[0, 105], [0, 68]])
        return heatmap
