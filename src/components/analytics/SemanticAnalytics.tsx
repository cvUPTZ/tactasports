import { Card } from "@/components/ui/card";
import { LoggedEvent } from "@/hooks/useGamepad";
import { Brain, Zap, Target, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SemanticAnalyticsProps {
    events: LoggedEvent[];
}

export const SemanticAnalytics = ({ events }: SemanticAnalyticsProps) => {
    // 1. Calculate Psychological Profile
    const psychCounts = events.reduce((acc, e) => {
        if (e.psychology) acc[e.psychology] = (acc[e.psychology] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 2. Calculate Momentum (Intensity of SPIRIT vs others)
    const spiritImpact = events.filter(e => e.psychology === 'SPIRIT').length;
    const fearImpact = events.filter(e => e.psychology === 'FEAR').length;
    const egoImpact = events.filter(e => e.psychology === 'EGO').length;

    // 3. Contextual Analysis (e.g., Post-Goal events)
    const postGoalEvents = events.filter(e => e.contextualFactor === 'Post-Goal');
    const lowBlockAfterGoal = postGoalEvents.filter(e => e.semanticIndicator === 'Defensive Block Height' && e.intensity === 'LOW').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            {/* PSYCHOLOGICAL RADAR */}
            <Card className="p-4 bg-background/50 backdrop-blur-sm border-primary/20">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Team Psychological Radar
                    </span>
                </div>
                <div className="space-y-3">
                    <TrendBar label="Spirit" value={psychCounts.SPIRIT || 0} total={events.length} color="bg-orange-500" icon={<Zap className="w-3 h-3" />} />
                    <TrendBar label="Focus/Ego" value={psychCounts.EGO || 0} total={events.length} color="bg-blue-600" icon={<Target className="w-3 h-3" />} />
                    <TrendBar label="Fragility/Fear" value={psychCounts.FEAR || 0} total={events.length} color="bg-amber-600" icon={<AlertTriangle className="w-3 h-3" />} />
                </div>
            </Card>

            {/* MOMENTUM SIGNAL */}
            <Card className="p-4 bg-background/50 backdrop-blur-sm border-primary/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Momentum Signal
                    </span>
                </div>
                <div className="text-center py-4">
                    <div className="text-4xl font-black italic text-primary">
                        {spiritImpact > fearImpact ? 'DOMINANT' : 'VULNERABLE'}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        Based on {events.length} semantic observations
                    </p>
                </div>
            </Card>

            {/* STRATEGIC VULNERABILITY */}
            <Card className="p-4 bg-background/50 backdrop-blur-sm border-destructive/20 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Strategic Vulnerability
                    </span>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 bg-destructive/5 p-3 rounded-lg border border-destructive/10 text-center">
                        <div className="text-2xl font-black text-destructive">{lowBlockAfterGoal}</div>
                        <div className="text-[9px] uppercase font-bold opacity-70">Sustained Low Block<br />Post-Goal Score</div>
                    </div>
                    <div className="flex-1 bg-primary/5 p-3 rounded-lg border border-primary/10 text-center">
                        <div className="text-2xl font-black text-primary">{egoImpact}</div>
                        <div className="text-[9px] uppercase font-bold opacity-70">Losses due to<br />Decision Inefficiency</div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

interface TrendBarProps {
    label: string;
    value: number;
    total: number;
    color: string;
    icon: React.ReactNode;
}

const TrendBar = ({ label, value, total, color, icon }: TrendBarProps) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px] uppercase font-bold">
                <span className="flex items-center gap-1">{icon} {label}</span>
                <span>{value} ({Math.round(percentage)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
};
