// src/components/MatchStateIndicator.tsx
// Visual display of current match state - shows possession, phase, zone, and transition status

import { useMatchContext } from '@/contexts/MatchContext';
import { useEffect, useState } from 'react';
import {
    ArrowRightLeft,
    Target,
    Shield,
    Flame,
    Timer,
    Users,
    TrendingUp,
    AlertTriangle,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchStateIndicatorProps {
    compact?: boolean;
    className?: string;
}

export function MatchStateIndicator({ compact = false, className }: MatchStateIndicatorProps) {
    const {
        matchState,
        isInTransition,
        transitionTimeRemaining,
        currentPossession,
        stateLabel
    } = useMatchContext();

    const [countdown, setCountdown] = useState(0);

    // Update countdown for transition window
    useEffect(() => {
        if (isInTransition && transitionTimeRemaining > 0) {
            setCountdown(Math.ceil(transitionTimeRemaining / 1000));
            const interval = setInterval(() => {
                setCountdown(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCountdown(0);
        }
    }, [isInTransition, transitionTimeRemaining]);

    // Team colors
    const teamColor = matchState.teamInPossession === 'TEAM_A'
        ? 'bg-blue-500'
        : matchState.teamInPossession === 'TEAM_B'
            ? 'bg-red-500'
            : 'bg-gray-400';

    const teamName = matchState.teamInPossession === 'TEAM_A'
        ? 'Home'
        : matchState.teamInPossession === 'TEAM_B'
            ? 'Away'
            : 'Neutral';

    // Phase display
    const phaseConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
        'BUILD_UP': { icon: <TrendingUp className="w-3 h-3" />, label: 'Build-Up', color: 'text-green-400' },
        'CONSOLIDATION': { icon: <Shield className="w-3 h-3" />, label: 'Consolidation', color: 'text-blue-400' },
        'FINAL_THIRD': { icon: <Target className="w-3 h-3" />, label: 'Final Third', color: 'text-orange-400' },
        'TRANSITION_OFF': { icon: <Zap className="w-3 h-3" />, label: 'Transition ⚡', color: 'text-yellow-400' },
        'TRANSITION_DEF': { icon: <Shield className="w-3 h-3" />, label: 'Def. Transition', color: 'text-purple-400' },
        'SET_PIECE': { icon: <Target className="w-3 h-3" />, label: 'Set Piece', color: 'text-cyan-400' },
        'NEUTRAL': { icon: <ArrowRightLeft className="w-3 h-3" />, label: 'Neutral', color: 'text-gray-400' },
    };

    const phase = phaseConfig[matchState.phase] || phaseConfig['NEUTRAL'];

    // Threat level styling
    const threatConfig: Record<string, { color: string; pulse: boolean }> = {
        'HIGH': { color: 'bg-red-500', pulse: true },
        'MEDIUM': { color: 'bg-yellow-500', pulse: false },
        'LOW': { color: 'bg-green-500', pulse: false },
    };

    const threat = threatConfig[matchState.threatLevel] || threatConfig['LOW'];

    // Pressure styling
    const pressureConfig: Record<string, string> = {
        'HIGH': '🔴 High Press',
        'MEDIUM': '🟡 Medium',
        'LOW': '🟢 Low Block',
    };

    // Zone display
    const zoneLabel = `${matchState.zone.third.charAt(0)}${matchState.zone.third.slice(1).toLowerCase()} ${matchState.zone.lane.replace(/_/g, ' ').toLowerCase()}`;

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50",
                className
            )}>
                {/* Team indicator */}
                <div className={cn("w-2 h-2 rounded-full", teamColor)} />
                <span className="text-xs font-medium">{teamName}</span>

                {/* Phase */}
                <span className={cn("text-xs", phase.color)}>
                    {phase.label}
                </span>

                {/* Transition countdown */}
                {isInTransition && countdown > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 animate-pulse">
                        <Timer className="w-3 h-3" />
                        {countdown}s
                    </span>
                )}

                {/* Threat */}
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    threat.color,
                    threat.pulse && "animate-pulse"
                )} />
            </div>
        );
    }

    return (
        <div className={cn(
            "rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg overflow-hidden",
            className
        )}>
            {/* Header with team possession */}
            <div className={cn(
                "px-4 py-2 flex items-center justify-between",
                teamColor,
                "text-white"
            )}>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-sm">{teamName} Possession</span>
                </div>
                {currentPossession && (
                    <span className="text-xs opacity-80">
                        Chain #{currentPossession.id}
                    </span>
                )}
            </div>

            {/* State details */}
            <div className="p-3 space-y-2">
                {/* Phase row */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Phase</span>
                    <div className={cn("flex items-center gap-1.5 font-medium text-sm", phase.color)}>
                        {phase.icon}
                        {phase.label}
                    </div>
                </div>

                {/* Zone row */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Zone</span>
                    <span className="text-sm font-medium capitalize">{zoneLabel}</span>
                </div>

                {/* Pressure row */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pressure</span>
                    <span className="text-sm">{pressureConfig[matchState.pressure]}</span>
                </div>

                {/* Threat level */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Threat</span>
                    <div className="flex items-center gap-1.5">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            threat.color,
                            threat.pulse && "animate-pulse"
                        )} />
                        <span className="text-sm">{matchState.threatLevel}</span>
                    </div>
                </div>

                {/* Transition window countdown */}
                {isInTransition && countdown > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-yellow-400">
                                <Zap className="w-4 h-4" />
                                <span className="text-sm font-semibold">Transition Window</span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-400 font-mono font-bold animate-pulse">
                                <Timer className="w-4 h-4" />
                                {countdown}s
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 bg-yellow-900/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-400 transition-all duration-1000 ease-linear"
                                style={{ width: `${(countdown / 5) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Pressing context */}
                {matchState.pressingContext.active && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-orange-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Pressing Active</span>
                        </div>
                    </div>
                )}

                {/* Possession chain info */}
                {currentPossession && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Passes: {currentPossession.passCount}</span>
                            <span>Events: {currentPossession.events.length}</span>
                        </div>
                        {currentPossession.enteredFinalThird && (
                            <span className="text-green-400">✓ Final third entered</span>
                        )}
                        {currentPossession.fromTransition && (
                            <span className="text-yellow-400 ml-2">⚡ From transition</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MatchStateIndicator;
