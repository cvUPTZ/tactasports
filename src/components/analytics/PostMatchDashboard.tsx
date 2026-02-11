import { LoggedEvent } from "@/hooks/useGamepad";
import { TacticalAnalysisDashboard } from "@/components/TacticalAnalysisDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Target,
    ArrowRightLeft,
    Shield,
    Zap,
    TrendingUp,
    Activity,
    Users,
    Timer,
    BarChart3
} from "lucide-react";
import { useMemo } from "react";

interface PostMatchDashboardProps {
    events: LoggedEvent[];
    teamNames: { teamA: string, teamB: string };
    videoFile?: File | null;
}

// Calculate comprehensive post-match stats
const calculateStats = (events: LoggedEvent[], teamNames: { teamA: string, teamB: string }) => {
    const teamA = events.filter(e => e.team === "TEAM_A");
    const teamB = events.filter(e => e.team === "TEAM_B");

    // Possession Events
    const passesA = teamA.filter(e => e.eventName.includes('pass')).length;
    const passesB = teamB.filter(e => e.eventName.includes('pass')).length;
    const totalPasses = passesA + passesB;

    // Shots & Goals
    const shotsA = teamA.filter(e => e.eventName.includes('shot')).length;
    const shotsB = teamB.filter(e => e.eventName.includes('shot')).length;
    const goalsA = teamA.filter(e => e.eventName === 'goal').length;
    const goalsB = teamB.filter(e => e.eventName === 'goal').length;

    // Key passes & assists
    const keyPassesA = teamA.filter(e => e.eventName === 'key_pass').length;
    const keyPassesB = teamB.filter(e => e.eventName === 'key_pass').length;
    const assistsA = teamA.filter(e => e.eventName === 'assist').length;
    const assistsB = teamB.filter(e => e.eventName === 'assist').length;

    // Chances
    const chancesA = teamA.filter(e => ['chance_created', 'big_chance'].includes(e.eventName)).length;
    const chancesB = teamB.filter(e => ['chance_created', 'big_chance'].includes(e.eventName)).length;

    // Defensive
    const tacklesA = teamA.filter(e => ['tackle', 'duel_ground', 'duel_aerial'].includes(e.eventName)).length;
    const tacklesB = teamB.filter(e => ['tackle', 'duel_ground', 'duel_aerial'].includes(e.eventName)).length;
    const interceptionsA = teamA.filter(e => e.eventName === 'interception').length;
    const interceptionsB = teamB.filter(e => e.eventName === 'interception').length;

    // Pressing
    const pressingSuccessA = teamA.filter(e => e.eventName === 'pressing_success').length;
    const pressingSuccessB = teamB.filter(e => e.eventName === 'pressing_success').length;
    const pressingFailA = teamA.filter(e => e.eventName === 'pressing_fail').length;
    const pressingFailB = teamB.filter(e => e.eventName === 'pressing_fail').length;

    // Dribbles
    const dribbleSuccessA = teamA.filter(e => e.eventName === 'dribble_success').length;
    const dribbleSuccessB = teamB.filter(e => e.eventName === 'dribble_success').length;
    const dribbleFailA = teamA.filter(e => e.eventName === 'dribble_fail').length;
    const dribbleFailB = teamB.filter(e => e.eventName === 'dribble_fail').length;

    // Off-ball movement
    const offBallA = teamA.filter(e => ['off_ball_run', 'overlap', 'underlap', 'third_man_run', 'dummy_run'].includes(e.eventName)).length;
    const offBallB = teamB.filter(e => ['off_ball_run', 'overlap', 'underlap', 'third_man_run', 'dummy_run'].includes(e.eventName)).length;

    // Transitions
    const transitionsA = teamA.filter(e => e.eventName.includes('transition')).length;
    const transitionsB = teamB.filter(e => e.eventName.includes('transition')).length;

    // Possession %
    const possessionA = totalPasses > 0 ? Math.round((passesA / totalPasses) * 100) : 50;

    return {
        total: events.length,
        teamA: {
            name: teamNames.teamA,
            events: teamA.length,
            goals: goalsA,
            shots: shotsA,
            passes: passesA,
            keyPasses: keyPassesA,
            assists: assistsA,
            chances: chancesA,
            tackles: tacklesA,
            interceptions: interceptionsA,
            pressingSuccess: pressingSuccessA,
            pressingFail: pressingFailA,
            dribbleSuccess: dribbleSuccessA,
            dribbleFail: dribbleFailA,
            offBall: offBallA,
            transitions: transitionsA,
            possession: possessionA,
        },
        teamB: {
            name: teamNames.teamB,
            events: teamB.length,
            goals: goalsB,
            shots: shotsB,
            passes: passesB,
            keyPasses: keyPassesB,
            assists: assistsB,
            chances: chancesB,
            tackles: tacklesB,
            interceptions: interceptionsB,
            pressingSuccess: pressingSuccessB,
            pressingFail: pressingFailB,
            dribbleSuccess: dribbleSuccessB,
            dribbleFail: dribbleFailB,
            offBall: offBallB,
            transitions: transitionsB,
            possession: 100 - possessionA,
        }
    };
};

export const PostMatchDashboard = ({ events, teamNames, videoFile }: PostMatchDashboardProps) => {
    const stats = useMemo(() => calculateStats(events, teamNames), [events, teamNames]);

    return (
        <div className="space-y-6">
            {/* Top Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Score Card */}
                <Card className="col-span-2 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10 border-muted">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                                <div className="text-4xl font-bold text-blue-400">{stats.teamA.goals}</div>
                                <div className="text-xs text-muted-foreground truncate">{stats.teamA.name}</div>
                            </div>
                            <div className="text-2xl font-light text-muted-foreground px-4">vs</div>
                            <div className="text-center flex-1">
                                <div className="text-4xl font-bold text-red-400">{stats.teamB.goals}</div>
                                <div className="text-xs text-muted-foreground truncate">{stats.teamB.name}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Key Stats */}
                <SummaryCard
                    icon={<Target className="w-5 h-5 text-primary" />}
                    title="Shots"
                    valueA={stats.teamA.shots}
                    valueB={stats.teamB.shots}
                />
                <SummaryCard
                    icon={<ArrowRightLeft className="w-5 h-5 text-green-500" />}
                    title="Passes"
                    valueA={stats.teamA.passes}
                    valueB={stats.teamB.passes}
                />
                <SummaryCard
                    icon={<Shield className="w-5 h-5 text-blue-500" />}
                    title="Tackles"
                    valueA={stats.teamA.tackles}
                    valueB={stats.teamB.tackles}
                />
                <SummaryCard
                    icon={<Zap className="w-5 h-5 text-yellow-500" />}
                    title="Chances"
                    valueA={stats.teamA.chances}
                    valueB={stats.teamB.chances}
                />
            </div>

            {/* Possession Bar */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-400 w-20 text-right">{stats.teamA.possession}%</span>
                    <div className="flex-1 h-3 bg-red-500/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${stats.teamA.possession}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium text-red-400 w-20">{stats.teamB.possession}%</span>
                </div>
                <div className="text-center text-xs text-muted-foreground mt-2">Ball Possession</div>
            </Card>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPICard label="Key Passes" valueA={stats.teamA.keyPasses} valueB={stats.teamB.keyPasses} />
                <KPICard label="Assists" valueA={stats.teamA.assists} valueB={stats.teamB.assists} />
                <KPICard label="Interceptions" valueA={stats.teamA.interceptions} valueB={stats.teamB.interceptions} />
                <KPICard label="Press Success" valueA={stats.teamA.pressingSuccess} valueB={stats.teamB.pressingSuccess} />
                <KPICard label="Dribble Success" valueA={stats.teamA.dribbleSuccess} valueB={stats.teamB.dribbleSuccess} />
                <KPICard label="Off-Ball Runs" valueA={stats.teamA.offBall} valueB={stats.teamB.offBall} />
            </div>

            {/* Main Analysis Dashboard */}
            <Card className="border-muted">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Detailed Tactical Analysis
                        <Badge variant="outline" className="ml-auto text-xs">
                            {stats.total} events
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <TacticalAnalysisDashboard
                        events={events}
                        teamNames={teamNames}
                        hasVideo={!!videoFile}
                        videoFile={videoFile}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

// Sub-components
const SummaryCard = ({
    icon,
    title,
    valueA,
    valueB
}: {
    icon: React.ReactNode,
    title: string,
    valueA: number,
    valueB: number
}) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-muted-foreground">{title}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-400">{valueA}</span>
                <span className="text-xs text-muted-foreground">-</span>
                <span className="text-xl font-bold text-red-400">{valueB}</span>
            </div>
        </CardContent>
    </Card>
);

const KPICard = ({ label, valueA, valueB }: { label: string, valueA: number, valueB: number }) => (
    <Card className="p-3 bg-muted/30">
        <div className="text-[10px] text-muted-foreground mb-1 truncate">{label}</div>
        <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-400">{valueA}</span>
            <span className="text-[10px] text-muted-foreground">vs</span>
            <span className="text-sm font-bold text-red-400">{valueB}</span>
        </div>
    </Card>
);
