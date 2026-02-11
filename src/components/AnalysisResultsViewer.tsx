import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, Users, MapPin, Network, Flame, Share2 } from "lucide-react";
import { useState } from "react";
import { PassingNetworkViz, buildPassingNetwork, PassingNetwork } from "./PassingNetworkViz";
import { API_BASE_URL, ANALYSIS_API_URL, API_HEADERS } from "@/utils/apiConfig";

interface PlayerStats {
    total_distance: number;
    max_speed: number;
    sprints: number;
    team: 'A' | 'B';
}

interface TrackPoint {
    frame: number;
    timestamp: number;
    x: number;
    y: number;
    xm?: number;
    ym?: number;
    xm_smooth?: number;
    ym_smooth?: number;
    v?: number;
    a?: number;
    is_sprinting?: boolean;
    xT?: number;
    team: 'A' | 'B';
    conf: number;
}

interface PassEvent {
    frame: number;
    timestamp: number;
    passer_id: number;
    receiver_id: number;
    team: string;
    distance: number;
    duration: number;
    pass_type: string;
    success: boolean;
    xthreat_delta: number;
}

interface AnalysisResults {
    metadata: {
        video_path: string;
        duration: number;
        fps: number;
    };
    stats: Record<string, PlayerStats>;
    tracks: Record<string, TrackPoint[]>;
    events: Array<{
        frame: number;
        timestamp: number;
        defender_id: number;
        attacker_id: number;
        distance: number;
        defender_speed: number;
    }>;
    passes?: PassEvent[];
    network_metrics?: Record<string, any>;
    positions: TrackPoint[];
}

interface AnalysisResultsViewerProps {
    results: AnalysisResults | null;
}

export const AnalysisResultsViewer = ({ results }: AnalysisResultsViewerProps) => {
    const [heatmapTeam, setHeatmapTeam] = useState<'A' | 'B' | null>(null);
    const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
    const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);

    if (!results) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    No analysis results yet. Run analysis on a clip to see player tracking data.
                </CardContent>
            </Card>
        );
    }

    const playerIds = Object.keys(results.stats);
    const teamAPlayers = playerIds.filter(id => results.stats[id].team === 'A');
    const teamBPlayers = playerIds.filter(id => results.stats[id].team === 'B');

    const formatSpeed = (ms: number) => `${(ms * 3.6).toFixed(1)} km/h`;
    const formatDistance = (m: number) => `${m.toFixed(0)}m`;
    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const generateHeatmap = async (team: 'A' | 'B' | null) => {
        setIsLoadingHeatmap(true);
        setHeatmapTeam(team);
        try {
            const response = await fetch(`${ANALYSIS_API_URL}/api/generate-heatmap`, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({
                    team: team,
                    scatter: false
                })
            });
            const data = await response.json();
            if (data.success) {
                setHeatmapUrl(`${ANALYSIS_API_URL}${data.imageUrl}`);
            }
        } catch (error) {
            console.error("Failed to generate heatmap:", error);
        } finally {
            setIsLoadingHeatmap(false);
        }
    };

    // Construct Passing Networks if data exists
    const networkA = results.passes ? buildPassingNetwork(
        results.passes.map(p => ({
            eventName: "PASS",
            team: "TEAM_A",
            player: { id: p.passer_id },
            timestamp: p.timestamp
        })),
        "TEAM_A",
        teamAPlayers.map(id => ({ id: parseInt(id), name: `Player ${id}` }))
    ) : null;

    const networkB = results.passes ? buildPassingNetwork(
        results.passes.map(p => ({
            eventName: "PASS",
            team: "TEAM_B",
            player: { id: p.passer_id },
            timestamp: p.timestamp
        })),
        "TEAM_B",
        teamBPlayers.map(id => ({ id: parseInt(id), name: `Player ${id}` }))
    ) : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    AI Analysis Results
                </CardTitle>
                <CardDescription>
                    Analyzed {formatTime(results.metadata.duration)} • {playerIds.length} players tracked • {results.events.length} pressing events
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="team-a">Team A</TabsTrigger>
                        <TabsTrigger value="team-b">Team B</TabsTrigger>
                        <TabsTrigger value="passing">Passing</TabsTrigger>
                        <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
                        <TabsTrigger value="tactical">Tactical</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Players Tracked
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{playerIds.length}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Team A: {teamAPlayers.length} • Team B: {teamBPlayers.length}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Total Sprints
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">
                                        {Object.values(results.stats).reduce((sum, s) => sum + s.sprints, 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Speed &gt; 25 km/h
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Pressing Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{results.events.length}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        High-intensity duels
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top Performers */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Top Performers</h3>

                            {/* Fastest Player */}
                            {(() => {
                                const fastest = playerIds.reduce((max, id) =>
                                    results.stats[id].max_speed > results.stats[max].max_speed ? id : max
                                    , playerIds[0]);
                                return (
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-500" />
                                            <span className="text-sm font-medium">Fastest Player</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={results.stats[fastest].team === 'A' ? 'default' : 'destructive'}>
                                                Player {fastest}
                                            </Badge>
                                            <span className="text-sm font-bold">{formatSpeed(results.stats[fastest].max_speed)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Most Distance */}
                            {(() => {
                                const mostDistance = playerIds.reduce((max, id) =>
                                    results.stats[id].total_distance > results.stats[max].total_distance ? id : max
                                    , playerIds[0]);
                                return (
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-medium">Most Distance</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={results.stats[mostDistance].team === 'A' ? 'default' : 'destructive'}>
                                                Player {mostDistance}
                                            </Badge>
                                            <span className="text-sm font-bold">{formatDistance(results.stats[mostDistance].total_distance)}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </TabsContent>

                    {/* TEAM A TAB */}
                    <TabsContent value="team-a" className="space-y-3">
                        {teamAPlayers.map(playerId => {
                            const stats = results.stats[playerId];
                            return (
                                <Card key={playerId}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">Player {playerId}</CardTitle>
                                            <Badge>Team A</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs">Distance</p>
                                                <p className="font-bold">{formatDistance(stats.total_distance)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Max Speed</p>
                                                <p className="font-bold">{formatSpeed(stats.max_speed)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Sprints</p>
                                                <p className="font-bold">{stats.sprints}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Speed Performance</span>
                                                <span>{((stats.max_speed / 10) * 100).toFixed(0)}%</span>
                                            </div>
                                            <Progress value={(stats.max_speed / 10) * 100} className="h-2" />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    {/* TEAM B TAB */}
                    <TabsContent value="team-b" className="space-y-3">
                        {teamBPlayers.map(playerId => {
                            const stats = results.stats[playerId];
                            return (
                                <Card key={playerId}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">Player {playerId}</CardTitle>
                                            <Badge variant="destructive">Team B</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs">Distance</p>
                                                <p className="font-bold">{formatDistance(stats.total_distance)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Max Speed</p>
                                                <p className="font-bold">{formatSpeed(stats.max_speed)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">Sprints</p>
                                                <p className="font-bold">{stats.sprints}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Speed Performance</span>
                                                <span>{((stats.max_speed / 10) * 100).toFixed(0)}%</span>
                                            </div>
                                            <Progress value={(stats.max_speed / 10) * 100} className="h-2" />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    {/* PASSING TAB */}
                    <TabsContent value="passing" className="space-y-6">
                        {networkA && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Network className="w-4 h-4 text-primary" /> Team A Network
                                </h3>
                                <PassingNetworkViz network={networkA} teamName="Team A" width={600} height={400} />
                            </div>
                        )}
                        {networkB && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Network className="w-4 h-4 text-destructive" /> Team B Network
                                </h3>
                                <PassingNetworkViz network={networkB} teamName="Team B" width={600} height={400} />
                            </div>
                        )}
                        {!results.passes && (
                            <div className="text-center py-8 text-muted-foreground">
                                No passing data available. Enable pass detection in analysis settings.
                            </div>
                        )}
                    </TabsContent>

                    {/* HEATMAPS TAB */}
                    <TabsContent value="heatmaps" className="space-y-4">
                        <div className="flex items-center gap-4 justify-center">
                            <Button
                                variant={heatmapTeam === 'A' ? "default" : "outline"}
                                onClick={() => generateHeatmap('A')}
                                disabled={isLoadingHeatmap}
                            >
                                <Flame className="w-4 h-4 mr-2" /> Team A Heatmap
                            </Button>
                            <Button
                                variant={heatmapTeam === 'B' ? "destructive" : "outline"}
                                onClick={() => generateHeatmap('B')}
                                disabled={isLoadingHeatmap}
                            >
                                <Flame className="w-4 h-4 mr-2" /> Team B Heatmap
                            </Button>
                        </div>

                        {isLoadingHeatmap && (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-sm text-muted-foreground">Generating heatmap...</p>
                            </div>
                        )}

                        {heatmapUrl && !isLoadingHeatmap && (
                            <div className="border rounded-lg overflow-hidden bg-black/5">
                                <img src={heatmapUrl} alt="Heatmap" className="w-full h-auto object-contain" />
                            </div>
                        )}
                    </TabsContent>

                    {/* TACTICAL TAB */}
                    <TabsContent value="tactical" className="space-y-3">
                        {results.events.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No pressing events detected in this clip.</p>
                        ) : (
                            results.events.map((event, idx) => (
                                <Card key={idx}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-orange-500" />
                                                <div>
                                                    <p className="font-medium text-sm">Pressing Event</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Player {event.defender_id} pressing Player {event.attacker_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline">{formatTime(event.timestamp)}</Badge>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {event.distance}m separation
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};
