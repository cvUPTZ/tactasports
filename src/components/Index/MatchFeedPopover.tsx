import { LoggedEvent } from "@/hooks/useGamepad";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Trophy,
    ArrowRight,
    Crosshair,
    AlertTriangle,
    Flag,
    RefreshCw,
    AlertOctagon,
    CornerUpRight,
    Activity,
    Bell,
    Clock,
    Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// -------------------------------------------
// ICON LOGIC (Reused)
// -------------------------------------------
const getEventIcon = (name: string) => {
    const t = name.toLowerCase();
    if (t.includes("goal")) return Trophy;
    if (t.includes("pass")) return ArrowRight;
    if (t.includes("shot")) return Crosshair;
    if (t.includes("foul")) return AlertTriangle;
    if (t.includes("offside")) return Flag;
    if (t.includes("sub")) return RefreshCw;
    if (t.includes("penalty")) return AlertOctagon;
    if (t.includes("corner")) return CornerUpRight;
    return Activity;
};

// -------------------------------------------
// COMPONENT
// -------------------------------------------
interface MatchFeedPopoverProps {
    events: LoggedEvent[];
    teamNames?: { teamA: string, teamB: string };
    onUndoEvent?: (eventId: number) => void;
    onEventClick?: (event: LoggedEvent) => void;
}

export const MatchFeedPopover = ({ events, teamNames, onUndoEvent, onEventClick }: MatchFeedPopoverProps) => {
    const recentEvents = [...events].slice(0, 50); // Limit to 50 for performance
    const [now, setNow] = useState(Date.now());
    const [isOpen, setIsOpen] = useState(false);
    const [hasNewEvents, setHasNewEvents] = useState(false);
    const lastEventIdRef = useRef<number | null>(null);

    // Live timer refresh
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(i);
    }, []);

    // Check for new events to show badge
    useEffect(() => {
        if (events.length > 0) {
            if (lastEventIdRef.current !== null && events[0].id !== lastEventIdRef.current) {
                if (!isOpen) setHasNewEvents(true);
            }
            lastEventIdRef.current = events[0].id;
        }
    }, [events, isOpen]);

    // Clear badge when opened
    useEffect(() => {
        if (isOpen) setHasNewEvents(false);
    }, [isOpen]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative">
                    <Activity className="h-4 w-4" />
                    <span className="hidden md:inline">Feed</span>
                    {hasNewEvents && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="end">
                <Card className="h-[500px] flex flex-col border-none bg-transparent shadow-none">
                    {/* HEADER */}
                    <div className="flex items-center justify-between p-4 pb-2 border-b">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            <span>Match Feed</span>
                        </h3>

                        <div className="flex gap-3 text-[10px] font-semibold">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                {teamNames?.teamA ?? "Team A"}
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-destructive"></div>
                                {teamNames?.teamB ?? "Team B"}
                            </span>
                        </div>
                    </div>

                    {/* FEED */}
                    <ScrollArea className="flex-1">
                        <div className="relative space-y-4 p-4">

                            {/* Vertical Timeline */}
                            <div className="absolute left-7 top-4 bottom-4 w-[2px] bg-border" />

                            {recentEvents.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-xs italic">
                                    Waiting for events...
                                </div>
                            ) : (
                                recentEvents.map((event, index) => {
                                    const Icon = getEventIcon(event.eventName);
                                    const isA = event.team === "TEAM_A";
                                    const color = isA ? "bg-primary" : "bg-destructive";
                                    const timeDiff = now - new Date(event.timestamp).getTime();
                                    const canUndo = timeDiff < 10000 && !event.isCalculated;

                                    return (
                                        <div
                                            key={`${event.id}-${index}`}
                                            className="relative flex gap-3 group"
                                        >
                                            {/* TIMELINE DOT */}
                                            <div
                                                className={cn(
                                                    "absolute left-2.5 mt-1.5 w-2 h-2 rounded-full border border-background z-10",
                                                    color
                                                )}
                                            />

                                            {/* EVENT CARD */}
                                            <div
                                                className={cn(
                                                    "flex-1 rounded-lg border bg-card p-3 shadow-sm hover:bg-muted/50 transition-colors ml-6 text-sm",
                                                    "cursor-pointer"
                                                )}
                                                onClick={() => onEventClick?.(event)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold flex items-center gap-2">
                                                        <Icon className="w-3.5 h-3.5 opacity-70" />
                                                        {event.eventName}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {event.matchTime || "00:00"}
                                                    </span>
                                                </div>

                                                {(event.player || canUndo) && (
                                                    <div className="flex justify-between items-end mt-2">
                                                        {event.player ? (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <span className={cn("w-1 h-3 rounded-full", color)}></span>
                                                                {event.player.name}
                                                            </div>
                                                        ) : <span></span>}

                                                        {canUndo && onUndoEvent && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 -mb-1 -mr-1 text-muted-foreground hover:text-destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUndoEvent(event.id);
                                                                }}
                                                            >
                                                                <Undo2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </PopoverContent>
        </Popover>
    );
};
