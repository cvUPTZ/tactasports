import { LoggedEvent } from "@/hooks/useGamepad";
import { TeamRoster } from "@/types/player";

interface VisiblePlayer {
    x: number;
    y: number;
    team: string;
    confidence: number;
    speed?: number; // m/s
    is_sprinting?: boolean;
    id?: number;
}

interface PassingPrediction {
    ball_carrier_id: number;
    receiver_id: number;
    probability: number;
    receiver_position: [number, number]; // x, y in %
}

interface TacticalAlert {
    id: number;
    event_type: string;
    team: string;
    severity: string;
    description: string;
    timestamp: number;
}

interface VideoOverlayProps {
    zoomLevel: number;
    eventNotifications: Array<{ id: number; event: LoggedEvent; timestamp: number }>;
    showRoster: boolean;
    teams?: Map<string, TeamRoster>;
    selectedTeam?: string;
    teamNames?: { teamA: string; teamB: string };
    onCloseRoster: () => void;
    visiblePlayers?: VisiblePlayer[];
    passingPredictions?: PassingPrediction[];
    tacticalAlerts?: TacticalAlert[];
    showHeatmap?: boolean;
}

export const VideoOverlay = ({
    zoomLevel,
    eventNotifications,
    showRoster,
    teams,
    selectedTeam,
    teamNames,
    onCloseRoster,
    onPlayerSelect,
    visiblePlayers = [],
    passingPredictions = [],
    tacticalAlerts = [],
    showHeatmap = false
}: VideoOverlayProps & { onPlayerSelect?: (playerId: number) => void }) => {
    return (
        <>
            {/* Zoom Indicator */}
            {zoomLevel > 1 && (
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono pointer-events-none z-20">
                    {zoomLevel.toFixed(1)}x
                </div>
            )}

            {/* Realtime Player Overlays */}
            {visiblePlayers.map((player, idx) => {
                const isBall = player.team === 'BALL';

                return (
                    <div
                        key={`${player.id}-${idx}`}
                        className="absolute pointer-events-none transition-all duration-75"
                        style={{
                            left: `${player.x}%`,
                            top: `${player.y}%`,
                            transform: isBall ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)', // Ball centered, players at feet
                            zIndex: isBall ? 50 : 10 // Ball on top
                        }}
                    >
                        {isBall ? (
                            // Ball Marker
                            <div className="w-3 h-3 bg-yellow-400 rounded-full border border-black shadow-lg animate-pulse" />
                        ) : (
                            // Player Marker
                            <div className={`
                                w-4 h-4 rounded-full border-2 shadow-sm flex items-center justify-center
                                ${player.team === 'A' ? 'bg-red-500/50 border-red-400' : 'bg-blue-500/50 border-blue-400'}
                                ${player.is_sprinting ? 'animate-pulse ring-2 ring-yellow-400' : ''}
                            `}>
                                <div className="w-1 h-1 bg-white rounded-full" />
                            </div>
                        )}

                        {/* Speed Label */}
                        {player.speed && player.speed > (isBall ? 2 : 7.2) && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/60 text-white text-[8px] px-1 rounded whitespace-nowrap backdrop-blur-sm">
                                {(player.speed * 3.6).toFixed(1)} km/h
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Passing Prediction Lines */}
            {passingPredictions.map((pred, idx) => {
                const carrier = visiblePlayers.find(p => p.id === pred.ball_carrier_id);
                const receiver = visiblePlayers.find(p => p.id === pred.receiver_id);

                if (!carrier || !receiver || pred.probability < 0.4) return null;

                return (
                    <svg
                        key={`pass-${idx}`}
                        className="absolute inset-0 pointer-events-none"
                        style={{ width: '100%', height: '100%', zIndex: 5 }}
                    >
                        <line
                            x1={`${carrier.x}%`}
                            y1={`${carrier.y}%`}
                            x2={`${receiver.x}%`}
                            y2={`${receiver.y}%`}
                            stroke="rgba(255, 255, 0, 0.6)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity={pred.probability}
                        />
                        <circle
                            cx={`${receiver.x}%`}
                            cy={`${receiver.y}%`}
                            r="8"
                            fill="rgba(255, 255, 0, 0.3)"
                            stroke="rgba(255, 255, 0, 0.8)"
                            strokeWidth="2"
                        />
                    </svg>
                );
            })}

            {/* Heatmap Overlay */}
            {showHeatmap && visiblePlayers.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
                    {visiblePlayers
                        .filter(p => p.team !== 'BALL')
                        .map((player, idx) => (
                            <div
                                key={`heat-${idx}`}
                                className="absolute rounded-full"
                                style={{
                                    left: `${player.x}%`,
                                    top: `${player.y}%`,
                                    width: '60px',
                                    height: '60px',
                                    transform: 'translate(-50%, -50%)',
                                    background: `radial-gradient(circle, ${player.team === 'A' ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,255,0.3)'} 0%, transparent 70%)`,
                                    filter: 'blur(8px)'
                                }}
                            />
                        ))}
                </div>
            )}

            {/* Tactical Alerts */}
            <div className="absolute top-20 right-4 pointer-events-none z-30 space-y-2 w-72">
                {tacticalAlerts.slice(-3).map((alert) => (
                    <div
                        key={alert.id}
                        className={`bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg border-l-4 shadow-lg animate-in slide-in-from-right
                            ${alert.severity === 'high' ? 'border-red-500' : alert.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'}`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <div className="font-bold text-xs uppercase">{alert.event_type.replace('_', ' ')}</div>
                                <div className="text-[10px] text-gray-300">{alert.description}</div>
                            </div>
                            <div className={`text-[10px] px-1.5 py-0.5 rounded
                                ${alert.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                                    alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                        'bg-blue-500/20 text-blue-300'}`}>
                                {alert.team}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Event Notifications */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 space-y-2 w-96">
                {eventNotifications.map((notification) => {
                    const age = Date.now() - notification.timestamp;
                    const opacity = Math.max(0, 1 - (age / 3000));
                    const translateY = (age / 3000) * -20;

                    return (
                        <div
                            key={notification.id}
                            className="bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg border-l-4 border-primary shadow-lg"
                            style={{
                                opacity,
                                transform: `translateY(${translateY}px)`,
                                transition: 'opacity 0.1s, transform 0.1s'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{notification.event.eventName}</div>
                                    <div className="text-sm text-gray-300 flex items-center gap-2">
                                        <span>
                                            {notification.event.team === "TEAM_A"
                                                ? (teamNames?.teamA || "Team A")
                                                : (teamNames?.teamB || "Team B")}
                                        </span>
                                        {notification.event.player && (
                                            <span>• {notification.event.player.name}</span>
                                        )}
                                        {notification.event.matchTime && (
                                            <span>• {notification.event.matchTime}</span>
                                        )}
                                    </div>
                                </div>
                                {notification.event.isCalculated && (
                                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                        AUTO
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Roster Display */}
            {showRoster && teams && selectedTeam && teams.get(selectedTeam) && (
                <>
                    <button
                        onClick={onCloseRoster}
                        className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center bg-black/30 hover:bg-black/50 rounded-full text-white/60 hover:text-white transition-colors z-40 pointer-events-auto"
                    >
                        ×
                    </button>

                    {/* Starting XI */}
                    <div className="absolute top-4 left-4 bottom-4 flex flex-col gap-2 pointer-events-none z-30">
                        {(() => {
                            const startingNumbers = [1, 2, 5, 6, 7, 8, 9, 10, 11, 15, 22];
                            return teams.get(selectedTeam)?.PlayerData
                                .filter(p => startingNumbers.includes(p.Number || 0))
                                .sort((a, b) => {
                                    const aIndex = startingNumbers.indexOf(a.Number || 0);
                                    const bIndex = startingNumbers.indexOf(b.Number || 0);
                                    return aIndex - bIndex;
                                })
                                .slice(0, 11)
                                .map((player) => (
                                    <div
                                        key={player.ID}
                                        onClick={() => onPlayerSelect?.(player.ID)}
                                        className="bg-black/20 backdrop-blur-sm rounded-md p-1.5 hover:bg-black/30 transition-all border border-white/10 hover:border-primary/30 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary text-xs">
                                                {player.Number || '?'}
                                            </div>
                                            <div className="text-center">
                                                <div className="font-semibold text-[9px] text-white/90">
                                                    {player.Surname}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ));
                        })()}
                    </div>

                    {/* Substitutes */}
                    {(() => {
                        const startingNumbers = [1, 2, 5, 6, 7, 8, 9, 10, 11, 15, 22];
                        const subs = teams.get(selectedTeam)?.PlayerData
                            .filter(p => !startingNumbers.includes(p.Number || 0))
                            .sort((a, b) => (a.Number || 99) - (b.Number || 99))
                            .slice(0, 7);

                        return subs && subs.length > 0 && (
                            <div className="absolute top-4 right-4 bottom-4 flex flex-col gap-2 pointer-events-none z-30">
                                {subs.map((player) => (
                                    <div
                                        key={player.ID}
                                        onClick={() => onPlayerSelect?.(player.ID)}
                                        className="bg-black/15 backdrop-blur-sm rounded-md p-1.5 hover:bg-black/25 transition-all border border-white/5 hover:border-white/15 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <div className="w-6 h-6 bg-gray-500/20 rounded-full flex items-center justify-center font-bold text-gray-300 text-[10px]">
                                                {player.Number || '?'}
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-[8px] text-white/70">
                                                    {player.Surname}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </>
            )}
        </>
    );
};
