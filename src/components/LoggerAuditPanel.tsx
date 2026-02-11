import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    ClipboardCheck,
    Mic,
    Activity,
    AlertCircle,
    FileOutput,
    Video
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useState, useEffect } from "react";
import { LoggedEvent } from "@/hooks/useGamepad";
import { toast } from "sonner";

// --- TYPES ---
interface RealityEvent {
    id: number;
    time: string;
    eventName: string;
    target: string;
    source: string;
}

interface LoggerAuditPanelProps {
    systemEvents: LoggedEvent[];
    onExport: () => void;
}

// --- ZONE SELECTOR COMPONENT ---
const ZoneSelector = ({ value, onChange }: { value: number, onChange: (z: number) => void }) => {
    // 3 Columns x 6 Rows Grid
    const rows = 6;
    const cols = 3;

    return (
        <div className="grid grid-cols-3 gap-1 w-full max-w-[200px] mx-auto aspect-[3/4] bg-slate-900/50 p-2 rounded-lg border border-white/10">
            {Array.from({ length: rows * cols }).map((_, i) => {
                const zoneId = i + 1;
                const isActive = value === zoneId;
                return (
                    <button
                        key={zoneId}
                        onClick={() => onChange(zoneId)}
                        className={cn(
                            "rounded text-[10px] font-bold flex items-center justify-center transition-all",
                            "hover:bg-primary/20 hover:text-primary",
                            isActive
                                ? "bg-primary text-black font-black shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                                : "bg-white/5 text-slate-500"
                        )}
                    >
                        {zoneId}
                    </button>
                );
            })}
        </div>
    );
};

export const LoggerAuditPanel = ({ systemEvents, onExport }: LoggerAuditPanelProps) => {
    const { socket } = useSocketContext();
    const [realityFeed, setRealityFeed] = useState<RealityEvent[]>([]);
    const [customReality, setCustomReality] = useState('');

    // --- EDITING STATE ---
    const [editingEvent, setEditingEvent] = useState<LoggedEvent | null>(null);
    const [editForm, setEditForm] = useState<{ zone: number, note?: string }>({ zone: 0 });



    // Listen for Spotter Pings
    useEffect(() => {
        if (!socket) return;

        const handleSpotterPing = (ping: any) => {
            const newEntry: RealityEvent = {
                id: ping.id,
                time: ping.matchTime,
                eventName: 'Spotter Ping',
                target: ping.target,
                source: 'PING'
            };
            setRealityFeed(prev => [newEntry, ...prev]);
            toast.info(`Reality Flag: Spotter Ping ${ping.target}`);
        };

        socket.on('spotter-ping', handleSpotterPing);
        return () => { socket.off('spotter-ping', handleSpotterPing); };
    }, [socket]);

    const addManualReality = (name: string, target: 'HOME' | 'AWAY' = 'HOME') => {
        const newEntry: RealityEvent = {
            id: Date.now(),
            time: 'LIVE', // This should Ideally be synced to match time
            eventName: name,
            target,
            source: 'VOICE'
        };
        setRealityFeed(prev => [newEntry, ...prev]);
    };

    // Open Edit Modal
    const handleEventClick = (event: LoggedEvent) => {
        setEditingEvent(event);
        setEditForm({ zone: event.zone || 0, note: event.validationNotes || '' });
    };

    // Save Changes (Ideally this would bubble up to parent or context)
    const handleSaveEdit = () => {
        if (editingEvent) {
            // Update local object reference (In real app, trigger an API call or Context update)
            editingEvent.zone = editForm.zone;
            editingEvent.validationNotes = editForm.note;
            editingEvent.isValidated = true; // Mark as validated since human touched it

            toast.success(`Updated Event #${editingEvent.id}: Zone ${editForm.zone}`);
            setEditingEvent(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/20 gap-4 p-4 overflow-hidden">
            {/* HEADER ACTIONS */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ClipboardCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-tight text-white">System Audit Log</h2>
                        <p className="text-[10px] text-slate-500 font-medium">REALITY vs SYSTEM MIRROR</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] gap-2 border-white/5 bg-slate-900/50" onClick={onExport}>
                        <FileOutput className="w-3.5 h-3.5" /> EXPORT REPORT
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 flex-1 min-h-0 gap-4">
                {/* REALITY FEED (LEFT) */}
                <Card className="flex flex-col bg-slate-900/30 border-white/5 overflow-hidden">
                    <div className="p-3 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                            <Mic className="w-3 h-3" /> Reality Feed
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => addManualReality('Possession', 'HOME')} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">HOME</button>
                            <button onClick={() => addManualReality('Possession', 'AWAY')} className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">AWAY</button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-2">
                        <div className="space-y-2">
                            {realityFeed.map(item => (
                                <div key={item.id} className="p-2 rounded-lg bg-slate-800/20 border border-white/5 flex items-center justify-between animate-in slide-in-from-left-2 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-mono h-4 px-1 border-white/10">{item.time}</Badge>
                                        <span className="text-[11px] font-bold">{item.eventName}</span>
                                        <span className={cn("text-[9px] font-black", item.target === 'HOME' ? 'text-primary' : 'text-destructive')}>{item.target}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-50">
                                        <span className="text-[8px] uppercase font-bold">{item.source}</span>
                                    </div>
                                </div>
                            ))}
                            {realityFeed.length === 0 && (
                                <div className="h-32 flex items-center justify-center text-[10px] text-slate-500 italic">Waiting for Spotter voice/ping...</div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* SYSTEM FEED (RIGHT) */}
                <Card className="flex flex-col bg-slate-900/30 border-white/5 overflow-hidden">
                    <div className="p-3 border-b border-white/5 bg-slate-800/50">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                            <Activity className="w-3 h-3" /> System Feed
                        </span>
                        <span className="ml-auto text-[9px] text-slate-500 italic px-2">Click Event to Edit</span>
                    </div>

                    <ScrollArea className="flex-1 p-2">
                        <div className="space-y-2">
                            {systemEvents.slice(0, 50).map((event, index) => (
                                <div
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className="p-2 rounded-lg bg-slate-800/40 border border-white/5 space-y-2 hover:bg-white/5 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[9px] font-mono h-4 px-1 border-white/10">{event.matchTime || '00:00'}</Badge>
                                            <span className="text-[11px] font-bold uppercase">{event.eventName}</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {event.zone && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-white/10">Z{event.zone}</Badge>
                                            )}
                                            <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] h-4 group-hover:bg-emerald-500 group-hover:text-black transition-colors">EDIT</Badge>
                                        </div>
                                    </div>

                                    {/* REAL FLAGS RENDERING (Placeholder for future real logic) */}
                                    {event.isCalculated && (
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1 text-[9px] text-blue-500 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                <Activity className="w-3 h-3" /> CALCULATED
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {systemEvents.length === 0 && (
                                <div className="h-32 flex items-center justify-center text-[10px] text-slate-500 italic">No system events recorded.</div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-sm">
                            <span>Edit Event: <span className="text-primary">{editingEvent?.eventName}</span></span>
                            <Badge variant="outline" className="font-mono bg-black/20">{editingEvent?.matchTime}</Badge>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="flex gap-4">
                            {/* Zone Selector */}
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs text-slate-400">Tactical Zone</Label>
                                <ZoneSelector
                                    value={editForm.zone}
                                    onChange={(z) => setEditForm(prev => ({ ...prev, zone: z }))}
                                />
                                <div className="text-center text-xs font-mono text-slate-500">
                                    Current: {editForm.zone ? `Zone ${editForm.zone}` : "None"}
                                </div>
                            </div>

                            {/* Notes / Details */}
                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Validation Notes</Label>
                                    <Input
                                        value={editForm.note}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                        className="bg-black/20 border-white/10 text-xs h-8"
                                        placeholder="Reason for change..."
                                    />
                                </div>
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-300">
                                    <p>Changing zones will affect analytics heatmaps and passing networks linked to this event.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-white/10" onClick={() => setEditingEvent(null)}>Cancel</Button>
                        <Button size="sm" className="h-8 text-xs bg-primary text-black hover:bg-primary/90" onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FOOTER - MISSING EVENT TRACKER */}
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <div>
                        <span className="text-[10px] font-bold text-destructive uppercase">Audit Alert</span>
                        <p className="text-[11px] font-medium text-white">3 Missed events detected in last phase.</p>
                    </div>
                </div>
                <Button variant="destructive" size="sm" className="h-7 text-[10px] font-black italic">MARK MISSED</Button>
            </div>
        </div>
    );
};
