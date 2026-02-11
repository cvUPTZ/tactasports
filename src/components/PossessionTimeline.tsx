// src/components/PossessionTimeline.tsx
// Visual timeline of possession chains - shows flow of the match

import { useMatchContext } from '@/contexts/MatchContext';
import { PossessionChain } from '@/utils/PossessionChain';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Target,
    Zap,
    AlertTriangle,
    Goal,
    ArrowRight
} from 'lucide-react';

interface PossessionTimelineProps {
    className?: string;
    maxVisible?: number;
}

export function PossessionTimeline({ className, maxVisible = 10 }: PossessionTimelineProps) {
    const { possessionHistory, currentPossession, chainStats } = useMatchContext();
    const [expanded, setExpanded] = useState(false);
    const [selectedChain, setSelectedChain] = useState<number | null>(null);

    // Get recent chains plus current
    const chains: (PossessionChain & { isCurrent?: boolean })[] = [
        ...(currentPossession ? [{ ...currentPossession, isCurrent: true }] : []),
        ...possessionHistory.slice().reverse().slice(0, expanded ? 50 : maxVisible),
    ];

    if (chains.length === 0) {
        return (
            <div className={cn(
                "rounded-lg border border-border/50 bg-card/95 p-4",
                className
            )}>
                <div className="text-center text-muted-foreground text-sm">
                    No possession chains recorded yet
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "rounded-lg border border-border/50 bg-card/95 overflow-hidden",
            className
        )}>
            {/* Header */}
            <div className="px-4 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Possession Flow</span>
                </div>
                {chainStats && (
                    <div className="text-xs text-muted-foreground">
                        {chainStats.totalChains} chains | {(chainStats.finalThirdEntryRate * 100).toFixed(0)}% to final third
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="p-3">
                <div className="flex flex-wrap gap-1.5">
                    {chains.map((chain) => (
                        <ChainPill
                            key={chain.id}
                            chain={chain}
                            isCurrent={chain.isCurrent}
                            isSelected={selectedChain === chain.id}
                            onClick={() => setSelectedChain(selectedChain === chain.id ? null : chain.id)}
                        />
                    ))}
                </div>

                {/* Expand/collapse */}
                {possessionHistory.length > maxVisible && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expanded ? 'Show less' : `Show ${possessionHistory.length - maxVisible} more`}
                    </button>
                )}
            </div>

            {/* Selected chain details */}
            {selectedChain !== null && (
                <ChainDetails chainId={selectedChain} />
            )}
        </div>
    );
}

interface ChainPillProps {
    chain: PossessionChain;
    isCurrent?: boolean;
    isSelected: boolean;
    onClick: () => void;
}

function ChainPill({ chain, isCurrent, isSelected, onClick }: ChainPillProps) {
    // Team color
    const teamColor = chain.team === 'TEAM_A'
        ? 'bg-blue-500'
        : 'bg-red-500';

    // Outcome styling
    const outcomeConfig: Record<string, { icon: React.ReactNode; ring: string }> = {
        'SHOT': { icon: <Target className="w-2.5 h-2.5" />, ring: 'ring-orange-400' },
        'GOAL': { icon: <Goal className="w-2.5 h-2.5" />, ring: 'ring-green-400' },
        'LOSS': { icon: null, ring: '' },
        'SET_PIECE': { icon: <AlertTriangle className="w-2.5 h-2.5" />, ring: 'ring-yellow-400' },
        'OUT_OF_PLAY': { icon: null, ring: '' },
        'ONGOING': { icon: null, ring: 'ring-white/50' },
    };

    const outcome = outcomeConfig[chain.outcome] || outcomeConfig['LOSS'];

    // Width based on duration (min 20px, max 80px)
    const durationS = (chain.durationMs || 1000) / 1000;
    const width = Math.min(80, Math.max(20, durationS * 3));

    return (
        <button
            onClick={onClick}
            className={cn(
                "h-7 rounded flex items-center justify-center gap-1 px-2 transition-all",
                teamColor,
                "hover:brightness-110",
                isCurrent && "animate-pulse ring-2 ring-white/50",
                isSelected && "ring-2 ring-white",
                outcome.ring && `ring-1 ${outcome.ring}`,
            )}
            style={{ minWidth: `${width}px` }}
            title={`Chain #${chain.id} - ${chain.team} - ${chain.passCount} passes`}
        >
            {/* Icons for special outcomes */}
            {chain.fromTransition && <Zap className="w-2.5 h-2.5 text-yellow-200" />}
            {outcome.icon && <span className="text-white">{outcome.icon}</span>}

            {/* Pass count */}
            <span className="text-[10px] font-bold text-white/90">
                {chain.passCount}
            </span>
        </button>
    );
}

function ChainDetails({ chainId }: { chainId: number }) {
    const { possessionHistory, currentPossession } = useMatchContext();

    const chain = currentPossession?.id === chainId
        ? currentPossession
        : possessionHistory.find(c => c.id === chainId);

    if (!chain) return null;

    const durationS = chain.durationMs ? (chain.durationMs / 1000).toFixed(1) : 'ongoing';

    return (
        <div className="px-4 py-3 bg-muted/20 border-t border-border/30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">
                    Chain #{chain.id}
                </span>
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    chain.team === 'TEAM_A' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
                )}>
                    {chain.team === 'TEAM_A' ? 'Home' : 'Away'}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-1 font-medium">{durationS}s</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Passes:</span>
                    <span className="ml-1 font-medium">{chain.passCount}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Events:</span>
                    <span className="ml-1 font-medium">{chain.events.length}</span>
                </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2 mt-2">
                {chain.fromTransition && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                        ⚡ Transition
                    </span>
                )}
                {chain.enteredFinalThird && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                        ✓ Final Third
                    </span>
                )}
                {chain.enteredBox && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                        📦 Box
                    </span>
                )}
                {chain.shotTaken && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                        🎯 Shot
                    </span>
                )}
                {chain.buildUpSpeed && (
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        chain.buildUpSpeed === 'FAST' && 'bg-cyan-500/20 text-cyan-300',
                        chain.buildUpSpeed === 'MEDIUM' && 'bg-gray-500/20 text-gray-300',
                        chain.buildUpSpeed === 'SLOW' && 'bg-purple-500/20 text-purple-300',
                    )}>
                        {chain.buildUpSpeed === 'FAST' ? '🚀' : chain.buildUpSpeed === 'SLOW' ? '🐢' : '➡️'} {chain.buildUpSpeed}
                    </span>
                )}
            </div>

            {/* Event sequence */}
            {chain.events.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Events:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {chain.events.slice(-8).map((event, i) => (
                            <span
                                key={event.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                                {event.eventName.replace(/_/g, ' ')}
                            </span>
                        ))}
                        {chain.events.length > 8 && (
                            <span className="text-[10px] text-muted-foreground">
                                +{chain.events.length - 8} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact horizontal timeline
export function PossessionTimelineCompact({ className }: { className?: string }) {
    const { possessionHistory, currentPossession } = useMatchContext();

    const recentChains = [
        ...(currentPossession ? [{ ...currentPossession, isCurrent: true }] : []),
        ...possessionHistory.slice(-5).reverse(),
    ];

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {recentChains.map((chain, i) => (
                <div
                    key={chain.id}
                    className={cn(
                        "h-4 rounded transition-all",
                        chain.team === 'TEAM_A' ? 'bg-blue-500' : 'bg-red-500',
                        'isCurrent' in chain && chain.isCurrent && 'animate-pulse'
                    )}
                    style={{
                        width: `${Math.max(8, Math.min(24, chain.passCount * 4))}px`,
                        opacity: 1 - (i * 0.15)
                    }}
                    title={`${chain.team} - ${chain.passCount} passes`}
                />
            ))}
        </div>
    );
}

export default PossessionTimeline;
