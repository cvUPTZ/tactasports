import { Card } from "@/components/ui/card";
import { Player } from "@/types/player";
import { User } from "lucide-react";

interface PlayerCardProps {
  player: Player;
}

export const PlayerCard = ({ player }: PlayerCardProps) => {
  return (
    <Card className="p-3 border border-border bg-card hover:border-primary/50 transition-all hover:shadow-lg group">
      <div className="flex items-center gap-3">
        {/* Player Image */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border/50">
          {player.ImageURL ? (
            <img
              src={player.ImageURL}
              alt={`${player.Forename} ${player.Surname}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${player.ImageURL ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center`}>
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {player.Number && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                #{player.Number}
              </span>
            )}
            <h4 className="text-sm font-semibold text-foreground truncate">
              {player.Forename} {player.Surname}
            </h4>
          </div>
          {player.Position && (
            <p className="text-xs text-muted-foreground mt-0.5">{player.Position}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
