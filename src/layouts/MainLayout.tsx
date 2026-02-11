import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ViewType } from '@/components/AppSidebar';
import { VisualGuide } from '@/components/dashboard/VisualGuide';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { VideoBackground } from '@/components/Index/VideoBackground';
import { DashboardView } from '@/components/dashboard/views/DashboardView';
import { AnalyticsView } from '@/components/dashboard/views/AnalyticsView';
import { QAView } from '@/components/dashboard/views/QAView';
import { TacticsView } from '@/components/dashboard/views/TacticsView';
import { SettingsView } from '@/components/dashboard/views/SettingsView';
import { CommunityHub } from '@/components/CommunityHub';
import { VideoManager } from '@/components/VideoManager';
import { LiveEventToast } from '@/components/Index/LiveEventToast';
import { SessionModeModal } from '@/components/SessionModeModal';
import { AdminWaitingRoom } from '@/components/AdminWaitingRoom';
import PendingEventsQueue from '@/components/PendingEventsQueue';
import ZoneSelectorOverlay from "@/components/ZoneSelectorOverlay";
import { QuickPlayerSelector } from "@/components/QuickPlayerSelector";
import { Activity } from 'lucide-react';
import { Card } from "@/components/ui/card";

export function MainLayout(props: any) {
    const {
        user,
        activeView,
        setActiveView,
        hasPermission,
        trackingMode,
        setTrackingMode,
        isMatchActive,
        toggleMatch,
        matchTime,
        formatTime,
        voiceLanguage,
        setVoiceLanguage,
        isListening,
        toggleListening,
        isInRoom,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMute,
        isMuted,
        peers,
        isEditMode,
        setIsEditMode,
        saveLayout,
        resetLayout,
        videoRef,
        videoStream,
        audioRef,
        // DashboardView props
        layoutConfig,
        toggleComponentVisibility,
        teams,
        selectedTeam,
        handleTeamUpload,
        handleTeamSelect,
        keyboardBuffer,
        showMappings,
        mappings,
        pressedButtons,
        updateMapping,
        resetMappings,
        handleGameEvent,
        isEditingMode,
        setIsEditingMode,
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
        setSessionMode,
        showAdminWaitingRoom,
        setShowAdminWaitingRoom,
        togglePiP,
        toggleWatchMatch,
        setEvents,
        lastEventButtonLabel,
        isSessionStarted,
        setIsSessionStarted,
        selectedPendingEvent,
        setSelectedPendingEvent,
        handleDismissPending,
        handleAssignZone
    } = props;

    // Visual Guide State
    const [runGuide, setRunGuide] = React.useState(false);

    React.useEffect(() => {
        const hasSeenGuide = localStorage.getItem('tacta-guide-seen');
        if (!hasSeenGuide) {
            // Delay slightly to ensure layout is ready
            const timer = setTimeout(() => setRunGuide(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleGuideFinish = () => {
        setRunGuide(false);
        localStorage.setItem('tacta-guide-seen', 'true');
    };

    const handleStartGuide = () => {
        setRunGuide(true);
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-screen bg-background overflow-hidden text-xs">
                {user?.role !== 'eye_spotter' && <AppSidebar currentView={activeView} onViewChange={setActiveView} />}

                <SidebarInset className="flex flex-col relative min-w-0 flex-1 h-screen overflow-hidden">
                    <VideoBackground videoRef={videoRef} videoStream={videoStream} />
                    <audio ref={audioRef} autoPlay playsInline />

                    <DashboardHeader
                        userRole={user?.role}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        onStartGuide={handleStartGuide}
                        hasPermission={hasPermission}
                        trackingMode={trackingMode}
                        setTrackingMode={setTrackingMode}
                        isMatchActive={isMatchActive}
                        toggleMatch={toggleMatch}
                        matchTime={matchTime}
                        formatTime={formatTime}
                        voiceLanguage={voiceLanguage}
                        setVoiceLanguage={setVoiceLanguage}
                        isListening={isListening}
                        toggleListening={toggleListening}
                        isInRoom={isInRoom}
                        joinVoiceRoom={joinVoiceRoom}
                        leaveVoiceRoom={leaveVoiceRoom}
                        toggleMute={toggleMute}
                        isMuted={isMuted}
                        peersCount={peers.length}
                        isEditMode={isEditMode}
                        setIsEditMode={setIsEditMode}
                        saveLayout={saveLayout}
                        resetLayout={resetLayout}
                    />

                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        {activeView === 'video_manager' ? (
                            <div className="flex-1 p-4 bg-slate-950 overflow-hidden">
                                <VideoManager />
                            </div>
                        ) : activeView === 'dashboard' ? (
                            <DashboardView
                                userRole={user?.role}
                                isEditMode={isEditMode}
                                layoutConfig={layoutConfig}
                                toggleComponentVisibility={toggleComponentVisibility}
                                teams={teams}
                                selectedTeam={selectedTeam}
                                handleTeamUpload={handleTeamUpload}
                                handleTeamSelect={handleTeamSelect}
                                trackingMode={trackingMode}
                                keyboardBuffer={keyboardBuffer}
                                showMappings={showMappings}
                                mappings={mappings}
                                pressedButtons={pressedButtons}
                                updateMapping={updateMapping}
                                resetMappings={resetMappings}
                                handleGameEvent={handleGameEvent}
                                isEditingMode={isEditingMode}
                                setIsEditingMode={setIsEditingMode}
                                hasPermission={hasPermission}
                                showAnalysisView={showAnalysisView}
                                videoMode={videoMode}
                                useVideoMode={useVideoMode}
                                isIPTVConfigured={isIPTVConfigured}
                                livePlayerRef={livePlayerRef}
                                events={events}
                                showFeed={showFeed}
                                setUseVideoMode={setUseVideoMode}
                                setVideoMode={setVideoMode}
                                showIPTVBrowser={showIPTVBrowser}
                                setShowIPTVBrowser={setShowIPTVBrowser}
                                showFIFAPlusBrowser={showFIFAPlusBrowser}
                                setShowFIFAPlusBrowser={setShowFIFAPlusBrowser}
                                videoFile={videoFile}
                                remoteVideoUrl={remoteVideoUrl}
                                videoTime={videoTime}
                                setVideoTime={setVideoTime}
                                seekTime={seekTime}
                                setSeekTime={setSeekTime}
                                isVideoPlaying={isVideoPlaying}
                                setIsVideoPlaying={setIsVideoPlaying}
                                socket={socket}
                                axes={axes}
                                buttons={buttons}
                                teamNames={teamNames}
                                handlePlayerSelect={handlePlayerSelect}
                                analysisResults={analysisResults}
                                quickSelectorState={quickSelectorState}
                                thirdsZone={thirdsZone}
                                setVideoFile={setVideoFile}
                                setServerVideoPath={setServerVideoPath}
                                sessionMode={sessionMode}
                                setShowAdminWaitingRoom={setShowAdminWaitingRoom}
                                togglePiP={togglePiP}
                                toggleWatchMatch={toggleWatchMatch}
                                setEvents={setEvents}
                                lastEventButtonLabel={lastEventButtonLabel}
                            />
                        ) : activeView === 'analytics' ? (
                            <AnalyticsView events={events} />
                        ) : activeView === 'qa' ? (
                            <QAView
                                events={events}
                                videoFile={videoFile}
                                teamNames={teamNames}
                                availablePlayers={teams.get(selectedTeam)?.PlayerData.map((p: any) => ({
                                    id: p.ID,
                                    name: `${p.Forename} ${p.Surname}`
                                })) || []}
                                setEvents={setEvents}
                                socket={socket}
                                setSeekTime={(time: number) => {
                                    setSeekTime(time);
                                    setTrackingMode('POST_MATCH');
                                    setActiveView('dashboard');
                                }}
                                setTrackingMode={setTrackingMode}
                                setActiveView={setActiveView}
                            />
                        ) : activeView === 'tactics' ? (
                            <TacticsView
                                events={events}
                                teamNames={teamNames}
                                teamARoster={teams.get(Array.from(teams.keys())[0]) || { PlayerData: [] }}
                                teamBRoster={teams.get(Array.from(teams.keys())[1]) || { PlayerData: [] }}
                            />
                        ) : activeView === 'community' ? (
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <CommunityHub />
                            </div>
                        ) : activeView === 'settings' ? (
                            <SettingsView
                                mappings={mappings}
                                pressedButtons={pressedButtons}
                                updateMapping={updateMapping}
                                resetMappings={resetMappings}
                                events={events}
                            />
                        ) : null}

                        {sessionMode === null && (
                            <SessionModeModal onSelectMode={(mode) => {
                                setSessionMode(mode);
                                if (mode === 'collab') {
                                    joinVoiceRoom();
                                }
                            }} />
                        )}

                        <div className="fixed bottom-20 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
                            <div className="pointer-events-auto">
                                <PendingEventsQueue
                                    events={events.filter((e: any) => e.id !== -1 && e.isPendingZone)}
                                    onSelectEvent={setSelectedPendingEvent}
                                    onDismiss={handleDismissPending}
                                />
                            </div>
                        </div>

                        {selectedPendingEvent && (
                            <ZoneSelectorOverlay
                                selectedZone={selectedPendingEvent.zone || 1}
                                onConfirm={(z) => handleAssignZone(selectedPendingEvent.id, z)}
                                onCancel={() => setSelectedPendingEvent(null)}
                                eventName={selectedPendingEvent.eventName}
                                pendingEvents={events.filter((e: any) => e.isPendingZone)}
                                onSelectEvent={setSelectedPendingEvent}
                            />
                        )}

                        {quickSelectorState.isOpen && (
                            <QuickPlayerSelector
                                isVisible={quickSelectorState.isOpen}
                                roster={quickSelectorState.roster}
                                selectedIndex={quickSelectorState.selectedIndex}
                                team={quickSelectorState.team}
                            />
                        )}

                        {showAdminWaitingRoom && (
                            <AdminWaitingRoom
                                connectedPeers={peers}
                                onStartSession={() => {
                                    setShowAdminWaitingRoom(false);
                                    setIsSessionStarted(true);
                                    socket?.emit('start-session');
                                }}
                            />
                        )}

                        {!isSessionStarted && sessionMode === 'collab' && user?.role !== 'admin' && (
                            <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center p-4">
                                <Card className="max-w-md w-full bg-card shadow-2xl border-primary/20 text-center p-8">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <Activity className="w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <h2 className="text-xl font-bold mb-2">Waiting for Admin</h2>
                                    <p className="text-sm text-muted-foreground">
                                        The session hasn't started yet. Please wait for the analyst to initialize the dashboard.
                                    </p>
                                </Card>
                            </div>
                        )}
                    </div >

                    {showFeed && <LiveEventToast events={events} />}
                </SidebarInset >
            </div >
            <VisualGuide run={runGuide} onFinish={handleGuideFinish} />
        </SidebarProvider >
    );
}
