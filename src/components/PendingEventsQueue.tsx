import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, X, ChevronRight } from 'lucide-react';
import { LoggedEvent } from '@/hooks/useGamepad';

interface PendingEventsQueueProps {
    events: LoggedEvent[];
    onSelectEvent: (event: LoggedEvent) => void;
    onDismiss: (eventId: number) => void;
}

const PendingEventsQueue: React.FC<PendingEventsQueueProps> = ({ events, onSelectEvent, onDismiss }) => {
    if (events.length === 0) return null;

    return (
        <Card className="bg-black/60 backdrop-blur-md border-amber-500/30 shadow-lg p-2 max-w-sm">
            <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                        Pending Zones ({events.length})
                    </h3>
                </div>
            </div>

            <ScrollArea className="h-[120px]">
                <div className="space-y-1 pr-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="group relative flex items-center justify-between bg-white/5 hover:bg-white/10 rounded border border-white/10 px-2 py-1.5 transition-all"
                        >
                            <div
                                className="flex-1 cursor-pointer pr-6"
                                onClick={() => onSelectEvent(event)}
                            >
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] h-4 px-1 ${event.team === 'TEAM_A' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'}`}
                                    >
                                        {event.team === 'TEAM_A' ? 'T.A' : 'T.B'}
                                    </Badge>
                                    <span className="text-[10px] font-medium text-zinc-100 truncate">
                                        {event.eventName.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="text-[8px] text-zinc-500 mt-0.5 font-mono">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:text-amber-500"
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-zinc-500 hover:text-red-500"
                                    onClick={() => onDismiss(event.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Visual Indicator for the row */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/50 rounded-l" />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
};

export default PendingEventsQueue;
