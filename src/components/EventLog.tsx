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
  Users,
  Undo2,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PlusCircle, Info } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

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

// -------------------------------------------
// COMPONENT
// -------------------------------------------
interface EventLogProps {
  events: LoggedEvent[];
  teamNames?: { teamA: string, teamB: string };
  onUndoEvent?: (id: number) => void;
  onMissedEvent?: () => void;
  onToggleDelay?: (id: number) => void;
  onEventClick?: (event: LoggedEvent) => void;
  editingEventId?: number | null;
}

export const EventLog = ({
  events,
  teamNames,
  onUndoEvent,
  onMissedEvent,
  onToggleDelay,
  onEventClick,
  editingEventId
}: EventLogProps) => {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLogger = user?.role === 'logger' || user?.role === 'admin';
  const recentEvents = [...events].reverse().slice(0, 30);

  // Auto-scroll to top (since we reverse)
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }
  }, [events]);

  // Live timer refresh
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <Card className="h-full flex flex-col border-none bg-transparent shadow-none">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <span className="tracking-tight">Match Feed</span>
        </h3>

        <div className="flex gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
            {teamNames?.teamA ?? "Team A"}
          </span>
        </div>
      </div>

      {/* Logger Quick Actions */}
      {isLogger && (
        <div className="px-4 pb-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => {
              if (onMissedEvent) onMissedEvent();
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Missed Event
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-2 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => {
              // Info or secondary action
            }}
          >
            <Info className="w-3.5 h-3.5" />
            Audit Note
          </Button>
        </div>
      )}

      {/* FEED */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="relative space-y-4 py-4 pl-5">

          {/* Vertical Timeline */}
          <div className="absolute left-3 top-4 bottom-4 w-[3px] bg-gradient-to-b from-primary/20 via-border to-destructive/20 rounded-full" />

          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm italic">
              Match hasn't started yet.
              <br />
              Waiting for events…
            </div>
          ) : (
            recentEvents.map((event, index) => {
              const Icon = getEventIcon(event.eventName || "");
              const isA = event.team === "TEAM_A";
              const accentColor = isA ? "bg-primary" : "bg-destructive";
              const timeDiff = now - new Date(event.timestamp).getTime();
              const canUndo = timeDiff < 10000 && !event.isCalculated;

              return (
                <div
                  key={`${event.id}-${index}`}
                  className={cn(
                    "relative flex gap-4 group transition-all animate-in fade-in slide-in-from-left-4 duration-300"
                  )}
                >
                  {/* TIMELINE DOT */}
                  <div
                    className={cn(
                      "absolute left-0 mt-2 w-3.5 h-3.5 rounded-full border-2 border-background shadow-lg z-10 transition-transform group-hover:scale-125",
                      accentColor
                    )}
                  />

                  {/* EVENT CARD */}
                  <div
                    className={cn(
                      "flex-1 rounded-xl border border-border/50 bg-card/40 backdrop-blur-md p-3 shadow-sm transition-all duration-300",
                      "hover:shadow-md hover:bg-card/60 group/card relative overflow-hidden",
                      editingEventId === event.id && "ring-2 ring-yellow-400 bg-yellow-400/5"
                    )}
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* Accent Line */}
                    <div className={cn("absolute top-0 left-0 w-1 h-full opacity-30 group-hover/card:opacity-100 transition-opacity", accentColor)} />

                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shadow-sm text-white",
                            accentColor
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs uppercase tracking-tight">
                          {event.eventName}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.matchTime || "00:00"}
                      </span>
                    </div>

                    {event.isPendingZone && (
                      <div className="flex items-center gap-1.5 mt-1 text-amber-500 animate-pulse">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Awaiting Zone</span>
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="flex justify-between items-end mt-3">
                      <div>
                        {event.player ? (
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-semibold shadow-inner">
                              {event.player.name.charAt(0)}
                            </div>
                            {event.player.name}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No player assigned
                          </span>
                        )}
                      </div>

                      {isLogger && !event.isCalculated && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 transition-all ml-1",
                            event.isDelayed ? "text-orange-500 bg-orange-500/10" : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                          )}
                          title="Mark as Delayed"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleDelay) onToggleDelay(event.id);
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {canUndo && onUndoEvent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          onClick={() => onUndoEvent(event.id)}
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
