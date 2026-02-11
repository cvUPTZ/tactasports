import { useRef, useEffect, useState, useCallback } from "react";
import { API_BASE_URL, ANALYSIS_API_URL } from "@/utils/apiConfig";
import { Button } from "@/components/ui/button";
import MappingOverlay from "../MappingOverlay";
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, Settings, Flame, SkipBack, SkipForward } from "lucide-react";
import { LoggedEvent } from "@/hooks/useGamepad";
import { TeamRoster } from "@/types/player";
import { useToast } from "@/hooks/use-toast";
import { VideoOverlay } from "./VideoOverlay";
import { QuickPlayerSelector } from "../QuickPlayerSelector";
import { QuickSelectorState } from "@/hooks/useGamepad";
import { Timeline } from "./Timeline";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LiveEventToast } from "../Index/LiveEventToast";
import { StatisticsDashboard } from "../StatisticsDashboard";
import { DashboardWidget } from "../common/DashboardWidget";
import { LayoutConfig } from "@/hooks/useDashboardLayout";

interface VideoPlayerProps {
    videoFile: File | null;
    videoUrl?: string | null; // For remote video URLs
    events: LoggedEvent[];
    onTimeUpdate: (currentTime: number) => void;
    onEventMarkerClick?: (event: LoggedEvent) => void;
    seekTo?: number | null;
    isPlaying?: boolean;
    onPlayPause?: (isPlaying: boolean) => void;
    onSeekComplete?: () => void;
    onSeek?: (time: number) => void;
    axes?: number[];
    buttons?: GamepadButton[];
    teams?: Map<string, TeamRoster>;
    selectedTeam?: string;
    teamNames?: { teamA: string, teamB: string };
    onPlayerSelect?: (playerId: number) => void;
    onAnalysisComplete?: (data: any) => void;
    quickSelectorState?: QuickSelectorState;
    currentTime?: number; // Added prop
    timelineVariant?: 'minimal' | 'pro';
    showLiveToasts?: boolean;
    analysisMode?: 'LIVE' | 'POST_MATCH'; // Controls D-Pad behavior
    isEditMode?: boolean;
    layoutConfig?: LayoutConfig;
    onToggleVisibility?: (id: string) => void;
}

export const VideoPlayer = ({
    videoFile,
    videoUrl: remoteVideoUrl,
    events,
    onTimeUpdate,
    seekTo,
    isPlaying: externalIsPlaying,
    onPlayPause,
    onSeekComplete,
    onSeek,
    axes,
    buttons,
    teams,
    selectedTeam,
    teamNames,
    onPlayerSelect,
    onAnalysisComplete,
    quickSelectorState,
    currentTime = 0, // Default
    timelineVariant = 'minimal',
    showLiveToasts = true,
    analysisMode, // Destructure analysisMode
    isEditMode = false,
    layoutConfig = {},
    onToggleVisibility
}: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const prevStartButtonState = useRef(false);
    const prevViewButtonState = useRef(false);
    const prevLeftButtonState = useRef(false);
    const prevRightButtonState = useRef(false);
    const { toast } = useToast();

    const fullscreenContainerRef = useRef<HTMLDivElement>(null);

    // State
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [duration, setDuration] = useState(0);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [eventNotifications, setEventNotifications] = useState<Array<{ id: number; event: LoggedEvent; timestamp: number }>>([]);
    const [showRoster, setShowRoster] = useState(false);
    const [trackingData, setTrackingData] = useState<any>(null);
    const [visiblePlayers, setVisiblePlayers] = useState<any[]>([]);
    const [remoteUrl, setRemoteUrl] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [analyzeFullVideo, setAnalyzeFullVideo] = useState(false);
    const [generateVideo, setGenerateVideo] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [passingPredictions, setPassingPredictions] = useState<any[]>([]);
    const [tacticalAlerts, setTacticalAlerts] = useState<any[]>([]);

    const [isFullscreen, setIsFullscreen] = useState(false); // Track full screen state

    const isImage = videoFile?.type.startsWith('image/');

    // Load video URL
    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (remoteVideoUrl) {
            // Use remote URL from server
            setVideoUrl(`${API_BASE_URL}${remoteVideoUrl}`);
        }
    }, [videoFile, remoteVideoUrl]);

    // Fullscreen listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Handle seekTo prop
    useEffect(() => {
        if (seekTo !== null && seekTo !== undefined && videoRef.current) {
            if (Number.isFinite(seekTo)) {
                console.log(`🎥 Seeking to: ${seekTo}`);
                videoRef.current.currentTime = seekTo;
                onSeekComplete?.();
            } else {
                console.warn("⚠️ Ignored seekTo with non-finite value:", seekTo);
            }
        }
    }, [seekTo, onSeekComplete]);

    // Update visible players based on current time
    useEffect(() => {
        if (!trackingData?.tracks || !videoRef.current) return;

        const updatePlayers = () => {
            const currentTime = videoRef.current!.currentTime;
            const fps = trackingData.metadata?.fps || 30;
            const currentFrame = Math.floor(currentTime * fps);

            const players: any[] = [];
            Object.entries(trackingData.tracks).forEach(([id, track]: [string, any]) => {
                const point = track.find((p: any) => p.frame === currentFrame);
                if (point) {
                    players.push({
                        id: parseInt(id),
                        x: (point.x / (trackingData.metadata?.width || 1920)) * 100,
                        y: (point.y / (trackingData.metadata?.height || 1080)) * 100,
                        team: point.team,
                        confidence: point.confidence,
                        speed: point.velocity,
                        is_sprinting: point.is_sprinting
                    });
                }
            });

            setVisiblePlayers(players);
        };

        const interval = setInterval(updatePlayers, 100);
        return () => clearInterval(interval);
    }, [trackingData]);

    const handleRunAnalysis = async () => {
        if (!videoFile) {
            toast({
                title: "Analysis Failed",
                description: "Please load a video first.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: "Starting Analysis",
            description: analyzeFullVideo ? "Analyzing entire video..." : `Analyzing ${events.length} event clips.`,
        });

        const formData = new FormData();
        formData.append('video', videoFile);

        if (!analyzeFullVideo && events.length > 0) {
            const clips = events.map(e => ({
                start: Math.max(0, (e.videoTime || 0) - 5),
                end: (e.videoTime || 0) + 5
            }));
            formData.append('clips', JSON.stringify(clips));
        }

        if (generateVideo) {
            formData.append('generate_annotated_video', 'true');
        }

        const headers: Record<string, string> = {};
        if (remoteUrl) {
            headers['x-remote-url'] = remoteUrl;
        }

        try {
            const response = await fetch(`${ANALYSIS_API_URL}/api/analyze-match`, {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setTrackingData(data.results);
                onAnalysisComplete?.(data.results);

                if (data.results.passing_predictions) {
                    setPassingPredictions(data.results.passing_predictions);
                }
                if (data.results.tactical_alerts) {
                    const alerts = data.results.tactical_alerts.map((a: any, idx: number) => ({
                        ...a,
                        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}${idx}`),
                        timestamp: Date.now()
                    }));
                    setTacticalAlerts(alerts);
                }

                let description = `Tracked ${Object.keys(data.results.tracks || {}).length} players.`;
                if (data.results.metadata?.annotated_video) {
                    description += ` Video saved: ${data.results.metadata.annotated_video} `;
                }

                toast({
                    title: "Analysis Complete",
                    description,
                });
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to run analysis. Check console.",
                variant: "destructive"
            });
        }
    };

    const handleStepFrame = useCallback((direction: 'forward' | 'backward') => {
        if (!videoRef.current) return;

        // Only step frames when video is paused to avoid playback disruption
        if (!videoRef.current.paused) {
            console.info('🎥 Frame step skipped - video is playing');
            return;
        }

        // Default to 25fps if no metadata (0.04s per frame)
        const frameDuration = trackingData?.metadata?.fps ? (1 / trackingData.metadata.fps) : 0.04;

        const newTime = direction === 'forward'
            ? videoRef.current.currentTime + frameDuration
            : videoRef.current.currentTime - frameDuration;

        if (Number.isFinite(newTime)) {
            videoRef.current.currentTime = Math.max(0, Math.min(newTime, videoRef.current.duration));
            onTimeUpdate(videoRef.current.currentTime);
        }
    }, [onTimeUpdate, trackingData?.metadata?.fps]);

    // Zoom and Pan Handlers
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => {
        setZoomLevel(prev => {
            const newZoom = Math.max(prev - 0.5, 1);
            if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan on full zoom out
            return newZoom;
        });
    };
    const handleResetZoom = () => {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoomLevel > 1) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);

    // Gamepad Zoom/Pan Controls
    useEffect(() => {
        if (!buttons || !axes) return;

        // SKIP if Quick Selector is Open (D-Pad is used for grid)
        if (quickSelectorState?.isOpen) return;

        // R2 (button 7) = Zoom In, L2 (button 6) = Zoom Out
        const r2 = buttons[7];
        const l2 = buttons[6];

        if (r2?.pressed) {
            handleZoomIn();
        }
        if (l2?.pressed) {
            handleZoomOut();
        }

        // Right Stick (axes 2, 3) for panning when zoomed
        if (zoomLevel > 1 && axes.length >= 4) {
            const rightStickX = axes[2];
            const rightStickY = axes[3];
            const threshold = 0.2;

            if (Math.abs(rightStickX) > threshold || Math.abs(rightStickY) > threshold) {
                setPan(prev => ({
                    x: prev.x + rightStickX * 10,
                    y: prev.y + rightStickY * 10
                }));
            }
        }

        // START Button (9) for Play/Pause
        const startButton = buttons[9];
        if (startButton?.pressed && !prevStartButtonState.current) {
            onPlayPause?.(!externalIsPlaying);
            toast({
                title: !externalIsPlaying ? "▶ Playing" : "⏸ Paused",
                duration: 1000,
            });
        }
        prevStartButtonState.current = startButton?.pressed || false;

        // VIEW Button (8) for Fullscreen Toggle
        const viewButton = buttons[8];
        if (viewButton?.pressed && !prevViewButtonState.current) {
            if (!document.fullscreenElement) {
                fullscreenContainerRef.current?.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message} `);
                });
            } else {
                document.exitFullscreen();
            }
        }
        prevViewButtonState.current = viewButton?.pressed || false;

        // D-Pad Frame Stepping - ONLY in POST_MATCH mode AND when video is paused
        // In LIVE mode, D-Pad is reserved for event tagging
        const allowFrameStep = analysisMode === 'POST_MATCH' && !externalIsPlaying;

        if (allowFrameStep) {
            // D-Pad Left (14) = Prev Frame
            const leftButton = buttons[14];
            if (leftButton?.pressed && !prevLeftButtonState.current) {
                handleStepFrame('backward');
            }
            prevLeftButtonState.current = leftButton?.pressed || false;

            // D-Pad Right (15) = Next Frame
            const rightButton = buttons[15];
            if (rightButton?.pressed && !prevRightButtonState.current) {
                handleStepFrame('forward');
            }
            prevRightButtonState.current = rightButton?.pressed || false;
        } else {
            // Reset state refs and skip expensive seek logic during active playback
            if (prevLeftButtonState.current) prevLeftButtonState.current = false;
            if (prevRightButtonState.current) prevRightButtonState.current = false;
        }

        // Left Stick (Axis 0) - Shuttle Control (Speed & Rewind) - Optimized
        if (axes.length >= 1) {
            const shuttleX = axes[0];
            const shuttleThreshold = 0.25; // Slightly higher threshold to avoid drift lag

            if (Math.abs(shuttleX) > shuttleThreshold) {
                if (videoRef.current) {
                    if (shuttleX > 0) {
                        // Fast Forward (Variable Speed)
                        const rate = 1 + (shuttleX - shuttleThreshold) * 3; // Scale 1x to ~3.5x
                        if (Math.abs(videoRef.current.playbackRate - rate) > 0.1) {
                            videoRef.current.playbackRate = rate;
                        }
                        if (videoRef.current.paused) {
                            videoRef.current.play();
                            onPlayPause?.(true);
                        }
                    } else if (!externalIsPlaying) {
                        // Rewind (Manual Seek) - Only if NOT actively playing from external state
                        // Step backward based on deflection
                        const step = (Math.abs(shuttleX) - shuttleThreshold) * 0.1; // Reduced step for smoother scrub
                        const newTime = Math.max(0, videoRef.current.currentTime - step);
                        if (Math.abs(videoRef.current.currentTime - newTime) > 0.01) {
                            videoRef.current.currentTime = newTime;
                        }
                    }
                }
            } else {
                // Reset Rate in Neutral
                if (videoRef.current && videoRef.current.playbackRate !== 1) {
                    videoRef.current.playbackRate = 1;
                }
            }
        }

    }, [buttons, axes, zoomLevel, externalIsPlaying, onPlayPause, quickSelectorState, handleStepFrame, analysisMode]);

    // Sync external play/pause state with video element
    useEffect(() => {
        if (!videoRef.current || !videoUrl) return;

        const playVideo = async () => {
            try {
                if (externalIsPlaying && videoRef.current?.paused) {
                    await videoRef.current.play();
                } else if (!externalIsPlaying && !videoRef.current?.paused) {
                    videoRef.current?.pause();
                }
            } catch (e) {
                console.error("Play/Pause failed:", e);
            }
        };

        playVideo();
    }, [externalIsPlaying, videoUrl]);

    return (
        <div
            ref={fullscreenContainerRef}
            className="relative group bg-black rounded-lg overflow-hidden shadow-xl ring-1 ring-white/10 h-full flex items-center justify-center transition-all duration-300"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
            {/* Quick Player Selector - Now inside the fullscreen container */}
            {quickSelectorState && (
                <QuickPlayerSelector
                    isVisible={quickSelectorState.isOpen}
                    roster={quickSelectorState.roster}
                    selectedIndex={quickSelectorState.selectedIndex}
                    team={quickSelectorState.team}
                />
            )}

            {/* Only show Overlay in Fullscreen */}
            {isFullscreen && <MappingOverlay />}

            <div
                className={`relative w-full h-full transition-transform duration-200 ease-out`}
                style={{
                    transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
                    cursor: zoomLevel > 1 ? 'move' : 'default'
                }}
            >
                {/* Content: Video or Image */}
                {isImage ? (
                    <img
                        src={videoUrl || undefined}
                        className="w-full h-full object-contain pointer-events-none"
                        alt="Match capture"
                    />
                ) : (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        src={videoUrl || undefined}
                        controls={false} // Disable native controls in favor of Timeline
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
                        onPlay={() => onPlayPause?.(true)}
                        onPause={() => onPlayPause?.(false)}
                        onSeeked={(e) => onSeek?.(e.currentTarget.currentTime)}
                    />
                )}

                {/* Overlay */}
                <VideoOverlay
                    zoomLevel={zoomLevel}
                    eventNotifications={eventNotifications}
                    showRoster={showRoster}
                    teams={teams}
                    selectedTeam={selectedTeam}
                    teamNames={teamNames}
                    onCloseRoster={() => setShowRoster(false)}
                    visiblePlayers={visiblePlayers}
                    passingPredictions={passingPredictions}
                    tacticalAlerts={tacticalAlerts}
                    showHeatmap={showHeatmap}
                    onPlayerSelect={onPlayerSelect}
                />

                {/* Statistics Dashboard Overlay - Visible in Fullscreen */}
                <DashboardWidget
                    id="live-stats"
                    label="Live Stats Overlay"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['live-stats']?.hidden}
                    onToggleVisibility={onToggleVisibility}
                    className="absolute top-4 left-4 z-[45] pointer-events-auto"
                >
                    <StatisticsDashboard events={events} isOverlay={true} />
                </DashboardWidget>
            </div>

            {/* Zoom & Frame Controls - Only helpful for video if step frame, but zoom good for both */}
            {videoUrl && (
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
                    <div className="flex gap-1 bg-black/50 p-1 rounded-lg backdrop-blur-sm">
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 text-white hover:bg-white/20" title="Zoom In">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 text-white hover:bg-white/20" title="Zoom Out">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleResetZoom} className="h-8 w-8 text-white hover:bg-white/20" title="Reset Zoom">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        {!isImage && (
                            <>
                                <div className="w-px bg-white/20 mx-1" />
                                <Button variant="ghost" size="icon" onClick={() => handleStepFrame('backward')} className="h-8 w-8 text-white hover:bg-white/20" title="Prev Frame">
                                    <SkipBack className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleStepFrame('forward')} className="h-8 w-8 text-white hover:bg-white/20" title="Next Frame">
                                    <SkipForward className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                    {zoomLevel > 1 && (
                        <div className="bg-black/50 px-2 py-1 rounded text-xs text-white text-center backdrop-blur-sm">
                            {Math.round(zoomLevel * 100)}%
                        </div>
                    )}
                </div>
            )}

            {/* Toolbar - Only visible if media is loaded */}
            {videoUrl && (
                <div className="absolute bottom-24 left-4 flex gap-2">
                    <Button
                        variant={showHeatmap ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className="gap-1 bg-black/50 hover:bg-black/70 text-white"
                    >
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="hidden sm:inline">Heatmap</span>
                    </Button>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="absolute top-4 right-4 p-3 bg-card rounded-lg border space-y-3 max-w-sm z-50">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Analysis Settings</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSettings(false)}
                        >
                            ×
                        </Button>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Analysis Mode
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="fullVideo"
                                checked={analyzeFullVideo}
                                onChange={(e) => setAnalyzeFullVideo(e.target.checked)}
                                className="h-4 w-4"
                            />
                            <label htmlFor="fullVideo" className="text-sm cursor-pointer select-none">
                                Analyze Full Video (Realtime Tracking)
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Video Generation
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="generateVideo"
                                checked={generateVideo}
                                onChange={(e) => setGenerateVideo(e.target.checked)}
                                className="h-4 w-4"
                            />
                            <label htmlFor="generateVideo" className="text-sm cursor-pointer select-none">
                                Generate Annotated Video File
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Remote Server URL (RunPod / Kaggle)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="https://xyz.ngrok-free.app"
                                value={remoteUrl}
                                onChange={(e) => setRemoteUrl(e.target.value)}
                                className="flex-1 text-sm bg-background border rounded px-2 py-1"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Leave empty for local processing.
                        </p>
                    </div>

                    <Button
                        onClick={handleRunAnalysis}
                        disabled={!videoFile}
                        className="w-full"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Run Analysis
                    </Button>
                </div>
            )}

            {/* Settings Toggle */}
            <Button
                variant="secondary"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="absolute top-4 right-4 z-40"
            >
                <Settings className="w-4 h-4" />
            </Button>

            {/* Professional Timeline */}
            {!isImage && (
                <div className="absolute bottom-0 left-0 w-full z-[60]">
                    <Timeline
                        duration={duration}
                        currentTime={currentTime}
                        events={events}
                        variant={timelineVariant}
                        onSeek={(time) => {
                            if (Number.isFinite(time)) {
                                if (videoRef.current) {
                                    videoRef.current.currentTime = time;
                                }
                                onSeek?.(time);
                            } else {
                                console.warn("⚠️ Ignored Timeline seek with non-finite value:", time);
                            }
                        }}
                    />
                </div>
            )}

            {/* Toasts for Fullscreen - only visible when this container is fullscreened */}
            {isFullscreen && (
                <>
                    {showLiveToasts && <LiveEventToast events={events} />}
                    <Toaster />
                    <Sonner />
                </>
            )}
        </div>
    );
};
