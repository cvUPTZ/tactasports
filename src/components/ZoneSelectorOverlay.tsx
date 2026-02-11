import { LoggedEvent } from '@/hooks/useGamepad';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, X, ChevronRight, Layout } from 'lucide-react';

interface ZoneSelectorOverlayProps {
    selectedZone: number;
    onConfirm: (zone: number) => void;
    onCancel: () => void;
    eventName?: string;
    pendingEvents: LoggedEvent[];
    onSelectEvent: (event: LoggedEvent) => void;
}

const ZoneSelectorOverlay: React.FC<ZoneSelectorOverlayProps> = ({
    selectedZone,
    onConfirm,
    onCancel,
    eventName,
    pendingEvents,
    onSelectEvent
}) => {
    // 3 columns x 6 rows = 18 zones (Standard Tacta Grid)
    const zones = Array.from({ length: 18 }, (_, i) => i + 1);

    return (
        <div className="fixed inset-0 z-[100] flex bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden">
            {/* Left Sidebar: Pending Events */}
            <div className="w-[350px] border-r border-white/10 bg-black/40 p-6 flex flex-col h-full shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Layout className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">EN ATTENTE</h2>
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest opacity-70">Assignation de zone</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-3">
                        {pendingEvents.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <MapPin className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-xs uppercase tracking-widest font-bold">Aucun événement</p>
                            </div>
                        ) : (
                            pendingEvents.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => onSelectEvent(event)}
                                    className={`w-full group relative flex flex-col gap-1 p-4 rounded-xl border transition-all text-left
                                        ${eventName === event.eventName && pendingEvents.find(e => e.eventName === eventName)?.id === event.id
                                            ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'}
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${event.team === 'TEAM_A' ? 'border-red-500/40 text-red-500' : 'border-blue-500/40 text-blue-500'}`}>
                                            {event.team === 'TEAM_A' ? 'TEAM A' : 'TEAM B'}
                                        </Badge>
                                        <span className="text-[9px] font-mono opacity-50 text-white">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-zinc-100 truncate mt-1">
                                        {event.eventName.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                            <span>🎮 NAVIGUER</span>
                            <span className="text-zinc-500 italic">D-PAD</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-green-500">
                            <span>✅ CONFIRMER</span>
                            <span>BUTTON A</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-red-500">
                            <span>❌ ANNULER</span>
                            <span>BUTTON B</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Pitch Overlay */}
            <div className="flex-1 relative flex items-center justify-center p-12 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_100%)]">
                <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter opacity-20">ZONE SELECTOR</h1>
                    <div className="h-1 w-24 bg-amber-500/30 mx-auto rounded-full" />
                </div>

                {/* Pitch Construction */}
                <div className="relative w-full max-w-2xl aspect-[3/4] bg-emerald-950/20 rounded-[2rem] border-4 border-white/20 p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    {/* Pitch Lines */}
                    <div className="absolute inset-8 border-2 border-white/20 rounded-sm pointer-events-none">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full" />
                    </div>

                    {/* Zone Grid */}
                    <div className="grid grid-cols-3 gap-2 h-full relative z-10">
                        {zones.map((zone) => (
                            <button
                                key={zone}
                                onClick={() => onConfirm(zone)}
                                className={`
                                    flex items-center justify-center rounded-xl border-2 text-3xl font-black transition-all duration-300
                                    ${selectedZone === zone
                                        ? 'bg-amber-500 border-white text-black scale-105 rotate-2 shadow-[0_0_40px_rgba(245,158,11,0.4)]'
                                        : 'bg-white/5 border-white/10 text-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white/40'}
                                `}
                            >
                                {zone}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Exit Button */}
                <button
                    onClick={onCancel}
                    className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-red-500/20 text-white rounded-full transition-colors border border-white/10 group"
                >
                    <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default ZoneSelectorOverlay;
