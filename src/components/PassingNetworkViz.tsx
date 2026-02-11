import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { LoggedEvent } from '@/hooks/useGamepad';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Zap,
    Target,
    Activity,
    Share2,
    Cpu,
    ChevronRight,
    Network,
    TrendingUp,
    Users
} from 'lucide-react';

// --- Types ---
// LoggedEvent is imported from @/hooks/useGamepad

export interface PassConnection {
    from: number;
    to: number;
    count: number;
    team: string;
    bidirectional: boolean;
}

export interface PlayerNetworkNode extends d3.SimulationNodeDatum {
    playerId: number;
    playerName: string;
    team: string;
    passesGiven: number;
    passesReceived: number;
    centrality: number;
    betweenness: number;
    totalInvolvement: number;
    influence: number;
    reliability: number;
    threat: number;
    role: string;
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
        networkDensity: number;
        keyPasser: PlayerNetworkNode | null;
        keyReceiver: PlayerNetworkNode | null;
        mostCentralPlayer: PlayerNetworkNode | null;
        mostFrequentConnection: PassConnection | null;
        bidirectionalConnections: number;
        transmissionRate: number;      // passes per minute
        stabilityScore: string;        // "OPTIMAL", "STABLE", "FRAGILE"
        threatVectors: number;         // passes crossing into final third
        systemEntropy: string;         // "LOW", "MEDIUM", "HIGH" based on density
    };
}

// --- Helper Functions ---

const isPass = (e: LoggedEvent) =>
    e.eventName === "PASS" ||
    e.eventName === "Successful Pass" ||
    e.eventName === "PASS_SUCCESS" ||
    e.eventName === "pass_start" ||
    e.eventName === "pass_end";

function getPlayerName(playerId: number, roster: any[]): string {
    const player = roster?.find(p =>
        (p.id !== undefined && p.id === playerId) ||
        (p.number !== undefined && p.number === playerId)
    );
    return player?.name || `Player ${playerId}`;
}

function calculateBetweennessCentrality(
    nodes: PlayerNetworkNode[],
    connections: PassConnection[]
): Map<number, number> {
    const betweennessMap = new Map<number, number>();
    nodes.forEach(node => {
        const incoming = connections.filter(c => c.to === node.playerId).length;
        const outgoing = connections.filter(c => c.from === node.playerId).length;
        betweennessMap.set(node.playerId, incoming * outgoing);
    });
    return betweennessMap;
}

function calculateNetworkDensity(nodes: number, connections: number): number {
    if (nodes <= 1) return 0;
    return connections / (nodes * (nodes - 1));
}

// --- Intelligence Engine (Pro logic) ---

const computeInfluence = (nodes: PlayerNetworkNode[], links: any[]) => {
    nodes.forEach(n => n.influence = 1);
    for (let i = 0; i < 5; i++) {
        const nextInfluence = new Map<number, number>();
        links.forEach(l => {
            const s = typeof l.source === 'object' ? l.source.playerId : l.source;
            const t = typeof l.target === 'object' ? l.target.playerId : l.target;
            nextInfluence.set(t, (nextInfluence.get(t) || 0) + (nodes.find(n => n.playerId === s)?.influence || 0));
        });
        const max = Math.max(...Array.from(nextInfluence.values()), 1);
        nodes.forEach(n => n.influence = (nextInfluence.get(n.playerId) || 0) / max);
    }
};

// --- Main Builder Function ---

export function buildPassingNetwork(
    events: LoggedEvent[],
    team: "TEAM_A" | "TEAM_B",
    roster: any[] = [],
    timeWindow: number = 8
): PassingNetwork {
    const teamPasses = events
        .filter(e => e.team === team && isPass(e))
        .sort((a, b) => (a.videoTime || a.timestamp || 0) - (b.videoTime || b.timestamp || 0));

    if (teamPasses.length === 0) return createEmptyNetwork(team);

    const passesWithPlayers = teamPasses.filter(p => p.player?.id !== undefined);
    if (passesWithPlayers.length === 0) return createEmptyNetwork(team);

    const connectionsList: Array<{ from: number, to: number }> = [];
    for (let i = 0; i < passesWithPlayers.length - 1; i++) {
        const p = passesWithPlayers[i];
        const r = passesWithPlayers[i + 1];
        const dt = (r.videoTime || r.timestamp || 0) - (p.videoTime || p.timestamp || 0);

        if (p.player!.id !== r.player!.id && dt >= 0 && dt < timeWindow) {
            connectionsList.push({ from: p.player!.id, to: r.player!.id });
        }
    }

    const connectionMap = new Map<string, PassConnection>();
    connectionsList.forEach(({ from, to }) => {
        const key = `${from}-${to}`;
        if (connectionMap.has(key)) {
            connectionMap.get(key)!.count++;
        } else {
            connectionMap.set(key, { from, to, count: 1, team, bidirectional: false });
        }
    });

    const aggregated = Array.from(connectionMap.values());
    aggregated.forEach(c => {
        const rev = `${c.to}-${c.from}`;
        if (connectionMap.has(rev)) c.bidirectional = true;
    });

    // Step 4: Build player nodes with stats and role heuristics
    const playerStatsMap = new Map<number, PlayerNetworkNode>();
    aggregated.forEach(c => {
        [c.from, c.to].forEach(id => {
            if (!playerStatsMap.has(id)) {
                playerStatsMap.set(id, {
                    playerId: id,
                    playerName: getPlayerName(id, roster),
                    team,
                    passesGiven: 0,
                    passesReceived: 0,
                    centrality: 0,
                    betweenness: 0,
                    totalInvolvement: 0,
                    influence: 0,
                    reliability: 0.8, // Default base
                    threat: 0,
                    role: "Asset"
                });
            }
        });
        playerStatsMap.get(c.from)!.passesGiven += c.count;
        playerStatsMap.get(c.to)!.passesReceived += c.count;
        playerStatsMap.get(c.from)!.totalInvolvement += c.count;
        playerStatsMap.get(c.to)!.totalInvolvement += c.count;
    });

    const nodes = Array.from(playerStatsMap.values());
    const betweenness = calculateBetweennessCentrality(nodes, aggregated);
    const maxB = Math.max(...Array.from(betweenness.values()), 1);

    // Calculate quality-based reliability if ratings exist
    const playerRatings = new Map<number, number[]>();
    events.filter(e => e.team === team && e.player?.id).forEach(e => {
        if (e.qualityRating) {
            const ratings = playerRatings.get(e.player!.id) || [];
            ratings.push(e.qualityRating);
            playerRatings.set(e.player!.id, ratings);
        }
    });

    nodes.forEach(n => {
        const degree = n.passesGiven + n.passesReceived;
        n.centrality = nodes.length > 1 ? degree / ((nodes.length - 1) * 2) : 0;
        n.betweenness = (betweenness.get(n.playerId) || 0) / maxB;

        // Threat calculation: involvement in final third passes
        const playerPasses = teamPasses.filter(p => p.player?.id === n.playerId);
        const playerThreat = playerPasses.filter(p => (p.endX || 0) > 70).length;
        n.threat = playerThreat / (playerPasses.length || 1);

        // Reliability: Avg Quality Rating or base 0.8
        const ratings = playerRatings.get(n.playerId);
        if (ratings && ratings.length > 0) {
            n.reliability = ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5);
        } else {
            // No quality ratings available
            n.reliability = 0;
        }

        // Roles
        if (n.betweenness > 0.7) n.role = "Tactical Hub";
        else if (n.threat > 0.4) n.role = "Incisive Outlet";
        else if (n.passesGiven > n.passesReceived * 1.5) n.role = "Distributor";
        else if (n.passesReceived > n.passesGiven * 1.5) n.role = "Target Asset";
        else n.role = "Connector";
    });

    // Metric Calculations
    const times = teamPasses.map(p => p.videoTime || p.timestamp || 0).filter(t => t > 0);
    const durationSec = times.length > 1 ? Math.max(...times) - Math.min(...times) : 60;
    const transmissionRate = (teamPasses.length / (durationSec / 60));
    const threatVectors = teamPasses.filter(p => (p.endX || 0) > 70).length;
    const density = calculateNetworkDensity(nodes.length, aggregated.length);
    const stability = teamPasses.length > 0 ? (aggregated.reduce((s, c) => s + c.count, 0) / teamPasses.length) : 0;

    const mostFreq = aggregated.length > 0 ? aggregated.reduce((a, b) => a.count > b.count ? a : b) : null;

    return {
        team,
        connections: aggregated,
        nodes,
        metrics: {
            totalPasses: aggregated.reduce((s, c) => s + c.count, 0),
            uniquePassers: new Set(aggregated.map(c => c.from)).size,
            uniqueReceivers: new Set(aggregated.map(c => c.to)).size,
            avgPassesPerPlayer: nodes.length > 0 ? Math.round((aggregated.reduce((s, c) => s + c.count, 0) / nodes.length) * 10) / 10 : 0,
            networkDensity: Math.round(density * 100) / 100,
            keyPasser: nodes.length > 0 ? nodes.reduce((a, b) => a.passesGiven > b.passesGiven ? a : b) : null,
            keyReceiver: nodes.length > 0 ? nodes.reduce((a, b) => a.passesReceived > b.passesReceived ? a : b) : null,
            mostCentralPlayer: nodes.length > 0 ? nodes.reduce((a, b) => a.betweenness > b.betweenness ? a : b) : null,
            mostFrequentConnection: mostFreq,
            bidirectionalConnections: aggregated.filter(c => c.bidirectional).length,
            transmissionRate: Math.round(transmissionRate * 10) / 10,
            threatVectors,
            stabilityScore: stability > 0.8 ? "OPTIMAL" : stability > 0.5 ? "STABLE" : "FRAGILE",
            systemEntropy: density > 0.4 ? "LOW" : density > 0.2 ? "STABLE" : "HIGH"
        }
    };
}

function createEmptyNetwork(team: string): PassingNetwork {
    return {
        team, connections: [], nodes: [],
        metrics: {
            totalPasses: 0, uniquePassers: 0, uniqueReceivers: 0, avgPassesPerPlayer: 0,
            networkDensity: 0, keyPasser: null, keyReceiver: null, mostCentralPlayer: null,
            mostFrequentConnection: null, bidirectionalConnections: 0,
            transmissionRate: 0, threatVectors: 0, stabilityScore: "N/A", systemEntropy: "N/A"
        }
    };
}

// --- Visualization Component ---

interface PassingNetworkVizProps {
    network: PassingNetwork;
    teamName?: string;
    width?: number;
    height?: number;
    showLabels?: boolean;
    highlightBidirectional?: boolean;
}

export const PassingNetworkViz: React.FC<PassingNetworkVizProps> = ({
    network,
    teamName = "Team",
    width = 800,
    height = 600,
    showLabels = true,
    highlightBidirectional = true
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredNode, setHoveredNode] = useState<PlayerNetworkNode | null>(null);

    useEffect(() => {
        if (!svgRef.current || network.nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const nodes = network.nodes.map(n => ({ ...n }));
        const links = network.connections.map(c => ({
            source: c.from,
            target: c.to,
            weight: c.count,
            bidirectional: c.bidirectional
        }));

        // Compute influence using the Pro logic
        computeInfluence(nodes, links);

        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "neon-glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
        const merge = filter.append("feMerge");
        merge.append("feMergeNode").attr("in", "blur");
        merge.append("feMergeNode").attr("in", "SourceGraphic");

        const simulation = d3.forceSimulation<any>(nodes)
            .force("link", d3.forceLink(links).id((d: any) => Number(d.playerId)).distance(150))  // FIXED: Added Number() conversion
            .force("charge", d3.forceManyBody().strength(-1500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(60));

        const g = svg.append("g");

        // Links (The "Flow")
        const link = g.append("g")
            .selectAll("path")
            .data(links)
            .enter().append("path")
            .attr("stroke", d => d.bidirectional && highlightBidirectional ? "rgba(239, 68, 68, 0.6)" : "rgba(34, 211, 238, 0.4)")
            .attr("stroke-width", d => Math.sqrt(d.weight) * 3)
            .attr("fill", "none")
            .attr("class", d => d.weight > 3 ? "animate-pulse" : "");

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .on("mouseenter", (e, d) => setHoveredNode(d))
            .on("mouseleave", () => setHoveredNode(null))
            .call(d3.drag<any, any>()
                .on("start", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on("end", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                })
            );

        node.append("circle")
            .attr("r", d => 20 + (d.influence || 0) * 30)
            .attr("fill", "#0f172a")
            .attr("stroke", d => (d.influence || 0) > 0.7 ? "#22d3ee" : "#334155")
            .attr("stroke-width", 3)
            .style("filter", d => (d.influence || 0) > 0.7 ? "url(#neon-glow)" : "none");

        node.append("text")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.playerName.split(' ').pop() || "")
            .attr("fill", "#f8fafc")
            .style("font-size", "11px")
            .style("font-weight", "900")
            .style("text-transform", "uppercase")
            .style("pointer-events", "none");

        simulation.on("tick", () => {
            link.attr("d", (d: any) => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 2;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [network, width, height, highlightBidirectional]);

    if (network.nodes.length === 0) {
        return (
            <Card className="bg-[#020617] border-slate-800">
                <CardHeader>
                    <CardTitle className="text-cyan-400 uppercase italic">Network Offline</CardTitle>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center text-slate-500 font-mono text-xs">
                    SYSTEM_MESSAGE: NO_PASSING_DATA_IN_CURRENT_WINDOW
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-[#020617] border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black tracking-tighter flex items-center gap-2 italic">
                            <Cpu className="text-cyan-400 w-6 h-6" />
                            TACTICAL FLOW <span className="text-cyan-400">OS</span>
                        </CardTitle>
                        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                            {teamName} Network Synthesis // Nodes: {network.nodes.length} // Flux: {network.metrics.totalPasses}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <div className="text-xs font-mono text-slate-500 uppercase">Density</div>
                            <div className="text-lg font-black text-cyan-400">{(network.metrics.networkDensity * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 relative">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:25px_25px]"
                />

                {/* Hub Overlay */}
                <div className="absolute top-6 left-6 space-y-2">
                    {network.nodes.sort((a, b) => b.influence - a.influence).slice(0, 3).map((n, i) => (
                        <div key={n.playerId} className="bg-slate-900/80 border border-slate-700 p-2 rounded-lg flex items-center gap-3 backdrop-blur-xl border-l-4 border-l-cyan-400 w-48">
                            <div className="bg-cyan-500/10 text-cyan-400 text-[10px] font-black h-8 w-8 rounded flex items-center justify-center">
                                0{i + 1}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-[9px] font-mono text-slate-500 uppercase truncate">Primary {n.role}</div>
                                <div className="text-xs font-bold uppercase italic truncate">{n.playerName}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Node Inspector */}
                {hoveredNode && (
                    <div className="absolute bottom-6 left-6 right-6 bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-2xl p-4 rounded-xl flex justify-between animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-400/10">
                                <Activity className="text-cyan-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black uppercase italic tracking-tighter">{hoveredNode.playerName}</h4>
                                <p className="text-[10px] font-mono text-cyan-400 uppercase">Influence: {(hoveredNode.influence * 100).toFixed(1)}% // Role: {hoveredNode.role}</p>
                            </div>
                        </div>
                        <div className="flex gap-8 text-right">
                            <div>
                                <div className="text-[9px] text-slate-400 font-mono">RELIABILITY</div>
                                <div className="text-xl font-black text-white">{Math.round(hoveredNode.reliability * 100)}%</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-slate-400 font-mono">DELIVERED</div>
                                <div className="text-xl font-black">{hoveredNode.passesGiven}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-slate-400 font-mono">ACQUIRED</div>
                                <div className="text-xl font-black">{hoveredNode.passesReceived}</div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <div className="bg-slate-900/80 p-6 grid grid-cols-4 gap-4 border-t border-slate-800">
                {[
                    { label: 'Transmission Rate', val: `${network.metrics.transmissionRate} p/m`, icon: Zap },
                    { label: 'System Cohesion', val: `${(network.metrics.networkDensity * 100).toFixed(0)}%`, icon: Share2 },
                    { label: 'Entropy', val: network.metrics.systemEntropy, icon: Target },
                    { label: 'Threat Vectors', val: network.metrics.threatVectors, icon: ChevronRight },
                ].map((stat, i) => (
                    <div key={i} className="space-y-1 border-r border-slate-800 last:border-0 px-4">
                        <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 uppercase">
                            <stat.icon className="w-3 h-3 text-cyan-500" /> {stat.label}
                        </div>
                        <div className="text-lg font-black text-slate-200">{stat.val}</div>
                    </div>
                ))}
            </div>

            {/* Distribution intelligence Table */}
            <div className="p-6 bg-slate-950/50">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mb-4 flex items-center gap-3">
                    <div className="h-[1px] w-8 bg-cyan-500/50" /> Distribution Intelligence <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="border border-slate-800 rounded-lg overflow-hidden font-mono text-[11px]">
                    <div className="bg-slate-900/50 grid grid-cols-5 p-3 font-bold text-slate-400 border-b border-slate-800">
                        <div>ASSET_ID</div>
                        <div className="text-center">SENT</div>
                        <div className="text-center">RECV</div>
                        <div className="text-center">VOL</div>
                        <div className="text-right">CONNECTIVITY</div>
                    </div>
                    {network.nodes.sort((a, b) => b.totalInvolvement - a.totalInvolvement).map(node => (
                        <div key={node.playerId} className="grid grid-cols-5 p-3 border-b border-slate-800/50 hover:bg-cyan-500/5 transition-colors">
                            <div className="flex items-center gap-2 font-bold">
                                <span className="text-cyan-500 opacity-50">#{node.playerId}</span>
                                {node.playerName.toUpperCase()}
                            </div>
                            <div className="text-center">{node.passesGiven}</div>
                            <div className="text-center">{node.passesReceived}</div>
                            <div className="text-center font-bold text-cyan-400">{node.totalInvolvement}</div>
                            <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500" style={{ width: `${node.centrality * 100}%` }} />
                                </div>
                                <span className="text-[9px] text-slate-500">{Math.round(node.centrality * 100)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

// --- TacticalNetworkPro (User's specific request component) ---

export const TacticalNetworkPro: React.FC<{
    events: LoggedEvent[];
    team: "TEAM_A" | "TEAM_B";
    roster: any[];
}> = ({ events, team, roster }) => {
    const network = useMemo(() => buildPassingNetwork(events, team, roster), [events, team, roster]);
    return <PassingNetworkViz network={network} teamName={team === "TEAM_A" ? "Attack Alpha" : "Strike Bravo"} />;
};

export default PassingNetworkViz;
