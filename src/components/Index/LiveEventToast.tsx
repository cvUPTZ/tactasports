import { LoggedEvent } from "@/hooks/useGamepad";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Trophy, ArrowRight, Crosshair, AlertTriangle, Flag, RefreshCw, AlertOctagon, CornerUpRight, Activity } from "lucide-react";

// -------------------------------------------
// ICON LOGIC
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

interface LiveEventToastProps {
    events: LoggedEvent[];
}

export const LiveEventToast = ({ events }: LiveEventToastProps) => {
    const [activeToasts, setActiveToasts] = useState<LoggedEvent[]>([]);
    const lastEventIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (events.length > 0) {
            const newestEvent = events[0];

            // Only add if it's a new event ID we haven't processed
            if (newestEvent.id !== lastEventIdRef.current) {
                lastEventIdRef.current = newestEvent.id;

                // Add to active toasts (limit to 3)
                setActiveToasts(prev => [newestEvent, ...prev].slice(0, 3));

                // Auto-dismiss after 5 seconds
                const timer = setTimeout(() => {
                    setActiveToasts(prev => prev.filter(e => e.id !== newestEvent.id));
                }, 5000);

                return () => clearTimeout(timer);
            }
        }
    }, [events]);

    if (activeToasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {activeToasts.map((event, index) => {
                const Icon = getEventIcon(event.eventName);
                const isA = event.team === "TEAM_A";
                const colorClass = isA ? "border-l-primary" : "border-l-destructive";

                return (
                    <div
                        key={event.id}
                        className={cn(
                            "bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-3 w-[280px]",
                            "border-l-4 transition-all duration-500 transform origin-bottom-right",
                            colorClass,
                            "animate-in slide-in-from-right-10 fade-in zoom-in-95"
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="font-bold text-sm">{event.eventName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{event.matchTime}</span>
                        </div>
                        {event.player && (
                            <div className="text-xs text-muted-foreground mt-1 ml-6">
                                {event.player.name}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
