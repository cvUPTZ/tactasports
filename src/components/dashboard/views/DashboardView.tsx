import React, { RefObject } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Monitor, Trophy, Upload, X } from 'lucide-react';
import { LiveStreamPlayer, LiveStreamPlayerRef } from '@/components/LiveStreamPlayer';
import { IPTVChannelBrowser } from '@/components/IPTV';
import { FIFAPlusBrowser } from '@/components/FIFAPlus/FIFAPlusBrowser';
import { AnnotatedVideoPlayer } from '@/components/VideoPlayer/AnnotatedVideoPlayer';
import { VideoUpload } from '@/components/VideoUpload';
import { ZoneIndicator } from '@/components/ZoneIndicator';
import { DashboardWidget } from '@/components/common/DashboardWidget';
import { DashboardLeftPanel } from '@/components/dashboard/DashboardLeftPanel';
import { DashboardRightPanel } from '@/components/dashboard/DashboardRightPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Radio, Loader2 } from 'lucide-react';
import { LayoutConfig } from '@/hooks/useDashboardLayout';
import { TeamRoster } from '@/types/player';
import { LoggedEvent } from '@/hooks/useGamepad';
import type { AnalysisMode } from '@/components/AnalysisModeSelector';
import { API_BASE_URL } from '@/utils/apiConfig';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DashboardViewProps {
    userRole?: string;
    isEditMode: boolean;
    layoutConfig: LayoutConfig;
    toggleComponentVisibility: (id: string) => void;
    // State
    teams: Map<string, TeamRoster>;
    selectedTeam: string;
    handleTeamUpload: (teams: Map<string, TeamRoster>) => void;
    handleTeamSelect: (teamId: string) => void;
    trackingMode: AnalysisMode;
    keyboardBuffer: string;
    showMappings: boolean;
    mappings: Record<string, string>;
    pressedButtons: Set<string>;
    updateMapping: (button: string, action: string) => void;
    resetMappings: () => void;
    handleGameEvent: (eventName: string, source?: string) => void;
    isEditingMode: boolean;
    setIsEditingMode: (mode: boolean) => void;
    hasPermission: (permission: string) => boolean;
    // Video & Analytics State
    showAnalysisView: boolean;
    videoMode: 'upload' | 'live' | 'fifaplus';
    useVideoMode: boolean;
    isIPTVConfigured: boolean;
    livePlayerRef: RefObject<LiveStreamPlayerRef>;
    events: LoggedEvent[];
    showFeed: boolean;
    setUseVideoMode: (use: boolean) => void;
    setVideoMode: (mode: 'upload' | 'live' | 'fifaplus') => void;
    showIPTVBrowser: boolean;
    setShowIPTVBrowser: (show: boolean) => void;
    showFIFAPlusBrowser: boolean;
    setShowFIFAPlusBrowser: (show: boolean) => void;
    videoFile: File | null;
    remoteVideoUrl: string | null;
    videoTime: number;
    setVideoTime: (time: number) => void;
    seekTime: number | null;
    setSeekTime: (time: number | null) => void;
    isVideoPlaying: boolean;
    setIsVideoPlaying: (playing: boolean) => void;
    socket: any;
    axes: any;
    buttons: any;
    teamNames: { teamA: string; teamB: string };
    handlePlayerSelect: (playerId: number) => void;
    analysisResults: any;
    quickSelectorState: any;
    thirdsZone: any;
    setVideoFile: (file: File | null) => void;
    setServerVideoPath: (path: string | null) => void;
    sessionMode: 'collab' | 'individual' | null;
    setShowAdminWaitingRoom: (show: boolean) => void;
    togglePiP: () => void;
    toggleWatchMatch: () => void;
    setEvents: React.Dispatch<React.SetStateAction<LoggedEvent[]>>;
    lastEventButtonLabel?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    userRole,
    isEditMode,
    layoutConfig,
    toggleComponentVisibility,
    teams,
    selectedTeam,
    handleTeamUpload,
    handleTeamSelect,
    trackingMode,
    keyboardBuffer,
    showMappings,
    mappings,
    pressedButtons,
    updateMapping,
    resetMappings,
    handleGameEvent,
    isEditingMode,
    setIsEditingMode,
    hasPermission,
    showAnalysisView,
    videoMode,
    useVideoMode,
    isIPTVConfigured,
    livePlayerRef,
    events,
    showFeed,
    setUseVideoMode,
    setVideoMode,
    showIPTVBrowser,
    setShowIPTVBrowser,
    showFIFAPlusBrowser,
    setShowFIFAPlusBrowser,
    videoFile,
    remoteVideoUrl,
    videoTime,
    setVideoTime,
    seekTime,
    setSeekTime,
    isVideoPlaying,
    setIsVideoPlaying,
    socket,
    axes,
    buttons,
    teamNames,
    handlePlayerSelect,
    analysisResults,
    quickSelectorState,
    thirdsZone,
    setVideoFile,
    setServerVideoPath,
    sessionMode,
    setShowAdminWaitingRoom,
    togglePiP,
    toggleWatchMatch,
    setEvents,
    lastEventButtonLabel
}) => {
    const isLeftHidden = userRole === 'eye_spotter'
        ? layoutConfig['spotter-panel']?.hidden
        : layoutConfig['left-tools']?.hidden;

    const isRightHidden = userRole === 'eye_spotter' ? true : (
        userRole === 'logger'
            ? layoutConfig['logger-audit']?.hidden
            : (layoutConfig['predictor-stats']?.hidden &&
                layoutConfig['event-log']?.hidden &&
                layoutConfig['right-panel-bottom']?.hidden)
    );

    return (
        <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 relative z-10">
            {/* LEFT COLUMN - System Controls / Spotter Assist */}
            {!isLeftHidden && (
                <DashboardLeftPanel
                    userRole={userRole}
                    isEditMode={isEditMode}
                    layoutConfig={layoutConfig}
                    toggleComponentVisibility={toggleComponentVisibility}
                    teams={teams}
                    selectedTeam={selectedTeam}
                    onTeamUpload={handleTeamUpload}
                    onSelectTeam={handleTeamSelect}
                    trackingMode={trackingMode}
                    keyboardBuffer={keyboardBuffer}
                    showMappings={showMappings}
                    mappings={mappings}
                    pressedButtons={pressedButtons}
                    onUpdateMapping={updateMapping}
                    onResetMappings={resetMappings}
                    handleGameEvent={handleGameEvent}
                    isEditingMode={isEditingMode}
                    setIsEditingMode={setIsEditingMode}
                    hasPermission={hasPermission}
                />
            )}

            {/* CENTER COLUMN - Analytics & Video */}
            <div className={cn(
                "flex flex-col gap-3 h-full min-h-0 overflow-y-auto custom-scrollbar transition-all duration-300",
                userRole === 'eye_spotter' ? "col-span-12" : (
                    isLeftHidden && isRightHidden ? "col-span-12" :
                        isLeftHidden ? "col-span-12 md:col-span-12 lg:col-span-9" :
                            isRightHidden ? "col-span-12 md:col-span-9 lg:col-span-10" :
                                "col-span-12 md:col-span-9 lg:col-span-7"
                )
            )}>
                <DashboardWidget
                    id="main-video"
                    label="Live Feed / Video Player"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['main-video']?.hidden}
                    onToggleVisibility={toggleComponentVisibility}
                    className="flex-1 min-h-0 relative bg-black rounded-lg overflow-hidden shadow-2xl border border-border/20 flex items-center justify-center"
                >
                    <div className="w-full h-full relative">
                        <div className={showAnalysisView ? 'grid grid-cols-3 gap-2 h-full' : 'h-full'}>
                            {(videoMode === 'live' || videoMode === 'fifaplus') && isIPTVConfigured ? (
                                <div className="w-full h-full relative group">
                                    <LiveStreamPlayer
                                        ref={livePlayerRef}
                                        events={events}
                                        showLiveToasts={showFeed}
                                        variant="streamlined"
                                        onClose={() => { setUseVideoMode(false); setVideoMode('upload'); }}
                                        isEditMode={isEditMode}
                                        layoutConfig={layoutConfig}
                                        onToggleVisibility={toggleComponentVisibility}
                                    />
                                    <div className="absolute top-2 right-12 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-[60]">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 gap-1.5"
                                            onClick={() => setShowIPTVBrowser(true)}
                                        >
                                            <Monitor className="h-3.5 w-3.5" />
                                            <span>Channels</span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 gap-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-500/30"
                                            onClick={() => setShowFIFAPlusBrowser(true)}
                                        >
                                            <Trophy className="h-3.5 w-3.5" />
                                            <span>FIFA+</span>
                                        </Button>
                                    </div>

                                    {showIPTVBrowser && (
                                        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                                            <div className="fixed inset-4 z-[101] bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                                                <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-slate-900/50">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="h-4 w-4 text-primary" />
                                                        <span className="text-sm font-bold uppercase tracking-wider">IPTV Channel Browser</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setShowIPTVBrowser(false)}>
                                                        <X size={18} />
                                                    </Button>
                                                </div>
                                                <div className="flex-1 min-h-0">
                                                    <IPTVChannelBrowser />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showFIFAPlusBrowser && (
                                        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                                            <div className="fixed inset-4 z-[101] bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                                                <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-slate-900/50">
                                                    <div className="flex items-center gap-2">
                                                        <Trophy className="h-4 w-4 text-primary" />
                                                        <span className="text-sm font-bold uppercase tracking-wider">FIFA+ Digital Browser</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setShowFIFAPlusBrowser(false)}>
                                                        <X size={18} />
                                                    </Button>
                                                </div>
                                                <div className="flex-1 min-h-0">
                                                    <FIFAPlusBrowser />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : useVideoMode ? (
                                <div className="relative w-full h-full">
                                    <AnnotatedVideoPlayer
                                        videoFile={videoFile}
                                        videoUrl={remoteVideoUrl}
                                        events={events}
                                        onTimeUpdate={setVideoTime}
                                        seekTo={seekTime}
                                        isPlaying={isVideoPlaying}
                                        onPlayPause={(playing) => {
                                            setIsVideoPlaying(playing);
                                            // Sync Restriction: Only Admin broadcasts playback state
                                            if (socket && userRole === 'admin') {
                                                if (playing) {
                                                    socket.emit('video-play', videoTime);
                                                } else {
                                                    socket.emit('video-pause', videoTime);
                                                }
                                            }
                                        }}
                                        onSeekComplete={() => setSeekTime(null)}
                                        onSeek={(time) => {
                                            setSeekTime(time); // Update local first
                                            // Sync Restriction: Only Admin broadcasts seek
                                            if (socket && userRole === 'admin') {
                                                socket.emit('video-seek', time);
                                            }
                                        }}
                                        axes={axes}
                                        buttons={buttons}
                                        teams={teams}
                                        selectedTeam={selectedTeam}
                                        teamNames={teamNames}
                                        onPlayerSelect={handlePlayerSelect}
                                        trackingData={analysisResults}
                                        quickSelectorState={quickSelectorState}
                                        timelineVariant={isEditingMode ? 'pro' : 'minimal'}
                                        showLiveToasts={showFeed}
                                        analysisMode={trackingMode}
                                        isEditMode={isEditMode}
                                        layoutConfig={layoutConfig}
                                        onToggleVisibility={toggleComponentVisibility}
                                    />

                                    {/* --- NEW: THIRDS ZONE INDICATOR OVERLAY --- */}
                                    {(thirdsZone.previewZone !== null || thirdsZone.activeThird !== 'MIDFIELD') && (
                                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[51] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <ZoneIndicator thirdsZone={thirdsZone} />
                                        </div>
                                    )}
                                    {userRole === 'admin' && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute top-4 right-4 z-[100] gap-2 bg-slate-900/90 hover:bg-slate-800 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all"
                                            onClick={() => {
                                                setUseVideoMode(false);
                                                setVideoFile(null);
                                                setVideoMode('upload');
                                                socket?.emit('video-mode-sync', { mode: 'upload', useVideoMode: false });
                                            }}
                                        >
                                            <Upload className="h-4 w-4" /> Change Source
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                                    <div className="bg-card/90 p-6 rounded-xl border border-border/50 shadow-2xl flex flex-col items-center gap-4 max-w-md w-full animate-in zoom-in-95 duration-200">
                                        <div className="text-center space-y-1">
                                            <h3 className="text-lg font-bold text-foreground tracking-tight">Media Source</h3>
                                            <p className="text-[11px] text-muted-foreground">Select a video source to begin the analysis session.</p>
                                        </div>

                                        <Tabs defaultValue="upload" className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="upload" className="text-xs">Upload Video</TabsTrigger>
                                                <TabsTrigger value="live" className="text-xs" disabled={!hasPermission('dashboard.live.stream.view')}>Live Stream</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="upload" className="mt-4">
                                                {userRole === 'admin' || userRole === 'operational_analyst' ? (
                                                    <div className="bg-muted/20 border-2 border-dashed border-muted-foreground/10 rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                                        <VideoUpload
                                                            onVideoUpload={async (file) => {
                                                                setVideoFile(file);
                                                                setUseVideoMode(true);
                                                                setVideoMode('upload');
                                                                const formData = new FormData();
                                                                formData.append('video', file);
                                                                try {
                                                                    const response = await fetch(`${API_BASE_URL}/api/upload-video`, { method: 'POST', body: formData });

                                                                    // Check content type to avoid JSON parse errors on HTML responses
                                                                    const contentType = response.headers.get("content-type");
                                                                    if (!contentType || !contentType.includes("application/json")) {
                                                                        throw new Error("Server returned non-JSON response (likely a 500/404 error page)");
                                                                    }

                                                                    const data = await response.json();
                                                                    if (data.success) {
                                                                        setServerVideoPath(data.filePath); // SAVE SERVER PATH
                                                                        socket?.emit('video-loaded', data.videoUrl);
                                                                        socket?.emit('video-mode-sync', { mode: 'upload', useVideoMode: true });

                                                                        // Trigger Waiting Room if in Collab Mode
                                                                        if (sessionMode === 'collab') {
                                                                            setShowAdminWaitingRoom(true);
                                                                        }
                                                                        toast.success("Video uploaded successfully");
                                                                    } else {
                                                                        throw new Error(data.error || "Upload failed");
                                                                    }
                                                                } catch (e: any) {
                                                                    console.error("Upload error:", e);
                                                                    toast.error(`Upload failed: ${e.message}`);
                                                                }
                                                            }}
                                                            currentVideo={videoFile}
                                                            onClearVideo={() => {
                                                                setVideoFile(null);
                                                                setUseVideoMode(false);
                                                                setServerVideoPath(null);
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/10 rounded-lg border border-border/20">
                                                        <Activity className="h-8 w-8 text-muted-foreground mb-3 animate-pulse" />
                                                        <p className="text-sm font-medium">Waiting for Host</p>
                                                        <p className="text-[10px] text-muted-foreground mt-1">The session host will upload the analysis video.</p>
                                                        <p className="text-[9px] text-muted-foreground/50 mt-4 uppercase tracking-widest">
                                                            Your Role: {userRole || 'Guest'}
                                                        </p>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="live" className="mt-4 space-y-3">
                                                <div className="bg-muted/20 border border-border/50 rounded-lg p-6 flex flex-col items-center gap-3 text-center">
                                                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                                        <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-semibold">Live Broadcast</h4>
                                                        <p className="text-[10px] text-muted-foreground">Connect to the secured IPTV feed for real-time analysis.</p>
                                                    </div>

                                                    {userRole === 'admin' ? (
                                                        <Button
                                                            className="w-full mt-2 gap-2"
                                                            variant="default"
                                                            onClick={() => {
                                                                setVideoMode('live');
                                                                setUseVideoMode(true);
                                                                socket?.emit('video-mode-sync', { mode: 'live', useVideoMode: true });

                                                                // Trigger Waiting Room if in Collab Mode
                                                                if (sessionMode === 'collab') {
                                                                    setShowAdminWaitingRoom(true);
                                                                }
                                                            }}
                                                        >
                                                            <Monitor className="h-4 w-4" />
                                                            Launch Player
                                                        </Button>
                                                    ) : (
                                                        <div className="w-full mt-2 p-3 bg-slate-950/50 rounded flex items-center justify-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                            <span className="text-[10px] text-muted-foreground">Waiting for Live Stream...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DashboardWidget>

                <div className="h-10 shrink-0 flex items-center justify-between px-2 bg-card/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 transition-colors text-muted-foreground hover:text-primary" onClick={togglePiP}>
                            <Monitor className="h-3.5 w-3.5" /> <span className="text-[10px] font-bold uppercase tracking-wider">Pop Out</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 transition-colors text-muted-foreground hover:text-primary" onClick={toggleWatchMatch}>
                            <Monitor className="h-3.5 w-3.5" /> <span className="text-[10px] font-bold uppercase tracking-wider">Watch</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Event Log / Logger Audit (Visible on LG+) */}
            {!isRightHidden && (
                <DashboardRightPanel
                    userRole={userRole}
                    isEditMode={isEditMode}
                    layoutConfig={layoutConfig}
                    toggleComponentVisibility={toggleComponentVisibility}
                    events={events}
                    setEvents={setEvents}
                    teams={teams}
                    selectedTeam={selectedTeam}
                    teamNames={teamNames}
                    onPlayerSelect={handlePlayerSelect}
                    trackingMode={trackingMode}
                    useVideoMode={useVideoMode}
                    videoFile={videoFile}
                    videoTime={videoTime}
                    lastEventButtonLabel={lastEventButtonLabel}
                />
            )}
        </div>
    );
};
