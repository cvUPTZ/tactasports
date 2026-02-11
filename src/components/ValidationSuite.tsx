import React, { useState, useMemo } from 'react';
import { LoggedEvent } from '@/hooks/useGamepad';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ANALYSIS_API_URL, API_BASE_URL, API_HEADERS } from '@/utils/apiConfig';
import {
    CheckCircle2,
    AlertCircle,
    History,
    Edit3,
    CheckCircle,
    XSquare,
    Filter,
    Search,
    ArrowRight,
    ShieldCheck,
    AlertTriangle,
    ExternalLink,
    ChevronRight,
    Users,
    Loader2,
    CheckSquare,
    Activity,
    Link2Off,
    Workflow
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENT_DEFINITIONS } from '@/data/eventDefinitions';
import { useEventConfig } from '@/contexts/EventConfigContext';
import { generateEventFilename } from '@/utils/eventNaming';

interface ValidationSuiteProps {
    events: LoggedEvent[];
    availablePlayers?: { id: number; name: string }[];
    videoFile: File | null;
    matchName: string;
    onUpdateEvent: (updatedEvent: LoggedEvent) => void;
    onAddEvent: (newEvent: LoggedEvent) => void;
    onSeekToEvent: (time: number) => void;
}

export const ValidationSuite: React.FC<ValidationSuiteProps> = ({
    events,
    availablePlayers = [],
    videoFile,
    matchName,
    onUpdateEvent,
    onAddEvent,
    onSeekToEvent
}) => {
    const { toast } = useToast();
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'incomplete'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingClipId, setSendingClipId] = useState<number | null>(null);
    const { events: eventsConfig } = useEventConfig();
    const availableEvents = eventsConfig.length > 0 ? eventsConfig : EVENT_DEFINITIONS;

    // Color mapping for event types
    const getEventColor = (eventName: string) => {
        const name = eventName.toLowerCase();
        if (name.includes('goal')) return 'bg-green-500/20 text-green-600 border-green-500/30';
        if (name.includes('pass')) return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
        if (name.includes('foul') || name.includes('card')) return 'bg-red-500/20 text-red-600 border-red-500/30';
        if (name.includes('offside')) return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
        if (name.includes('defense') || name.includes('press')) return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
        return 'bg-muted text-muted-foreground border-border';
    };

    const stats = useMemo(() => {
        const total = events.length;
        const validated = events.filter(e => e.isValidated).length;
        const missingPlayer = events.filter(e => !e.player).length;
        const lowQuality = events.filter(e => e.qualityRating && e.qualityRating < 2).length;

        // Calculate orphaned passes
        const orphanedPasses = events.filter((e, idx) => {
            if (e.eventName !== 'pass_start') return false;
            // Events AFTER in time are at indices 0 to idx-1 (nearest is idx-1)
            const nextEvent = events.slice(0, idx).reverse().find(next =>
                ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
            );
            return !nextEvent || nextEvent.eventName !== 'pass_end';
        }).length;

        return { total, validated, missingPlayer, lowQuality, orphanedPasses };
    }, [events]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const isOrphaned = e.eventName === 'pass_start' && (() => {
                const idx = events.findIndex(event => event.id === e.id);
                const nextEvent = events.slice(0, idx).reverse().find(next =>
                    ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
                );
                return !nextEvent || nextEvent.eventName !== 'pass_end';
            })();

            const matchesFilter = filter === 'all' ||
                (filter === 'pending' && !e.isValidated) ||
                (filter === 'validated' && e.isValidated) ||
                (filter === 'incomplete' && isOrphaned);
            const matchesSearch = (e.eventName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.player?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [events, filter, searchQuery]);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    const handleExtractSequence = async (event: LoggedEvent) => {
        if (!videoFile || event.videoTime === undefined) return;

        try {
            toast({ title: "Extracting Clip...", description: `Saving sequence for ${event.eventName}` });

            // Lookup Event Definition from Dynamic Config
            const matchDate = matchName.match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().split('T')[0];
            const relativePath = generateEventFilename(event, matchDate, availableEvents as any);

            // Remove leading slash if present to ensure it's treated as relative by the server
            const outputRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

            const definition = availableEvents.find(def => def.eventName === event.eventName);
            // Use config defaultDuration (max) or fallback
            // defaultDuration might be [min, max], we use max for clip length. StartTime handles pre-roll.
            const duration = (definition as any)?.defaultDuration ? (definition as any).defaultDuration[1] : ((definition as any)?.clipDuration || 10);

            // Default preRoll if not sending explicit timestamp (though we send startTime)
            const preRoll = 5;

            const response = await fetch(`${API_BASE_URL}/api/extract-clip`, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({
                    videoPath: `./public/uploads/${videoFile.name}`,
                    startTime: Math.max(0, event.videoTime - preRoll),
                    duration: duration,
                    outputRelativePath: outputRelativePath,
                    // Legacy fields backup
                    eventType: event.eventName,
                    eventName: `${event.team || 'Match'}_${event.player?.name || 'Player'}`
                })
            });

            const data = await response.json();
            if (data.success) {
                toast({ title: "Clip Extracted", description: "Saved to " + data.url });
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Extraction Failed", description: "Could not save clip.", variant: "destructive" });
        }
    };

    const handleToggleValidation = (event: LoggedEvent) => {
        const isValid = !event.isValidated;
        onUpdateEvent({
            ...event,
            isValidated: isValid,
            reviewedBy: 'Early Tester'
        });

        if (isValid) {
            handleExtractSequence(event);
        }
    };

    const handleBulkVerify = () => {
        const pending = filteredEvents.filter(e => !e.isValidated);
        if (pending.length === 0) return;

        pending.forEach(event => {
            onUpdateEvent({
                ...event,
                isValidated: true,
                reviewedBy: 'Lead Analyst'
            });
            // Auto-extract for bulk might be too heavy? Let's do it for now or maybe skip.
            // handleExtractSequence(event); 
        });

        toast({
            title: "Bulk Verification Complete",
            description: `Validated ${pending.length} events.`
        });
    };

    const handleSendToCrowd = async (event: LoggedEvent) => {
        if (!videoFile) {
            toast({
                title: "Error",
                description: "Load a video file first.",
                variant: "destructive"
            });
            return;
        }

        const tacticalEvents = ['goal', 'shot', 'foul', 'offside', 'penalty', 'corner', 'red_card', 'yellow_card', 'pass_start', 'handball'];
        const isTactical = tacticalEvents.some(te => event.eventName.toLowerCase().includes(te));

        if (!isTactical) {
            toast({
                title: "Not a Tactical Event",
                description: "Only critical tactical events (Goals, Fouls, Shots, etc.) are sent to the crowd.",
                variant: "destructive"
            });
            return;
        }

        setSendingClipId(event.id);
        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('timestamp_seconds', (event.videoTime || 0).toString());
            formData.append('match_name', matchName);
            formData.append('event_type', event.eventName);
            formData.append('window_seconds', '8.0'); // Targeted clip

            const response = await fetch(`${ANALYSIS_API_URL}/api/crowd/request-review-upload`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                toast({
                    title: "Sent to Crowd!",
                    description: `Analyst request for '${event.eventName}' broadcasted to fans.`
                });
                onUpdateEvent({
                    ...event,
                    validationNotes: (event.validationNotes || '') + "\n[Crowd Review Requested]"
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: "Request Failed",
                description: error instanceof Error ? error.message : "Failed to sync with crowd API",
                variant: "destructive"
            });
        } finally {
            setSendingClipId(null);
        }
    };

    const handleResolvePass = (event: LoggedEvent) => {
        if (event.videoTime !== undefined) {
            onSeekToEvent(event.videoTime);
            setSelectedEventId(event.id);
        }
    };

    const handleCreatePassEnd = (parentEvent: LoggedEvent) => {
        const newEvent: LoggedEvent = {
            id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
            timestamp: new Date().toISOString(),
            eventName: "pass_end",
            team: parentEvent.team,
            buttonLabel: "Validation Fix",
            matchTime: parentEvent.matchTime,
            videoTime: parentEvent.videoTime !== undefined ? parentEvent.videoTime + 2 : undefined, // +2s offset as a reasonable default
            player: parentEvent.player, // Initially same player, intended to be changed by analyst
            mode: parentEvent.mode,
            isValidated: true,
            reviewedBy: 'Lead Analyst (Manual Fix)'
        };
        onAddEvent(newEvent);
        toast({
            title: "Pass End Registered",
            description: "A pass_end event has been inserted after the start point."
        });
    };

    return (
        <div className="flex flex-col h-full gap-4 text-sm">
            {/* 1. TOP STATS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="p-2 bg-card/50 border-2 border-primary/20 flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Validation Progress</span>
                    <div className="flex items-end gap-2">
                        <span className="text-lg font-black">{stats.validated}</span>
                        <span className="text-muted-foreground mb-1 text-[10px]">/ {stats.total}</span>
                        <Badge className="ml-auto mb-0" variant="outline">{Math.round((stats.validated / stats.total) * 100 || 0)}%</Badge>
                    </div>
                </Card>

                <Card className="p-2 bg-yellow-500/5 border-2 border-yellow-500/20 flex flex-col gap-1">
                    <span className="text-[9px] text-yellow-600 uppercase font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Missing Players
                    </span>
                    <span className="text-lg font-black text-yellow-600">{stats.missingPlayer}</span>
                </Card>

                <Card className="p-2 bg-blue-500/5 border-2 border-blue-500/20 flex flex-col gap-1">
                    <span className="text-[9px] text-blue-600 uppercase font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> QA Passed
                    </span>
                    <span className="text-lg font-black text-blue-600">{stats.validated}</span>
                </Card>

                <Card className="p-2 bg-destructive/5 border-2 border-destructive/20 flex flex-col gap-1">
                    <span className="text-[9px] text-destructive uppercase font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Flagged (Low Qual)
                    </span>
                    <span className="text-lg font-black text-destructive">{stats.lowQuality}</span>
                </Card>

                <Card className="p-2 bg-orange-500/5 border-2 border-orange-500/20 flex flex-col gap-1">
                    <span className="text-[9px] text-orange-600 uppercase font-bold flex items-center gap-1">
                        <Link2Off className="w-3 h-3" /> Incomplete Passes
                    </span>
                    <span className="text-lg font-black text-orange-600">{stats.orphanedPasses}</span>
                </Card>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                {/* 2. EVENT REVIEW LIST */}
                <Card className="w-full md:w-2/3 flex flex-col overflow-hidden bg-card/30 backdrop-blur-md border-border/50">
                    <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4 bg-muted/20">
                        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border">
                            <Button
                                variant={filter === 'all' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                variant={filter === 'pending' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setFilter('pending')}
                            >
                                Pending
                            </Button>
                            <Button
                                variant={filter === 'validated' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setFilter('validated')}
                            >
                                Validated
                            </Button>
                            <Button
                                variant={filter === 'incomplete' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setFilter('incomplete')}
                            >
                                Incomplete
                            </Button>
                        </div>

                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search events or players..."
                                className="pl-9 h-9 text-xs bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 border-primary/30 hover:bg-primary/5"
                            onClick={handleBulkVerify}
                        >
                            <CheckSquare className="w-4 h-4 text-primary" />
                            Verify All ({filteredEvents.filter(e => !e.isValidated).length})
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-border/50">
                            {filteredEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => setSelectedEventId(event.id)}
                                    className={cn(
                                        "p-3 flex items-center gap-4 hover:bg-primary/5 transition-all cursor-pointer group",
                                        selectedEventId === event.id && "bg-primary/10 border-r-4 border-r-primary shadow-inner"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        event.isValidated ? "bg-green-500" : (
                                            event.eventName === 'pass_start' && (() => {
                                                const idx = events.findIndex(e => e.id === event.id);
                                                const nextEvent = events.slice(0, idx).reverse().find(next =>
                                                    ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
                                                );
                                                return !nextEvent || nextEvent.eventName !== 'pass_end';
                                            })() ? "bg-orange-500 animate-bounce" : "bg-yellow-500 animate-pulse"
                                        )
                                    )} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 font-bold uppercase", getEventColor(event.eventName))}>
                                                {event.eventName}
                                            </Badge>
                                            {event.psychology && (
                                                <span className={cn(
                                                    "text-[8px] px-1 rounded-sm font-black uppercase text-white",
                                                    event.psychology === 'SPIRIT' ? "bg-orange-600" :
                                                        event.psychology === 'EGO' ? "bg-blue-600" :
                                                            event.psychology === 'FEAR' ? "bg-amber-600" :
                                                                "bg-neutral-600"
                                                )}>
                                                    {event.psychology}
                                                </span>
                                            )}
                                            {event.semanticIndicator && (
                                                <span className="text-[8px] px-1 rounded-sm bg-primary/20 text-primary border border-primary/30 font-bold uppercase truncate max-w-[80px]">
                                                    {event.semanticIndicator}
                                                </span>
                                            )}
                                            {event.eventName === 'pass_start' && (() => {
                                                const idx = events.findIndex(e => e.id === event.id);
                                                const nextEvent = events.slice(0, idx).reverse().find(next =>
                                                    ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
                                                );
                                                return !nextEvent || nextEvent.eventName !== 'pass_end';
                                            })() && (
                                                    <Badge variant="destructive" className="text-[8px] h-4 flex items-center gap-1 font-black">
                                                        <Link2Off className="w-2 h-2" /> MISSING END
                                                    </Badge>
                                                )}
                                            <span className="text-[10px] opacity-70 font-mono ml-auto">@{event.matchTime}</span>
                                        </div>
                                        <div className="text-xs font-medium mt-1 truncate">
                                            {event.player?.name || <span className="text-destructive italic">Anonymous Player</span>}
                                            <span className="text-muted-foreground mx-1">•</span>
                                            <span className="text-muted-foreground">{event.corridor || 'Zone N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-background"
                                            title="Sync Player"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (event.videoTime !== undefined) onSeekToEvent(event.videoTime);
                                            }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn("h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600", sendingClipId === event.id && "animate-spin")}
                                            title="Send to Fan Voting"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendToCrowd(event);
                                            }}
                                            disabled={sendingClipId !== null}
                                        >
                                            {sendingClipId === event.id ? <Loader2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                        </Button>

                                        {event.eventName === 'pass_start' && (() => {
                                            const idx = events.findIndex(e => e.id === event.id);
                                            const nextEvent = events.slice(idx + 1).find(next =>
                                                ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
                                            );
                                            return !nextEvent || nextEvent.eventName !== 'pass_end';
                                        })() && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResolvePass(event);
                                                    }}
                                                >
                                                    RESOLVE
                                                </Button>
                                            )}

                                        <Button
                                            variant={event.isValidated ? "ghost" : "default"}
                                            size="sm"
                                            className="h-7 px-3 text-[10px] font-bold"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleValidation(event);
                                            }}
                                        >
                                            {event.isValidated ? "REFUTE" : "VERIFY"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>

                {/* 3. EVENT DETAILS & CORRECTION */}
                <div className="hidden md:flex w-1/3 flex-col gap-4">
                    <Card className="flex-1 p-4 bg-card shadow-xl border-2 border-primary/5 flex flex-col">
                        {selectedEvent ? (
                            <div className="space-y-4 flex-1 flex flex-col">
                                <div className="flex items-center justify-between pb-2 border-b">
                                    <h4 className="font-bold flex items-center gap-2 uppercase tracking-tighter text-xs">
                                        <Edit3 className="w-4 h-4 text-primary" /> Event Correction
                                    </h4>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">ID: {selectedEvent.id.toString().slice(-6)}</Badge>
                                </div>

                                <ScrollArea className="flex-1 pr-2">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-black">Event Type</label>
                                                <select
                                                    className="w-full h-8 bg-muted/30 rounded-md text-xs border border-border px-2"
                                                    value={selectedEvent.eventName}
                                                    onChange={(e) => {
                                                        const newName = e.target.value;
                                                        const def = availableEvents.find(d => d.eventName === newName);
                                                        onUpdateEvent({
                                                            ...selectedEvent,
                                                            eventName: newName,
                                                            validationNotes: (selectedEvent.validationNotes || '')
                                                        });
                                                    }}
                                                >
                                                    <option value={selectedEvent.eventName}>{selectedEvent.eventName} (Current)</option>
                                                    {Array.from(new Set(availableEvents.map(d => d.category))).map(category => (
                                                        <optgroup key={category} label={category}>
                                                            {availableEvents.filter(d => d.category === category).map(def => (
                                                                <option key={def.id} value={def.eventName}>
                                                                    {def.eventName}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-black">Position (TS)</label>
                                                <Input defaultValue={selectedEvent.matchTime} className="h-8 text-xs bg-muted/30" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] text-muted-foreground uppercase font-black">Assign Actor</label>
                                            <select
                                                className="w-full h-8 bg-muted/30 rounded-md text-xs border border-border px-2 focus:ring-1 ring-primary"
                                                value={selectedEvent.player?.id || ''}
                                                onChange={(e) => {
                                                    const playerId = parseInt(e.target.value);
                                                    const player = availablePlayers.find(p => p.id === playerId);
                                                    if (player) {
                                                        onUpdateEvent({
                                                            ...selectedEvent,
                                                            player: { id: player.id, name: player.name }
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="">Select Local Player...</option>
                                                {availablePlayers.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-black">Quality Vetting</label>
                                                <select
                                                    className="w-full h-8 bg-muted/30 rounded-md text-xs border border-border px-2"
                                                    defaultValue={selectedEvent.qualityRating}
                                                >
                                                    {[1, 2, 3, 4, 5].map(v => (
                                                        <option key={v} value={v}>Lvl {v} - {v > 3 ? 'High' : 'Low'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-muted-foreground uppercase font-black">Tempo</label>
                                                <Badge variant="secondary" className="h-8 w-full justify-center text-[10px] bg-muted/50">{selectedEvent.tempo || 'MODERATE'}</Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-1 pt-2 border-t border-dashed">
                                            <label className="text-[10px] text-primary uppercase font-black flex items-center gap-1">
                                                <Activity className="w-3 h-3" /> Semantic Intelligence Layer
                                            </label>

                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Tactical Indicator</label>
                                                    <select
                                                        className="w-full h-8 bg-primary/5 rounded-md text-[10px] border border-primary/20 px-2"
                                                        value={selectedEvent.semanticIndicator || ''}
                                                        onChange={(e) => onUpdateEvent({ ...selectedEvent, semanticIndicator: e.target.value })}
                                                    >
                                                        <option value="">None</option>
                                                        <option value="Defensive Block Height">Defensive Block Height</option>
                                                        <option value="Momentum Shift">Momentum Shift</option>
                                                        <option value="Width/Depth Ratio">Width/Depth Ratio</option>
                                                        <option value="Transition Vulnerability">Transition Vulnerability</option>
                                                        <option value="Decision Efficiency">Decision Efficiency</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Psychology</label>
                                                    <select
                                                        className="w-full h-8 bg-orange-500/5 rounded-md text-[10px] border border-orange-500/20 px-2"
                                                        value={selectedEvent.psychology || ''}
                                                        onChange={(e) => onUpdateEvent({ ...selectedEvent, psychology: e.target.value as any })}
                                                    >
                                                        <option value="">Neutral</option>
                                                        <option value="SPIRIT">Spirit 🔥 (Duels/Recoveries)</option>
                                                        <option value="EGO">Ego 💎 (Selfish Actions)</option>
                                                        <option value="FEAR">Fear 😨 (Backpasses)</option>
                                                        <option value="COMA">Coma 😴 (Simple Losses)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Intensity / Impact</label>
                                                    <div className="flex gap-1">
                                                        {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                                                            <Button
                                                                key={level}
                                                                variant={selectedEvent.intensity === level ? 'default' : 'outline'}
                                                                size="sm"
                                                                className="flex-1 h-7 text-[9px] px-0"
                                                                onClick={() => onUpdateEvent({ ...selectedEvent, intensity: level as any })}
                                                            >
                                                                {level}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Contextual Factor</label>
                                                    <select
                                                        className="w-full h-8 bg-muted/30 rounded-md text-[10px] border border-border px-2"
                                                        value={selectedEvent.contextualFactor || ''}
                                                        onChange={(e) => onUpdateEvent({ ...selectedEvent, contextualFactor: e.target.value })}
                                                    >
                                                        <option value="">Normal Play</option>
                                                        <option value="Post-Goal">Post-Goal Balance</option>
                                                        <option value="Ref Decision">Ref Decision Impact</option>
                                                        <option value="Final Minutes">Clutch / Final Minutes</option>
                                                        <option value="Symmetry Break">Symmetry Break</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1 border-t border-dashed pt-2">
                                            <label className="text-[10px] text-muted-foreground uppercase font-black">Editorial Notes</label>
                                            <Textarea
                                                placeholder="Describe corrections, context, or visual details..."
                                                className="min-h-[80px] text-xs bg-muted/10 resize-none"
                                                defaultValue={selectedEvent.validationNotes}
                                                onBlur={(e) => onUpdateEvent({ ...selectedEvent, validationNotes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </ScrollArea>

                                <div className="pt-4 flex gap-2 border-t mt-auto">
                                    {selectedEvent.eventName === 'pass_start' && (() => {
                                        const idx = events.findIndex(e => e.id === selectedEvent.id);
                                        // Events AFTER in time are at indices 0 to idx-1 (nearest is idx-1)
                                        const nextEvent = events.slice(0, idx).reverse().find(next =>
                                            ['pass_end', 'pass_start', 'turnover'].includes(next.eventName)
                                        );
                                        return !nextEvent || nextEvent.eventName !== 'pass_end';
                                    })() && (
                                            <Button
                                                variant="secondary"
                                                className="flex-1 h-10 gap-2 font-bold uppercase tracking-widest text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20"
                                                onClick={() => handleCreatePassEnd(selectedEvent)}
                                            >
                                                <Workflow className="w-4 h-4" /> Register Reception
                                            </Button>
                                        )}
                                    <Button variant="default" className="flex-1 h-10 gap-2 font-bold uppercase tracking-widest text-[10px]" onClick={() => {
                                        toast({ title: "Draft Saved", description: "Changes recorded locally." });
                                    }}>
                                        <CheckCircle className="w-4 h-4" /> Save Metadata
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10">
                                        <XSquare className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic gap-2 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center border-2 border-dashed border-border mb-2">
                                    <ChevronRight className="w-8 h-8 opacity-20" />
                                </div>
                                <span className="text-xs uppercase font-bold tracking-widest opacity-50">Validation Queue Idle</span>
                                <span className="text-[10px]">Select an event from the left list<br />to modify its properties.</span>
                            </div>
                        )}
                    </Card>

                    {/* 4. RECENT CORRECTIONS (Audit Trail) */}
                    <Card className="h-40 flex flex-col overflow-hidden bg-muted/20 border-border/50">
                        <div className="p-2 px-3 border-b bg-muted/50 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-secondary-foreground flex items-center gap-1">
                                <History className="w-3 h-3" /> QA Audit Trail
                            </span>
                            <span className="text-[9px] font-medium opacity-60 italic">{matchName}</span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 flex flex-col gap-1.5">
                                {events.filter(e => e.isValidated).slice(-3).map(e => (
                                    <div key={e.id} className="text-[10px] bg-background/50 p-2 rounded border border-border/30 shadow-sm flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold">{e.eventName}</span> verified by {e.reviewedBy || 'System'}
                                        </div>
                                    </div>
                                ))}
                                {events.filter(e => e.isValidated).length === 0 && (
                                    <div className="text-[10px] text-center opacity-40 py-4">No validation activity logs.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>
        </div>
    );
};
