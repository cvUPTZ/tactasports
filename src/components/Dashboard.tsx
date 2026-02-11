import { LoggedEvent } from "@/hooks/useGamepad";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Shield, Trophy, XCircle } from "lucide-react";

interface DashboardProps {
    events: LoggedEvent[];
    teamNames?: { teamA: string, teamB: string };
}

export const Dashboard = ({ events, teamNames = { teamA: "Team A", teamB: "Team B" } }: DashboardProps) => {
    // Calculate Stats
    const totalPasses = events.filter(e => e.eventName === "PASS").length;
    const successfulPasses = events.filter(e => e.eventName === "Successful Pass").length;
    const failedPasses = events.filter(e => e.eventName === "Failed Pass").length;

    const duelsWon = events.filter(e => e.eventName === "Duel Won").length; // Note: Logic for Duel Won/Lost needs to be precise in useGamepad
    // Based on current logic in useGamepad, we log "Duel" then "Possession Won/Lost". 
    // We might need to refine useGamepad to explicitly log "Duel Won" if that's the requirement, 
    // or infer it here. For now, let's count "Possession Won" as a positive defensive action if no pass preceded it.

    const possessionWon = events.filter(e => e.eventName === "Possession Won").length;
    const possessionLost = events.filter(e => e.eventName === "Possession Lost").length;

    // Simple Possession % Estimate (based on event counts for now, or time if we had it easily)
    // Let's use event count ratio for Team A vs Team B for a rough "Activity" metric
    const teamAEvents = events.filter(e => e.team === "TEAM_A").length;
    const teamBEvents = events.filter(e => e.team === "TEAM_B").length;
    const totalEvents = teamAEvents + teamBEvents;
    const teamAPercentage = totalEvents > 0 ? Math.round((teamAEvents / totalEvents) * 100) : 50;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Possession / Activity */}
            <Card className="p-4 border-2 border-primary/20 bg-card col-span-1 md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Match Activity ({teamNames.teamA} vs {teamNames.teamB})
                    </h3>
                    <span className="text-sm font-mono">{teamAPercentage}% - {100 - teamAPercentage}%</span>
                </div>
                <Progress value={teamAPercentage} className="h-3" />
            </Card>

            {/* Passing Stats */}
            <Card className="p-4 border-2 border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Passing
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Passes</span>
                        <span className="font-bold">{totalPasses}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Successful</span>
                        <span className="font-bold text-success">{successfulPasses}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Failed</span>
                        <span className="font-bold text-destructive">{failedPasses}</span>
                    </div>
                </div>
            </Card>

            {/* Defensive Stats */}
            <Card className="p-4 border-2 border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Possession
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Possession Won</span>
                        <span className="font-bold text-success">{possessionWon}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Possession Lost</span>
                        <span className="font-bold text-destructive">{possessionLost}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};
