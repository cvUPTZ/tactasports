import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useMatchContext } from '@/contexts/MatchContext';
import { RadioTower, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export const SpotterPingPanel = () => {
    const { socket } = useSocketContext();
    const { matchTime } = useMatchContext();
    const [target, setTarget] = useState<'HOME' | 'AWAY'>('HOME');

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePing = () => {
        const timestamp = new Date().toISOString();
        const formattedMatchTime = formatTime(matchTime || 0);

        const pingEvent = {
            type: 'SPOTTER_PING',
            target,
            timestamp,
            matchTime: formattedMatchTime,
            id: Date.now()
        };

        socket?.emit('spotter-ping', pingEvent);
        toast.success(`Ping recorded at ${formattedMatchTime}`);

        // Add haptic feedback if supported
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-3xl p-6 gap-8 items-center justify-center border-l border-white/5">
            <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <RadioTower className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tighter text-white">Spotter Assist</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Voice is Primary • Tap for Timing</p>
            </div>

            <RadioGroup
                value={target}
                onValueChange={(val: any) => setTarget(val)}
                className="grid grid-cols-2 gap-4 w-full max-w-xs"
            >
                <div className="flex items-center space-x-2 bg-slate-900/50 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-slate-900 transition-colors">
                    <RadioGroupItem value="HOME" id="home" className="sr-only" />
                    <Label htmlFor="home" className={`w-full text-center font-bold cursor-pointer ${target === 'HOME' ? 'text-primary' : 'text-slate-500'}`}>HOME</Label>
                </div>
                <div className="flex items-center space-x-2 bg-slate-900/50 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-slate-900 transition-colors">
                    <RadioGroupItem value="AWAY" id="away" className="sr-only" />
                    <Label htmlFor="away" className={`w-full text-center font-bold cursor-pointer ${target === 'AWAY' ? 'text-destructive' : 'text-slate-500'}`}>AWAY</Label>
                </div>
            </RadioGroup>

            <Button
                onClick={handlePing}
                className="w-64 h-64 rounded-full border-[12px] border-white/10 bg-slate-900 hover:bg-slate-800 shadow-[0_0_50px_rgba(var(--primary),0.3)] group transition-all duration-300 active:scale-95 active:border-primary/50"
            >
                <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-3xl font-black italic tracking-tighter text-white">PING</span>
                </div>
            </Button>

            <div className="text-[10px] text-slate-500 font-mono text-center max-w-[200px]">
                This will send a high-precision timestamp to the Logger for verification.
            </div>
        </div>
    );
};
