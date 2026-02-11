import { LoggedEvent } from "@/hooks/useGamepad";
import { buildPassingNetwork, PassingNetwork } from "./passingNetwork";

// --- Types ---

export interface TacticalAnalysis {
    possession: {
        teamA: TeamPossessionStats;
        teamB: TeamPossessionStats;
        momentum: MomentumSegment[];
    };
    passing: {
        teamA: TeamPassingStats;
        teamB: TeamPassingStats;
    };
    passingNetworks: {
        teamA: PassingNetwork;
        teamB: PassingNetwork;
    };
    transitions: {
        teamA: TeamTransitionStats;
        teamB: TeamTransitionStats;
    };
    stability: {
        teamA: TeamStabilityStats;
        teamB: TeamStabilityStats;
    };
    tempo: {
        teamA: TeamTempoStats;
        teamB: TeamTempoStats;
    };
    style: {
        teamA: TeamStyleStats;
        teamB: TeamStyleStats;
    };
    kpis: {
        teamA: TeamKPIs;
        teamB: TeamKPIs;
    };
    recommendations: {
        teamA: string[];
        teamB: string[];
    };
    chainPerformance?: {
        teamA: ChainPerformance;
        teamB: ChainPerformance;
    };
    derivedEvents: DerivedEvent[];
}

export interface ChainPerformance {
    avgVerticality: number;
    avgBuildUpSpeed: number;
    finalThirdEntryRate: number;
    shotConversionRate: number;
    transitionConversionRate: number;
}

export interface TeamKPIs {
    attackEfficiency: number; // 0-100
    defenseSolidity: number; // 0-100
    possessionControl: number; // 0-100
    transitionSpeed: number; // 0-100 (based on counter attack duration)
}

export interface TeamPossessionStats {
    totalTime: number;
    percentage: number;
    phases: {
        count: number;
        avgDuration: number;
        longest: number;
        shortest: number;
        types: {
            short: number; // < 10s
            medium: number; // 10-30s
            long: number; // > 30s
        };
    };
}

export interface MomentumSegment {
    startTime: number;
    endTime: number;
    dominantTeam: "TEAM_A" | "TEAM_B" | "NEUTRAL";
    intensity: number; // 0-100
}

export interface TeamPassingStats {
    total: number;
    perMinute: number;
    perPossession: number;
    accuracy: number; // Inferred from turnovers
    streaks: {
        longest: number;
        commonLength: number;
    };
    buildUp: {
        short: number; // 1-3 passes
        medium: number; // 4-10 passes
        long: number; // 10+ passes
    };
}

export interface TeamTransitionStats {
    counterAttacks: number;
    turnovers: {
        high: number; // Zone 3
        mid: number; // Zone 2
        low: number; // Zone 1
        total: number;
    };
    efficiency: number; // % of turnovers leading to >5 passes
}

export interface TeamStabilityStats {
    pressResistance: number; // % of possessions > 1 pass
    onePassLosses: number;
}

export interface TeamTempoStats {
    passesPerMinute: number;
    fastPossessions: number; // > 1 pass/sec
    slowPossessions: number; // < 0.5 pass/sec
}

export interface TeamStyleStats {
    classification: "Direct" | "Possession" | "Balanced";
    directness: number; // 0-100
}

export type DerivedEventType =
    | "BUILD_UP_PASS"
    | "LINE_BREAKING_PASS"
    | "SUCCESSFUL_PRESS"
    | "COUNTER_ATTACK"
    | "POSSESSION_SEQUENCE"
    | "LONG_BUILDUP"
    | "DIRECT_ATTACK"
    | "LONG_BUILDUP"
    | "DIRECT_ATTACK"
    | "HIGH_TURNOVER"
    | "TRANSITION_SEQUENCE";

export interface DerivedEvent {
    id: string;
    type: DerivedEventType;
    name: string;
    startTime: number;
    endTime: number;
    description: string;
    relatedEventIds: number[];
    team?: "TEAM_A" | "TEAM_B";
}

// --- Helpers ---

const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const getTeamEvents = (events: LoggedEvent[], team: "TEAM_A" | "TEAM_B") => {
    return events.filter(e => e.team === team);
};

const isPass = (e: LoggedEvent) => e.eventName === "PASS" || e.eventName === "Successful Pass";
const isLoss = (e: LoggedEvent) => e.eventName === "Possession Lost";
const isWon = (e: LoggedEvent) => e.eventName === "Possession Won";

// --- Main Analysis Function ---

export const analyzeTactics = (events: LoggedEvent[]): TacticalAnalysis => {
    // Filter and sort
    const sortedEvents = [...events]
        .filter(e => e.videoTime !== undefined)
        .sort((a, b) => (a.videoTime || 0) - (b.videoTime || 0));

    if (sortedEvents.length === 0) {
        return createEmptyAnalysis();
    }

    const matchDuration = sortedEvents[sortedEvents.length - 1].videoTime || 0;
    const derivedEvents: DerivedEvent[] = [];

    // 1. Organize into Possessions
    // A possession starts with Won or first event, ends with Lost or Won by other team
    interface Possession {
        team: "TEAM_A" | "TEAM_B";
        startTime: number;
        endTime: number;
        events: LoggedEvent[];
        passCount: number;
        startZone?: number;
        endZone?: number;
    }

    const possessions: Possession[] = [];
    let currentPossession: Possession | null = null;

    sortedEvents.forEach((event) => {
        if (!currentPossession) {
            // Start new possession
            currentPossession = {
                team: event.team,
                startTime: event.videoTime || 0,
                endTime: event.videoTime || 0,
                events: [event],
                passCount: isPass(event) ? 1 : 0,
                startZone: event.zone
            };
        } else {
            if (event.team === currentPossession.team) {
                // Continue possession
                currentPossession.events.push(event);
                currentPossession.endTime = event.videoTime || 0;
                if (isPass(event)) currentPossession.passCount++;
                currentPossession.endZone = event.zone;
            } else {
                // Switch possession
                possessions.push(currentPossession);
                currentPossession = {
                    team: event.team,
                    startTime: event.videoTime || 0,
                    endTime: event.videoTime || 0,
                    events: [event],
                    passCount: isPass(event) ? 1 : 0,
                    startZone: event.zone
                };
            }
        }
    });

    if (currentPossession) possessions.push(currentPossession);

    // --- Generate Sequence Events ---

    // 1. Possession Sequences (All of them)
    possessions.forEach((p, index) => {
        derivedEvents.push({
            id: `pos-${p.startTime}-${index}`,
            type: "POSSESSION_SEQUENCE",
            name: `Possession: ${p.team}`,
            startTime: Math.max(0, p.startTime - 2),
            endTime: p.endTime + 2,
            description: `${p.passCount} passes, ${(p.endTime - p.startTime).toFixed(1)}s`,
            relatedEventIds: p.events.map(e => e.id),
            team: p.team
        });
    });

    // 2. Transition Sequences (High Value)
    // Start: Exact moment of possession change
    // End: 10 seconds after
    possessions.forEach((p, index) => {
        if (index > 0) {
            // The start of this possession is a transition from the previous one
            derivedEvents.push({
                id: `trans-${p.startTime}-${index}`,
                type: "TRANSITION_SEQUENCE",
                name: `Transition: To ${p.team}`,
                startTime: Math.max(0, p.startTime - 2), // Start slightly before to capture the change
                endTime: p.startTime + 10, // 10 seconds after
                description: `Transition to ${p.team}`,
                relatedEventIds: [p.events[0].id],
                team: p.team
            });
        }
    });

    // --- Calculate Stats ---

    const calculateTeamStats = (team: "TEAM_A" | "TEAM_B") => {
        const teamPossessions = possessions.filter(p => p.team === team);
        const teamEvents = getTeamEvents(sortedEvents, team);
        const passes = teamEvents.filter(isPass);
        const turnovers = teamEvents.filter(isLoss);

        // 1. Possession
        const totalTime = teamPossessions.reduce((sum, p) => sum + (p.endTime - p.startTime), 0);
        const percentage = matchDuration > 0 ? (totalTime / matchDuration) * 100 : 50;

        const phases = {
            count: teamPossessions.length,
            avgDuration: teamPossessions.length > 0 ? totalTime / teamPossessions.length : 0,
            longest: Math.max(0, ...teamPossessions.map(p => p.endTime - p.startTime)),
            shortest: teamPossessions.length > 0 ? Math.min(...teamPossessions.map(p => p.endTime - p.startTime)) : 0,
            types: {
                short: teamPossessions.filter(p => (p.endTime - p.startTime) < 10).length,
                medium: teamPossessions.filter(p => (p.endTime - p.startTime) >= 10 && (p.endTime - p.startTime) < 30).length,
                long: teamPossessions.filter(p => (p.endTime - p.startTime) >= 30).length,
            }
        };

        // 2. Passing
        const passCounts = teamPossessions.map(p => p.passCount);
        const streaks = {
            longest: Math.max(0, ...passCounts),
            commonLength: mode(passCounts)
        };
        const buildUp = {
            short: passCounts.filter(c => c >= 1 && c <= 3).length,
            medium: passCounts.filter(c => c >= 4 && c <= 10).length,
            long: passCounts.filter(c => c > 10).length
        };

        // 3. Transitions
        const turnoverZones = {
            high: turnovers.filter(t => t.zone === 3).length,
            mid: turnovers.filter(t => t.zone === 2).length,
            low: turnovers.filter(t => t.zone === 1).length,
            total: turnovers.length
        };

        // Generate High Turnover Events
        turnovers.filter(t => t.zone === 3).forEach(t => {
            derivedEvents.push({
                id: `ht-${t.id}`,
                type: "HIGH_TURNOVER",
                name: "High Turnover",
                startTime: Math.max(0, (t.videoTime || 0) - 5),
                endTime: (t.videoTime || 0) + 2,
                description: `${team} lost possession in attacking third.`,
                relatedEventIds: [t.id],
                team: team
            });
        });

        // Counter Attacks
        const counterAttacks = teamPossessions.filter((p, index) => {
            const isCounter = p.startZone === 1 && p.passCount <= 3 && (p.endTime - p.startTime) < 10 && p.endZone === 3;
            if (isCounter) {
                derivedEvents.push({
                    id: `ca-${team}-${p.startTime}-${index}`,
                    type: "COUNTER_ATTACK",
                    name: "Counter Attack",
                    startTime: Math.max(0, p.startTime - 2),
                    endTime: p.endTime + 2,
                    description: `${team} fast transition from defense to attack.`,
                    relatedEventIds: p.events.map(e => e.id),
                    team: team
                });
            }
            return isCounter;
        }).length;

        // Long Build-ups
        teamPossessions.filter(p => p.passCount >= 10).forEach((p) => {
            derivedEvents.push({
                id: `lb-${team}-${p.startTime}-${crypto.randomUUID()}`,
                type: "LONG_BUILDUP",
                name: "Long Build-up",
                startTime: Math.max(0, p.startTime - 2),
                endTime: p.endTime + 2,
                description: `${team} sustained possession (${p.passCount} passes).`,
                relatedEventIds: p.events.map(e => e.id),
                team: team
            });
        });

        // Direct Attacks
        teamPossessions.filter(p => p.passCount <= 3 && p.endZone === 3 && p.startZone !== 3).forEach((p, index) => {
            derivedEvents.push({
                id: `da-${team}-${p.startTime}-${index}`,
                type: "DIRECT_ATTACK",
                name: "Direct Attack",
                startTime: Math.max(0, p.startTime - 2),
                endTime: p.endTime + 2,
                description: `${team} direct play to attacking zone.`,
                relatedEventIds: p.events.map(e => e.id),
                team: team
            });
        });

        // 4. Stability
        const onePassLosses = teamPossessions.filter(p => p.passCount <= 1).length;
        const pressResistance = teamPossessions.length > 0 ? ((teamPossessions.length - onePassLosses) / teamPossessions.length) * 100 : 0;

        // 5. Tempo
        const passesPerMinute = matchDuration > 0 ? (passes.length / (matchDuration / 60)) : 0;
        const fastPossessions = teamPossessions.filter(p => p.passCount > 0 && (p.passCount / (p.endTime - p.startTime || 1)) > 0.8).length;
        const slowPossessions = teamPossessions.filter(p => p.passCount > 0 && (p.passCount / (p.endTime - p.startTime || 1)) < 0.4).length;

        // 6. Style
        const directness = buildUp.short / (teamPossessions.length || 1) * 100;
        let classification: "Direct" | "Possession" | "Balanced" = "Balanced";
        if (directness > 60) classification = "Direct";
        if (directness < 30) classification = "Possession";

        return {
            possession: { totalTime, percentage, phases },
            passing: {
                total: passes.length,
                perMinute: passesPerMinute,
                perPossession: teamPossessions.length > 0 ? passes.length / teamPossessions.length : 0,
                accuracy: 100 - (turnovers.length / (passes.length + turnovers.length || 1) * 100), // Rough estimate
                streaks,
                buildUp
            },
            transitions: {
                counterAttacks,
                turnovers: turnoverZones,
                efficiency: 0 // Placeholder
            },
            stability: {
                pressResistance,
                onePassLosses
            },
            tempo: {
                passesPerMinute,
                fastPossessions,
                slowPossessions
            },
            style: {
                classification,
                directness
            }
        };
    };

    // 7. Advanced Chain Analysis
    const getAdvancedChainStats = (team: "TEAM_A" | "TEAM_B"): ChainPerformance => {
        // Find events that have possessionId (from the new system)
        const teamEvents = sortedEvents.filter(e => e.team === team && e.possessionId !== undefined);

        // Group by possessionId
        const chainGroups = new Map<number, LoggedEvent[]>();
        teamEvents.forEach(e => {
            const id = e.possessionId!;
            if (!chainGroups.has(id)) chainGroups.set(id, []);
            chainGroups.get(id)!.push(e);
        });

        const chains = Array.from(chainGroups.values());
        if (chains.length === 0) return {
            avgVerticality: 0,
            avgBuildUpSpeed: 0,
            finalThirdEntryRate: 0,
            shotConversionRate: 0,
            transitionConversionRate: 0
        };

        const finalThirdEntries = chains.filter(c => c.some(e => e.eventName === 'final_third_entry')).length;
        const shots = chains.filter(c => c.some(e => e.eventName === 'shot_start')).length;
        const transitionChains = chains.filter(c => c.some(e => e.inTransitionWindow));
        const transitionShots = transitionChains.filter(c => c.some(e => e.eventName === 'shot_start')).length;

        // Calculate verticality (simple version: end zone higher than start zone)
        let totalVerticality = 0;
        chains.forEach(c => {
            const startZone = c[0].zone || 0;
            const endZone = c[c.length - 1].zone || 0;
            if (endZone > startZone) totalVerticality += 1;
        });

        return {
            avgVerticality: (totalVerticality / chains.length) * 100,
            avgBuildUpSpeed: 0, // Placeholder
            finalThirdEntryRate: (finalThirdEntries / chains.length) * 100,
            shotConversionRate: (shots / chains.length) * 100,
            transitionConversionRate: transitionChains.length > 0 ? (transitionShots / transitionChains.length) * 100 : 0
        };
    };

    // Momentum (Simple: Sliding window of pass differential)
    const momentum: MomentumSegment[] = [];
    // ... (Momentum logic can be added here, for now placeholder)

    // Generate Derived Events (Legacy support + new ones)
    // ... (Keep existing logic or adapt)

    // Build passing networks from controller events
    const passingNetworks = {
        teamA: buildPassingNetwork(sortedEvents, "TEAM_A", []),
        teamB: buildPassingNetwork(sortedEvents, "TEAM_B", [])
    };

    const kpis = {
        teamA: calculateKPIs(calculateTeamStats("TEAM_A"), "TEAM_A"),
        teamB: calculateKPIs(calculateTeamStats("TEAM_B"), "TEAM_B")
    };

    const recommendations = {
        teamA: generateRecommendations(calculateTeamStats("TEAM_A"), kpis.teamA, "TEAM_A"),
        teamB: generateRecommendations(calculateTeamStats("TEAM_B"), kpis.teamB, "TEAM_B")
    };

    return {
        possession: {
            teamA: calculateTeamStats("TEAM_A").possession,
            teamB: calculateTeamStats("TEAM_B").possession,
            momentum
        },
        passing: {
            teamA: calculateTeamStats("TEAM_A").passing,
            teamB: calculateTeamStats("TEAM_B").passing,
        },
        passingNetworks,
        transitions: {
            teamA: calculateTeamStats("TEAM_A").transitions,
            teamB: calculateTeamStats("TEAM_B").transitions,
        },
        stability: {
            teamA: calculateTeamStats("TEAM_A").stability,
            teamB: calculateTeamStats("TEAM_B").stability,
        },
        tempo: {
            teamA: calculateTeamStats("TEAM_A").tempo,
            teamB: calculateTeamStats("TEAM_B").tempo,
        },
        style: {
            teamA: calculateTeamStats("TEAM_A").style,
            teamB: calculateTeamStats("TEAM_B").style,
        },
        kpis,
        recommendations,
        chainPerformance: {
            teamA: getAdvancedChainStats("TEAM_A"),
            teamB: getAdvancedChainStats("TEAM_B")
        },
        derivedEvents: derivedEvents.sort((a, b) => a.startTime - b.startTime)
    };
};

// --- KPI & Recommendation Logic ---

const calculateKPIs = (stats: any, team: string): TeamKPIs => {
    // 1. Attack Efficiency
    // Based on: Shots (if avail), Deep Completions (Zone 3), and Possession conversion
    // For now, using proxy: (Zone 3 entries / Total Possessions) * 100
    // We don't have explicit Zone 3 entries count easily, so using (Long Build-ups + Counter Attacks) / Total Possessions
    const totalPossessions = stats.possession.phases.count || 1;
    const attackingSequences = stats.transitions.counterAttacks + (stats.passing.buildUp.long * 0.5); // Weight long build-ups less
    const attackEfficiency = Math.min(100, (attackingSequences / totalPossessions) * 100 * 2); // Multiplier to normalize

    // 2. Defense Solidity
    // Inverse of opponent's attack efficiency + Press Resistance
    // Proxy: 100 - (Turnovers in Zone 1 + Zone 2) / Total Possessions * 100
    const dangerousTurnovers = stats.transitions.turnovers.low + stats.transitions.turnovers.mid;
    const defenseSolidity = Math.max(0, 100 - ((dangerousTurnovers / totalPossessions) * 100));

    // 3. Possession Control
    // Combination of Possession % and Pass Accuracy
    const possessionControl = (stats.possession.percentage * 0.6) + (stats.passing.accuracy * 0.4);

    // 4. Transition Speed
    // Based on % of possessions that are "Fast" (Tempo)
    const transitionSpeed = Math.min(100, (stats.tempo.fastPossessions / totalPossessions) * 100 * 3);

    return {
        attackEfficiency,
        defenseSolidity,
        possessionControl,
        transitionSpeed
    };
};

const generateRecommendations = (stats: any, kpis: TeamKPIs, team: string): string[] => {
    const recs: string[] = [];

    // Possession
    if (stats.possession.percentage < 40) {
        recs.push("Increase possession retention to relieve defensive pressure.");
    }
    if (stats.possession.phases.types.short > stats.possession.phases.count * 0.6) {
        recs.push("Possessions are too short. Look to recycle the ball rather than forcing play.");
    }

    // Passing
    if (stats.passing.accuracy < 75) {
        recs.push("Passing accuracy is low. Focus on safer, shorter passes to build rhythm.");
    }
    if (stats.passing.buildUp.long < 2 && stats.possession.percentage > 50) {
        recs.push("Dominating possession but lacking sustained build-ups. Be more patient in the final third.");
    }

    // Transitions
    if (stats.transitions.turnovers.low > 5) {
        recs.push("Critical: Too many turnovers in defensive third. Clear lines faster.");
    }
    if (stats.transitions.counterAttacks < 2 && kpis.transitionSpeed < 30) {
        recs.push("Transition speed is slow. Look for forward runners immediately upon winning possession.");
    }

    // Stability
    if (stats.stability.onePassLosses > 5) {
        recs.push("High number of one-pass losses. Improve support angles for the ball carrier.");
    }

    // KPIs
    if (kpis.attackEfficiency < 30) {
        recs.push("Attack efficiency is low. Work on converting possession into final third entries.");
    }

    if (recs.length === 0) {
        recs.push("Maintain current performance levels.");
    }

    return recs.slice(0, 5); // Return top 5
};

// Helper for mode
function mode(arr: number[]) {
    if (arr.length === 0) return 0;
    const counts: Record<number, number> = {};
    let maxCount = 0;
    let maxKey = 0;
    for (const n of arr) {
        counts[n] = (counts[n] || 0) + 1;
        if (counts[n] > maxCount) {
            maxCount = counts[n];
            maxKey = n;
        }
    }
    return maxKey;
}

function createEmptyAnalysis(): TacticalAnalysis {
    const emptyStats = {
        possession: { totalTime: 0, percentage: 0, phases: { count: 0, avgDuration: 0, longest: 0, shortest: 0, types: { short: 0, medium: 0, long: 0 } } },
        passing: { total: 0, perMinute: 0, perPossession: 0, accuracy: 0, streaks: { longest: 0, commonLength: 0 }, buildUp: { short: 0, medium: 0, long: 0 } },
        transitions: { counterAttacks: 0, turnovers: { high: 0, mid: 0, low: 0, total: 0 }, efficiency: 0 },
        stability: { pressResistance: 0, onePassLosses: 0 },
        tempo: { passesPerMinute: 0, fastPossessions: 0, slowPossessions: 0 },
        style: { classification: "Balanced" as const, directness: 0 }
    };

    const emptyNetwork = {
        team: "",
        connections: [],
        nodes: [],
        metrics: {
            totalPasses: 0,
            uniquePassers: 0,
            uniqueReceivers: 0,
            avgPassesPerPlayer: 0,
            keyPasser: null,
            keyReceiver: null,
            mostFrequentConnection: null
        }
    };

    return {
        possession: { teamA: emptyStats.possession, teamB: emptyStats.possession, momentum: [] },
        passing: { teamA: emptyStats.passing, teamB: emptyStats.passing },
        passingNetworks: { teamA: { ...emptyNetwork, team: "TEAM_A" }, teamB: { ...emptyNetwork, team: "TEAM_B" } },
        transitions: { teamA: emptyStats.transitions, teamB: emptyStats.transitions },
        stability: { teamA: emptyStats.stability, teamB: emptyStats.stability },
        tempo: { teamA: emptyStats.tempo, teamB: emptyStats.tempo },
        style: { teamA: emptyStats.style, teamB: emptyStats.style },
        kpis: {
            teamA: { attackEfficiency: 0, defenseSolidity: 0, possessionControl: 0, transitionSpeed: 0 },
            teamB: { attackEfficiency: 0, defenseSolidity: 0, possessionControl: 0, transitionSpeed: 0 }
        },
        recommendations: { teamA: [], teamB: [] },
        derivedEvents: []
    };
}

// Export legacy function wrapper if needed, or replace
export const analyzeEvents = (events: LoggedEvent[]): DerivedEvent[] => {
    // Re-implement legacy derived events logic here if we want to keep the list
    // For now, returning empty or we can merge the logic.
    // ... (Previous logic for derived events)
    return [];
};
