import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerPosition } from "@/utils/passPredictor";
import { ChevronRight, User } from "lucide-react";

interface SmartPlayerSelectorProps {
    currentBallHolder: PlayerPosition | null;
    predictedTargets: PlayerPosition[];
    selectedTargetIndex: number;
    isActive: boolean;
}

export const SmartPlayerSelector = ({
    currentBallHolder,
    predictedTargets,
    selectedTargetIndex,
    isActive
}: SmartPlayerSelectorProps) => {
    if (!isActive || !currentBallHolder) {
        return null;
    }

    const getPositionColor = (position: PlayerPosition["position"]) => {
        switch (position) {
            case "GK": return "bg-yellow-500";
            case "DEF": return "bg-blue-500";
            case "MID": return "bg-green-500";
            case "FWD": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    const getTeamColor = (team: "TEAM_A" | "TEAM_B") => {
        return team === "TEAM_A" ? "bg-primary" : "bg-destructive";
    };

    return (
        <Card className="fixed top-4 right-4 bg-card/95 backdrop-blur border-2 shadow-xl z-50 min-w-[280px] max-w-[320px]">
            {/* Current Ball Holder */}
            <div className="p-3 border-b bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Ball Holder
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getTeamColor(currentBallHolder.team)}`} />
                    <div className="font-semibold text-sm">
                        #{currentBallHolder.number} {currentBallHolder.name}
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {currentBallHolder.position}
                    </Badge>
                </div>
            </div>

            {/* Predicted Targets */}
            <div className="p-3">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                    Pass to:
                </div>

                {predictedTargets.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                        No predictions available
                    </div>
                ) : (
                    <div className="space-y-1">
                        {predictedTargets.map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center gap-2 p-2 rounded-md transition-all ${index === selectedTargetIndex
                                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                                        : "bg-muted/40 hover:bg-muted/60"
                                    }`}
                            >
                                {index === selectedTargetIndex && (
                                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                )}
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${index === selectedTargetIndex
                                        ? "bg-primary-foreground"
                                        : getPositionColor(player.position)
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                        #{player.number} {player.name}
                                    </div>
                                </div>
                                <Badge
                                    variant={index === selectedTargetIndex ? "secondary" : "outline"}
                                    className="text-xs flex-shrink-0"
                                >
                                    {player.position}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="px-3 pb-3 pt-1 border-t">
                <div className="text-xs text-muted-foreground text-center">
                    D-pad ↑↓ to select • A to confirm
                </div>
            </div>
        </Card>
    );
};
