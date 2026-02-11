import { PlayerCard } from "@/components/PlayerCard";
import { Player } from "@/types/player";

interface PlayerGridProps {
  players: Player[];
  teamName?: string;
}

export const PlayerGrid = ({ players, teamName }: PlayerGridProps) => {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">
          {teamName || "Team Roster"}
        </h2>
        <span className="text-sm text-muted-foreground">
          {players.length} players
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {players.map((player) => (
          <PlayerCard key={player.ID} player={player} />
        ))}
      </div>
    </div>
  );
};
