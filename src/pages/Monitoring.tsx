import React, { useEffect } from 'react';
import { useMatchContext } from '@/contexts/MatchContext';
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { MatchStateIndicator } from '@/components/MatchStateIndicator';
import { SequenceAssistant, PredictorStats } from '@/components/SequenceAssistant';
import { PossessionTimeline } from '@/components/PossessionTimeline';
import { Brain, Activity, Shield, Users, LayoutDashboard, Database, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

const Monitoring = () => {
    const {
        matchState,
        stateLabel,
        isInTransition,
        predictions,
        learningStats,
        possessionId
    } = useMatchContext();

    const { connected, role, socket } = useSocketContext();

    // Ensure we are in viewer mode for monitoring
    // In a real app, this might be handled by auth/permissions
    useEffect(() => {
        if (socket && connected) {
            console.log('Monitoring mode active - Syncing from broadcaster...');
        }
    }, [socket, connected]);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-purple-500/30">
            {/* TOP NAVIGATION / HEADER */}
            <header className="h-16 border-b border-border/40 bg-card/30 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            TACTA <span className="text-purple-500">ADMIN</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5 font-mono">
                            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                            Live Monitoring System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Status Indicators */}
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-border/40 bg-slate-900/50 backdrop-blur-sm self-center">
                        <div className="flex items-center gap-2 pr-3 border-r border-border/40">
                            <div className={cn(
                                "w-2 h-2 rounded-full shadow-[0_0_8px]",
                                connected ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                            )} />
                            <span className="text-xs font-medium">{connected ? 'CONNECTED' : 'OFFLINE'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{role || 'GUEST'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
                {/* LEFT SIDEBAR - STATS & ENGINE STATUS */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                    <Card className="bg-slate-900/40 border-border/40 backdrop-blur-sm p-4 ring-1 ring-white/5 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4 text-purple-400">
                            <Brain className="w-5 h-5" />
                            <h2 className="text-sm font-bold uppercase tracking-wider">Predictor Engine</h2>
                        </div>
                        <PredictorStats className="bg-transparent border-none p-0 shadow-none" />
                    </Card>

                    <Card className="bg-slate-900/40 border-border/40 backdrop-blur-sm p-4 ring-1 ring-white/5 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                            <Database className="w-5 h-5" />
                            <h2 className="text-sm font-bold uppercase tracking-wider">Session Context</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-border/20">
                                <span className="text-xs text-muted-foreground">Current Chain ID</span>
                                <span className="text-xs font-mono font-bold text-white">#{possessionId || 'NONE'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/20">
                                <span className="text-xs text-muted-foreground">Team Possession</span>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded",
                                    matchState.teamInPossession === 'TEAM_A' ? "bg-blue-500/20 text-blue-300" :
                                        matchState.teamInPossession === 'TEAM_B' ? "bg-red-500/20 text-red-300" : "bg-slate-800 text-slate-400"
                                )}>
                                    {matchState.teamInPossession || 'NEUTRAL'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs text-muted-foreground">Transition State</span>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded animate-pulse",
                                    isInTransition ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/50" : "bg-slate-800 text-slate-500"
                                )}>
                                    {isInTransition ? 'ACTIVE' : 'IDLE'}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* MAIN DASHBOARD AREA */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                    {/* Live State Visualization Wrapper */}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 xl:col-span-7">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                <MatchStateIndicator className="relative bg-slate-900/80 border-border/60 backdrop-blur-xl h-full shadow-inner" />
                            </div>
                        </div>

                        <div className="col-span-12 xl:col-span-5">
                            <SequenceAssistant className="bg-slate-900/80 border-border/60 backdrop-blur-xl h-full shadow-2xl" maxPredictions={4} />
                        </div>
                    </div>

                    {/* Timeline & Flow Section */}
                    <Card className="bg-slate-900/40 border-border/40 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-2xl flex-1">
                        <div className="flex items-center justify-between mb-6 border-b border-border/20 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <LayoutDashboard className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold">Possession Analysis Flow</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Historical View</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="min-h-[300px]">
                            <PossessionTimeline maxVisible={12} />
                        </div>
                    </Card>
                </div>
            </main>

            {/* DECORATIVE BACKGROUND ELEMENTS */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
        </div>
    );
};

export default Monitoring;
