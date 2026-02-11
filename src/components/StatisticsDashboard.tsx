import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, Clock, Zap, Target } from 'lucide-react';

interface LoggedEvent {
    eventName: string;
    timestamp: string;
    durationMs?: number;
    zone?: number;
    subType?: string;
}

interface StatisticsDashboardProps {
    events: LoggedEvent[];
    isFullPage?: boolean;
    isOverlay?: boolean;
}

export const StatisticsDashboard = ({ events, isFullPage = false, isOverlay = false }: StatisticsDashboardProps) => {
    const [isMinimized, setIsMinimized] = React.useState(false);

    // Calculate statistics
    const totalEvents = events.length;

    const passes = events.filter(e => e.eventName === "pass_start" || e.eventName === "pass_end").length;
    const successfulPasses = events.filter(e =>
        e.eventName === "Successful Pass" ||
        e.eventName === "PASS_SUCCESS" ||
        (e.eventName === "pass_end" && !e.subType?.includes("INCOMPLETE")) // Assuming subType might hold success info or just relying on explicit success events if they exist
    ).length;
    const failedPasses = 0;

    const shots = events.filter(e => e.eventName === "shot_start" || e.eventName === "shot_outcome").length;

    const possessionWon = events.filter(e => e.eventName === "interception" || e.eventName === "recovery").length;
    const possessionLost = events.filter(e => e.eventName === "turnover" || e.eventName === "loss").length;
    const possessionChanges = possessionWon + possessionLost;

    const fouls = events.filter(e => e.eventName === "foul" || e.eventName === "foul_committed").length;

    const duels = events.filter(e => e.eventName?.includes("duel")).length;
    const looseBalls = events.filter(e => e.eventName === "loose_ball").length;

    // Advanced Metrics
    const eventsWithZone = events.filter(e => e.zone && e.zone > 0);
    const leftZones = [1, 4, 7, 10, 13, 16];
    const centerZones = [2, 5, 8, 11, 14, 17];
    const rightZones = [3, 6, 9, 12, 15, 18];

    const leftCount = eventsWithZone.filter(e => leftZones.includes(e.zone!)).length;
    const centerCount = eventsWithZone.filter(e => centerZones.includes(e.zone!)).length;
    const rightCount = eventsWithZone.filter(e => rightZones.includes(e.zone!)).length;
    const totalZoneEvents = eventsWithZone.length || 1;

    const leftPct = ((leftCount / totalZoneEvents) * 100).toFixed(0);
    const centerPct = ((centerCount / totalZoneEvents) * 100).toFixed(0);
    const rightPct = ((rightCount / totalZoneEvents) * 100).toFixed(0);

    const shortPasses = events.filter(e => e.subType === "SHORT").length;
    const longPasses = events.filter(e => e.subType === "LONG").length;
    const buildupSequences = events.filter(e => e.eventName === "phase_buildup").length;

    const highPressCount = events.filter(e =>
        (e.eventName === "interception" || e.eventName === "recovery") &&
        e.zone && e.zone >= 13
    ).length;

    // Filter relevant stats for the overlay
    const overlayStats = [
        { title: "Passes", value: passes, color: "text-blue-400", subtext: `✓ ${successfulPasses}` },
        { title: "Shots", value: shots, color: "text-orange-400" },
        { title: "Possession", value: possessionChanges, color: "text-purple-400" },
        { title: "Goals", value: events.filter(e => e.eventName === 'goal').length, color: "text-emerald-400" },
        { title: "Fouls", value: fouls, color: "text-yellow-400" }
    ];

    if (isOverlay) {
        if (isMinimized) {
            return (
                <div
                    className="absolute top-4 left-4 z-50 cursor-pointer group"
                    onClick={() => setIsMinimized(false)}
                >
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-2 flex items-center gap-2 hover:bg-black/80 transition-all shadow-xl">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Stats</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute top-4 left-4 z-50 w-[240px] animate-in slide-in-from-left-4 duration-200">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {/* Overlay Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Stats</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                            className="text-muted-foreground hover:text-white transition-colors"
                        >
                            <TrendingDown className="w-3 h-3 rotate-180" />
                        </button>
                    </div>

                    {/* Compact Overlay Content */}
                    <div className="p-2 space-y-1.5">
                        {overlayStats.map((stat) => (
                            <div key={stat.title} className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-white/5">
                                <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">{stat.title}</span>
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm font-black font-mono", stat.color)}>{stat.value}</span>
                                    {stat.subtext && <span className="text-[8px] text-muted-foreground/50">{stat.subtext}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Footer */}
                    <div className="px-3 py-1.5 bg-emerald-500/10 border-t border-white/5 flex justify-between items-center text-[9px]">
                        <span className="text-emerald-400 font-bold uppercase tracking-wider">Total Events</span>
                        <span className="text-white font-mono">{totalEvents}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {isFullPage && (
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                            <Activity className="w-7 h-7 text-emerald-400" />
                            Match Analytics
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Real-time performance tracking</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-4 py-3 rounded-lg border border-white/5">
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Events</div>
                            <div className="text-2xl font-black text-emerald-400 font-mono">{totalEvents}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Statistics Grid */}
            <div>
                <SectionHeader title="Match Statistics" icon={Target} />
                <div className={`grid gap-2 ${isFullPage ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-7'}`}>
                    <StatCard
                        title="Passes"
                        value={passes}
                        subtext={`✓ ${successfulPasses} | ✗ ${failedPasses}`}
                        color="text-blue-400"
                        bgGradient="from-blue-500/10 to-blue-600/5"
                    />
                    <StatCard
                        title="Shots"
                        value={shots}
                        color="text-orange-400"
                        bgGradient="from-orange-500/10 to-orange-600/5"
                    />
                    <StatCard
                        title="Possession"
                        value={possessionChanges}
                        color="text-purple-400"
                        bgGradient="from-purple-500/10 to-purple-600/5"
                    />
                    <StatCard
                        title="Recoveries"
                        value={possessionWon}
                        subtext="Won"
                        color="text-green-400"
                        bgGradient="from-green-500/10 to-green-600/5"
                        trend="up"
                    />
                    <StatCard
                        title="Losses"
                        value={possessionLost}
                        subtext="Lost"
                        color="text-red-400"
                        bgGradient="from-red-500/10 to-red-600/5"
                        trend="down"
                    />
                    <StatCard
                        title="Fouls"
                        value={fouls}
                        color="text-yellow-400"
                        bgGradient="from-yellow-500/10 to-yellow-600/5"
                    />
                    <StatCard
                        title="Duels"
                        value={duels}
                        subtext={`50/50: ${looseBalls}`}
                        color="text-indigo-400"
                        bgGradient="from-indigo-500/10 to-indigo-600/5"
                    />
                </div>
            </div>



            {/* Advanced Analytics Cards */}
            {isFullPage && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <AdvancedCard
                        title="Passing Circuits"
                        subtitle="Field distribution analysis"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-blue-400">{leftPct}%</div>
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Left</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white">{centerPct}%</div>
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Center</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-red-400">{rightPct}%</div>
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Right</div>
                                </div>
                            </div>
                            <div className="relative w-full h-4 bg-slate-900/60 rounded-full overflow-hidden shadow-inner border border-white/5">
                                <div className="absolute inset-0 flex">
                                    <div
                                        style={{ width: `${leftPct}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out"
                                    />
                                    <div
                                        style={{ width: `${centerPct}%` }}
                                        className="h-full bg-gradient-to-r from-white/40 to-white/30 transition-all duration-700 ease-out"
                                    />
                                    <div
                                        style={{ width: `${rightPct}%` }}
                                        className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 ease-out"
                                    />
                                </div>
                            </div>
                        </div>
                    </AdvancedCard>

                    <AdvancedCard
                        title="Style of Play"
                        subtitle="Tactical approach metrics"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-3 rounded-lg border border-blue-500/20">
                                    <div className="text-[10px] uppercase text-blue-400 tracking-wider mb-1.5">Short Range</div>
                                    <div className="text-3xl font-black text-blue-400">{shortPasses}</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500/10 to-transparent p-3 rounded-lg border border-purple-500/20">
                                    <div className="text-[10px] uppercase text-purple-400 tracking-wider mb-1.5">Long Range</div>
                                    <div className="text-3xl font-black text-purple-400">{longPasses}</div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Buildup Phases</span>
                                <span className="text-xl font-black text-emerald-400">{buildupSequences}</span>
                            </div>
                        </div>
                    </AdvancedCard>

                    <AdvancedCard
                        title="Defensive Intensity"
                        subtitle="Pressing effectiveness"
                    >
                        <div className="space-y-3">
                            <div className="flex items-end gap-3">
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-orange-400">
                                    {highPressCount}
                                </div>
                                <div className="pb-2">
                                    <TrendingUp className="w-6 h-6 text-red-400" />
                                </div>
                            </div>
                            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">
                                High-Press Recoveries
                            </div>
                            <div className="text-[10px] text-muted-foreground/70 leading-relaxed pt-2 border-t border-white/5">
                                Counter-pressing effectiveness in the attacking third of the pitch.
                            </div>
                        </div>
                    </AdvancedCard>
                </div>
            )}
        </div>
    );
};

const SectionHeader = ({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: any }) => (
    <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-emerald-400" />}
        <div>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {title}
            </h3>
            {subtitle && (
                <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">{subtitle}</p>
            )}
        </div>
    </div>
);

const StatCard = ({
    title,
    value,
    subtext,
    color,
    bgGradient,
    trend,
    isTime
}: {
    title: string;
    value: string | number;
    subtext?: string;
    color: string;
    bgGradient?: string;
    trend?: 'up' | 'down';
    isTime?: boolean;
}) => (
    <Card className={cn(
        "relative p-3 bg-slate-900/50 border-white/10 backdrop-blur-sm",
        "transition-all duration-300 hover:scale-[1.02] hover:border-white/20",
        "hover:shadow-lg hover:shadow-black/20 group cursor-pointer overflow-hidden"
    )}>
        {/* Background Gradient Overlay */}
        <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            bgGradient || "from-white/5 to-transparent"
        )} />

        {/* Animated Corner Accent */}
        <div className={cn(
            "absolute top-0 right-0 w-16 h-16 opacity-10 blur-2xl rounded-full",
            "translate-x-1/2 -translate-y-1/2 bg-current transition-all duration-300",
            "group-hover:opacity-20 group-hover:scale-150",
            color
        )} />

        <div className="relative z-10">
            <CardHeader className="p-0 mb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-[9px] text-muted-foreground/70 uppercase font-black tracking-[0.12em] group-hover:text-muted-foreground transition-colors leading-tight">
                        {title}
                    </CardTitle>
                    {trend && (
                        <div className={cn("mt-0.5", trend === 'up' ? 'text-green-400' : 'text-red-400')}>
                            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        </div>
                    )}
                    {isTime && <Clock className="w-3 h-3 text-muted-foreground/50 mt-0.5" />}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className={cn(
                    "text-2xl font-black tracking-tight transition-all duration-300",
                    "group-hover:scale-105 origin-left leading-none",
                    isTime ? "font-mono" : "",
                    color
                )}>
                    {value}
                </div>
                {subtext && (
                    <div className="text-[8px] text-muted-foreground/50 mt-1.5 font-medium uppercase tracking-wide group-hover:text-muted-foreground/70 transition-colors leading-tight">
                        {subtext}
                    </div>
                )}
            </CardContent>
        </div>
    </Card>
);

const AdvancedCard = ({
    title,
    subtitle,
    children
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) => (
    <Card className="p-5 bg-gradient-to-br from-slate-900/70 to-slate-900/40 border-white/10 backdrop-blur-md hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
        <CardHeader className="p-0 mb-4">
            <CardTitle className="text-[11px] text-white uppercase font-black tracking-widest">
                {title}
            </CardTitle>
            {subtitle && (
                <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mt-1">
                    {subtitle}
                </p>
            )}
        </CardHeader>
        <CardContent className="p-0">
            {children}
        </CardContent>
    </Card>
);