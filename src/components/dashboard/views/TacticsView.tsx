import React from 'react';
import { Activity } from 'lucide-react';
import { TacticalReview } from '@/components/analytics/TacticalReview';
import { LoggedEvent } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';

interface TacticsViewProps {
    events: LoggedEvent[];
    teamNames: { teamA: string; teamB: string };
    teamARoster: TeamRoster;
    teamBRoster: TeamRoster;
}

export const TacticsView: React.FC<TacticsViewProps> = ({
    events,
    teamNames,
    teamARoster,
    teamBRoster
}) => {
    return (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Activity className="h-5 w-5" /> Tactical Review
                </h2>
            </div>
            <TacticalReview
                events={events}
                teamNames={teamNames}
                teamARoster={teamARoster?.PlayerData || []}
                teamBRoster={teamBRoster?.PlayerData || []}
            />
        </div>
    );
};
