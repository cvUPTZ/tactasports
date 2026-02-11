#!/usr/bin/env python3
"""
Advanced Analysis Engines
Passing Prediction and Tactical Event Detection
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from dataclasses import dataclass

from soccer_analysis_core import TrackPoint, logger


@dataclass
class PassingPrediction:
    """Predicted pass from ball carrier to potential receiver"""
    frame: int
    timestamp: float
    ball_carrier_id: int
    receiver_id: int
    probability: float  # 0.0 to 1.0
    distance: float
    receiver_position: Tuple[float, float]


@dataclass
class TacticalAlert:
    """Real-time tactical event"""
    frame: int
    timestamp: float
    event_type: str  # 'counter_attack', 'high_press', 'defensive_line_break'
    team: str
    severity: str  # 'low', 'medium', 'high'
    description: str
    players_involved: List[int]


class PassingEngine:
    """Predicts likely pass targets based on player positions and movement"""
    
    def __init__(self, config):
        self.config = config
    
    def predict_passes(self, frames_data: Dict[int, List[Tuple[int, TrackPoint]]], 
                      ball_track: Optional[List[TrackPoint]] = None) -> List[PassingPrediction]:
        """
        Predict passing options for each frame
        
        Algorithm:
        1. Find ball carrier (closest player to ball)
        2. Identify teammates in passing range
        3. Calculate pass probability based on:
           - Distance (closer = higher)
           - Angle (forward passes preferred)
           - Receiver velocity (moving into space = higher)
           - Defensive pressure (fewer defenders nearby = higher)
        """
        predictions = []
        
        for frame, players in frames_data.items():
            if not ball_track:
                continue
            
            # Find ball position for this frame
            ball_pos = next((b for b in ball_track if b.frame == frame), None)
            if not ball_pos or ball_pos.xm_smooth is None:
                continue
            
            # Find ball carrier (closest player to ball)
            carrier_id, carrier = self._find_ball_carrier(players, ball_pos)
            if carrier_id is None:
                continue
            
            # Get teammates
            teammates = [(pid, p) for pid, p in players 
                        if p.team == carrier.team and pid != carrier_id]
            
            if not teammates:
                continue
            
            # Calculate pass probabilities
            for receiver_id, receiver in teammates:
                if receiver.xm_smooth is None:
                    continue
                
                prob = self._calculate_pass_probability(
                    carrier, receiver, players, ball_pos
                )
                
                if prob > 0.3:  # Only include likely passes
                    distance = np.sqrt(
                        (receiver.xm_smooth - ball_pos.xm_smooth)**2 +
                        (receiver.ym_smooth - ball_pos.ym_smooth)**2
                    )
                    
                    predictions.append(PassingPrediction(
                        frame=frame,
                        timestamp=ball_pos.timestamp,
                        ball_carrier_id=carrier_id,
                        receiver_id=receiver_id,
                        probability=round(prob, 3),
                        distance=round(distance, 2),
                        receiver_position=(receiver.xm_smooth, receiver.ym_smooth)
                    ))
        
        return predictions
    
    def _find_ball_carrier(self, players: List[Tuple[int, TrackPoint]], 
                          ball: TrackPoint) -> Tuple[Optional[int], Optional[TrackPoint]]:
        """Find player closest to ball"""
        min_dist = float('inf')
        carrier_id = None
        carrier = None
        
        for pid, p in players:
            if p.xm_smooth is None or p.team == "BALL":
                continue
            
            dist = np.sqrt(
                (p.xm_smooth - ball.xm_smooth)**2 +
                (p.ym_smooth - ball.ym_smooth)**2
            )
            
            if dist < min_dist and dist < 2.0:  # Within 2m
                min_dist = dist
                carrier_id = pid
                carrier = p
        
        return carrier_id, carrier
    
    def _calculate_pass_probability(self, carrier: TrackPoint, receiver: TrackPoint,
                                    all_players: List[Tuple[int, TrackPoint]],
                                    ball: TrackPoint) -> float:
        """Calculate probability of pass to receiver"""
        # Distance factor (optimal 5-20m)
        distance = np.sqrt(
            (receiver.xm_smooth - ball.xm_smooth)**2 +
            (receiver.ym_smooth - ball.ym_smooth)**2
        )
        
        if distance < 3 or distance > 40:
            return 0.0
        
        distance_score = 1.0 - min(abs(distance - 12) / 30, 1.0)
        
        # Forward pass bonus (attacking direction)
        forward_score = 1.0
        if receiver.xm_smooth > carrier.xm_smooth:
            forward_score = 1.3
        
        # Receiver movement score (moving into space)
        movement_score = min(receiver.velocity / 5.0, 1.0) if receiver.velocity > 0 else 0.5
        
        # Defensive pressure (count opponents near receiver)
        opponents = [p for pid, p in all_players 
                    if p.team != carrier.team and p.team != "BALL" and p.xm_smooth is not None]
        
        pressure_count = sum(1 for p in opponents if np.sqrt(
            (p.xm_smooth - receiver.xm_smooth)**2 +
            (p.ym_smooth - receiver.ym_smooth)**2
        ) < 5.0)
        
        pressure_score = max(0.3, 1.0 - (pressure_count * 0.2))
        
        # Combined probability
        probability = (distance_score * 0.4 + 
                      forward_score * 0.2 + 
                      movement_score * 0.2 + 
                      pressure_score * 0.2)
        
        return min(probability, 1.0)


class TacticalEngine:
    """Detects tactical events in real-time"""
    
    def __init__(self, config):
        self.config = config
        self.last_alerts = defaultdict(float)  # Debounce alerts
    
    def detect_events(self, frames_data: Dict[int, List[Tuple[int, TrackPoint]]]) -> List[TacticalAlert]:
        """Detect tactical events across frames"""
        alerts = []
        
        for frame, players in frames_data.items():
            # Separate teams
            team_a = [(pid, p) for pid, p in players if p.team == "A" and p.xm_smooth is not None]
            team_b = [(pid, p) for pid, p in players if p.team == "B" and p.xm_smooth is not None]
            
            if not team_a or not team_b:
                continue
            
            timestamp = players[0][1].timestamp if players else 0
            
            # Detect counter attacks
            alerts.extend(self._detect_counter_attack(frame, timestamp, team_a, team_b))
            alerts.extend(self._detect_counter_attack(frame, timestamp, team_b, team_a))
            
            # Detect high press
            alerts.extend(self._detect_high_press(frame, timestamp, team_a, team_b))
            alerts.extend(self._detect_high_press(frame, timestamp, team_b, team_a))
        
        return alerts
    
    def _detect_counter_attack(self, frame: int, timestamp: float,
                               attacking_team: List[Tuple[int, TrackPoint]],
                               defending_team: List[Tuple[int, TrackPoint]]) -> List[TacticalAlert]:
        """Detect counter attack: fast forward movement with numerical advantage"""
        alerts = []
        
        # Check if multiple attackers are sprinting forward
        sprinting_attackers = [(pid, p) for pid, p in attacking_team if p.is_sprinting]
        
        if len(sprinting_attackers) < 2:
            return alerts
        
        # Check if they're in attacking half
        avg_x = np.mean([p.xm_smooth for _, p in sprinting_attackers])
        if avg_x < 52.5:  # Not in attacking half
            return alerts
        
        # Count defenders in vicinity
        defenders_back = sum(1 for _, p in defending_team if p.xm_smooth > avg_x - 20)
        
        if len(sprinting_attackers) > defenders_back:
            # Debounce (don't alert within 3 seconds)
            alert_key = f"counter_{attacking_team[0][1].team}_{frame // 90}"
            if timestamp - self.last_alerts[alert_key] > 3.0:
                self.last_alerts[alert_key] = timestamp
                
                alerts.append(TacticalAlert(
                    frame=frame,
                    timestamp=timestamp,
                    event_type='counter_attack',
                    team=attacking_team[0][1].team,
                    severity='high',
                    description=f"Counter attack! {len(sprinting_attackers)} vs {defenders_back}",
                    players_involved=[pid for pid, _ in sprinting_attackers]
                ))
        
        return alerts
    
    def _detect_high_press(self, frame: int, timestamp: float,
                          pressing_team: List[Tuple[int, TrackPoint]],
                          pressed_team: List[Tuple[int, TrackPoint]]) -> List[TacticalAlert]:
        """Detect high press: multiple defenders in opponent's half"""
        alerts = []
        
        # Count pressers in opponent's defensive third
        pressers = [(pid, p) for pid, p in pressing_team 
                   if p.xm_smooth < 35 and p.velocity > 2.0]
        
        if len(pressers) >= 3:
            alert_key = f"press_{pressing_team[0][1].team}_{frame // 90}"
            if timestamp - self.last_alerts[alert_key] > 5.0:
                self.last_alerts[alert_key] = timestamp
                
                alerts.append(TacticalAlert(
                    frame=frame,
                    timestamp=timestamp,
                    event_type='high_press',
                    team=pressing_team[0][1].team,
                    severity='medium',
                    description=f"High press with {len(pressers)} players",
                    players_involved=[pid for pid, _ in pressers]
                ))
        
        return alerts
