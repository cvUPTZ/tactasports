// src/utils/PossessionChain.ts
// Possession chain management - tracks linked sequences of events within a possession

import { LoggedEvent } from "@/hooks/useGamepad";
import { MatchState, PitchZone, TeamId } from "./MatchStateMachine";

// ============================================================================
// TYPES
// ============================================================================

export type PossessionOutcome =
    | "SHOT"
    | "GOAL"
    | "LOSS"
    | "SET_PIECE"
    | "OUT_OF_PLAY"
    | "ONGOING";

export interface PossessionChain {
    id: number;
    team: TeamId;
    startTime: number;
    endTime?: number;
    events: LoggedEvent[];

    // Zone tracking
    startZone: PitchZone;
    endZone?: PitchZone;
    zonesVisited: Set<number>;

    // Calculated metrics
    passCount: number;
    progressivePassCount: number;
    enteredFinalThird: boolean;
    enteredBox: boolean;
    shotTaken: boolean;

    // Context flags
    fromTransition: boolean; // Started from offensive transition
    fromSetPiece: boolean;
    underPressure: boolean; // Started under high pressing

    // Outcome
    outcome: PossessionOutcome;

    // Analytics (calculated when chain ends)
    durationMs?: number;
    buildUpSpeed?: "FAST" | "MEDIUM" | "SLOW";
    verticality?: number; // 0-1, how direct was the progression
    xgContext?: number; // Bonus multiplier for xG based on context
}

export interface ChainStats {
    totalChains: number;
    avgDuration: number;
    avgPassesPerChain: number;

    // Outcome distribution
    shotsPerChain: number;
    goalsPerChain: number;
    lossRate: number;

    // Transition stats
    transitionChains: number;
    transitionToShotRate: number;
    transitionToGoalRate: number;

    // Progression stats
    finalThirdEntryRate: number;
    boxEntryRate: number;
    progressivePassRate: number;

    // Build-up profile
    fastBuildUps: number;
    slowBuildUps: number;
}

export interface PossessionManager {
    currentChain: PossessionChain | null;
    completedChains: PossessionChain[];
    chainIdCounter: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createPossessionManager(): PossessionManager {
    return {
        currentChain: null,
        completedChains: [],
        chainIdCounter: 1,
    };
}

export function createNewChain(
    team: TeamId,
    event: LoggedEvent,
    state: MatchState,
    manager: PossessionManager
): PossessionChain {
    const chainId = manager.chainIdCounter++;

    return {
        id: chainId,
        team,
        startTime: Date.now(),
        events: [event],

        startZone: { ...state.zone },
        zonesVisited: new Set([state.zone.zoneNumber]),

        passCount: event.eventName.includes("pass") ? 1 : 0,
        progressivePassCount: 0,
        enteredFinalThird: state.zone.third === "FINAL",
        enteredBox: state.zone.zoneNumber === 18,
        shotTaken: event.eventName === "shot_start",

        fromTransition: state.phase === "TRANSITION_OFF",
        fromSetPiece: state.phase === "SET_PIECE",
        underPressure: state.pressure === "HIGH",

        outcome: "ONGOING",
    };
}

// ============================================================================
// CHAIN OPERATIONS
// ============================================================================

export function startNewPossession(
    manager: PossessionManager,
    team: TeamId,
    event: LoggedEvent,
    state: MatchState
): PossessionManager {
    // End current chain if exists
    let updatedManager = manager;
    if (manager.currentChain) {
        updatedManager = endPossession(manager, "LOSS");
    }

    // Create new chain
    const newChain = createNewChain(team, event, state, updatedManager);

    return {
        ...updatedManager,
        currentChain: newChain,
    };
}

export function addEventToChain(
    manager: PossessionManager,
    event: LoggedEvent,
    state: MatchState
): PossessionManager {
    if (!manager.currentChain) {
        // No active chain - start one
        return startNewPossession(manager, event.team as TeamId, event, state);
    }

    const chain = manager.currentChain;

    // Check if event belongs to same team
    if (event.team !== chain.team) {
        // Possession changed - end current chain and start new one
        const endedManager = endPossession(manager, "LOSS");
        return startNewPossession(endedManager, event.team as TeamId, event, state);
    }

    // Add event to current chain
    const updatedChain: PossessionChain = {
        ...chain,
        events: [...chain.events, event],
        zonesVisited: new Set([...chain.zonesVisited, state.zone.zoneNumber]),
    };

    // Update metrics based on event type
    if (event.eventName.includes("pass")) {
        updatedChain.passCount++;

        // Check if progressive (moved ball toward goal)
        if (isProgressivePass(event, chain.startZone, state.zone)) {
            updatedChain.progressivePassCount++;
        }
    }

    if (state.zone.third === "FINAL" && !chain.enteredFinalThird) {
        updatedChain.enteredFinalThird = true;
    }

    if (state.zone.zoneNumber === 18 && !chain.enteredBox) {
        updatedChain.enteredBox = true;
    }

    if (event.eventName === "shot_start") {
        updatedChain.shotTaken = true;
    }

    // Update end zone
    updatedChain.endZone = { ...state.zone };

    return {
        ...manager,
        currentChain: updatedChain,
    };
}

export function endPossession(
    manager: PossessionManager,
    outcome: PossessionOutcome
): PossessionManager {
    if (!manager.currentChain) {
        return manager;
    }

    const chain = manager.currentChain;
    const endTime = Date.now();
    const durationMs = endTime - chain.startTime;

    // Calculate analytics
    const completedChain: PossessionChain = {
        ...chain,
        endTime,
        outcome,
        durationMs,
        buildUpSpeed: calculateBuildUpSpeed(durationMs, chain.passCount),
        verticality: calculateVerticality(chain),
        xgContext: calculateXGContext(chain),
    };

    return {
        ...manager,
        currentChain: null,
        completedChains: [...manager.completedChains, completedChain],
    };
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

function isProgressivePass(
    event: LoggedEvent,
    startZone: PitchZone,
    currentZone: PitchZone
): boolean {
    // Progressive if moved ball closer to goal
    const thirdOrder = { "DEFENSIVE": 0, "MIDDLE": 1, "FINAL": 2 };
    return thirdOrder[currentZone.third] > thirdOrder[startZone.third];
}

function calculateBuildUpSpeed(
    durationMs: number,
    passCount: number
): "FAST" | "MEDIUM" | "SLOW" {
    if (passCount === 0) return "FAST"; // Quick action

    const passesPerSecond = passCount / (durationMs / 1000);

    if (passesPerSecond > 1) return "FAST";
    if (passesPerSecond > 0.5) return "MEDIUM";
    return "SLOW";
}

function calculateVerticality(chain: PossessionChain): number {
    if (!chain.endZone) return 0;

    const thirdOrder = { "DEFENSIVE": 0, "MIDDLE": 1, "FINAL": 2 };
    const startThird = thirdOrder[chain.startZone.third];
    const endThird = thirdOrder[chain.endZone.third];

    // Verticality = how much progress toward goal relative to passes
    const progressMade = endThird - startThird;
    const maxProgress = 2 - startThird;

    if (maxProgress === 0) return 1; // Already in final third
    if (chain.passCount === 0) return progressMade > 0 ? 1 : 0;

    // Fewer passes to progress = more vertical
    const efficiency = progressMade / Math.max(1, chain.passCount / 3);
    return Math.min(1, Math.max(0, efficiency));
}

function calculateXGContext(chain: PossessionChain): number {
    let multiplier = 1.0;

    // Transition bonus: Higher xG for shots from transition
    if (chain.fromTransition) {
        multiplier *= 1.3;
    }

    // Fast build-up bonus
    if (chain.buildUpSpeed === "FAST") {
        multiplier *= 1.15;
    }

    // High verticality bonus
    if (chain.verticality && chain.verticality > 0.7) {
        multiplier *= 1.1;
    }

    // Under pressure penalty (team was pressing, may indicate counter)
    if (chain.underPressure && !chain.fromTransition) {
        multiplier *= 0.9;
    }

    return multiplier;
}

// ============================================================================
// STATISTICS
// ============================================================================

export function calculateChainStats(
    chains: PossessionChain[],
    team?: TeamId
): ChainStats {
    const filtered = team
        ? chains.filter(c => c.team === team)
        : chains;

    if (filtered.length === 0) {
        return {
            totalChains: 0,
            avgDuration: 0,
            avgPassesPerChain: 0,
            shotsPerChain: 0,
            goalsPerChain: 0,
            lossRate: 0,
            transitionChains: 0,
            transitionToShotRate: 0,
            transitionToGoalRate: 0,
            finalThirdEntryRate: 0,
            boxEntryRate: 0,
            progressivePassRate: 0,
            fastBuildUps: 0,
            slowBuildUps: 0,
        };
    }

    const totalChains = filtered.length;
    const totalDuration = filtered.reduce((sum, c) => sum + (c.durationMs || 0), 0);
    const totalPasses = filtered.reduce((sum, c) => sum + c.passCount, 0);
    const totalProgressivePasses = filtered.reduce((sum, c) => sum + c.progressivePassCount, 0);

    const shots = filtered.filter(c => c.shotTaken).length;
    const goals = filtered.filter(c => c.outcome === "GOAL").length;
    const losses = filtered.filter(c => c.outcome === "LOSS").length;

    const transitionChains = filtered.filter(c => c.fromTransition);
    const transitionShots = transitionChains.filter(c => c.shotTaken).length;
    const transitionGoals = transitionChains.filter(c => c.outcome === "GOAL").length;

    const finalThirdEntries = filtered.filter(c => c.enteredFinalThird).length;
    const boxEntries = filtered.filter(c => c.enteredBox).length;

    const fastBuildUps = filtered.filter(c => c.buildUpSpeed === "FAST").length;
    const slowBuildUps = filtered.filter(c => c.buildUpSpeed === "SLOW").length;

    return {
        totalChains,
        avgDuration: totalDuration / totalChains,
        avgPassesPerChain: totalPasses / totalChains,
        shotsPerChain: shots / totalChains,
        goalsPerChain: goals / totalChains,
        lossRate: losses / totalChains,
        transitionChains: transitionChains.length,
        transitionToShotRate: transitionChains.length > 0
            ? transitionShots / transitionChains.length
            : 0,
        transitionToGoalRate: transitionChains.length > 0
            ? transitionGoals / transitionChains.length
            : 0,
        finalThirdEntryRate: finalThirdEntries / totalChains,
        boxEntryRate: boxEntries / totalChains,
        progressivePassRate: totalPasses > 0
            ? totalProgressivePasses / totalPasses
            : 0,
        fastBuildUps,
        slowBuildUps,
    };
}

// ============================================================================
// SERIALIZATION
// ============================================================================

export function serializeManager(manager: PossessionManager): string {
    const serializable = {
        ...manager,
        currentChain: manager.currentChain
            ? {
                ...manager.currentChain,
                zonesVisited: Array.from(manager.currentChain.zonesVisited),
            }
            : null,
        completedChains: manager.completedChains.map(c => ({
            ...c,
            zonesVisited: Array.from(c.zonesVisited),
        })),
    };
    return JSON.stringify(serializable);
}

export function deserializeManager(json: string): PossessionManager {
    const parsed = JSON.parse(json);
    return {
        ...parsed,
        currentChain: parsed.currentChain
            ? {
                ...parsed.currentChain,
                zonesVisited: new Set(parsed.currentChain.zonesVisited),
            }
            : null,
        completedChains: parsed.completedChains.map((c: any) => ({
            ...c,
            zonesVisited: new Set(c.zonesVisited),
        })),
    };
}
