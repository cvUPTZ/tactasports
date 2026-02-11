import { LoggedEvent } from "@/hooks/useGamepad";

// --- Types ---

export interface PassConnection {
    from: number;      // Player ID who made the pass
    to: number;        // Player ID who received the pass
    count: number;     // Number of passes between these players
    team: string;      // Team identifier
    bidirectional?: boolean; // Whether passes go both ways
}

export interface PlayerNetworkNode {
    playerId: number;
    playerName: string;
    team: string;
    passesGiven: number;      // Total passes made by this player
    passesReceived: number;   // Total passes received by this player
    centrality: number;       // Network centrality score (0-1)
}

export interface PassingNetwork {
    team: string;
    connections: PassConnection[];
    nodes: PlayerNetworkNode[];
    metrics: {
        totalPasses: number;
        uniquePassers: number;
        uniqueReceivers: number;
        avgPassesPerPlayer: number;
        keyPasser: PlayerNetworkNode | null;
        keyReceiver: PlayerNetworkNode | null;
        mostFrequentConnection: PassConnection | null;
    };
}

// --- Helper Functions ---

const isPass = (e: LoggedEvent) => e.eventName === "PASS" || e.eventName === "Successful Pass";

function getPlayerName(playerId: number, roster: any[]): string {
    const player = roster?.find(p => p.id === playerId || p.number === playerId);
    return player?.name || `Player #${playerId}`;
}

// --- Main Function ---

export function buildPassingNetwork(
    events: LoggedEvent[],
    team: "TEAM_A" | "TEAM_B",
    roster: any[] = []
): PassingNetwork {
    // Step 1: Filter pass events for this team and sort by time
    const teamPasses = events
        .filter(e => e.team === team && isPass(e))
        .sort((a, b) => (a.videoTime || 0) - (b.videoTime || 0));

    if (teamPasses.length === 0) {
        return createEmptyNetwork(team);
    }

    // Check if any passes have player data
    const passesWithPlayers = teamPasses.filter(p => p.player?.id);

    if (passesWithPlayers.length === 0) {
        console.warn(`⚠️ No player data found in pass events for ${team}. Please assign players to events to see the passing network.`);
        return createEmptyNetwork(team);
    }

    // Step 2: Infer connections from consecutive passes (only use passes with player data)
    const connections: PassConnection[] = [];

    for (let i = 0; i < passesWithPlayers.length - 1; i++) {
        const passer = passesWithPlayers[i];
        const receiver = passesWithPlayers[i + 1];

        // Only create connection if:
        // 1. Both have player IDs
        // 2. They're different players
        // 3. Within reasonable time window (10 seconds)
        if (
            passer.player?.id &&
            receiver.player?.id &&
            passer.player.id !== receiver.player.id &&
            (receiver.videoTime || 0) - (passer.videoTime || 0) < 10
        ) {
            connections.push({
                from: passer.player.id,
                to: receiver.player.id,
                count: 1,
                team: team
            });
        }
    }

    // Step 3: Aggregate connections (group by passer-receiver pair)
    const connectionMap = new Map<string, PassConnection>();

    connections.forEach(conn => {
        const key = `${conn.from}-${conn.to}`;
        if (connectionMap.has(key)) {
            connectionMap.get(key)!.count++;
        } else {
            connectionMap.set(key, conn);
        }
    });

    const aggregatedConnections = Array.from(connectionMap.values());

    // Step 4: Build player nodes with stats
    const playerStatsMap = new Map<number, PlayerNetworkNode>();

    aggregatedConnections.forEach(conn => {
        // Initialize passer if not exists
        if (!playerStatsMap.has(conn.from)) {
            playerStatsMap.set(conn.from, {
                playerId: conn.from,
                playerName: getPlayerName(conn.from, roster),
                team: team,
                passesGiven: 0,
                passesReceived: 0,
                centrality: 0
            });
        }

        // Initialize receiver if not exists
        if (!playerStatsMap.has(conn.to)) {
            playerStatsMap.set(conn.to, {
                playerId: conn.to,
                playerName: getPlayerName(conn.to, roster),
                team: team,
                passesGiven: 0,
                passesReceived: 0,
                centrality: 0
            });
        }

        // Update stats
        playerStatsMap.get(conn.from)!.passesGiven += conn.count;
        playerStatsMap.get(conn.to)!.passesReceived += conn.count;
    });

    // Step 5: Calculate centrality for each player
    const maxDegree = playerStatsMap.size > 1 ? playerStatsMap.size - 1 : 1;

    playerStatsMap.forEach(player => {
        const degree = player.passesGiven + player.passesReceived;
        player.centrality = degree / maxDegree;
    });

    const nodes = Array.from(playerStatsMap.values());

    // Step 6: Calculate metrics
    const totalPasses = aggregatedConnections.reduce((sum, conn) => sum + conn.count, 0);
    const uniquePassers = new Set(aggregatedConnections.map(c => c.from)).size;
    const uniqueReceivers = new Set(aggregatedConnections.map(c => c.to)).size;
    const avgPassesPerPlayer = nodes.length > 0 ? totalPasses / nodes.length : 0;

    // Find key players
    const keyPasser = nodes.length > 0
        ? nodes.reduce((max, player) => player.passesGiven > max.passesGiven ? player : max)
        : null;

    const keyReceiver = nodes.length > 0
        ? nodes.reduce((max, player) => player.passesReceived > max.passesReceived ? player : max)
        : null;

    // Find most frequent connection
    const mostFrequentConnection = aggregatedConnections.length > 0
        ? aggregatedConnections.reduce((max, conn) => conn.count > max.count ? conn : max)
        : null;

    return {
        team,
        connections: aggregatedConnections,
        nodes,
        metrics: {
            totalPasses,
            uniquePassers,
            uniqueReceivers,
            avgPassesPerPlayer: Math.round(avgPassesPerPlayer * 10) / 10,
            keyPasser,
            keyReceiver,
            mostFrequentConnection
        }
    };
}

function createEmptyNetwork(team: string): PassingNetwork {
    return {
        team,
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
}

// --- Export ---
export { isPass };
