import React, { useRef, useMemo, useState, useEffect } from 'react';
import { LoggedEvent } from '@/hooks/useGamepad';
import {
    Circle, Target, Shield, AlertTriangle, XCircle, Trophy,
    ArrowRight, Activity, Flag, ZoomIn, ZoomOut
} from 'lucide-react';

interface TimelineProps {
    duration: number;
    currentTime: number;
    events: LoggedEvent[];
    onSeek: (time: number) => void;
    variant?: 'minimal' | 'pro';
}

const TRACKS = [
    { id: 'goals', label: 'Goals & Shots', types: ['goal', 'shot', 'save'], color: 'bg-red-500', height: 40 },
    { id: 'passing', label: 'Passing', types: ['pass'], color: 'bg-blue-500', height: 30 },
    { id: 'defense', label: 'Defense', types: ['interception', 'tackle', 'foul', 'duel'], color: 'bg-orange-500', height: 30 },
    { id: 'other', label: 'Other', types: ['turnover', 'offside', 'loose_ball'], color: 'bg-zinc-500', height: 30 },
];

export const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, events, onSeek, variant = 'pro' }) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [zoom, setZoom] = useState(1);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!timelineRef.current || duration === 0) return;

        const updateTime = (clientX: number) => {
            const rect = timelineRef.current!.getBoundingClientRect();
            // Calculate strictly based on the timeline width (which is expanded when zoomed)
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percentage = x / rect.width;
            onSeek(percentage * duration);
        };

        updateTime(e.clientX);

        const handleMouseMove = (mmE: MouseEvent) => {
            mmE.preventDefault();
            updateTime(mmE.clientX);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Group events into tracks
    const eventTracks = useMemo(() => {
        const grouped: Record<string, LoggedEvent[]> = {
            goals: [],
            passing: [],
            defense: [],
            other: []
        };

        events.forEach(e => {
            const name = e.eventName?.toLowerCase() || "";
            if (!e.videoTime) return;

            let placed = false;
            for (const track of TRACKS) {
                if (track.types.some(t => name.includes(t))) {
                    grouped[track.id].push(e);
                    placed = true;
                    break;
                }
            }
            if (!placed) grouped.other.push(e);
        });

        return grouped;
    }, [events]);

    const getEventIcon = (eventName: string) => {
        const name = eventName.toLowerCase();
        if (name.includes('pass')) return <ArrowRight className="w-3 h-3 text-blue-200" />;
        if (name.includes('shot')) return <Target className="w-3 h-3 text-red-200" />;
        if (name.includes('goal')) return <Trophy className="w-3 h-3 text-yellow-200" />;
        if (name.includes('foul')) return <AlertTriangle className="w-3 h-3 text-orange-200" />;
        if (name.includes('interception')) return <Shield className="w-3 h-3 text-green-200" />;
        if (name.includes('turnover')) return <XCircle className="w-3 h-3 text-gray-300" />;
        return <Circle className="w-2 h-2 text-white/50" />;
    };

    // Generate Ruler Ticks - Adaptive based on zoom
    const rulerTicks = useMemo(() => {
        if (!duration) return [];
        const baseStep = duration > 600 ? 60 : 10;
        // Increase density when zoomed in
        const step = zoom > 2 ? (baseStep / 2) : baseStep;

        const ticks = [];
        for (let t = 0; t <= duration; t += step) {
            ticks.push({ time: t, label: formatTime(t), left: (t / duration) * 100 });
        }
        return ticks;
    }, [duration, zoom]);

    if (variant === 'minimal') {
        return (
            <div
                ref={timelineRef}
                className="w-full h-8 bg-black/60 backdrop-blur-md border-t border-white/10 relative group cursor-pointer flex items-center px-4 select-none"
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* Progress Rail */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-primary-500/20 -translate-y-1/2 rounded-full mx-4 overflow-visible">
                    <div
                        className="h-full bg-primary rounded-full relative"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    >
                        <div className="absolute right-0 top-1/2 w-3 h-3 bg-white rounded-full -translate-y-1/2 shadow transition-transform scale-0 group-hover:scale-100" />
                    </div>
                </div>

                {/* Simple Event Dots */}
                {events.map(event => {
                    const pos = ((event.videoTime || 0) / (duration || 1)) * 100;
                    if (pos < 0 || pos > 100) return null;
                    return (
                        <div
                            key={event.id}
                            className="absolute top-1/2 w-1.5 h-1.5 rounded-full -translate-y-1/2 -ml-[3px] bg-white/60 pointer-events-none"
                            style={{ left: `${pos}%` }}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div
            className="w-full bg-zinc-950 border-t border-zinc-800 flex flex-col select-none relative group h-48"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-black/80 rounded p-1 border border-white/10 shadow-lg">
                <button
                    onClick={() => setZoom(z => Math.max(1, z - 0.5))}
                    className="p-1 hover:bg-white/20 rounded text-white disabled:opacity-50"
                    disabled={zoom <= 1}
                    title="Zoom Out"
                >
                    <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono w-8 text-center text-white">{Math.round(zoom * 100)}%</span>
                <button
                    onClick={() => setZoom(z => Math.min(10, z + 0.5))}
                    className="p-1 hover:bg-white/20 rounded text-white"
                    title="Zoom In"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 w-full overflow-x-auto overflow-y-hidden relative custom-scrollbar">
                {/* Scaled Content Wrapper */}
                <div
                    style={{ width: `${zoom * 100}%` }}
                    className="h-full flex flex-col relative transition-all duration-200 ease-out"
                >
                    {/* Top Ruler */}
                    <div className="h-6 bg-zinc-900 border-b border-zinc-800 relative w-full overflow-hidden text-[10px] text-zinc-500 font-mono flex-shrink-0">
                        {rulerTicks.map((tick) => (
                            <div
                                key={tick.time}
                                className="absolute top-0 h-full border-l border-zinc-700 pl-1 pt-1"
                                style={{ left: `${tick.left}%` }}
                            >
                                {tick.label}
                            </div>
                        ))}
                    </div>

                    {/* Tracks Area */}
                    <div
                        ref={timelineRef}
                        className="flex-1 relative w-full cursor-crosshair bg-zinc-900/50"
                        onMouseDown={handleMouseDown}
                    >
                        {/* Horizontal Grid Lines */}
                        {TRACKS.map((track, idx) => (
                            <div
                                key={track.id}
                                className="w-full border-b border-zinc-800 relative box-border flex items-center px-2"
                                style={{ height: `${track.height}px` }}
                            >
                                {/* Track Label (Sticky Left) */}
                                <div className="sticky left-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider pointer-events-none z-10 w-20 bg-zinc-900/50 backdrop-blur-sm px-1 rounded">
                                    {track.label}
                                </div>

                                {/* Events in this track */}
                                {eventTracks[track.id]?.map((event) => {
                                    const position = ((event.videoTime || 0) / (duration || 1)) * 100;
                                    return (
                                        <div
                                            key={event.id}
                                            className={`absolute top-1 bottom-1 w-1 min-w-[4px] rounded-sm hover:w-6 hover:z-20 transition-all cursor-pointer group/event flex items-center justify-center ${track.color.replace('bg-', 'bg-opacity-60 bg-')}`}
                                            style={{ left: `${position}%` }}
                                            title={`${event.eventName} @ ${formatTime(event.videoTime || 0)}`}
                                        >
                                            {/* Expanded view on hover */}
                                            <div className="hidden group-hover/event:flex w-full h-full items-center justify-center bg-black/80 rounded border border-white/20">
                                                {getEventIcon(event.eventName)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Playhead Line (Full Height) */}
                        <div
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                        >
                            <div className="absolute -top-3 -translate-x-1/2 text-[9px] bg-red-600 text-white px-1 rounded-sm font-mono whitespace-nowrap z-40">
                                {formatTime(currentTime)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
