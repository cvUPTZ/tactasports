import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerPosition } from "@/utils/passPredictor";

interface QuickPlayerSelectorProps {
    isVisible: boolean;
    roster: PlayerPosition[];
    selectedIndex: number;
    team: "TEAM_A" | "TEAM_B";
}

export const QuickPlayerSelector = ({
    isVisible,
    roster,
    selectedIndex,
    team
}: QuickPlayerSelectorProps) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container - pointer events auto to allow interaction if mouse used, though mainly for visual */}
            <Card className="w-[800px] bg-zinc-900/95 border-zinc-700 p-6 shadow-2xl pointer-events-auto">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                        Select Player <span className={team === "TEAM_A" ? "text-blue-400" : "text-red-400"}>({team === "TEAM_A" ? "Home" : "Away"})</span>
                    </h2>
                    <p className="text-zinc-400 text-sm">Use D-Pad to Select • A to Confirm • B to Cancel</p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                    {roster.map((player, index) => (
                        <div
                            key={player.id}
                            className={`
                                relative p-3 rounded-lg border transition-all duration-200 flex flex-col items-center gap-2
                                ${index === selectedIndex
                                    ? "bg-white text-black border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10"
                                    : "bg-zinc-800 text-zinc-300 border-zinc-700 opacity-80"
                                }
                            `}
                        >
                            <span className={`
                                text-2xl font-black 
                                ${index === selectedIndex ? "text-black" : "text-zinc-500"}
                            `}>
                                {player.number}
                            </span>
                            <span className="text-xs font-medium truncate w-full text-center">
                                {player.name}
                            </span>
                            <Badge
                                variant="outline"
                                className={`
                                    text-[10px] px-1 py-0 h-4 border-0
                                    ${index === selectedIndex ? "bg-black/10 text-black" : "bg-zinc-700 text-zinc-400"}
                                `}
                            >
                                {player.position}
                            </Badge>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
