export interface PlayerPosition {
    id: number;
    name: string;
    number: number;
    position: "GK" | "DEF" | "MID" | "FWD";
    team: "TEAM_A" | "TEAM_B";
    x?: number; // 0-105 (0=Left Goal, 105=Right Goal)
    y?: number; // 0-68 (0=Top, 68=Bottom)
    score?: number;
}

/**
 * Classify player position based on jersey number
 * Updated to catch common defender numbers like 15, 2, 3, 4, 5, 20-25
 */
export const classifyPosition = (playerNumber: number): PlayerPosition["position"] => {
    if (playerNumber === 1) return "GK";
    // Expanded DEF range to catch common fullbacks/centerbacks
    if ((playerNumber >= 2 && playerNumber <= 5) || playerNumber === 15 || (playerNumber >= 20 && playerNumber <= 25)) return "DEF";
    if (playerNumber >= 6 && playerNumber <= 8) return "MID";
    if (playerNumber >= 9 && playerNumber <= 11) return "FWD";
    return "MID"; // Default
};

// Default 4-3-3 Formation Coordinates (x, y) - Standard 105x68m
// Team A attacks Left -> Right (0 -> 105)
const DEFAULT_FORMATION_A: Record<number, { x: number, y: number }> = {
    1: { x: 5.25, y: 34 },   // GK (5% of 105, 50% of 68)
    2: { x: 26.25, y: 57.8 }, // RB (25% of 105, 85% of 68)
    3: { x: 26.25, y: 10.2 }, // LB
    4: { x: 21, y: 40.8 },    // CB
    5: { x: 21, y: 27.2 },    // CB
    6: { x: 47.25, y: 34 },   // CDM
    7: { x: 63, y: 54.4 },    // RM
    8: { x: 63, y: 13.6 },    // LM
    9: { x: 89.25, y: 34 },   // ST
    10: { x: 78.75, y: 20.4 }, // LF
    11: { x: 78.75, y: 47.6 }  // RF
};

// Team B attacks Right -> Left (105 -> 0)
const DEFAULT_FORMATION_B: Record<number, { x: number, y: number }> = {
    1: { x: 99.75, y: 34 },
    2: { x: 78.75, y: 10.2 },
    3: { x: 78.75, y: 57.8 },
    4: { x: 84, y: 27.2 },
    5: { x: 84, y: 40.8 },
    6: { x: 57.75, y: 34 },
    7: { x: 42, y: 13.6 },
    8: { x: 42, y: 54.4 },
    9: { x: 15.75, y: 34 },
    10: { x: 26.25, y: 47.6 },
    11: { x: 26.25, y: 20.4 }
};

const ensureCoordinates = (player: PlayerPosition): PlayerPosition => {
    if (player.x !== undefined && player.y !== undefined) return player;

    const defaults = player.team === "TEAM_A" ? DEFAULT_FORMATION_A : DEFAULT_FORMATION_B;
    // Map jersey number to 1-11 range for default positions
    const lookupId = ((player.number - 1) % 11) + 1;
    const coords = defaults[lookupId] || { x: 52.5, y: 34 };

    return { ...player, ...coords };
};

export const predictPassTargets = (
    currentPlayer: PlayerPosition,
    roster: PlayerPosition[],
    currentZone?: 1 | 2 | 3
): PlayerPosition[] => {
    const ballHolder = ensureCoordinates(currentPlayer);

    const candidates = roster
        .filter(p => p.id !== currentPlayer.id && p.team === currentPlayer.team)
        .map(p => ensureCoordinates(p));

    if (candidates.length === 0) return [];

    const scoredCandidates = candidates.map(p => {
        // 1. Distance
        const dist = Math.hypot(p.x! - ballHolder.x!, p.y! - ballHolder.y!);

        // 2. Forward Progress
        let forward = 0;
        if (ballHolder.team === "TEAM_A") {
            forward = p.x! - ballHolder.x!;
        } else {
            forward = ballHolder.x! - p.x!;
        }

        // 3. Lane Alignment
        const lane = -Math.abs(p.y! - ballHolder.y!);

        // Base Score - Adjusted weights for meter scale
        let score = (-dist * 0.5) + (forward * 1.5) + (lane * 0.4);

        // --- CRITICAL FIX FOR GK PASSING ---
        if (currentPlayer.position === 'GK') {
            // Instead of simple distance, check if player is in the "Defensive Zone"
            // Team A Defenders are roughly 0-40. Team B Defenders are roughly 60-100.

            let isBackLine = false;
            if (ballHolder.team === "TEAM_A" && p.x! < 45) isBackLine = true;
            if (ballHolder.team === "TEAM_B" && p.x! > 55) isBackLine = true;

            if (isBackLine) {
                // HUGE boost to ensure #2, #15, #5, #4 are ALWAYS at the top for GK
                score += 50;
            }
        }

        return { ...p, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => (b.score || 0) - (a.score || 0));

    // --- DYNAMIC LIMIT ---
    let limit = 5;

    switch (currentPlayer.position) {
        case "GK":
            limit = 20; // Show EVERYONE. Never hide options for GK.
            break;
        case "DEF":
            limit = 8;  // Defenders need wide options
            break;
        case "MID":
            limit = 6;
            break;
        case "FWD":
            limit = 5;
            break;
        default:
            limit = 5;
    }

    return scoredCandidates.slice(0, Math.min(limit, scoredCandidates.length));
};

/**
 * TACTA Standard 18-Zone Calculation
 * Pitch: 105x68m
 * Grid: 3 sections long (h), 6 sections wide (v)
 * Zones: 1-6 Attacking, 7-12 Middle, 13-18 Defensive
 */
export const calculateZone = (x: number, y: number): number => {
    // Horizontal (x): 3 sections (Thirds)
    let h: number;
    if (x >= 70) {
        h = 0; // Final Third
    } else if (x >= 35) {
        h = 1; // Middle Third
    } else {
        h = 2; // Defensive Third
    }

    // Vertical (y): 6 sections
    // 68 / 6 = 11.33m per slice
    let v: number;
    if (y < 11.33) v = 0;
    else if (y < 22.66) v = 1;
    else if (y < 34) v = 2;
    else if (y < 45.33) v = 3;
    else if (y < 56.66) v = 4;
    else v = 5;

    return (h * 6) + v + 1;
};

/**
 * Map y-coordinate to TACTA Corridor
 */
export const calculateCorridor = (y: number): 'LW' | 'LHS' | 'C' | 'RHS' | 'RW' => {
    // Five-Corridor System (approx 13.6m each? No, Central is Zone 14 width)
    // Based on doc: LW (~10m), LH, C, RH, RW (~10m)
    if (y > 58) return 'LW';       // Top (Left)
    if (y > 44) return 'LHS';
    if (y > 24) return 'C';
    if (y > 10) return 'RHS';
    return 'RW';                  // Bottom (Right)
};

export const convertToPlayerPosition = (
    roster: Array<{ id: number; name: string; number?: number }>,
    team: "TEAM_A" | "TEAM_B"
): PlayerPosition[] => {
    return roster.map(player => ({
        id: player.id,
        name: player.name,
        number: player.number || player.id,
        position: classifyPosition(player.number || player.id),
        team
    }));
};

export const createDefaultRoster = (team: "TEAM_A" | "TEAM_B"): PlayerPosition[] => {
    return Array.from({ length: 11 }, (_, i) => {
        const number = i + 1;
        return {
            id: number,
            name: `Player #${number}`,
            number,
            position: classifyPosition(number),
            team
        };
    });
};