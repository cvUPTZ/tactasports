import { LoggedEvent } from "@/hooks/useGamepad";
import { ZoneGrid } from "@/components/ZoneGrid";
import { EventLog } from "@/components/EventLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Activity,
    Zap,
    Target,
    Shield,
    Crosshair,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowRightLeft,
    Timer,
    Users
} from "lucide-react";
import { MomentumChart } from "./MomentumChart";
import { useMemo } from "react";

interface LiveDashboardProps {
    events: LoggedEvent[];
    currentZone: number;
    onZoneClick: (zone: number) => void;
    teamNames: { teamA: string, teamB: string };
}

// Calculate comprehensive KPIs from events
const calculateKPIs = (events: LoggedEvent[], teamNames: { teamA: string, teamB: string }) => {
    const teamA = events.filter(e => e.team === "TEAM_A");
    const teamB = events.filter(e => e.team === "TEAM_B");

    // Possession Events
    const passesA = teamA.filter(e => e.eventName.includes('pass')).length;
    const passesB = teamB.filter(e => e.eventName.includes('pass')).length;
    const totalPasses = passesA + passesB;

    // Shots
    const shotsA = teamA.filter(e => e.eventName.includes('shot')).length;
    const shotsB = teamB.filter(e => e.eventName.includes('shot')).length;
    const goalsA = teamA.filter(e => e.eventName === 'goal').length;
    const goalsB = teamB.filter(e => e.eventName === 'goal').length;

    // Defensive Actions
    const tacklesA = teamA.filter(e => ['tackle', 'duel_ground', 'duel_aerial'].includes(e.eventName)).length;
    const tacklesB = teamB.filter(e => ['tackle', 'duel_ground', 'duel_aerial'].includes(e.eventName)).length;
    const interceptionsA = teamA.filter(e => e.eventName === 'interception').length;
    const interceptionsB = teamB.filter(e => e.eventName === 'interception').length;
    const clearancesA = teamA.filter(e => e.eventName === 'clearance').length;
    const clearancesB = teamB.filter(e => e.eventName === 'clearance').length;

    // Pressing
    const pressTriggersA = teamA.filter(e => ['pressing_trigger', 'press_trap', 'pressing_success'].includes(e.eventName)).length;
    const pressTriggersB = teamB.filter(e => ['pressing_trigger', 'press_trap', 'pressing_success'].includes(e.eventName)).length;

    // Transitions
    const transitionsOffA = teamA.filter(e => e.eventName === 'transition_off_start').length;
    const transitionsOffB = teamB.filter(e => e.eventName === 'transition_off_start').length;
    const transitionsDefA = teamA.filter(e => e.eventName === 'transition_def_start').length;
    const transitionsDefB = teamB.filter(e => e.eventName === 'transition_def_start').length;
    const counterAttacksA = teamA.filter(e => e.eventName === 'counter_attack').length;
    const counterAttacksB = teamB.filter(e => e.eventName === 'counter_attack').length;

    // Turnovers
    const turnoversA = teamA.filter(e => e.eventName === 'turnover').length;
    const turnoversB = teamB.filter(e => e.eventName === 'turnover').length;

    // Dribbles
    const dribblesA = teamA.filter(e => e.eventName.includes('dribble')).length;
    const dribblesB = teamB.filter(e => e.eventName.includes('dribble')).length;

    // Danger
    const dangerousAttacksA = teamA.filter(e => ['dangerous_attack', 'big_chance', 'final_third_entry'].includes(e.eventName)).length;
    const dangerousAttacksB = teamB.filter(e => ['dangerous_attack', 'big_chance', 'final_third_entry'].includes(e.eventName)).length;

    // Set Pieces
    const setPiecesA = teamA.filter(e => ['corner_start', 'free_kick', 'penalty', 'throw_in_tactical'].includes(e.eventName)).length;
    const setPiecesB = teamB.filter(e => ['corner_start', 'free_kick', 'penalty', 'throw_in_tactical'].includes(e.eventName)).length;

    // Cards
    const yellowCardsA = teamA.filter(e => e.eventName === 'card_yellow').length;
    const yellowCardsB = teamB.filter(e => e.eventName === 'card_yellow').length;
    const redCardsA = teamA.filter(e => e.eventName === 'card_red').length;
    const redCardsB = teamB.filter(e => e.eventName === 'card_red').length;

    // Possession % (based on pass events)
    const possessionA = totalPasses > 0 ? Math.round((passesA / totalPasses) * 100) : 50;
    const possessionB = 100 - possessionA;

    return {
        teamA: {
            name: teamNames.teamA,
            events: teamA.length,
            passes: passesA,
            shots: shotsA,
            goals: goalsA,
            tackles: tacklesA,
            interceptions: interceptionsA,
            clearances: clearancesA,
            pressing: pressTriggersA,
            transitionsOff: transitionsOffA,
            transitionsDef: transitionsDefA,
            counterAttacks: counterAttacksA,
            turnovers: turnoversA,
            dribbles: dribblesA,
            dangerousAttacks: dangerousAttacksA,
            setPieces: setPiecesA,
            yellowCards: yellowCardsA,
            redCards: redCardsA,
            possession: possessionA,
        },
        teamB: {
            name: teamNames.teamB,
            events: teamB.length,
            passes: passesB,
            shots: shotsB,
            goals: goalsB,
            tackles: tacklesB,
            interceptions: interceptionsB,
            clearances: clearancesB,
            pressing: pressTriggersB,
            transitionsOff: transitionsOffB,
            transitionsDef: transitionsDefB,
            counterAttacks: counterAttacksB,
            turnovers: turnoversB,
            dribbles: dribblesB,
            dangerousAttacks: dangerousAttacksB,
            setPieces: setPiecesB,
            yellowCards: yellowCardsB,
            redCards: redCardsB,
            possession: possessionB,
        },
        total: events.length,
    };
};

// Generate insights based on KPIs
const generateInsights = (kpis: ReturnType<typeof calculateKPIs>) => {
    const insights: { type: 'warning' | 'success' | 'info', title: string, description: string }[] = [];

    // Possession insight
    if (kpis.teamA.possession > 60) {
        insights.push({
            type: 'success',
            title: `${kpis.teamA.name} Dominating Possession`,
            description: `Controlling ${kpis.teamA.possession}% of possession with ${kpis.teamA.passes} passes.`
        });
    } else if (kpis.teamB.possession > 60) {
        insights.push({
            type: 'warning',
            title: `${kpis.teamB.name} Dominating Possession`,
            description: `Opponent controlling ${kpis.teamB.possession}% of possession.`
        });
    }

    // Pressing insight
    if (kpis.teamA.pressing > kpis.teamB.pressing + 3) {
        insights.push({
            type: 'info',
            title: 'High Pressing Intensity',
            description: `${kpis.teamA.name} is pressing aggressively with ${kpis.teamA.pressing} triggers.`
        });
    }

    // Counter-attack warning
    if (kpis.teamB.counterAttacks >= 2) {
        insights.push({
            type: 'warning',
            title: 'Counter-Attack Threat',
            description: `${kpis.teamB.name} has launched ${kpis.teamB.counterAttacks} counter-attacks.`
        });
    }

    // Danger zone
    if (kpis.teamB.dangerousAttacks >= 3) {
        insights.push({
            type: 'warning',
            title: 'Defensive Alert',
            description: `${kpis.teamB.name} has ${kpis.teamB.dangerousAttacks} dangerous attacks.`
        });
    }

    // Shots on target
    if (kpis.teamA.shots > 0 && kpis.teamA.goals / kpis.teamA.shots < 0.1) {
        insights.push({
            type: 'info',
            title: 'Low Shot Conversion',
            description: `${kpis.teamA.name} has ${kpis.teamA.shots} shots but only ${kpis.teamA.goals} goals.`
        });
    }

    // Turnovers warning
    if (kpis.teamA.turnovers > 5) {
        insights.push({
            type: 'warning',
            title: 'High Turnovers',
            description: `${kpis.teamA.name} has lost possession ${kpis.teamA.turnovers} times.`
        });
    }

    return insights.slice(0, 4); // Max 4 insights
};

export const LiveDashboard = ({ events, currentZone, onZoneClick, teamNames }: LiveDashboardProps) => {
    const kpis = useMemo(() => calculateKPIs(events, teamNames), [events, teamNames]);
    const insights = useMemo(() => generateInsights(kpis), [kpis]);

    return (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
            {/* Left Column: Stats & Event Feed */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
                {/* Score / Events Count */}
                <div className="grid grid-cols-2 gap-2">
                    <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{kpis.teamA.goals}</div>
                            <div className="text-xs text-muted-foreground truncate">{kpis.teamA.name}</div>
                            <div className="text-[10px] text-blue-400/70 mt-1">{kpis.teamA.events} events</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-bold text-red-400">{kpis.teamB.goals}</div>
                            <div className="text-xs text-muted-foreground truncate">{kpis.teamB.name}</div>
                            <div className="text-[10px] text-red-400/70 mt-1">{kpis.teamB.events} events</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Possession Bar */}
                <Card className="p-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-blue-400 font-bold">{kpis.teamA.possession}%</span>
                        <span className="text-muted-foreground">Possession</span>
                        <span className="text-red-400 font-bold">{kpis.teamB.possession}%</span>
                    </div>
                    <div className="h-2 bg-red-500/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${kpis.teamA.possession}%` }}
                        />
                    </div>
                </Card>

                {/* Event Feed */}
                <div className="flex-1 min-h-0 border rounded-lg bg-card/50 overflow-hidden">
                    <EventLog events={events} teamNames={teamNames} />
                </div>
            </div>

            {/* Center Column: Visualizations & KPIs */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                {/* Momentum Chart */}
                <Card className="shrink-0">
                    <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Match Momentum (Last 5 mins)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 h-32">
                        <MomentumChart events={events} />
                    </CardContent>
                </Card>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <KPICard
                        label="Shots"
                        valueA={kpis.teamA.shots}
                        valueB={kpis.teamB.shots}
                        icon={<Target className="w-4 h-4" />}
                    />
                    <KPICard
                        label="Passes"
                        valueA={kpis.teamA.passes}
                        valueB={kpis.teamB.passes}
                        icon={<ArrowRightLeft className="w-4 h-4" />}
                    />
                    <KPICard
                        label="Tackles"
                        valueA={kpis.teamA.tackles}
                        valueB={kpis.teamB.tackles}
                        icon={<Shield className="w-4 h-4" />}
                    />
                    <KPICard
                        label="Pressing"
                        valueA={kpis.teamA.pressing}
                        valueB={kpis.teamB.pressing}
                        icon={<Zap className="w-4 h-4" />}
                    />
                </div>

                {/* Detailed Stats */}
                <Card>
                    <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm">Match Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                        <StatRow label="Goals" a={kpis.teamA.goals} b={kpis.teamB.goals} />
                        <StatRow label="Shots" a={kpis.teamA.shots} b={kpis.teamB.shots} />
                        <StatRow label="Dangerous Attacks" a={kpis.teamA.dangerousAttacks} b={kpis.teamB.dangerousAttacks} />
                        <StatRow label="Counter Attacks" a={kpis.teamA.counterAttacks} b={kpis.teamB.counterAttacks} />
                        <StatRow label="Interceptions" a={kpis.teamA.interceptions} b={kpis.teamB.interceptions} />
                        <StatRow label="Clearances" a={kpis.teamA.clearances} b={kpis.teamB.clearances} />
                        <StatRow label="Turnovers" a={kpis.teamA.turnovers} b={kpis.teamB.turnovers} />
                        <StatRow label="Dribbles" a={kpis.teamA.dribbles} b={kpis.teamB.dribbles} />
                        <StatRow label="Set Pieces" a={kpis.teamA.setPieces} b={kpis.teamB.setPieces} />
                        <StatRow label="Yellow Cards" a={kpis.teamA.yellowCards} b={kpis.teamB.yellowCards} highlight />
                        <StatRow label="Red Cards" a={kpis.teamA.redCards} b={kpis.teamB.redCards} highlight />
                    </CardContent>
                </Card>

                {/* Zone Grid - Compact */}
                <Card className="p-4">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-primary" />
                        Pitch Zones
                    </div>
                    <div className="max-w-xs mx-auto">
                        <ZoneGrid currentZone={currentZone} onZoneClick={onZoneClick} />
                    </div>
                </Card>
            </div>

            {/* Right Column: Insights */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                <Card className="flex-1">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Live Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                        {insights.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                Log more events to generate insights
                            </div>
                        ) : (
                            insights.map((insight, idx) => (
                                <InsightCard key={idx} {...insight} />
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="p-4">
                    <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-primary" />
                        Quick Stats
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-muted/50 rounded p-2">
                            <div className="text-lg font-bold">{kpis.total}</div>
                            <div className="text-[10px] text-muted-foreground">Total Events</div>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                            <div className="text-lg font-bold">{kpis.teamA.transitionsOff + kpis.teamB.transitionsOff}</div>
                            <div className="text-[10px] text-muted-foreground">Transitions</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// Sub-components
const KPICard = ({ label, valueA, valueB, icon }: { label: string, valueA: number, valueB: number, icon: React.ReactNode }) => (
    <Card className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {icon}
            <span className="text-xs">{label}</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-400">{valueA}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="text-lg font-bold text-red-400">{valueB}</span>
        </div>
    </Card>
);

const StatRow = ({ label, a, b, highlight = false }: { label: string, a: number, b: number, highlight?: boolean }) => {
    const total = a + b;
    const percentA = total > 0 ? (a / total) * 100 : 50;

    return (
        <div className="flex items-center gap-2">
            <span className={`text-xs w-8 text-right font-bold ${highlight ? 'text-yellow-500' : 'text-blue-400'}`}>{a}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/70 transition-all" style={{ width: `${percentA}%` }} />
            </div>
            <span className="text-xs flex-1 text-center text-muted-foreground truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-red-500/70 transition-all float-right" style={{ width: `${100 - percentA}%` }} />
            </div>
            <span className={`text-xs w-8 text-left font-bold ${highlight ? 'text-yellow-500' : 'text-red-400'}`}>{b}</span>
        </div>
    );
};

const InsightCard = ({ type, title, description }: { type: 'warning' | 'success' | 'info', title: string, description: string }) => {
    const config = {
        warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, text: 'text-yellow-600' },
        success: { bg: 'bg-green-500/10', border: 'border-green-500/20', icon: <CheckCircle className="w-4 h-4 text-green-500" />, text: 'text-green-600' },
        info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <Activity className="w-4 h-4 text-blue-500" />, text: 'text-blue-600' },
    };
    const c = config[type];

    return (
        <div className={`p-3 ${c.bg} border ${c.border} rounded-lg flex gap-2`}>
            <div className="shrink-0 mt-0.5">{c.icon}</div>
            <div>
                <h4 className={`font-semibold text-xs ${c.text}`}>{title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
};
