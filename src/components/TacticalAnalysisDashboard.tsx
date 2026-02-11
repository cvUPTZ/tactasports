import { LoggedEvent } from "@/hooks/useGamepad";
import { analyzeTactics, TacticalAnalysis, DerivedEvent } from "@/utils/analysisEngine";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Play, Clock, Filter, Sparkles, CheckSquare, Square, Lightbulb, Target, TrendingUp, Shield, Activity, Zap } from "lucide-react";
import { useState } from "react";
import { PlayerHeatmap } from "@/components/PlayerHeatmap";
import { VideoPlayer } from "@/components/VideoPlayer";
import { X } from "lucide-react";
import { PassingNetworkViz } from "@/components/PassingNetworkViz";

interface TacticalAnalysisDashboardProps {
    events: LoggedEvent[];
    onJumpToTime?: (time: number) => void;
    hasVideo?: boolean;
    videoFile?: File | null;
    teamNames?: { teamA: string, teamB: string };
    onRunClipAnalysis?: (clipStart: number, clipEnd: number) => Promise<void>;
}

export const TacticalAnalysisDashboard = ({
    events,
    onJumpToTime,
    hasVideo = false,
    videoFile = null,
    teamNames = { teamA: "Team A", teamB: "Team B" },
    onRunClipAnalysis
}: TacticalAnalysisDashboardProps) => {
    const analysis = analyzeTactics(events);
    const [clipFilter, setClipFilter] = useState<"ALL" | "POSSESSION" | "TRANSITION" | "HIGHLIGHT">("ALL");
    const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());

    // Clip Player State
    const [activeClip, setActiveClip] = useState<DerivedEvent | null>(null);
    const [isClipPlaying, setIsClipPlaying] = useState(false);
    const [clipSeekTime, setClipSeekTime] = useState<number | null>(null);

    if (events.length < 5) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tactical Analysis</CardTitle>
                    <CardDescription>Log more events (Pass, Possession Change) to see tactical insights.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const filteredClips = analysis.derivedEvents.filter(e => {
        if (clipFilter === "ALL") return true;
        if (clipFilter === "POSSESSION") return e.type === "POSSESSION_SEQUENCE" || e.type === "LONG_BUILDUP";
        if (clipFilter === "TRANSITION") return e.type === "TRANSITION_SEQUENCE" || e.type === "COUNTER_ATTACK" || e.type === "HIGH_TURNOVER";
        if (clipFilter === "HIGHLIGHT") return e.type === "COUNTER_ATTACK" || e.type === "HIGH_TURNOVER" || e.type === "DIRECT_ATTACK";
        return true;
    });

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Tactical Analysis</CardTitle>
                <CardDescription>Deep dive into possession, passing, and team stability.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="possession" className="w-full">
                    <TabsList className="grid w-full grid-cols-8">
                        <TabsTrigger value="possession">Possession</TabsTrigger>
                        <TabsTrigger value="passing">Passing</TabsTrigger>
                        <TabsTrigger value="network">Network</TabsTrigger>
                        <TabsTrigger value="transitions">Transitions</TabsTrigger>
                        <TabsTrigger value="stability">Stability</TabsTrigger>
                        <TabsTrigger value="tempo">Tempo</TabsTrigger>
                        <TabsTrigger value="clips">Clips</TabsTrigger>
                        <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
                        <TabsTrigger value="insights">Insights</TabsTrigger>
                    </TabsList>

                    {/* INSIGHTS TAB */}
                    <TabsContent value="insights" className="space-y-6 mt-4">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-center flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                    {teamNames.teamA} KPIs
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <KPICard title="Attack Eff." value={analysis.kpis.teamA.attackEfficiency} icon={<Target className="w-4 h-4" />} />
                                    <KPICard title="Defense" value={analysis.kpis.teamA.defenseSolidity} icon={<Shield className="w-4 h-4" />} />
                                    <KPICard title="Control" value={analysis.kpis.teamA.possessionControl} icon={<Activity className="w-4 h-4" />} />
                                    <KPICard title="Speed" value={analysis.kpis.teamA.transitionSpeed} icon={<Zap className="w-4 h-4" />} />
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        AI Recommendations
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.recommendations.teamA.map((rec, i) => (
                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                <span className="text-primary mt-1">•</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-center flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-destructive" />
                                    {teamNames.teamB} KPIs
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <KPICard title="Attack Eff." value={analysis.kpis.teamB.attackEfficiency} icon={<Target className="w-4 h-4" />} color="text-destructive" />
                                    <KPICard title="Defense" value={analysis.kpis.teamB.defenseSolidity} icon={<Shield className="w-4 h-4" />} color="text-destructive" />
                                    <KPICard title="Control" value={analysis.kpis.teamB.possessionControl} icon={<Activity className="w-4 h-4" />} color="text-destructive" />
                                    <KPICard title="Speed" value={analysis.kpis.teamB.transitionSpeed} icon={<Zap className="w-4 h-4" />} color="text-destructive" />
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        AI Recommendations
                                    </h4>
                                    <ul className="space-y-2">
                                        {analysis.recommendations.teamB.map((rec, i) => (
                                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                                <span className="text-destructive mt-1">•</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="possession" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <TeamStatCard
                                title="Possession %"
                                teamA={analysis.possession.teamA.percentage}
                                teamB={analysis.possession.teamB.percentage}
                                suffix="%"
                                teamNames={teamNames}
                            />
                            <TeamStatCard
                                title="Avg Phase Duration"
                                teamA={analysis.possession.teamA.phases.avgDuration}
                                teamB={analysis.possession.teamB.phases.avgDuration}
                                suffix="s"
                                teamNames={teamNames}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-center">{teamNames.teamA} Phases</h4>
                                <PhaseBar stats={analysis.possession.teamA.phases.types} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-center">{teamNames.teamB} Phases</h4>
                                <PhaseBar stats={analysis.possession.teamB.phases.types} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* PASSING TAB */}
                    <TabsContent value="passing" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <TeamStatCard
                                title="Passes per Possession"
                                teamA={analysis.passing.teamA.perPossession}
                                teamB={analysis.passing.teamB.perPossession}
                                teamNames={teamNames}
                            />
                            <TeamStatCard
                                title="Pass Accuracy (Est)"
                                teamA={analysis.passing.teamA.accuracy}
                                teamB={analysis.passing.teamB.accuracy}
                                suffix="%"
                                teamNames={teamNames}
                            />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-8">
                            <BuildUpStats team={teamNames.teamA} stats={analysis.passing.teamA.buildUp} />
                            <BuildUpStats team={teamNames.teamB} stats={analysis.passing.teamB.buildUp} />
                        </div>
                    </TabsContent>

                    {/* NETWORK TAB */}
                    <TabsContent value="network" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <PassingNetworkViz
                                network={analysis.passingNetworks.teamA as any}
                                teamName={teamNames.teamA}
                            />
                            <PassingNetworkViz
                                network={analysis.passingNetworks.teamB as any}
                                teamName={teamNames.teamB}
                            />
                        </div>
                    </TabsContent>

                    {/* TRANSITIONS TAB */}
                    <TabsContent value="transitions" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <TeamStatCard
                                title="Counter Attacks"
                                teamA={analysis.transitions.teamA.counterAttacks}
                                teamB={analysis.transitions.teamB.counterAttacks}
                                teamNames={teamNames}
                            />
                            <TeamStatCard
                                title="Turnovers (Total)"
                                teamA={analysis.transitions.teamA.turnovers.total}
                                teamB={analysis.transitions.teamB.turnovers.total}
                                teamNames={teamNames}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-8 mt-4">
                            <TurnoverZones team={teamNames.teamA} stats={analysis.transitions.teamA.turnovers} />
                            <TurnoverZones team={teamNames.teamB} stats={analysis.transitions.teamB.turnovers} />
                        </div>
                    </TabsContent>

                    {/* STABILITY TAB */}
                    <TabsContent value="stability" className="space-y-4 mt-4">
                        <TeamStatCard
                            title="Press Resistance"
                            teamA={analysis.stability.teamA.pressResistance}
                            teamB={analysis.stability.teamB.pressResistance}
                            suffix="%"
                            description="% of possessions > 1 pass"
                            teamNames={teamNames}
                        />
                        <TeamStatCard
                            title="One-Pass Losses"
                            teamA={analysis.stability.teamA.onePassLosses}
                            teamB={analysis.stability.teamB.onePassLosses}
                            description="Possessions lost immediately"
                            teamNames={teamNames}
                        />
                    </TabsContent>

                    {/* TEMPO TAB */}
                    <TabsContent value="tempo" className="space-y-4 mt-4">
                        <TeamStatCard
                            title="Passes per Minute"
                            teamA={analysis.tempo.teamA.passesPerMinute}
                            teamB={analysis.tempo.teamB.passesPerMinute}
                            teamNames={teamNames}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border rounded bg-muted/20">
                                <h4 className="font-semibold mb-2 text-center">{teamNames.teamA} Style</h4>
                                <div className="flex justify-between text-sm">
                                    <span>Class:</span>
                                    <span className="font-bold">{analysis.style.teamA.classification}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Directness:</span>
                                    <span>{analysis.style.teamA.directness.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="p-4 border rounded bg-muted/20">
                                <h4 className="font-semibold mb-2 text-center">{teamNames.teamB} Style</h4>
                                <div className="flex justify-between text-sm">
                                    <span>Class:</span>
                                    <span className="font-bold">{analysis.style.teamB.classification}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Directness:</span>
                                    <span>{analysis.style.teamB.directness.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* CLIPS TAB */}
                    <TabsContent value="clips" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            {/* Dedicated Clip Player */}
                            {activeClip && videoFile && (
                                <div className="rounded-lg border bg-card overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${activeClip.team === 'TEAM_A' ? 'bg-primary' : activeClip.team === 'TEAM_B' ? 'bg-destructive' : 'bg-gray-400'}`} />
                                            <span className="font-semibold text-sm">Now Playing: {activeClip.name}</span>
                                            <span className="text-xs text-muted-foreground">({formatDuration(activeClip.endTime - activeClip.startTime)})</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                                            onClick={() => {
                                                setActiveClip(null);
                                                setIsClipPlaying(false);
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="p-2 bg-black">
                                        <VideoPlayer
                                            videoFile={videoFile}
                                            events={[]}
                                            onTimeUpdate={(time) => {
                                                // Auto-pause at end of clip
                                                if (activeClip && isClipPlaying && time >= activeClip.endTime) {
                                                    setIsClipPlaying(false);
                                                }
                                            }}
                                            seekTo={clipSeekTime}
                                            isPlaying={isClipPlaying}
                                            onPlayPause={setIsClipPlaying}
                                            onSeekComplete={() => setClipSeekTime(null)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Header with filters */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold">Tactical Clips</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {filteredClips.length} {filteredClips.length === 1 ? 'clip' : 'clips'} found
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant={clipFilter === "ALL" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setClipFilter("ALL")}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant={clipFilter === "POSSESSION" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setClipFilter("POSSESSION")}
                                    >
                                        Possessions
                                    </Button>
                                    <Button
                                        variant={clipFilter === "TRANSITION" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setClipFilter("TRANSITION")}
                                    >
                                        Transitions
                                    </Button>
                                    <Button
                                        variant={clipFilter === "HIGHLIGHT" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setClipFilter("HIGHLIGHT")}
                                    >
                                        Highlights
                                    </Button>
                                </div>
                            </div>

                            {filteredClips.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Play className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">No clips found for this category</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try selecting a different filter</p>
                                </div>
                            ) : (
                                <>
                                    {/* Batch Actions Bar */}
                                    {selectedClipIds.size > 0 && onRunClipAnalysis && hasVideo && (
                                        <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckSquare className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium">
                                                    {selectedClipIds.size} clip{selectedClipIds.size > 1 ? 's' : ''} selected
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedClipIds(new Set())}
                                                >
                                                    Clear
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        const selectedClips = filteredClips.filter(c => selectedClipIds.has(c.id));
                                                        if (selectedClips.length === 0) return;

                                                        // Create array of all selected clip ranges
                                                        const ranges = selectedClips.map(c => ({ start: c.startTime, end: c.endTime }));

                                                        // Sort and merge overlapping ranges
                                                        ranges.sort((a, b) => a.start - b.start);
                                                        const merged = [ranges[0]];
                                                        for (let i = 1; i < ranges.length; i++) {
                                                            const last = merged[merged.length - 1];
                                                            if (ranges[i].start <= last.end) {
                                                                last.end = Math.max(last.end, ranges[i].end);
                                                            } else {
                                                                merged.push(ranges[i]);
                                                            }
                                                        }

                                                        // Run analysis on the first merged range (or all if you want)
                                                        await onRunClipAnalysis(merged[0].start, merged[merged.length - 1].end);
                                                        setSelectedClipIds(new Set());
                                                    }}
                                                >
                                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                                    Analyze Selected
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                                        {filteredClips.map((event) => {
                                            const isSelected = selectedClipIds.has(event.id);
                                            return (
                                                <div
                                                    key={event.id}
                                                    className={`group relative border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-all duration-200 ${activeClip?.id === event.id ? 'ring-2 ring-primary' : ''
                                                        } ${isSelected ? 'ring-2 ring-blue-500' : ''
                                                        }`}
                                                >
                                                    {/* Thumbnail area with gradient overlay */}
                                                    <div className="relative h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden">
                                                        {/* Selection Checkbox */}
                                                        {onRunClipAnalysis && hasVideo && (
                                                            <div className="absolute top-2 left-2 z-10">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="w-6 h-6 rounded bg-white/90 hover:bg-white p-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedClipIds(prev => {
                                                                            const newSet = new Set(prev);
                                                                            if (newSet.has(event.id)) {
                                                                                newSet.delete(event.id);
                                                                            } else {
                                                                                newSet.add(event.id);
                                                                            }
                                                                            return newSet;
                                                                        });
                                                                    }}
                                                                >
                                                                    {isSelected ? (
                                                                        <CheckSquare className="w-4 h-4 text-blue-600" />
                                                                    ) : (
                                                                        <Square className="w-4 h-4 text-gray-600" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Team color accent bar */}
                                                        <div className={`absolute top-0 left-0 right-0 h-1 ${event.team === 'TEAM_A' ? 'bg-primary' : event.team === 'TEAM_B' ? 'bg-destructive' : 'bg-gray-400'}`} />

                                                        {/* Play overlay */}
                                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="w-12 h-12 rounded-full bg-white/90 hover:bg-white hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                                                onClick={() => {
                                                                    if (hasVideo) {
                                                                        setActiveClip(event);
                                                                        setClipSeekTime(event.startTime);
                                                                        setIsClipPlaying(true);
                                                                    } else if (onJumpToTime) {
                                                                        onJumpToTime(event.startTime);
                                                                    }
                                                                }}
                                                            >
                                                                <Play className="w-6 h-6 text-gray-900 ml-0.5" />
                                                            </Button>
                                                        </div>

                                                        {/* Duration badge */}
                                                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-mono">
                                                            {formatDuration(event.endTime - event.startTime)}
                                                        </div>

                                                        {/* Type badge */}
                                                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-semibold uppercase tracking-wide">
                                                            {event.type.replace('_', ' ')}
                                                        </div>
                                                    </div>

                                                    {/* Content area */}
                                                    <div className="p-3 space-y-2">
                                                        {/* Title and team */}
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-sm truncate">{event.name}</h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                                    {event.description}
                                                                </p>
                                                            </div>
                                                            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${event.team === 'TEAM_A' ? 'bg-primary' : event.team === 'TEAM_B' ? 'bg-destructive' : 'bg-gray-400'}`} />
                                                        </div>

                                                        {/* Metadata row */}
                                                        <div className="flex items-center justify-between pt-2 border-t">
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="font-mono">{formatTime(event.startTime)}</span>
                                                            </div>

                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant={activeClip?.id === event.id ? "default" : "ghost"}
                                                                    size="sm"
                                                                    className="h-7 px-3 text-xs font-medium"
                                                                    disabled={!hasVideo}
                                                                    title={!hasVideo ? "Upload a video first to play clips" : "Play this clip"}
                                                                    onClick={() => {
                                                                        if (hasVideo) {
                                                                            setActiveClip(event);
                                                                            setClipSeekTime(event.startTime);
                                                                            setIsClipPlaying(true);
                                                                        } else if (onJumpToTime) {
                                                                            onJumpToTime(event.startTime);
                                                                        }
                                                                    }}
                                                                >
                                                                    {activeClip?.id === event.id && isClipPlaying ? (
                                                                        <>
                                                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1.5" />
                                                                            Playing
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play className="w-3 h-3 mr-1.5" />
                                                                            Play
                                                                        </>
                                                                    )}
                                                                </Button>
                                                                {onRunClipAnalysis && hasVideo && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        title="Run AI analysis on this clip only"
                                                                        onClick={() => onRunClipAnalysis(event.startTime, event.endTime)}
                                                                    >
                                                                        <Sparkles className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* HEATMAPS TAB */}
                    <TabsContent value="heatmaps" className="mt-4">
                        <PlayerHeatmap videoFile={videoFile} teamNames={teamNames} />
                    </TabsContent>
                </Tabs>
            </CardContent >
        </Card >
    );
};

// --- Sub-components ---

const TeamStatCard = ({ title, teamA, teamB, suffix = "", description, teamNames }: { title: string, teamA: number, teamB: number, suffix?: string, description?: string, teamNames: { teamA: string, teamB: string } }) => (
    <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-2 text-center">{title}</h3>
        <div className="flex justify-between items-end">
            <div className="text-center w-1/2 border-r">
                <div className="text-2xl font-bold text-primary">{teamA.toFixed(1)}{suffix}</div>
                <div className="text-xs text-muted-foreground">{teamNames.teamA}</div>
            </div>
            <div className="text-center w-1/2">
                <div className="text-2xl font-bold text-destructive">{teamB.toFixed(1)}{suffix}</div>
                <div className="text-xs text-muted-foreground">{teamNames.teamB}</div>
            </div>
        </div>
        {description && <p className="text-xs text-center mt-2 text-muted-foreground">{description}</p>}
    </div>
);

const PhaseBar = ({ stats }: { stats: { short: number, medium: number, long: number } }) => {
    const total = stats.short + stats.medium + stats.long || 1;
    return (
        <div className="flex h-4 w-full rounded-full overflow-hidden">
            <div style={{ width: `${(stats.short / total) * 100}%` }} className="bg-red-400" title={`Short: ${stats.short}`} />
            <div style={{ width: `${(stats.medium / total) * 100}%` }} className="bg-yellow-400" title={`Medium: ${stats.medium}`} />
            <div style={{ width: `${(stats.long / total) * 100}%` }} className="bg-green-400" title={`Long: ${stats.long}`} />
        </div>
    );
};

const BuildUpStats = ({ team, stats }: { team: string, stats: { short: number, medium: number, long: number } }) => (
    <div className="space-y-2">
        <h4 className="text-sm font-medium">{team} Build-up</h4>
        <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Short (1-3):</span> <span className="font-mono">{stats.short}</span></div>
            <div className="flex justify-between"><span>Medium (4-10):</span> <span className="font-mono">{stats.medium}</span></div>
            <div className="flex justify-between"><span>Long (10+):</span> <span className="font-mono">{stats.long}</span></div>
        </div>
    </div>
);

const TurnoverZones = ({ team, stats }: { team: string, stats: { high: number, mid: number, low: number } }) => (
    <div className="space-y-2">
        <h4 className="text-sm font-medium">{team} Turnovers</h4>
        <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>High (Zone 3):</span> <span className="font-mono">{stats.high}</span></div>
            <div className="flex justify-between"><span>Mid (Zone 2):</span> <span className="font-mono">{stats.mid}</span></div>
            <div className="flex justify-between"><span>Low (Zone 1):</span> <span className="font-mono">{stats.low}</span></div>
        </div>
    </div>
);

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number) => {
    const secs = Math.floor(seconds);
    if (secs < 60) {
        return `${secs}s`;
    }
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
};

const KPICard = ({ title, value, icon, color = "text-primary" }: { title: string, value: number, icon: React.ReactNode, color?: string }) => (
    <div className="p-3 bg-card border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">{title}</span>
            <span className={`${color} opacity-80`}>{icon}</span>
        </div>
        <div className="flex items-end gap-2">
            <span className={`text-xl font-bold ${color}`}>{value.toFixed(0)}</span>
            <div className="h-1.5 flex-1 bg-muted rounded-full mb-1.5 overflow-hidden">
                <div className={`h-full ${color === "text-primary" ? "bg-primary" : "bg-destructive"}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    </div>
);

