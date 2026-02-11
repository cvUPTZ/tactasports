import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crosshair, Move, Activity, ArrowUpRight, Target, Network, TrendingUp } from "lucide-react";
import PitchMap from "../PitchMap";
import { LoggedEvent } from "@/hooks/useGamepad";
import { MomentumChart } from "./MomentumChart";
import { buildPassingNetwork, PassingNetworkViz } from "../PassingNetworkViz";

interface TacticalReviewProps {
    events: LoggedEvent[];
    teamNames: { teamA: string; teamB: string };
    teamARoster?: any[];
    teamBRoster?: any[];
}

export const TacticalReview: React.FC<TacticalReviewProps> = ({
    events,
    teamNames,
    teamARoster = [],
    teamBRoster = []
}) => {
    const [selectedTeam, setSelectedTeam] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');

    // 1. Calculate Player Centroids (Average Positioning)
    const playerCentroids = useMemo(() => {
        const centroids: any[] = [];
        const teamEvents = events.filter(e => e.team === selectedTeam && e.x !== undefined && e.y !== undefined);

        // Group by player
        const playerGroups = teamEvents.reduce((acc: any, e) => {
            const id = e.player?.id || 0;
            if (!acc[id]) acc[id] = [];
            acc[id].push(e);
            return acc;
        }, {});

        Object.keys(playerGroups).forEach(pid => {
            const pEvents = playerGroups[pid];
            const avgX = pEvents.reduce((sum: number, e: any) => sum + e.x, 0) / pEvents.length;
            const avgY = pEvents.reduce((sum: number, e: any) => sum + e.y, 0) / pEvents.length;
            centroids.push({
                x: avgX,
                y: avgY,
                team: selectedTeam === 'TEAM_A' ? 'A' : 'B',
                id: pid,
                name: pEvents[0].player?.name || `P${pid}`
            });
        });

        return centroids;
    }, [events, selectedTeam]);

    // 1b. Formation Detection Logic
    const detectedFormation = useMemo(() => {
        if (playerCentroids.length < 5) return "Analysing...";
        const defenders = playerCentroids.filter(p => p.x < 35).length;
        const midfielders = playerCentroids.filter(p => p.x >= 35 && p.x < 70).length;
        const attackers = playerCentroids.filter(p => p.x >= 70).length;
        const hasKeeper = playerCentroids.some(p => p.x < 15);
        const adjDef = hasKeeper ? defenders - 1 : defenders;
        return adjDef > 0 ? `${adjDef}-${midfielders}-${attackers}` : "Searching...";
    }, [playerCentroids]);

    // 2. Identify Penetrative Passes
    const penetrations = useMemo(() => {
        return events.filter(e => {
            if (e.team !== selectedTeam) return false;
            if (!e.eventName.toLowerCase().includes('pass')) return false;
            if (e.x === undefined || e.endX === undefined) return false;

            // Logic for "Penetrative": Either crosses into Final Third (70m) or enters Box (88.5m)
            const enteredFinalThird = e.x < 70 && e.endX >= 70;
            const enteredBox = e.endX >= 88.5 && (e.endY! >= 13.85 && e.endY! <= 54.15);

            return enteredFinalThird || enteredBox;
        });
    }, [events, selectedTeam]);

    // 3. Passing Network
    const network = useMemo(() => {
        const roster = selectedTeam === 'TEAM_A' ? teamARoster : teamBRoster;
        return buildPassingNetwork(events, selectedTeam, roster);
    }, [events, selectedTeam, teamARoster, teamBRoster]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold uppercase tracking-tight">Tactical Review</h2>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={selectedTeam === 'TEAM_A' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTeam('TEAM_A')}
                    >
                        {teamNames.teamA}
                    </Button>
                    <Button
                        variant={selectedTeam === 'TEAM_B' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTeam('TEAM_B')}
                    >
                        {teamNames.teamB}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Left: Performance Pitch */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                    <Tabs defaultValue="positioning" className="w-full">
                        <TabsList className="bg-muted/50 w-full justify-start border-b rounded-none h-12 p-0 px-4">
                            <TabsTrigger value="positioning" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12 px-6">
                                <Move className="w-4 h-4 mr-2" />
                                Avg. Positioning
                            </TabsTrigger>
                            <TabsTrigger value="penetration" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12 px-6">
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Penetration Map
                            </TabsTrigger>
                            <TabsTrigger value="network" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12 px-6">
                                <Network className="w-4 h-4 mr-2" />
                                Pass Network
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="positioning" className="mt-4 pt-0">
                            <Card className="border-2 border-primary/5 shadow-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                                <CardHeader className="p-4 pb-0">
                                    <CardTitle className="text-sm font-medium">Centroid Clusters</CardTitle>
                                    <CardDescription className="text-xs">Average locations of all logged touches per player</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="relative">
                                        <PitchMap
                                            playerPositions={playerCentroids}
                                            className="border border-white/10"
                                        />
                                        {/* Centroid Labels Layer */}
                                        <svg viewBox="0 0 105 68" className="absolute inset-0 pointer-events-none p-4">
                                            {playerCentroids.map(p => (
                                                <text
                                                    key={p.id}
                                                    x={p.x}
                                                    y={p.y - 3}
                                                    textAnchor="middle"
                                                    className="text-[2px] font-bold fill-white drop-shadow-md"
                                                >
                                                    {p.name}
                                                </text>
                                            ))}
                                        </svg>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="penetration" className="mt-4 pt-0">
                            <Card className="border-2 border-primary/5 shadow-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                                <CardHeader className="p-4 pb-0">
                                    <CardTitle className="text-sm font-medium">Vertical Penetration</CardTitle>
                                    <CardDescription className="text-xs">Passes entering the Final Third or the Box</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="relative">
                                        <PitchMap className="border border-white/10" />
                                        <svg viewBox="0 0 105 68" className="absolute inset-0 pointer-events-none p-4">
                                            <defs>
                                                <marker id="arrow" markerWidth="2" markerHeight="2" refX="1" refY="1" orient="auto">
                                                    <polyline points="0,0 2,1 0,2" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                                                </marker>
                                            </defs>
                                            {penetrations.map((p, i) => (
                                                <line
                                                    key={i}
                                                    x1={p.x} y1={p.y}
                                                    x2={p.endX} y2={p.endY}
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth="0.4"
                                                    opacity="0.6"
                                                    markerEnd="url(#arrow)"
                                                />
                                            ))}
                                        </svg>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="network" className="mt-4 pt-0">
                            <Card className="border-2 border-primary/5 shadow-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                                <CardHeader className="p-4 pb-0">
                                    <CardTitle className="text-sm font-medium">Passing Dynamics</CardTitle>
                                    <CardDescription className="text-xs">Visualizing the core distribution hubs</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <PassingNetworkViz
                                        network={network}
                                        teamName={selectedTeam === 'TEAM_A' ? teamNames.teamA : teamNames.teamB}
                                        width={700}
                                        height={450}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right: Insights & Momentum */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Match Momentum
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="h-32">
                                <MomentumChart events={events} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Efficiency Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground">Detected Formation</div>
                                <div className="text-xl font-bold text-primary">{detectedFormation}</div>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground">Line-Breaking Passes</div>
                                <div className="text-xl font-bold text-primary">{penetrations.length}</div>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground">Network Density</div>
                                <div className="text-xl font-bold text-primary">{(network.metrics.networkDensity * 100).toFixed(0)}%</div>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground">Transition Speed</div>
                                <div className="text-xl font-bold text-primary">High</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold text-primary">Tactical Insight</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {penetrations.length > 5
                                    ? `${teamNames[selectedTeam === 'TEAM_A' ? 'teamA' : 'teamB']} is effectively exploiting the half-spaces and finding vertical lanes into the box.`
                                    : `${teamNames[selectedTeam === 'TEAM_A' ? 'teamA' : 'teamB']} is struggling to advance the ball centrally. Consider increasing lateral circulation to stretch the block.`
                                }
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
