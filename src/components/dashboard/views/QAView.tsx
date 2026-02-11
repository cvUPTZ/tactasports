import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ValidationSuite } from '@/components/ValidationSuite';
import { LoggedEvent } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';

interface QAViewProps {
    events: LoggedEvent[];
    videoFile: File | null;
    teamNames: { teamA: string; teamB: string };
    availablePlayers: { id: number; name: string }[];
    setEvents: React.Dispatch<React.SetStateAction<LoggedEvent[]>>;
    socket: any;
    setSeekTime: (time: number) => void;
    setTrackingMode: (mode: any) => void;
    setActiveView: (view: any) => void;
}

export const QAView: React.FC<QAViewProps> = ({
    events,
    videoFile,
    teamNames,
    availablePlayers,
    setEvents,
    socket,
    setSeekTime,
    setTrackingMode,
    setActiveView
}) => {
    return (
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Validation Suite
                </h2>
            </div>
            <div className="flex-1 min-h-0 bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 p-4 overflow-y-auto">
                <ValidationSuite
                    events={events}
                    videoFile={videoFile}
                    matchName={`${teamNames.teamA} vs ${teamNames.teamB}`}
                    availablePlayers={availablePlayers}
                    onUpdateEvent={(updated) => {
                        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
                        socket?.emit('update-event', updated);
                    }}
                    onAddEvent={(newEvent) => {
                        setEvents(prev => [newEvent, ...prev].sort((a, b) => {
                            const timeA = a.videoTime ?? 0;
                            const timeB = b.videoTime ?? 0;
                            return timeB - timeA;
                        }));
                        socket?.emit('new-event', newEvent);
                    }}
                    onSeekToEvent={(time) => {
                        setSeekTime(time);
                        setTrackingMode('POST_MATCH');
                        setActiveView('dashboard');
                    }}
                />
            </div>
        </div>
    );
};
