// src/utils/MatchStateMachine.ts
// Core state machine for tracking match state in real-time

import { LoggedEvent } from "@/hooks/useGamepad";

// ============================================================================
// TYPES
// ============================================================================

export type TeamId = "TEAM_A" | "TEAM_B";

export type MatchPhase =
    | "BUILD_UP"
    | "CONSOLIDATION"
    | "FINAL_THIRD"
    | "TRANSITION_OFF"
    | "TRANSITION_DEF"
    | "SET_PIECE"
    | "NEUTRAL";

export type PitchThird = "DEFENSIVE" | "MIDDLE" | "FINAL";
export type PitchLane = "LEFT" | "HALF_SPACE_LEFT" | "CENTER" | "HALF_SPACE_RIGHT" | "RIGHT";
export type PressureLevel = "HIGH" | "MEDIUM" | "LOW";
export type ThreatLevel = "HIGH" | "MEDIUM" | "LOW";

export interface PitchZone {
    third: PitchThird;
    lane: PitchLane;
    zoneNumber: number; // 1-18
}

export interface TransitionWindow {
    active: boolean;
    type: "OFFENSIVE" | "DEFENSIVE" | null;
    startTime: number | null;
    duration: number; // ms, default 5000
}

export interface PressingContext {
    active: boolean;
    triggerTime: number | null;
    location?: PitchZone;
    outcome?: "RECOVERY" | "LOSS" | "CLEAR" | null;
}

export interface MatchState {
    teamInPossession: TeamId | null;
    phase: MatchPhase;
    zone: PitchZone;
    pressure: PressureLevel;
    threatLevel: ThreatLevel;
    transitionWindow: TransitionWindow;
    pressingContext: PressingContext;

    // Metadata
    lastEventTime: number;
    lastEventName: string | null;
    stateVersion: number; // Increments on each change
}

export interface StateTransition {
    from: Partial<MatchState>;
    to: Partial<MatchState>;
    trigger: string;
    timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TRANSITION_WINDOW_DURATION = 5000; // 5 seconds
const PRESSING_CONTEXT_DURATION = 8000; // 8 seconds for pressing outcome tracking

// Zone number to zone mapping (1-18 grid)
const ZONE_MAP: Record<number, PitchZone> = {
    // Defensive third
    1: { third: "DEFENSIVE", lane: "LEFT", zoneNumber: 1 },
    2: { third: "DEFENSIVE", lane: "HALF_SPACE_LEFT", zoneNumber: 2 },
    3: { third: "DEFENSIVE", lane: "CENTER", zoneNumber: 3 },
    4: { third: "DEFENSIVE", lane: "HALF_SPACE_RIGHT", zoneNumber: 4 },
    5: { third: "DEFENSIVE", lane: "RIGHT", zoneNumber: 5 },
    6: { third: "DEFENSIVE", lane: "CENTER", zoneNumber: 6 }, // GK zone

    // Middle third
    7: { third: "MIDDLE", lane: "LEFT", zoneNumber: 7 },
    8: { third: "MIDDLE", lane: "HALF_SPACE_LEFT", zoneNumber: 8 },
    9: { third: "MIDDLE", lane: "CENTER", zoneNumber: 9 },
    10: { third: "MIDDLE", lane: "HALF_SPACE_RIGHT", zoneNumber: 10 },
    11: { third: "MIDDLE", lane: "RIGHT", zoneNumber: 11 },
    12: { third: "MIDDLE", lane: "CENTER", zoneNumber: 12 },

    // Final third
    13: { third: "FINAL", lane: "LEFT", zoneNumber: 13 },
    14: { third: "FINAL", lane: "HALF_SPACE_LEFT", zoneNumber: 14 },
    15: { third: "FINAL", lane: "CENTER", zoneNumber: 15 },
    16: { third: "FINAL", lane: "HALF_SPACE_RIGHT", zoneNumber: 16 },
    17: { third: "FINAL", lane: "RIGHT", zoneNumber: 17 },
    18: { third: "FINAL", lane: "CENTER", zoneNumber: 18 }, // Box
};

// Events that indicate possession gain
const POSSESSION_GAIN_EVENTS = [
    "interception",
    "goal_kick",
    "throw_in_tactical",
    "free_kick",
    "corner_start",
];

// Events that indicate possession loss
const POSSESSION_LOSS_EVENTS = [
    "turnover",
    "shot_start", // May lose possession
    "foul",
    "offside",
];

// Events that indicate high threat
const HIGH_THREAT_EVENTS = [
    "shot_start",
    "big_chance",
    "dangerous_attack",
    "penalty",
];

// ============================================================================
// STATE MACHINE
// ============================================================================

export function createInitialState(): MatchState {
    return {
        teamInPossession: null,
        phase: "NEUTRAL",
        zone: { third: "MIDDLE", lane: "CENTER", zoneNumber: 9 },
        pressure: "MEDIUM",
        threatLevel: "LOW",
        transitionWindow: {
            active: false,
            type: null,
            startTime: null,
            duration: TRANSITION_WINDOW_DURATION,
        },
        pressingContext: {
            active: false,
            triggerTime: null,
            outcome: null,
        },
        lastEventTime: Date.now(),
        lastEventName: null,
        stateVersion: 0,
    };
}

export function getZoneFromNumber(zoneNumber: number): PitchZone {
    return ZONE_MAP[zoneNumber] || ZONE_MAP[9]; // Default to center
}

export function processEvent(
    currentState: MatchState,
    event: LoggedEvent | { eventName: string; team: TeamId; zone?: number }
): { newState: MatchState; transition: StateTransition } {
    const now = Date.now();
    const eventName = event.eventName;
    const team = event.team as TeamId;

    // Clone current state
    const newState: MatchState = {
        ...currentState,
        transitionWindow: { ...currentState.transitionWindow },
        pressingContext: { ...currentState.pressingContext },
        zone: { ...currentState.zone },
    };

    // Track what's changing
    const previousState = { ...currentState };

    // -------------------------------------------------------------------------
    // 1. Check Transition Window Expiry
    // -------------------------------------------------------------------------
    if (newState.transitionWindow.active && newState.transitionWindow.startTime) {
        const elapsed = now - newState.transitionWindow.startTime;
        if (elapsed > newState.transitionWindow.duration) {
            newState.transitionWindow.active = false;
            newState.transitionWindow.type = null;
            newState.transitionWindow.startTime = null;

            // Transition window expired - revert to build-up if we're in transition phase
            if (newState.phase === "TRANSITION_OFF" || newState.phase === "TRANSITION_DEF") {
                newState.phase = newState.zone.third === "FINAL" ? "FINAL_THIRD" : "BUILD_UP";
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. Check Pressing Context Expiry
    // -------------------------------------------------------------------------
    if (newState.pressingContext.active && newState.pressingContext.triggerTime) {
        const elapsed = now - newState.pressingContext.triggerTime;
        if (elapsed > PRESSING_CONTEXT_DURATION) {
            newState.pressingContext.active = false;
            newState.pressingContext.outcome = null;
        }
    }

    // -------------------------------------------------------------------------
    // 3. Process Event-Specific State Changes
    // -------------------------------------------------------------------------

    // Update zone if provided
    if ('zone' in event && typeof event.zone === 'number' && event.zone > 0) {
        newState.zone = getZoneFromNumber(event.zone);
    }

    switch (eventName) {
        // ----- POSSESSION CHANGES -----
        case "interception":
            // RB: Possession gained
            if (newState.teamInPossession !== team) {
                newState.teamInPossession = team;
                newState.phase = "TRANSITION_OFF";
                newState.transitionWindow = {
                    active: true,
                    type: "OFFENSIVE",
                    startTime: now,
                    duration: TRANSITION_WINDOW_DURATION,
                };
                newState.threatLevel = "MEDIUM";

                // Complete pressing context if active
                if (newState.pressingContext.active) {
                    newState.pressingContext.outcome = "RECOVERY";
                }
            }
            break;

        case "turnover":
            // LB: Possession lost
            if (newState.teamInPossession === team) {
                // Switch possession to other team
                newState.teamInPossession = team === "TEAM_A" ? "TEAM_B" : "TEAM_A";
                newState.phase = "TRANSITION_DEF";
                newState.transitionWindow = {
                    active: true,
                    type: "DEFENSIVE",
                    startTime: now,
                    duration: TRANSITION_WINDOW_DURATION,
                };
                newState.threatLevel = "LOW";

                // Complete pressing context if active (other team won it)
                if (newState.pressingContext.active) {
                    newState.pressingContext.outcome = "LOSS";
                }
            }
            break;

        // ----- TRANSITION PHASES -----
        case "transition_off_start":
            // RT: Offensive transition
            newState.phase = "TRANSITION_OFF";
            newState.transitionWindow = {
                active: true,
                type: "OFFENSIVE",
                startTime: now,
                duration: TRANSITION_WINDOW_DURATION,
            };
            newState.pressure = "LOW"; // Defense is disorganized
            break;

        case "transition_def_start":
            // LT: Defensive transition
            newState.phase = "TRANSITION_DEF";
            newState.transitionWindow = {
                active: true,
                type: "DEFENSIVE",
                startTime: now,
                duration: TRANSITION_WINDOW_DURATION,
            };
            newState.pressure = "HIGH"; // Need immediate reaction
            break;

        // ----- ZONE CHANGES -----
        case "final_third_entry":
            // D-Right: Ball entered final third
            newState.zone.third = "FINAL";
            newState.phase = "FINAL_THIRD";
            newState.threatLevel = "MEDIUM";
            break;

        case "switch_of_play":
            // D-Left: Switch of play (lane change)
            // Toggle between left and right lanes
            if (newState.zone.lane === "LEFT" || newState.zone.lane === "HALF_SPACE_LEFT") {
                newState.zone.lane = "RIGHT";
            } else if (newState.zone.lane === "RIGHT" || newState.zone.lane === "HALF_SPACE_RIGHT") {
                newState.zone.lane = "LEFT";
            }
            break;

        // ----- PRESSING -----
        case "pressing_trigger":
            // D-Up: Pressing trigger activated
            newState.pressingContext = {
                active: true,
                triggerTime: now,
                location: { ...newState.zone },
                outcome: null,
            };
            newState.pressure = "HIGH";
            break;

        case "phase_highpress":
            // D-Up Hold: High press phase
            newState.pressure = "HIGH";
            newState.phase = "BUILD_UP"; // Opponent's build-up phase
            break;

        case "phase_lowblock":
            // D-Down: Low block phase
            newState.pressure = "LOW";
            newState.phase = "CONSOLIDATION";
            break;

        // ----- THREATS -----
        case "dangerous_attack":
            // R3: Dangerous attack tag
            newState.threatLevel = "HIGH";
            break;

        case "big_chance":
            // RT+R3: Big chance
            newState.threatLevel = "HIGH";
            break;

        case "shot_start":
            // Y: Shot taken
            newState.threatLevel = "HIGH";
            // Shot doesn't automatically end possession (could be saved, blocked)
            break;

        // ----- SET PIECES -----
        case "free_kick":
        case "penalty":
        case "corner_start":
            newState.phase = "SET_PIECE";
            newState.transitionWindow.active = false;
            newState.teamInPossession = team;
            if (eventName === "penalty") {
                newState.threatLevel = "HIGH";
            }
            break;

        case "foul":
            // Foul committed - possession switches, set piece context
            newState.phase = "SET_PIECE";
            newState.transitionWindow.active = false;
            newState.pressingContext.active = false;
            // Possession to the fouled team (opposite of current)
            if (newState.teamInPossession === team) {
                newState.teamInPossession = team === "TEAM_A" ? "TEAM_B" : "TEAM_A";
            }
            break;

        // ----- PHASE CHANGES -----
        case "phase_buildup_end":
            newState.phase = "BUILD_UP";
            break;

        case "phase_consolidation":
            newState.phase = "CONSOLIDATION";
            break;

        case "phase_final_third":
            newState.phase = "FINAL_THIRD";
            break;

        // ----- PASSES & CARRIES -----
        case "pass_start":
        case "pass_end":
            // Passes maintain current state but update team if needed
            if (!newState.teamInPossession) {
                newState.teamInPossession = team;
            }
            break;

        case "carry_start":
            // Ball carry - player is dribbling
            if (!newState.teamInPossession) {
                newState.teamInPossession = team;
            }
            break;

        case "clearance":
            // Clearance - likely ends immediate threat
            newState.threatLevel = "LOW";
            break;

        default:
            // Other events - just update metadata
            break;
    }

    // -------------------------------------------------------------------------
    // 4. Infer Pressure Level from Zone and Phase
    // -------------------------------------------------------------------------
    if (newState.phase !== "TRANSITION_OFF" && newState.phase !== "TRANSITION_DEF") {
        if (newState.zone.third === "FINAL") {
            newState.pressure = "HIGH";
        } else if (newState.zone.third === "DEFENSIVE") {
            newState.pressure = "MEDIUM";
        }
    }

    // -------------------------------------------------------------------------
    // 5. Update Metadata
    // -------------------------------------------------------------------------
    newState.lastEventTime = now;
    newState.lastEventName = eventName;
    newState.stateVersion += 1;

    // Create transition record
    const transition: StateTransition = {
        from: previousState,
        to: newState,
        trigger: eventName,
        timestamp: now,
    };

    return { newState, transition };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isInTransitionWindow(state: MatchState): boolean {
    if (!state.transitionWindow.active || !state.transitionWindow.startTime) {
        return false;
    }
    const elapsed = Date.now() - state.transitionWindow.startTime;
    return elapsed < state.transitionWindow.duration;
}

export function getTransitionTimeRemaining(state: MatchState): number {
    if (!state.transitionWindow.active || !state.transitionWindow.startTime) {
        return 0;
    }
    const elapsed = Date.now() - state.transitionWindow.startTime;
    const remaining = state.transitionWindow.duration - elapsed;
    return Math.max(0, remaining);
}

export function getStateLabel(state: MatchState): string {
    const team = state.teamInPossession || "N/A";
    const phase = state.phase.replace(/_/g, " ");
    const zone = `${state.zone.third} ${state.zone.lane}`.toLowerCase();
    const pressure = `${state.pressure} press`.toLowerCase();
    const threat = `${state.threatLevel} threat`.toLowerCase();

    return `${team} | ${phase} | ${zone} | ${pressure} | ${threat}`;
}

export function shouldApplyTransitionXGBoost(state: MatchState): boolean {
    return state.transitionWindow.active && state.transitionWindow.type === "OFFENSIVE";
}

export function getZoneNumber(third: PitchThird, lane: PitchLane): number {
    // Find matching zone
    for (const [num, zone] of Object.entries(ZONE_MAP)) {
        if (zone.third === third && zone.lane === lane) {
            return parseInt(num);
        }
    }
    return 9; // Default center
}
