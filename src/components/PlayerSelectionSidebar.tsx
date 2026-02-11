import { Player } from "@/types/player";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface PlayerSelectionSidebarProps {
    players: Player[];
    selectedPlayerId: number | null;
    onSelectPlayer: (playerId: number) => void;
    teamName: string;
    startingNumbers?: number[]; // Optional array of jersey numbers for starting XI
}

export const PlayerSelectionSidebar = ({
    players,
    selectedPlayerId,
    onSelectPlayer,
    teamName,
    startingNumbers
}: PlayerSelectionSidebarProps) => {
    // Filter to show only starting players
    // If startingNumbers is provided, use those; otherwise default to 1-11
    const defaultStarting = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const numbersToShow = startingNumbers || defaultStarting;

    const startingPlayers = players
        .filter(player => numbersToShow.includes(player.Number))
        .sort((a, b) => a.Number - b.Number);

    return (
        <Card className="h-auto flex flex-col border-r border-border bg-card rounded-none border-y-0 border-l-0">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-lg">Starting XI</h2>
                <p className="text-sm text-muted-foreground truncate">{teamName}</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-1 grid grid-cols-3 gap-1">
                    {startingPlayers.map((player) => (
                        <div
                            key={player.ID}
                            onClick={() => onSelectPlayer(player.ID)}
                            className={`flex flex-col items-center justify-center p-1 rounded cursor-pointer transition-all border h-16 ${selectedPlayerId === player.ID
                                ? "bg-primary/20 border-primary"
                                : "bg-card hover:bg-secondary/50 border-border hover:border-primary/30"
                                }`}
                        >
                            <span className="text-lg font-bold font-mono text-primary leading-none">
                                {player.Number || "#"}
                            </span>
                            <p className="font-medium text-[10px] text-center leading-tight line-clamp-1 w-full px-0.5 mt-0.5">
                                {player.Surname}
                            </p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
};
