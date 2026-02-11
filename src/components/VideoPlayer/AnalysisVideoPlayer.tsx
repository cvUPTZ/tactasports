import { useRef, useEffect, useState } from "react";
import { VideoOverlay } from "./VideoOverlay";
import { LoggedEvent } from "@/hooks/useGamepad";
import { TeamRoster } from "@/types/player";
import { API_BASE_URL } from "@/utils/apiConfig";

interface AnalysisVideoPlayerProps {
    videoFile: File | null;
    videoUrl: string | null;
    currentTime: number;
    isPlaying: boolean;
    analysisResults: any;
    eventNotifications?: Array<{ id: number; event: LoggedEvent; timestamp: number }>;
    teams?: Map<string, TeamRoster>;
    selectedTeam?: string;
    teamNames?: { teamA: string; teamB: string };
}

export const AnalysisVideoPlayer = ({
    videoFile,
    videoUrl: remoteVideoUrl,
    currentTime,
    isPlaying,
    analysisResults,
    eventNotifications = [],
    teams,
    selectedTeam,
    teamNames
}: AnalysisVideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
    const [visiblePlayers, setVisiblePlayers] = useState<any[]>([]);

    // Handle video URL
    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setLocalVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [videoFile]);

    const activeUrl = localVideoUrl || (remoteVideoUrl ? `${API_BASE_URL}${remoteVideoUrl}` : null);

    // Sync playback state
    useEffect(() => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.play().catch(e => console.log('Play failed:', e));
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    // Sync current time
    useEffect(() => {
        if (!videoRef.current) return;

        const diff = Math.abs(videoRef.current.currentTime - currentTime);
        if (diff > 0.5) { // Only sync if difference > 0.5s
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime]);

    // Calculate visible players
    useEffect(() => {
        if (!analysisResults?.tracks) return;

        const fps = analysisResults.metadata?.fps || 30;
        const currentFrame = Math.floor(currentTime * fps);

        const players: any[] = [];
        Object.entries(analysisResults.tracks).forEach(([id, track]: [string, any]) => {
            const point = track.find((p: any) => p.frame === currentFrame);
            if (point) {
                players.push({
                    id: parseInt(id),
                    x: (point.x / (analysisResults.metadata?.width || 1920)) * 100,
                    y: (point.y / (analysisResults.metadata?.height || 1080)) * 100,
                    team: point.team === 'team_a' ? 'A' : (point.team === 'team_b' ? 'B' : point.team),
                    confidence: point.confidence,
                    speed: point.velocity,
                    is_sprinting: point.is_sprinting
                });
            }
        });

        setVisiblePlayers(players);
    }, [currentTime, analysisResults]);

    return (
        <div className="relative w-full h-full bg-black">
            {/* Video */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={activeUrl || undefined}
                muted // Muted to avoid echo
            />

            {/* Analysis Overlays - Always Enabled */}
            <VideoOverlay
                zoomLevel={1}
                eventNotifications={eventNotifications}
                showRoster={false}
                teams={teams}
                selectedTeam={selectedTeam}
                teamNames={teamNames}
                onCloseRoster={() => { }}
                visiblePlayers={visiblePlayers}
                passingPredictions={analysisResults?.passing_predictions || []}
                tacticalAlerts={analysisResults?.tactical_alerts || []}
                showHeatmap={true} // Always show heatmap
            />

            {/* Label */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold z-10">
                AI ANALYSIS VIEW
            </div>
        </div>
    );
};
