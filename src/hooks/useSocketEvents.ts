// src/hooks/useSocketEvents.ts - Socket event listeners
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { useMatchContext } from '@/contexts/MatchContext';
import { LoggedEvent } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';

export function useSocketEvents(socket: Socket) {
    const { toast } = useToast();
    const {
        setEvents,
        setMatchTime,
        setIsMatchActive,
        setSelectedTeam,
        setTeams,
        setRemoteVideoUrl,
        setUseVideoMode,
        setVideoMode,
        setIsVideoPlaying,
        setVideoTime,
        setSeekTime,
        setIsSessionStarted,
        setStreamUrl,
    } = useMatchContext();

    const matchTimeRef = useRef(0);

    useEffect(() => {
        function onSyncState(state: any) {
            console.log('Syncing state:', state);

            if (state.events && state.events.length > 0) {
                setEvents(state.events);
            }

            if (state.matchTime > matchTimeRef.current) {
                setMatchTime(state.matchTime);
                matchTimeRef.current = state.matchTime;
            }

            if (state.isMatchActive !== undefined) {
                setIsMatchActive(state.isMatchActive);
            }

            if (state.selectedTeam) {
                setSelectedTeam(state.selectedTeam);
            }

            if (state.teams && state.teams.length > 0) {
                try {
                    const newTeams = new Map<string, TeamRoster>();
                    if (Array.isArray(state.teams)) {
                        state.teams.forEach((t: any) => {
                            if (Array.isArray(t) && t.length === 2) {
                                newTeams.set(t[0], t[1]);
                            }
                        });
                    }
                    if (newTeams.size > 0) setTeams(newTeams);
                } catch (e) {
                    console.error('Error syncing teams:', e);
                }
            }

            if (state.streamUrl) {
                setStreamUrl(state.streamUrl);
                setVideoMode('live');
                setUseVideoMode(true);
            }

            if (state.videoMode) {
                setVideoMode(state.videoMode);
            }

            if (state.useVideoMode !== undefined) {
                setUseVideoMode(state.useVideoMode);
            }

            if (state.isSessionStarted !== undefined) {
                setIsSessionStarted(state.isSessionStarted);
            }

            if (state.videoState) {
                if (state.videoState.videoUrl) {
                    setRemoteVideoUrl(state.videoState.videoUrl);
                    // If we have a video URL, ensure we are in the right mode
                    if (state.useVideoMode) {
                        setVideoMode('upload');
                        setUseVideoMode(true);
                    }
                }
                if (state.videoState.currentTime !== undefined) {
                    setVideoTime(state.videoState.currentTime);
                    setSeekTime(state.videoState.currentTime); // Force seek to sync
                }
                if (state.videoState.isPlaying !== undefined) {
                    setIsVideoPlaying(state.videoState.isPlaying);
                }
            }
        }

        function onSyncTeams(teamsData: any[]) {
            console.log('Received synced teams:', teamsData);
            try {
                const newTeams = new Map<string, TeamRoster>();
                if (Array.isArray(teamsData)) {
                    teamsData.forEach((t: any) => {
                        if (Array.isArray(t) && t.length === 2) {
                            newTeams.set(t[0], t[1]);
                        }
                    });
                }
                if (newTeams.size > 0) setTeams(newTeams);
                toast({
                    title: 'Teams Synced',
                    description: 'Received team data from broadcaster.'
                });
            } catch (e) {
                console.error('Error handling sync-teams:', e);
            }
        }

        function onNewEvent(event: LoggedEvent) {
            console.log('Received remote event:', event);
            setEvents(prev => [...prev, event]);
        }

        function onSyncTimer(data: { matchTime: number; isMatchActive: boolean }) {
            setMatchTime(data.matchTime);
            matchTimeRef.current = data.matchTime;
            setIsMatchActive(data.isMatchActive);
        }

        function onSelectTeam(teamId: string) {
            console.log('Broadcaster switched team to:', teamId);
            setSelectedTeam(teamId);
        }

        function onUndoEvent(eventId: number) {
            console.log('Received undo event:', eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            toast({
                title: 'Event Annulled',
                description: `Event #${eventId} was removed by broadcaster`,
            });
        }

        function onUpdateEvent(updatedEvent: LoggedEvent) {
            console.log('Received update event:', updatedEvent);
            setEvents(prev => prev.map(e => (e.id === updatedEvent.id ? updatedEvent : e)));
        }

        // Video sync handlers
        function onVideoLoaded(url: string) {
            console.log('Broadcaster loaded video:', url);
            setRemoteVideoUrl(url);
            setUseVideoMode(true);
            setVideoMode('upload');
        }

        function onVideoPlay(time: number) {
            console.log('Broadcaster played at:', time);
            setIsVideoPlaying(true);
            setVideoTime(time);
        }

        function onVideoPause(time: number) {
            console.log('Broadcaster paused at:', time);
            setIsVideoPlaying(false);
            setVideoTime(time);
        }

        function onVideoSeek(time: number) {
            console.log('Broadcaster seeked to:', time);
            setSeekTime(time);
        }

        function onSessionStarted() {
            console.log('🚀 Session started by admin');
            setIsSessionStarted(true);
            toast({
                title: 'Session Started',
                description: 'The analyst has initialized the collaboration session.',
            });
        }

        function onVideoModeChange(data: { mode: 'upload' | 'live', useVideoMode: boolean }) {
            console.log('📹 Broadcaster changed video mode:', data);
            setVideoMode(data.mode);
            setUseVideoMode(data.useVideoMode);
            toast({
                title: 'View Synchronized',
                description: `Switched to ${data.mode === 'live' ? 'Live/IPTV' : 'Video Upload'} view.`,
            });
        }

        if (!socket) return;

        // Register listeners
        socket.on('sync-state', onSyncState);
        socket.on('new-event', onNewEvent);
        socket.on('sync-timer', onSyncTimer);
        socket.on('select-team', onSelectTeam);
        socket.on('sync-teams', onSyncTeams);
        socket.on('undo-event', onUndoEvent);
        socket.on('update-event', onUpdateEvent);
        socket.on('video-loaded', onVideoLoaded);
        socket.on('video-play', onVideoPlay);
        socket.on('video-pause', onVideoPause);
        socket.on('video-seek', onVideoSeek);
        socket.on('session-started', onSessionStarted);
        socket.on('video-mode-change', onVideoModeChange);

        // Cleanup
        return () => {
            socket.off('sync-state', onSyncState);
            socket.off('new-event', onNewEvent);
            socket.off('sync-timer', onSyncTimer);
            socket.off('select-team', onSelectTeam);
            socket.off('sync-teams', onSyncTeams);
            socket.off('undo-event', onUndoEvent);
            socket.off('update-event', onUpdateEvent);
            socket.off('video-loaded', onVideoLoaded);
            socket.off('video-play', onVideoPlay);
            socket.off('video-pause', onVideoPause);
            socket.off('video-seek', onVideoSeek);
            socket.off('session-started', onSessionStarted);
            socket.off('video-mode-change', onVideoModeChange);
        };
    }, [socket, setEvents, setMatchTime, setIsMatchActive, setSelectedTeam, setTeams, toast, setRemoteVideoUrl, setUseVideoMode, setVideoMode, setIsVideoPlaying, setVideoTime, setSeekTime, setIsSessionStarted]);

    return matchTimeRef;
}
