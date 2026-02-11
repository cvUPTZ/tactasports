import { useState, useRef, useMemo } from 'react';
import { ViewType } from '@/components/AppSidebar';
import { LoggedEvent } from '@/hooks/useGamepad';
import type { AnalysisMode } from '@/components/AnalysisModeSelector';
import { LiveStreamPlayerRef } from '@/components/LiveStreamPlayer';
import { TeamRoster } from '@/types/player';
import { useMatchTimer } from '@/hooks/useMatchTimer';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';
import { useAudioBroadcast } from '@/hooks/useAudioBroadcast';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import { useSocketEvents } from '@/hooks/useSocketEvents';
import { useIPTVAuth } from '@/contexts/IPTVAuthContext';

export function useIndexState(auth: any, match: any, socketContext: any) {
    const { user, hasPermission } = auth;
    const { teams, selectedTeam, matchTime, isMatchActive, setIsMatchActive, useVideoMode, setIsVideoPlaying } = match;
    const { socket, role: socketRole } = socketContext;

    const { isConfigured: isIPTVConfigured } = useIPTVAuth();
    const { matchTimeRef, formatTime } = useMatchTimer();
    const { pipWindow, togglePiP } = usePictureInPicture();
    const { remoteAudioStream } = useAudioBroadcast(socket, socketRole);
    const { isInRoom, joinVoiceRoom, leaveVoiceRoom, toggleMute, isMuted, peers } = useVoiceRoom(socket, user?.role);

    useSocketEvents(socket);

    // --- Local UI State ---
    const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'fr' | 'ar'>('en');
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    // Initialize Mode based on Permissions
    const [trackingMode, setTrackingMode] = useState<AnalysisMode>(() => {
        if (hasPermission('dashboard.post.view') && !hasPermission('dashboard.live.view')) return 'POST_MATCH';
        return 'LIVE';
    });
    const [isEditingMode, setIsEditingMode] = useState(false);

    // Initialize View based on Permissions
    const [activeView, setActiveView] = useState<ViewType>(() => {
        if (hasPermission('dashboard.view')) return 'dashboard';
        if (hasPermission('analytics.view')) return 'analytics';
        if (hasPermission('qa.view')) return 'qa';
        return 'dashboard'; // Fallback
    });

    const [sessionMode, setSessionMode] = useState<'collab' | 'individual' | null>(null);
    const [showAdminWaitingRoom, setShowAdminWaitingRoom] = useState(false);

    // Menu Toggles
    const [showFeed, setShowFeed] = useState(true);
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [showMappings, setShowMappings] = useState(true);
    const [showIPTVBrowser, setShowIPTVBrowser] = useState(false);
    const [showFIFAPlusBrowser, setShowFIFAPlusBrowser] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const livePlayerRef = useRef<LiveStreamPlayerRef>(null);

    // Auto-Validation State
    const [autoExtract] = useState(() => localStorage.getItem('tacta_auto_extract') === 'true');
    const [serverVideoPath, setServerVideoPath] = useState<string | null>(null);

    // Advanced Event Interaction State
    const [activeDurations, setActiveDurations] = useState<Map<string, { startTime: number, matchTime: number }>>(new Map());
    const [selectedPendingEvent, setSelectedPendingEvent] = useState<LoggedEvent | null>(null);

    // Derived State
    const teamNames = useMemo(() => ({
        teamA: Array.from(teams.keys())[0] || 'Algeria',
        teamB: Array.from(teams.keys())[1] || 'Nigeria'
    }), [teams]);

    const gamepadConfig = useMemo(() => ({
        teamARoster: (teams.get(selectedTeam) as TeamRoster)?.PlayerData?.map(p => ({
            id: p.ID,
            name: `${p.Forename} ${p.Surname}`,
            number: p.Number,
        })) || [],
        teamBRoster: Array.from(teams.entries())
            .find(([id]) => id !== selectedTeam)?.[1]?.PlayerData?.map((p: any) => ({
                id: p.ID,
                name: `${p.Forename} ${p.Surname}`,
                number: p.Number,
            })) || [],
        teamAStartingNumbers: selectedTeam === 'Algeria' ? [1, 2, 5, 6, 7, 8, 9, 10, 11, 15, 22] : undefined,
        analysisMode: trackingMode,
        useKeyboardAsController: user?.role === 'early_tester',
    }), [teams, selectedTeam, trackingMode, user]);

    return {
        voiceLanguage, setVoiceLanguage,
        videoStream, setVideoStream,
        trackingMode, setTrackingMode,
        isEditingMode, setIsEditingMode,
        activeView, setActiveView,
        sessionMode, setSessionMode,
        showAdminWaitingRoom, setShowAdminWaitingRoom,
        showFeed, setShowFeed,
        showAnalytics, setShowAnalytics,
        showMappings, setShowMappings,
        showIPTVBrowser, setShowIPTVBrowser,
        showFIFAPlusBrowser, setShowFIFAPlusBrowser,
        videoRef,
        audioRef,
        livePlayerRef,
        autoExtract,
        serverVideoPath, setServerVideoPath,
        activeDurations, setActiveDurations,
        selectedPendingEvent, setSelectedPendingEvent,
        teamNames,
        gamepadConfig,
        isIPTVConfigured,
        matchTimeRef, formatTime,
        pipWindow, togglePiP,
        remoteAudioStream,
        isInRoom, joinVoiceRoom, leaveVoiceRoom, toggleMute, isMuted, peers,
        socket, socketRole,
        ...auth,
        ...match
    };
}
