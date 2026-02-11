// src/utils/SequencePredictor.ts
// Pattern learning and sequence prediction for analyst assistance

// ============================================================================
// TYPES
// ============================================================================

export interface EventPattern {
    sequence: string[]; // The sequence of events leading up to this pattern
    sequenceKey: string; // Stringified version for map key
    followers: Map<string, number>; // Next event -> occurrence count
    totalOccurrences: number;
}

export interface Prediction {
    eventName: string;
    probability: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    buttonLabel: string;
    description: string;
}

export interface SequencePredictorState {
    patterns: Map<string, EventPattern>;
    recentSequence: string[];
    windowSize: number;
    minOccurrences: number; // Minimum occurrences to make a prediction
    totalEventsProcessed: number;
}

export interface LearningStats {
    totalPatterns: number;
    totalEventsProcessed: number;
    averageFollowersPerPattern: number;
    topPatterns: Array<{
        sequence: string[];
        occurrences: number;
        topFollower: string;
        topFollowerProbability: number;
    }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WINDOW_SIZE = 3; // Look at last 3 events to predict next
const DEFAULT_MIN_OCCURRENCES = 2; // Need at least 2 occurrences to predict
const MAX_PREDICTIONS = 5;
const STORAGE_KEY = "tacta_sequence_patterns";

// Event name to button label mapping
const EVENT_BUTTON_MAP: Record<string, { label: string; description: string }> = {
    // Face buttons
    "pass_start": { label: "X", description: "Pass" },
    "shot_start": { label: "Y", description: "Shot" },
    "ui_confirm": { label: "A", description: "Confirm" },
    "ui_cancel": { label: "B", description: "Cancel" },

    // Shoulder buttons
    "turnover": { label: "LB", description: "Possession Lost" },
    "interception": { label: "RB", description: "Interception" },

    // Triggers
    "transition_def_start": { label: "LT", description: "Defensive Transition" },
    "transition_off_start": { label: "RT", description: "Offensive Transition" },

    // D-Pad
    "pressing_trigger": { label: "D-Up", description: "Pressing Trigger" },
    "phase_lowblock": { label: "D-Down", description: "Low Block" },
    "switch_of_play": { label: "D-Left", description: "Switch of Play" },
    "final_third_entry": { label: "D-Right", description: "Final Third Entry" },

    // Special
    "foul": { label: "View", description: "Foul" },
    "dangerous_attack": { label: "R3", description: "Dangerous Attack" },
    "press_trap": { label: "L3", description: "Pressing Trap" },

    // Combos
    "cross_start": { label: "RT+B", description: "Cross" },
    "duel_ground": { label: "RT+X", description: "Ground Duel" },
    "clearance": { label: "RT+RB", description: "Clearance" },
    "big_chance": { label: "RT+R3", description: "Big Chance" },
    "free_kick": { label: "RT+View", description: "Free Kick" },
    "penalty": { label: "LT+View", description: "Penalty" },
    "card_yellow": { label: "View+Y", description: "Yellow Card" },
    "card_red": { label: "View+B", description: "Red Card" },
    "offside": { label: "View+A", description: "Offside" },
    "dribble_attempt": { label: "RB+X", description: "Dribble Attempt" },
    "counter_attack": { label: "RB+Y", description: "Counter Attack" },

    // Keyboard events
    "goal": { label: "Shift+2", description: "Goal" },
    "assist": { label: "Ctrl+1", description: "Assist" },
    "key_pass": { label: "Shift+1", description: "Key Pass" },
};

// ============================================================================
// FACTORY & PERSISTENCE
// ============================================================================

export function createSequencePredictor(
    windowSize: number = DEFAULT_WINDOW_SIZE,
    minOccurrences: number = DEFAULT_MIN_OCCURRENCES
): SequencePredictorState {
    // Try to load from localStorage
    const stored = loadPatternsFromStorage();
    if (stored) {
        return {
            ...stored,
            windowSize,
            minOccurrences,
        };
    }

    return {
        patterns: new Map(),
        recentSequence: [],
        windowSize,
        minOccurrences,
        totalEventsProcessed: 0,
    };
}

export function loadPatternsFromStorage(): SequencePredictorState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // Reconstruct Maps from serialized data
        const patterns = new Map<string, EventPattern>();
        for (const [key, value] of Object.entries(parsed.patterns)) {
            const patternData = value as any;
            patterns.set(key, {
                ...patternData,
                followers: new Map(Object.entries(patternData.followers)),
            });
        }

        return {
            patterns,
            recentSequence: parsed.recentSequence || [],
            windowSize: parsed.windowSize || DEFAULT_WINDOW_SIZE,
            minOccurrences: parsed.minOccurrences || DEFAULT_MIN_OCCURRENCES,
            totalEventsProcessed: parsed.totalEventsProcessed || 0,
        };
    } catch (e) {
        console.warn("Failed to load sequence patterns:", e);
        return null;
    }
}

export function savePatternsToStorage(state: SequencePredictorState): void {
    try {
        // Convert Maps to serializable objects
        const patternsObj: Record<string, any> = {};
        for (const [key, pattern] of state.patterns.entries()) {
            patternsObj[key] = {
                ...pattern,
                followers: Object.fromEntries(pattern.followers),
            };
        }

        const toStore = {
            patterns: patternsObj,
            recentSequence: state.recentSequence,
            windowSize: state.windowSize,
            minOccurrences: state.minOccurrences,
            totalEventsProcessed: state.totalEventsProcessed,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
        console.warn("Failed to save sequence patterns:", e);
    }
}

// ============================================================================
// CORE OPERATIONS
// ============================================================================

export function recordEvent(
    state: SequencePredictorState,
    eventName: string
): SequencePredictorState {
    // Skip UI events that don't contribute to patterns
    if (eventName.startsWith("ui_")) {
        return state;
    }

    const newRecentSequence = [...state.recentSequence, eventName];

    // Keep only the window size
    while (newRecentSequence.length > state.windowSize) {
        newRecentSequence.shift();
    }

    // If we have enough history, learn this pattern
    let newPatterns = state.patterns;
    if (state.recentSequence.length >= 1) {
        newPatterns = learnPattern(state.patterns, state.recentSequence, eventName);
    }

    const newState = {
        ...state,
        patterns: newPatterns,
        recentSequence: newRecentSequence,
        totalEventsProcessed: state.totalEventsProcessed + 1,
    };

    // Auto-save periodically (every 10 events)
    if (newState.totalEventsProcessed % 10 === 0) {
        savePatternsToStorage(newState);
    }

    return newState;
}

function learnPattern(
    patterns: Map<string, EventPattern>,
    sequence: string[],
    nextEvent: string
): Map<string, EventPattern> {
    const newPatterns = new Map(patterns);

    // Learn patterns of different lengths (1 to sequence length)
    for (let len = 1; len <= sequence.length; len++) {
        const subSeq = sequence.slice(-len);
        const key = subSeq.join("→");

        const existing = newPatterns.get(key);

        if (existing) {
            // Update existing pattern
            const newFollowers = new Map(existing.followers);
            newFollowers.set(nextEvent, (newFollowers.get(nextEvent) || 0) + 1);

            newPatterns.set(key, {
                ...existing,
                followers: newFollowers,
                totalOccurrences: existing.totalOccurrences + 1,
            });
        } else {
            // Create new pattern
            const followers = new Map<string, number>();
            followers.set(nextEvent, 1);

            newPatterns.set(key, {
                sequence: subSeq,
                sequenceKey: key,
                followers,
                totalOccurrences: 1,
            });
        }
    }

    return newPatterns;
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export function getPredictions(
    state: SequencePredictorState
): Prediction[] {
    if (state.recentSequence.length === 0) {
        return [];
    }

    // Try to find matching patterns from longest to shortest
    const predictions: Map<string, { probability: number; occurrences: number }> = new Map();

    for (let len = Math.min(state.recentSequence.length, state.windowSize); len >= 1; len--) {
        const subSeq = state.recentSequence.slice(-len);
        const key = subSeq.join("→");
        const pattern = state.patterns.get(key);

        if (pattern && pattern.totalOccurrences >= state.minOccurrences) {
            // Calculate probabilities for followers
            for (const [follower, count] of pattern.followers.entries()) {
                const probability = count / pattern.totalOccurrences;

                // Weight by pattern length (longer patterns = more specific = higher weight)
                const weight = len / state.windowSize;
                const weightedProb = probability * (0.5 + 0.5 * weight);

                const existing = predictions.get(follower);
                if (!existing || existing.probability < weightedProb) {
                    predictions.set(follower, {
                        probability: weightedProb,
                        occurrences: pattern.totalOccurrences
                    });
                }
            }
        }
    }

    // Convert to prediction objects and sort by probability
    const results: Prediction[] = [];

    for (const [eventName, data] of predictions.entries()) {
        const buttonInfo = EVENT_BUTTON_MAP[eventName] || {
            label: "?",
            description: eventName.replace(/_/g, " ")
        };

        results.push({
            eventName,
            probability: data.probability,
            confidence: getConfidenceLevel(data.probability, data.occurrences),
            buttonLabel: buttonInfo.label,
            description: buttonInfo.description,
        });
    }

    // Sort by probability and take top predictions
    results.sort((a, b) => b.probability - a.probability);
    return results.slice(0, MAX_PREDICTIONS);
}

function getConfidenceLevel(
    probability: number,
    occurrences: number
): "HIGH" | "MEDIUM" | "LOW" {
    // High confidence: High probability AND many observations
    if (probability > 0.5 && occurrences >= 10) return "HIGH";
    if (probability > 0.3 && occurrences >= 5) return "MEDIUM";
    return "LOW";
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function getLearningStats(state: SequencePredictorState): LearningStats {
    const patterns = Array.from(state.patterns.values());

    if (patterns.length === 0) {
        return {
            totalPatterns: 0,
            totalEventsProcessed: state.totalEventsProcessed,
            averageFollowersPerPattern: 0,
            topPatterns: [],
        };
    }

    const totalFollowers = patterns.reduce((sum, p) => sum + p.followers.size, 0);

    // Get top 5 most frequent patterns
    const sortedPatterns = patterns
        .filter(p => p.totalOccurrences >= 3)
        .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
        .slice(0, 5);

    const topPatterns = sortedPatterns.map(p => {
        // Find top follower
        let topFollower = "";
        let topCount = 0;
        for (const [follower, count] of p.followers.entries()) {
            if (count > topCount) {
                topCount = count;
                topFollower = follower;
            }
        }

        return {
            sequence: p.sequence,
            occurrences: p.totalOccurrences,
            topFollower,
            topFollowerProbability: topCount / p.totalOccurrences,
        };
    });

    return {
        totalPatterns: patterns.length,
        totalEventsProcessed: state.totalEventsProcessed,
        averageFollowersPerPattern: totalFollowers / patterns.length,
        topPatterns,
    };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function resetPredictor(): SequencePredictorState {
    localStorage.removeItem(STORAGE_KEY);
    return createSequencePredictor();
}

export function getButtonLabelForEvent(eventName: string): string {
    return EVENT_BUTTON_MAP[eventName]?.label || "?";
}

export function getDescriptionForEvent(eventName: string): string {
    return EVENT_BUTTON_MAP[eventName]?.description || eventName.replace(/_/g, " ");
}

// Format probability as percentage string
export function formatProbability(probability: number): string {
    return `${Math.round(probability * 100)}%`;
}
