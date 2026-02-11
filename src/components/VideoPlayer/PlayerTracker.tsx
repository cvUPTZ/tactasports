import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Target } from 'lucide-react';

interface PlayerTrackerProps {
    trackingData: any; // AI tracking data from analysis
    currentTime: number;
    videoWidth: number;
    videoHeight: number;
    onTrackPlayer: (playerId: number, points: Array<{ time: number; x: number; y: number }>) => void;
    onClose: () => void;
}

export const PlayerTracker: React.FC<PlayerTrackerProps> = ({
    trackingData,
    currentTime,
    videoWidth,
    videoHeight,
    onTrackPlayer,
    onClose,
}) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualPoints, setManualPoints] = useState<Array<{ time: number; x: number; y: number }>>([]);

    // Get current frame players from AI tracking data
    const getCurrentPlayers = () => {
        if (!trackingData?.tracks) return [];

        const fps = trackingData.metadata?.fps || 30;
        const currentFrame = Math.floor(currentTime * fps);

        const players: Array<{ id: number; x: number; y: number; team: string }> = [];

        Object.entries(trackingData.tracks).forEach(([id, track]: [string, any]) => {
            const point = track.find((p: any) => p.frame === currentFrame);
            if (point) {
                players.push({
                    id: parseInt(id),
                    x: point.x,
                    y: point.y,
                    team: point.team,
                });
            }
        });

        return players;
    };

    const handlePlayerSelect = (playerId: number) => {
        if (!trackingData?.tracks) return;

        const track = trackingData.tracks[playerId];
        if (!track) return;

        // Convert AI track to annotation format
        const points = track.map((p: any) => ({
            time: p.timestamp,
            x: p.x,
            y: p.y,
        }));

        setSelectedPlayerId(playerId);
        onTrackPlayer(playerId, points);
    };

    const handleManualClick = (e: React.MouseEvent<SVGElement>) => {
        if (!manualMode) return;

        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * videoWidth;
        const y = ((e.clientY - rect.top) / rect.height) * videoHeight;

        const newPoint = { time: currentTime, x, y };
        const updatedPoints = [...manualPoints, newPoint];
        setManualPoints(updatedPoints);
    };

    const handleSaveManualTrack = () => {
        if (manualPoints.length < 2) return;

        const playerId = Date.now(); // Generate unique ID for manual track
        onTrackPlayer(playerId, manualPoints);
        setManualPoints([]);
        setManualMode(false);
    };

    const currentPlayers = getCurrentPlayers();

    return (
        <div className="absolute top-0 left-0 w-full h-full z-40">
            {/* Control Panel */}
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold text-sm">Player Tracker</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-6 w-6 text-white hover:bg-white/20"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2">
                    <Button
                        variant={!manualMode ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setManualMode(false)}
                        className="flex-1 text-xs"
                    >
                        AI Track
                    </Button>
                    <Button
                        variant={manualMode ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setManualMode(true)}
                        className="flex-1 text-xs"
                    >
                        Manual
                    </Button>
                </div>

                {/* AI Mode: Player List */}
                {!manualMode && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        <p className="text-white/70 text-xs mb-1">Select a player:</p>
                        {currentPlayers.map((player) => (
                            <button
                                key={player.id}
                                onClick={() => handlePlayerSelect(player.id)}
                                className={`w-full px-2 py-1 rounded text-xs text-left ${selectedPlayerId === player.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                Player {player.id} ({player.team})
                            </button>
                        ))}
                        {currentPlayers.length === 0 && (
                            <p className="text-white/50 text-xs">No players detected at this time</p>
                        )}
                    </div>
                )}

                {/* Manual Mode: Instructions */}
                {manualMode && (
                    <div className="space-y-2">
                        <p className="text-white/70 text-xs">
                            Click on the player to track them. Navigate frame-by-frame and click again.
                        </p>
                        <p className="text-white text-xs">
                            Points: {manualPoints.length}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSaveManualTrack}
                                disabled={manualPoints.length < 2}
                                className="flex-1 text-xs"
                            >
                                Save Track
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualPoints([])}
                                className="flex-1 text-xs"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Clickable Overlay for Manual Mode */}
            {manualMode && (
                <svg
                    className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                    viewBox={`0 0 ${videoWidth} ${videoHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    onClick={handleManualClick}
                >
                    {/* Show manual points */}
                    {manualPoints.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={5}
                            fill="#00FF00"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                        />
                    ))}
                </svg>
            )}

            {/* AI Mode: Highlight Current Players */}
            {!manualMode && (
                <svg
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${videoWidth} ${videoHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {currentPlayers.map((player) => (
                        <g key={player.id}>
                            <circle
                                cx={player.x}
                                cy={player.y}
                                r={20}
                                fill="none"
                                stroke={selectedPlayerId === player.id ? '#00FF00' : '#FFFF00'}
                                strokeWidth={2}
                                opacity={0.7}
                            />
                            <Target
                                x={player.x - 10}
                                y={player.y - 10}
                                width={20}
                                height={20}
                                className="text-yellow-400"
                            />
                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
};
