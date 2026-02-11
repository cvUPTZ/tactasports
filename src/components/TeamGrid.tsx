import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TeamGridProps {
  teams: string[];
  selectedTeam?: string;
  onSelectTeam: (teamName: string) => void;
}

export const TeamGrid = ({ teams, selectedTeam, onSelectTeam }: TeamGridProps) => {
  if (teams.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No teams available. Please upload a team roster.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">Select a Team</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((teamName) => (
          <Card
            key={teamName}
            className={`p-6 cursor-pointer transition-colors flex items-center gap-4 group border-2 ${selectedTeam === teamName ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onClick={() => onSelectTeam(teamName)}
          >
            <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{teamName}</h3>
              <p className="text-sm text-muted-foreground">Click to view roster</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
