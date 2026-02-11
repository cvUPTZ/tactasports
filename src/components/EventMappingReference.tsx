import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Gamepad2, Keyboard, ChevronDown, ChevronUp,
    Zap, Edit2, Save, RotateCcw, X, HelpCircle, Cpu, Eye
} from 'lucide-react';

// Event Definition Type - Enhanced with documentation
export interface EventMapping {
    category: string;
    eventName: string;
    description: string;
    live: { controller: string | null; keyboard: string | null };
    postMatch: { controller: string | null; keyboard: string | null };
    whenToTag?: string;
    commonErrors?: string;
    isAI?: boolean; // AI-calculated event
}

// ============================================================================
// COMPREHENSIVE EVENT DEFINITIONS FROM SOCCER TACTICAL EVENT TAGGING GUIDE
// ============================================================================

const DEFAULT_EVENTS: EventMapping[] = [
    // =========================================================================
    // PART 1: REAL-TIME (LIVE) EVENTS - Controller-Triggered
    // =========================================================================

    // 1.1 POSSESSION EVENTS
    {
        category: 'Possession',
        eventName: 'pass_start',
        description: 'Pass Attempt',
        live: { controller: 'A', keyboard: null },
        postMatch: { controller: 'A', keyboard: '1' },
        whenToTag: 'Exact moment player makes contact with ball to initiate pass',
        commonErrors: 'Tagging too early (before contact) or too late (ball already traveling)'
    },
    {
        category: 'Possession',
        eventName: 'shot_start',
        description: 'Shot Attempt',
        live: { controller: 'B', keyboard: null },
        postMatch: { controller: 'B', keyboard: '2' },
        whenToTag: 'Player strikes ball toward goal - tag on contact, don\'t wait for outcome'
    },
    {
        category: 'Possession',
        eventName: 'cross_start',
        description: 'Cross/Long Ball',
        live: { controller: 'B+RT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Player delivers ball into penalty area or launches long aerial pass'
    },
    {
        category: 'Possession',
        eventName: 'switch_of_play',
        description: 'Switch of Play',
        live: { controller: 'D-Left', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Long lateral pass changing point of attack (>30m typically)'
    },

    // 1.2 DRIBBLING & CARRIES
    {
        category: 'Dribbling',
        eventName: 'dribble_attempt',
        description: 'Dribble Attempt',
        live: { controller: 'X', keyboard: null },
        postMatch: { controller: 'X', keyboard: '3' },
        whenToTag: 'Player attempts to beat opponent 1v1 with ball at feet'
    },
    {
        category: 'Dribbling',
        eventName: 'carry_start',
        description: 'Ball Carry Start',
        live: { controller: 'X (Hold)', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Player begins advancing with ball over distance (>5m)'
    },

    // 1.3 DEFENSIVE ACTIONS
    {
        category: 'Defense',
        eventName: 'tackle',
        description: 'Tackle',
        live: { controller: 'X', keyboard: null },
        postMatch: { controller: null, keyboard: '4' },
        whenToTag: 'Defender attempts to win ball through physical challenge'
    },
    {
        category: 'Defense',
        eventName: 'interception',
        description: 'Interception',
        live: { controller: 'RB', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Defender reads and cuts out pass without direct duel'
    },
    {
        category: 'Defense',
        eventName: 'clearance',
        description: 'Clearance',
        live: { controller: 'RB+RT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Defender urgently kicks/heads ball away from danger'
    },
    {
        category: 'Defense',
        eventName: 'duel_aerial',
        description: 'Aerial Duel',
        live: { controller: 'Y+A', keyboard: null },
        postMatch: { controller: null, keyboard: '5' },
        whenToTag: 'Two players contest for ball in the air - tag at moment of jump'
    },
    {
        category: 'Defense',
        eventName: 'duel_ground',
        description: 'Ground Duel',
        live: { controller: 'X+RT', keyboard: null },
        postMatch: { controller: null, keyboard: '4' },
        whenToTag: '50-50 ball contest between two players'
    },
    {
        category: 'Defense',
        eventName: 'turnover',
        description: 'Loss of Possession',
        live: { controller: 'LB', keyboard: null },
        postMatch: { controller: 'LB', keyboard: null },
        whenToTag: 'Team loses control of the ball to opponent'
    },

    // 1.4 TACTICAL PHASE TRIGGERS
    {
        category: 'Phases',
        eventName: 'pressing_trigger',
        description: 'Pressing Trigger',
        live: { controller: 'D-Up', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Team initiates organized pressing sequence - multiple players moving toward ball',
        commonErrors: 'This is a tactical judgment call requiring experienced analyst'
    },
    {
        category: 'Phases',
        eventName: 'press_trap',
        description: 'Pressing Trap',
        live: { controller: 'L3', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Coordinated trap forcing opponent into pressure zone'
    },
    {
        category: 'Phases',
        eventName: 'phase_highpress',
        description: 'High Press Phase',
        live: { controller: 'D-Up (Hold)', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Team pushes entire defensive line high (above halfway)'
    },
    {
        category: 'Phases',
        eventName: 'final_third_entry',
        description: 'Final Third Entry',
        live: { controller: 'D-Right', keyboard: null },
        postMatch: { controller: null, keyboard: 'E' },
        whenToTag: 'Ball enters attacking third (roughly 35m from goal)'
    },

    // 1.5 TRANSITIONS
    {
        category: 'Transitions',
        eventName: 'transition_off_start',
        description: 'Offensive Transition',
        live: { controller: 'RT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Team wins ball and immediately attacks - within 2-3 seconds of regaining possession'
    },
    {
        category: 'Transitions',
        eventName: 'transition_def_start',
        description: 'Defensive Transition',
        live: { controller: 'LT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Team loses ball and shifts to defensive organization'
    },
    {
        category: 'Transitions',
        eventName: 'counter_attack',
        description: 'Counter Attack',
        live: { controller: 'Y', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Fast break with numbers up - ball won in own half, quick forward progression'
    },

    // 1.6 SET PIECES
    {
        category: 'Set Pieces',
        eventName: 'corner_start',
        description: 'Corner Kick',
        live: { controller: 'View', keyboard: 'Space' },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Corner awarded and taken'
    },
    {
        category: 'Set Pieces',
        eventName: 'free_kick',
        description: 'Free Kick',
        live: { controller: 'View+RT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Free kick in dangerous position (attacking third)'
    },
    {
        category: 'Set Pieces',
        eventName: 'penalty',
        description: 'Penalty',
        live: { controller: 'View+LB', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Penalty awarded - always tag, critical match event'
    },
    {
        category: 'Set Pieces',
        eventName: 'throw_in_tactical',
        description: 'Tactical Throw-In',
        live: { controller: 'View+RB', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Throw-in in final third or organized long-throw routine'
    },

    // 1.7 REFEREE EVENTS
    {
        category: 'Referee',
        eventName: 'foul',
        description: 'Foul Committed',
        live: { controller: 'View', keyboard: 'ArrowUp' },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Referee blows whistle for infringement'
    },
    {
        category: 'Referee',
        eventName: 'card_yellow',
        description: 'Yellow Card',
        live: { controller: 'View+Y', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Referee shows yellow card - always tag, impacts tactical decisions'
    },
    {
        category: 'Referee',
        eventName: 'card_red',
        description: 'Red Card',
        live: { controller: 'View+B', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Referee shows red card - game-changing event, always tag'
    },
    {
        category: 'Referee',
        eventName: 'offside',
        description: 'Offside',
        live: { controller: 'View+A', keyboard: 'ArrowDown' },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Linesman/referee flags offside - AI can verify with tracking data later'
    },
    {
        category: 'Referee',
        eventName: 'injury_stoppage',
        description: 'Injury/Stoppage',
        live: { controller: 'Menu', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Player down requiring medical attention'
    },

    // 1.8 DANGER MOMENTS
    {
        category: 'Danger',
        eventName: 'dangerous_attack',
        description: 'Dangerous Attack',
        live: { controller: 'R3', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Sustained pressure in final third - 3+ touches in box, 2+ shots, or clear chance'
    },
    {
        category: 'Danger',
        eventName: 'big_chance',
        description: 'Big Chance',
        live: { controller: 'R3+RT', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Clear 1v1 with keeper or open goal opportunity'
    },

    // 1.9 WORKFLOW EVENTS
    {
        category: 'Workflow',
        eventName: 'tag_start',
        description: 'Generic Tag Start',
        live: { controller: 'Menu', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Beginning of sequence analyst wants to mark for post-analysis'
    },
    {
        category: 'Workflow',
        eventName: 'analyst_note',
        description: 'Analyst Note',
        live: { controller: 'Menu+LB', keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Quick notation for detailed review - tactical change, injury concern, etc.'
    },

    // =========================================================================
    // PART 2: POST-MATCH EVENTS - Keyboard/AI-Assisted
    // =========================================================================

    // 2.1 REFINED POSSESSION ANALYSIS
    {
        category: 'Possession',
        eventName: 'pass_end',
        description: 'Pass Completion',
        live: { controller: null, keyboard: null },
        postMatch: { controller: 'A (2nd)', keyboard: '1' },
        whenToTag: 'Frame-by-frame to moment ball reaches receiver'
    },
    {
        category: 'Possession',
        eventName: 'pass_type',
        description: 'Pass Type',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Short (<10m), Medium (10-25m), Long (>25m), Through Ball, Switch, Cross, Cutback',
        isAI: true
    },
    {
        category: 'Possession',
        eventName: 'key_pass',
        description: 'Key Pass',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Shift+1' },
        whenToTag: 'Pass immediately preceding shot attempt'
    },
    {
        category: 'Possession',
        eventName: 'assist',
        description: 'Assist',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Ctrl+1' },
        whenToTag: 'Pass directly leading to goal - confirm goal scored first'
    },
    {
        category: 'Possession',
        eventName: 'pre_assist',
        description: 'Pre-Assist',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Alt+1' },
        whenToTag: 'Pass immediately before assist - identifies deeper playmaking'
    },
    {
        category: 'Possession',
        eventName: 'progressive_pass',
        description: 'Progressive Pass',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Pass moving ball significantly closer to goal (own half >30m, opp half >10m)',
        isAI: true
    },
    {
        category: 'Possession',
        eventName: 'line_breaking',
        description: 'Line-Breaking Pass',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Pass bypassing opponent defensive line',
        isAI: true
    },

    // 2.2 SHOT ANALYSIS
    {
        category: 'Shots',
        eventName: 'shot_outcome',
        description: 'Shot Outcome',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: '2' },
        whenToTag: 'On Target, Off Target, Blocked, Woodwork'
    },
    {
        category: 'Shots',
        eventName: 'goal',
        description: 'Goal Scored',
        live: { controller: null, keyboard: null },
        postMatch: { controller: 'RB', keyboard: 'Shift+2' },
        whenToTag: 'Ball fully crosses goal line'
    },
    {
        category: 'Shots',
        eventName: 'xg_value',
        description: 'Expected Goals (xG)',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Algorithm considers distance, angle, body part, assist type, pressure',
        isAI: true
    },
    {
        category: 'Shots',
        eventName: 'psxg_value',
        description: 'Post-Shot xG',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'xG adjusted for shot placement quality - velocity, placement, GK position',
        isAI: true
    },
    {
        category: 'Shots',
        eventName: 'xt_value',
        description: 'Expected Threat (xT)',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Value added by moving ball between zones - probability increase of scoring',
        isAI: true
    },

    // 2.3 DRIBBLING SUCCESS/FAILURE
    {
        category: 'Dribbling',
        eventName: 'dribble_success',
        description: 'Dribble Success',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: '3' },
        whenToTag: 'Player successfully beats opponent 1v1 - maintains possession, advances beyond defender'
    },
    {
        category: 'Dribbling',
        eventName: 'dribble_fail',
        description: 'Dribble Failure',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Shift+3' },
        whenToTag: 'Opponent wins ball or forces backward pass'
    },
    {
        category: 'Dribbling',
        eventName: 'progressive_carry',
        description: 'Progressive Carry',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Player carries ball significantly forward (>5m toward goal)',
        isAI: true
    },

    // 2.4 DEFENSIVE METRICS
    {
        category: 'Defense',
        eventName: 'ppda',
        description: 'PPDA',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Passes Allowed Per Defensive Action - measures pressing intensity',
        isAI: true
    },
    {
        category: 'Defense',
        eventName: 'defensive_line_height',
        description: 'Defensive Line Height',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Average Y-coordinate of back 4/5 - distance from own goal in meters',
        isAI: true
    },
    {
        category: 'Defense',
        eventName: 'compactness',
        description: 'Team Compactness',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Average distance between all players - vertical and horizontal',
        isAI: true
    },
    {
        category: 'Defense',
        eventName: 'pressing_success',
        description: 'Pressing Success',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'P' },
        whenToTag: 'Pressing sequence resulting in ball recovery within 7s and 40m'
    },
    {
        category: 'Defense',
        eventName: 'pressing_fail',
        description: 'Pressing Failure',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Shift+P' },
        whenToTag: 'Pressing attempt allowing opponent to progress'
    },
    {
        category: 'Defense',
        eventName: 'counter_press_success',
        description: 'Counter-Press Success',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Ball won within 5 seconds and 20m of losing possession',
        isAI: true
    },

    // 2.5 TACTICAL PHASES (DETAILED)
    {
        category: 'Phases',
        eventName: 'phase_buildup_end',
        description: 'Build-Up Phase End',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Q' },
        whenToTag: 'End of possession sequence from GK/back line - ball enters middle third or lost'
    },
    {
        category: 'Phases',
        eventName: 'phase_consolidation',
        description: 'Consolidation Phase',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'W' },
        whenToTag: 'Team recycles possession without progression - 5+ passes in middle third'
    },
    {
        category: 'Phases',
        eventName: 'phase_progression',
        description: 'Progression Phase',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Active movement of ball toward final third - 3+ progressive actions',
        isAI: true
    },
    {
        category: 'Phases',
        eventName: 'phase_midblock',
        description: 'Mid Block',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'M' },
        whenToTag: 'Defensive line at ~40m from own goal, compacting central areas'
    },
    {
        category: 'Phases',
        eventName: 'phase_lowblock',
        description: 'Low Block',
        live: { controller: 'D-Down', keyboard: null },
        postMatch: { controller: null, keyboard: 'L' },
        whenToTag: 'Defensive line at <30m from own goal, players behind ball'
    },

    // 2.6 TRANSITION METRICS
    {
        category: 'Transitions',
        eventName: 'transition_speed',
        description: 'Transition Speed',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Time from winning ball to shot/final third - Fast <5s, Medium 5-10s, Slow >10s',
        isAI: true
    },
    {
        category: 'Transitions',
        eventName: 'transition_success_rate',
        description: 'Transition Success Rate',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: '(Successful transitions / Total transitions) × 100',
        isAI: true
    },

    // 2.7 SET PIECE ANALYSIS
    {
        category: 'Set Pieces',
        eventName: 'corner_type',
        description: 'Corner Type',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Short, Inswinger, Outswinger, Driven Low, Floated'
    },
    {
        category: 'Set Pieces',
        eventName: 'free_kick_type',
        description: 'Free Kick Type',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Direct Shot, Cross, Short, Lay-off'
    },
    {
        category: 'Set Pieces',
        eventName: 'set_piece_routine',
        description: 'Set Piece Routine',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Catalog team\'s set piece variations - movements, decoys, targets'
    },

    // 2.8 PLAYER TRACKING METRICS
    {
        category: 'Tracking',
        eventName: 'player_xy',
        description: 'Player XY Coords',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'X,Y coordinates per player per frame (25-30 FPS)',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'ball_xy',
        description: 'Ball XY Coords',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'X,Y coordinates of ball per frame with speed',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'player_speed',
        description: 'Player Speed',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Instantaneous, average, maximum, and speed zones',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'sprint_count',
        description: 'Sprint Count',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Movement >25 km/h for >1 second',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'distance_covered',
        description: 'Distance Covered',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Total, by speed zone, with/without ball, attacking/defending',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'heatmap',
        description: 'Heatmap',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Visual positioning representation - individual, team, phase-specific',
        isAI: true
    },
    {
        category: 'Tracking',
        eventName: 'formation_detection',
        description: 'Formation Detection',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Clustering player positions - can detect changes during match',
        isAI: true
    },

    // 2.9 OFF-BALL MOVEMENT
    {
        category: 'Off-Ball',
        eventName: 'off_ball_run',
        description: 'Off-Ball Run',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'O' },
        whenToTag: 'In Behind, Checking, Lateral, or Diagonal run creating space'
    },
    {
        category: 'Off-Ball',
        eventName: 'overlap',
        description: 'Overlap',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Shift+O' },
        whenToTag: 'Wide player runs outside teammate with ball - creates 2v1'
    },
    {
        category: 'Off-Ball',
        eventName: 'underlap',
        description: 'Underlap',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Alt+O' },
        whenToTag: 'Player runs inside teammate with ball - creates central overload'
    },
    {
        category: 'Off-Ball',
        eventName: 'third_man_run',
        description: 'Third Man Run',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'T' },
        whenToTag: 'Player makes run as 3rd man after 1-2 pass (A→B, C runs beyond)'
    },

    // 2.10 SPACE CREATION
    {
        category: 'Off-Ball',
        eventName: 'half_space_occupation',
        description: 'Half-Space Occupation',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Time spent in corridors between center and wing',
        isAI: true
    },
    {
        category: 'Off-Ball',
        eventName: 'dummy_run',
        description: 'Dummy Run',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'D' },
        whenToTag: 'Run designed to pull defender, not receive ball - creates space for teammate'
    },

    // 2.11 QUALITY CONTROL & VALIDATION
    {
        category: 'Workflow',
        eventName: 'ai_suggestion',
        description: 'AI Suggestion',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'AI proposes event during automated analysis - flagged for human verification',
        isAI: true
    },
    {
        category: 'Workflow',
        eventName: 'ai_accept',
        description: 'AI Accept',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Enter' },
        whenToTag: 'Analyst confirms AI correctly identified event'
    },
    {
        category: 'Workflow',
        eventName: 'ai_reject',
        description: 'AI Reject',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'Backspace' },
        whenToTag: 'Analyst corrects false positive - optionally recode correct event'
    },
    {
        category: 'Workflow',
        eventName: 'timestamp_fix',
        description: 'Timestamp Correction',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'F' },
        whenToTag: 'Navigate frame-by-frame to correct real-time tag timing'
    },

    // 2.12 OUTCOME & PERFORMANCE
    {
        category: 'Performance',
        eventName: 'chance_created',
        description: 'Chance Created',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'C' },
        whenToTag: 'Action directly leading to shot - key pass, cross to header, creating shot'
    },
    {
        category: 'Performance',
        eventName: 'overload_created',
        description: 'Overload Created',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Creating numerical advantage in zone (2v1, 3v2)'
    },
    {
        category: 'Performance',
        eventName: 'dangerous_recovery',
        description: 'Dangerous Recovery',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Ball won in position leading to immediate danger'
    },

    // 2.13 SPECIALIZED TACTICAL
    {
        category: 'Tactical',
        eventName: 'pressing_resistance',
        description: 'Pressing Resistance',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: 'R' },
        whenToTag: 'Successfully playing through opponent\'s press - facing 3+ pressers, maintaining possession'
    },
    {
        category: 'Tactical',
        eventName: 'rest_defense',
        description: 'Rest Defense',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Players not involved in attack maintaining defensive shape'
    },
    {
        category: 'Tactical',
        eventName: 'positional_rotation',
        description: 'Positional Rotation',
        live: { controller: null, keyboard: null },
        postMatch: { controller: null, keyboard: null },
        whenToTag: 'Two players switching positions during play - creates confusion'
    },
];

const STORAGE_KEY = 'tacta_custom_mappings_v2';
const CATEGORIES = [
    'All',
    'Possession',
    'Shots',
    'Dribbling',
    'Defense',
    'Phases',
    'Transitions',
    'Set Pieces',
    'Referee',
    'Danger',
    'Workflow',
    'Off-Ball',
    'Tracking',
    'Performance',
    'Tactical'
];

// Helper to load custom mappings from localStorage
export const loadCustomMappings = (): EventMapping[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load custom mappings:', e);
    }
    return DEFAULT_EVENTS;
};

// Helper to save custom mappings to localStorage
const saveCustomMappings = (mappings: EventMapping[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch (e) {
        console.error('Failed to save custom mappings:', e);
    }
};

interface EventMappingReferenceProps {
    mode?: 'LIVE' | 'POST_MATCH' | 'ALL';
    compact?: boolean;
}

export const EventMappingReference: React.FC<EventMappingReferenceProps> = ({
    mode = 'ALL',
    compact = false
}) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isExpanded, setIsExpanded] = useState(!compact);
    const [isEditing, setIsEditing] = useState(false);
    const [events, setEvents] = useState<EventMapping[]>(DEFAULT_EVENTS);
    const [editedEvents, setEditedEvents] = useState<EventMapping[]>([]);
    const [showAI, setShowAI] = useState(true);

    // Load custom mappings on mount
    useEffect(() => {
        const loaded = loadCustomMappings();
        setEvents(loaded);
        setEditedEvents(JSON.parse(JSON.stringify(loaded)));
    }, []);

    const filteredEvents = events.filter(e => {
        if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
        if (!showAI && e.isAI) return false;
        if (mode === 'LIVE') {
            return e.live.controller || e.live.keyboard;
        }
        if (mode === 'POST_MATCH') {
            return e.postMatch.controller || e.postMatch.keyboard || e.isAI;
        }
        return true;
    });

    const handleStartEdit = () => {
        setEditedEvents(JSON.parse(JSON.stringify(events)));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedEvents([]);
    };

    const handleSave = () => {
        setEvents(editedEvents);
        saveCustomMappings(editedEvents);
        setIsEditing(false);
    };

    const handleReset = () => {
        setEvents(DEFAULT_EVENTS);
        setEditedEvents(DEFAULT_EVENTS);
        saveCustomMappings(DEFAULT_EVENTS);
        setIsEditing(false);
    };

    const updateMapping = (eventName: string, mode: 'live' | 'postMatch', field: 'controller' | 'keyboard', value: string) => {
        setEditedEvents(prev => prev.map(e => {
            if (e.eventName === eventName) {
                return {
                    ...e,
                    [mode]: {
                        ...e[mode],
                        [field]: value || null
                    }
                };
            }
            return e;
        }));
    };

    const renderMapping = (controller: string | null, keyboard: string | null, isAI?: boolean) => (
        <div className="flex items-center gap-1 flex-wrap">
            {isAI && (
                <Badge variant="outline" className="gap-1 text-[10px] bg-purple-500/10 border-purple-500/30">
                    <Cpu className="w-2.5 h-2.5" />
                    AI
                </Badge>
            )}
            {controller && (
                <Badge variant="outline" className="gap-1 text-[10px] bg-blue-500/10 border-blue-500/30">
                    <Gamepad2 className="w-2.5 h-2.5" />
                    {controller}
                </Badge>
            )}
            {keyboard && (
                <Badge variant="outline" className="gap-1 text-[10px] bg-green-500/10 border-green-500/30">
                    <Keyboard className="w-2.5 h-2.5" />
                    {keyboard}
                </Badge>
            )}
            {!controller && !keyboard && !isAI && (
                <span className="text-[10px] text-muted-foreground">—</span>
            )}
        </div>
    );

    const renderEditableMapping = (event: EventMapping, modeKey: 'live' | 'postMatch') => {
        const editEvent = editedEvents.find(e => e.eventName === event.eventName);
        if (!editEvent) return null;

        return (
            <div className="flex gap-1">
                <Input
                    placeholder="Btn"
                    value={editEvent[modeKey].controller || ''}
                    onChange={(e) => updateMapping(event.eventName, modeKey, 'controller', e.target.value)}
                    className="h-6 w-16 text-[10px] px-1"
                />
                <Input
                    placeholder="Key"
                    value={editEvent[modeKey].keyboard || ''}
                    onChange={(e) => updateMapping(event.eventName, modeKey, 'keyboard', e.target.value)}
                    className="h-6 w-16 text-[10px] px-1"
                />
            </div>
        );
    };

    if (compact && !isExpanded) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full gap-2"
            >
                <ChevronDown className="w-4 h-4" />
                Show Event Mappings
            </Button>
        );
    }

    return (
        <TooltipProvider>
            <Card className="bg-zinc-950/80 border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Event Mapping Reference
                        <Badge variant="secondary" className="text-[10px]">
                            {filteredEvents.length} events
                        </Badge>
                    </h3>
                    <div className="flex items-center gap-1">
                        <Button
                            variant={showAI ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowAI(!showAI)}
                            className="h-7 text-xs gap-1"
                            title="Toggle AI-calculated events"
                        >
                            <Cpu className="w-3 h-3" />
                            AI
                        </Button>
                        {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={handleStartEdit} className="h-7 text-xs gap-1">
                                <Edit2 className="w-3 h-3" />
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button variant="default" size="sm" onClick={handleSave} className="h-7 text-xs gap-1">
                                    <Save className="w-3 h-3" />
                                    Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
                                    <RotateCcw className="w-3 h-3" />
                                    Reset
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-7 text-xs">
                                    <X className="w-3 h-3" />
                                </Button>
                            </>
                        )}
                        {compact && (
                            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                                <ChevronUp className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-1 mb-4">
                    {CATEGORIES.map(cat => (
                        <Badge
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            className="cursor-pointer text-[10px]"
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </Badge>
                    ))}
                </div>

                {/* Event Table */}
                <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-1 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                        <div className="col-span-3">Event</div>
                        <div className="col-span-3">Live Mode</div>
                        <div className="col-span-4">Post-Match</div>
                        <div className="col-span-2 text-right">Help</div>
                    </div>
                    {(isEditing ? editedEvents : filteredEvents).filter(e => {
                        if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
                        if (!showAI && e.isAI && !isEditing) return false;
                        return true;
                    }).map((event, idx) => (
                        <div
                            key={`${event.eventName}-${idx}`}
                            className="grid grid-cols-12 gap-2 py-1.5 border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                            <div className="col-span-3">
                                <div className="text-xs font-medium truncate flex items-center gap-1">
                                    {event.description}
                                    {event.isAI && (
                                        <Cpu className="w-3 h-3 text-purple-400" />
                                    )}
                                </div>
                                <div className="text-[9px] text-muted-foreground truncate">{event.eventName}</div>
                            </div>
                            <div className="col-span-3">
                                {isEditing
                                    ? renderEditableMapping(event, 'live')
                                    : renderMapping(event.live.controller, event.live.keyboard)
                                }
                            </div>
                            <div className="col-span-4">
                                {isEditing
                                    ? renderEditableMapping(event, 'postMatch')
                                    : renderMapping(event.postMatch.controller, event.postMatch.keyboard, event.isAI)
                                }
                            </div>
                            <div className="col-span-2 flex justify-end">
                                {event.whenToTag && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-xs">
                                            <p className="text-xs font-semibold mb-1">When to Tag:</p>
                                            <p className="text-xs text-muted-foreground">{event.whenToTag}</p>
                                            {event.commonErrors && (
                                                <>
                                                    <p className="text-xs font-semibold mt-2 text-yellow-400">⚠ Common Errors:</p>
                                                    <p className="text-xs text-muted-foreground">{event.commonErrors}</p>
                                                </>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3 text-blue-400" />
                        <span>Controller</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Keyboard className="w-3 h-3 text-green-400" />
                        <span>Keyboard</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-purple-400" />
                        <span>AI-Calculated</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        <span>Hover for guidance</span>
                    </div>
                    {isEditing && (
                        <span className="ml-auto text-yellow-400">⚠ Editing Mode</span>
                    )}
                </div>
            </Card>
        </TooltipProvider>
    );
};
