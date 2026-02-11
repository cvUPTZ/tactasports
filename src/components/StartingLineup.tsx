import { Player } from "@/types/player";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Shirt } from "lucide-react";

interface StartingLineupProps {
    players: Player[];
    teamName: string;
}

export const StartingLineup = ({ players, teamName }: StartingLineupProps) => {
    // Filter for starting XI if applicable, otherwise show all
    // For Algeria, we know the IDs: 1, 2, 5, 6, 7, 8, 9, 10, 11, 15, 22
    const ALGERIA_STARTERS = [1, 2, 5, 6, 7, 8, 9, 10, 11, 15, 22];

    const startingPlayers = teamName === "Algeria"
        ? players.filter(p => ALGERIA_STARTERS.includes(p.ID))
        : players.slice(0, 11); // Fallback: take first 11

    return (
        <Card className="h-full flex flex-col border-none bg-transparent shadow-none">
            <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Shirt className="w-5 h-5 text-primary" />
                    Starting XI
                </h3>
                <span className="text-xs font-bold px-2 py-1 rounded bg-primary/20 text-primary">
                    {teamName}
                </span>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="grid grid-cols-1 gap-2 pb-4">
                    {startingPlayers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm italic">
                            No players available.
                        </div>
                    ) : (
                        startingPlayers.map((player) => (
                            <div
                                key={player.ID}
                                className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shadow-sm border border-border">
                                    {player.Number || "-"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold leading-none">
                                        {player.Forename} {player.Surname}
                                    </span>
                                    {player.Position && (
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                            {player.Position}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </Card>
    );
};
