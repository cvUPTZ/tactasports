// src/components/SequenceAssistant.tsx
// AI prediction assistant overlay - shows predicted next events with confidence levels

import { useMatchContext } from '@/contexts/MatchContext';
import { Prediction, formatProbability } from '@/utils/SequencePredictor';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

interface SequenceAssistantProps {
    className?: string;
    maxPredictions?: number;
    minConfidenceThreshold?: number; // 0-1, hide predictions below this
}

export function SequenceAssistant({
    className,
    maxPredictions = 3,
    minConfidenceThreshold = 0.1
}: SequenceAssistantProps) {
    const { predictions, learningStats } = useMatchContext();

    // Filter predictions by confidence threshold
    const visiblePredictions = predictions
        .filter(p => p.probability >= minConfidenceThreshold)
        .slice(0, maxPredictions);

    // Don't render if no meaningful predictions
    if (visiblePredictions.length === 0) {
        return (
            <div className={cn(
                "rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3",
                className
            )}>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Brain className="w-4 h-4" />
                    <span className="text-xs">Learning patterns...</span>
                </div>
                {learningStats && (
                    <div className="mt-2 text-xs text-muted-foreground/70">
                        {learningStats.totalEventsProcessed} events processed
                    </div>
                )}
            </div>
        );
    }

    // Get top prediction for highlighting
    const topPrediction = visiblePredictions[0];

    return (
        <div className={cn(
            "rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg overflow-hidden",
            className
        )}>
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-border/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-200">Likely Next</span>
                    </div>
                    {learningStats && (
                        <span className="text-[10px] text-muted-foreground">
                            {learningStats.totalPatterns} patterns
                        </span>
                    )}
                </div>
            </div>

            {/* Predictions list */}
            <div className="p-2 space-y-1.5">
                {visiblePredictions.map((prediction, index) => (
                    <PredictionRow
                        key={prediction.eventName}
                        prediction={prediction}
                        isTop={index === 0}
                        rank={index + 1}
                    />
                ))}
            </div>

            {/* Quick hint */}
            {topPrediction && topPrediction.probability > 0.4 && (
                <div className="px-3 py-2 bg-purple-500/10 border-t border-border/30">
                    <div className="flex items-center gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 text-purple-400" />
                        <span className="text-muted-foreground">
                            Press <kbd className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                                {topPrediction.buttonLabel}
                            </kbd> for {topPrediction.description}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface PredictionRowProps {
    prediction: Prediction;
    isTop: boolean;
    rank: number;
}

function PredictionRow({ prediction, isTop, rank }: PredictionRowProps) {
    // Confidence-based styling
    const confidenceColors = {
        HIGH: 'bg-green-500',
        MEDIUM: 'bg-yellow-500',
        LOW: 'bg-gray-500',
    };

    const probabilityWidth = Math.round(prediction.probability * 100);

    return (
        <div className={cn(
            "relative rounded-md overflow-hidden transition-all",
            isTop ? "ring-1 ring-purple-500/50" : ""
        )}>
            {/* Background progress bar */}
            <div
                className={cn(
                    "absolute inset-0 opacity-20",
                    isTop ? "bg-purple-500" : "bg-gray-500"
                )}
                style={{ width: `${probabilityWidth}%` }}
            />

            {/* Content */}
            <div className="relative flex items-center gap-2 px-2.5 py-2">
                {/* Rank badge */}
                <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    isTop
                        ? "bg-purple-500 text-white"
                        : "bg-muted text-muted-foreground"
                )}>
                    {rank}
                </div>

                {/* Button label */}
                <kbd className={cn(
                    "px-2 py-1 rounded text-xs font-mono font-bold min-w-[40px] text-center",
                    isTop
                        ? "bg-purple-500/30 text-purple-200 ring-1 ring-purple-500/50"
                        : "bg-muted text-muted-foreground"
                )}>
                    {prediction.buttonLabel}
                </kbd>

                {/* Event description */}
                <span className={cn(
                    "flex-1 text-sm truncate",
                    isTop ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                    {prediction.description}
                </span>

                {/* Probability */}
                <div className="flex items-center gap-1.5">
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        confidenceColors[prediction.confidence]
                    )} />
                    <span className={cn(
                        "text-xs font-mono",
                        isTop ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {formatProbability(prediction.probability)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Compact version for inline display
export function SequenceAssistantCompact({ className }: { className?: string }) {
    const { predictions } = useMatchContext();

    const topPrediction = predictions[0];

    if (!topPrediction || topPrediction.probability < 0.2) {
        return null;
    }

    return (
        <div className={cn(
            "inline-flex items-center gap-2 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30",
            className
        )}>
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-200">
                Next:
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs font-bold">
                {topPrediction.buttonLabel}
            </kbd>
            <span className="text-xs text-muted-foreground">
                ({formatProbability(topPrediction.probability)})
            </span>
        </div>
    );
}

// Learning stats display
export function PredictorStats({ className }: { className?: string }) {
    const { learningStats, resetPredictions } = useMatchContext();

    if (!learningStats) {
        return null;
    }

    return (
        <div className={cn(
            "rounded-lg border border-border/50 bg-card/95 p-3 space-y-2",
            className
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold">Pattern Learning</span>
                </div>
                <button
                    onClick={resetPredictions}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-muted-foreground">Patterns:</span>
                    <span className="ml-1 font-medium">{learningStats.totalPatterns}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Events:</span>
                    <span className="ml-1 font-medium">{learningStats.totalEventsProcessed}</span>
                </div>
            </div>

            {learningStats.topPatterns.length > 0 && (
                <div className="pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Top Patterns:</span>
                    <div className="mt-1 space-y-1">
                        {learningStats.topPatterns.slice(0, 3).map((pattern, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-purple-300 truncate max-w-[120px]">
                                    {pattern.sequence.join(' → ')}
                                </span>
                                <span className="text-muted-foreground">
                                    → {pattern.topFollower} ({formatProbability(pattern.topFollowerProbability)})
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SequenceAssistant;
