import React, { useMemo } from 'react';
import PitchMap from '../PitchMap';
import { transformPoint, HomographyMatrix } from '@/utils/homography';

interface TacticalPitchViewProps {
    trackingData: any;
    currentTime: number;
    calibrationMatrix: HomographyMatrix | null;
    realtimeDetections?: any[];
    className?: string;
    teamNames?: { teamA: string; teamB: string };
}

export const TacticalPitchView: React.FC<TacticalPitchViewProps> = ({
    trackingData,
    currentTime,
    calibrationMatrix,
    realtimeDetections,
    className = '',
    teamNames = { teamA: 'Team A', teamB: 'Team B' }
}) => {
    // Project all players for the current frame
    const projectedPlayers = useMemo(() => {
        if (!trackingData?.tracks || !calibrationMatrix) return [];

        const fps = trackingData.metadata?.fps || 30;
        const currentFrame = Math.floor(currentTime * fps);
        const players: any[] = [];

        Object.entries(trackingData.tracks).forEach(([id, track]: [string, any]) => {
            const point = track.find((p: any) => p.frame === currentFrame);
            if (point) {
                // Determine base point (feet) for projection
                // If AI provides bbox [x1, y1, x2, y2], bottom center is ((x1+x2)/2, y2)
                // If it provides x, y, we hope it's already the bottom center or we approximate
                let basePoint = { x: point.x, y: point.y };

                if (point.bbox && Array.isArray(point.bbox) && point.bbox.length === 4) {
                    const [x1, y1, x2, y2] = point.bbox;
                    basePoint = { x: (x1 + x2) / 2, y: y2 };
                }

                // Transform it to pitch coordinates (0-105, 0-68)
                const projected = transformPoint(basePoint, calibrationMatrix);

                // Keep it within pitch bounds for visual safety
                players.push({
                    id: parseInt(id),
                    x: Math.max(0, Math.min(105, projected.x)),
                    y: Math.max(0, Math.min(68, projected.y)),
                    team: point.team === 'team_a' ? 'A' : (point.team === 'team_b' ? 'B' : (point.team === 'ball' ? 'BALL' : 'neutral')),
                    name: point.player_id ? `P${point.player_id}` : undefined,
                    isBall: point.team === 'ball'
                });
            }
        });

        return players;
    }, [trackingData, currentTime, calibrationMatrix]);

    // Use realtime detections if available and no tracking trackingData
    const playersToDisplay = useMemo(() => {
        if (projectedPlayers && projectedPlayers.length > 0) return projectedPlayers;
        if (!realtimeDetections || !calibrationMatrix) return [];

        return realtimeDetections.map((p, idx) => {
            // Assume p has x, y in pixels
            const projected = transformPoint({ x: p.x, y: p.y }, calibrationMatrix);
            return {
                id: p.id || idx,
                x: Math.max(0, Math.min(105, projected.x)),
                y: Math.max(0, Math.min(68, projected.y)),
                team: p.team === 'BALL' ? 'BALL' : (p.team === 'A' ? 'A' : (p.team === 'B' ? 'B' : 'neutral')),
                isBall: p.team === 'BALL'
            };
        });
    }, [projectedPlayers, realtimeDetections, calibrationMatrix]);

    return (
        <div className={`flex flex-col h-full bg-card rounded-xl border border-border/50 shadow-lg overflow-hidden ${className}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tactical View (2D)</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                        <span className="text-[10px] font-medium opacity-70">{teamNames.teamA}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                        <span className="text-[10px] font-medium opacity-70">{teamNames.teamB}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center min-h-0 bg-secondary/10">
                <PitchMap
                    playerPositions={playersToDisplay}
                    className="w-full max-h-full"
                    showLandmarks={false}
                />
            </div>

            {!calibrationMatrix && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-center z-50">
                    <div className="max-w-[200px] space-y-2">
                        <p className="text-sm font-bold text-white">Calibration Required</p>
                        <p className="text-[10px] text-white/70">
                            Please use the "Auto-Detect" or manual calibration tool to enable the 2D tactical projection.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
