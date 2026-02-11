import { useCallback } from 'react';
import { toast } from 'sonner';
import { LoggedEvent } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';
import { EVENT_REGISTRY } from '@/config/eventRegistry';
import { API_BASE_URL } from '@/utils/apiConfig';
import { exportToCSV } from '@/utils/csvExport';
import { COMMANDS, matchCommand, parseNumber } from '@/utils/voiceUtils';

export function useIndexHandlers(state: any) {
    const {
        // From match context/state
        events, setEvents,
        teams, setTeams,
        selectedTeam, setSelectedTeam,
        videoTime,
        useVideoMode, setUseVideoMode,
        setVideoMode,
        setIsVideoPlaying,
        editingEventId, setEditingEventId,
        setLastEventButtonLabel,
        processEvent,
        setIsMatchActive,
        isMatchActive,
        // From state hook
        matchTimeRef, formatTime,
        socket,
        hasPermission, user,
        autoExtract,
        serverVideoPath,
        setActiveDurations,
        setSelectedPendingEvent,
        voiceLanguage,
        startListening, isListening
    } = state;

    const extractClip = async (event: LoggedEvent) => {
        if (!serverVideoPath) return;

        const userBuffer = 5;
        const clipDuration = 10;
        const captureTime = Math.max(0, (event.videoTime || videoTime) - 0.6 - userBuffer);

        try {
            await fetch(`${API_BASE_URL}/api/extract-clip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: serverVideoPath,
                    startTime: captureTime,
                    duration: clipDuration,
                    eventType: event.eventName,
                    eventName: `${event.eventName}_Z${event.zone || 0}_${event.matchTime.replace(/:/g, '-')}`,
                    outputRelativePath: null
                })
            });
            toast.info(`Auto-Clipping: ${event.eventName}`);
        } catch (e) {
            console.error("Auto-extract failed", e);
            toast.error("Auto-clip failed");
        }
    };

    const handleEventLogged = useCallback((event: LoggedEvent) => {
        if (event.eventName === 'ui_confirm' || event.eventName === 'ui_cancel') {
            return;
        }

        const currentTime = matchTimeRef.current;
        const currentVideoTime = videoTime;
        const eventWithTime = {
            ...event,
            matchTime: formatTime(currentTime),
            ...(useVideoMode ? { videoTime: currentVideoTime } : {}),
        };

        const { newState, possessionId, predictions: newPredictions, isInTransition: inTrans } = processEvent(eventWithTime);

        const enrichedEvent = {
            ...eventWithTime,
            matchState: newState,
            possessionId,
            predictions: newPredictions.slice(0, 3),
            inTransitionWindow: inTrans
        };

        if (!hasPermission('dashboard.live.tagging') && user?.role !== 'admin') {
            toast.error('Only the Live Tagger can record events.');
            return;
        }

        setEvents((prev: LoggedEvent[]) => [enrichedEvent, ...prev]);
        setLastEventButtonLabel(event.buttonLabel);
        socket?.emit('new-event', enrichedEvent);

        const eventDef = EVENT_REGISTRY.find(e => e.eventName === event.eventName);
        if (autoExtract && useVideoMode && eventDef?.clippingEnabled !== false) {
            extractClip(enrichedEvent);
        }

        if (eventDef?.requiresDuration) {
            let isStarting = false;
            setActiveDurations((prev: Map<string, any>) => {
                const next = new Map(prev);
                if (next.has(event.eventName)) {
                    const startData = next.get(event.eventName)!;
                    const duration = (useVideoMode ? (videoTime - startData.startTime) : (matchTimeRef.current - startData.matchTime));
                    console.log(`⏱️ Duration for ${event.eventName}: ${duration.toFixed(2)}s`);
                    next.delete(event.eventName);
                } else {
                    next.set(event.eventName, {
                        startTime: useVideoMode ? videoTime : 0,
                        matchTime: matchTimeRef.current
                    });
                    isStarting = true;
                }
                return next;
            });

            if (isStarting) {
                toast.info(`⏺️ Started: ${event.buttonLabel || event.eventName}`);
            }
        }
    }, [useVideoMode, videoTime, formatTime, matchTimeRef, setEvents, setLastEventButtonLabel, socket, processEvent, autoExtract, hasPermission, user, setActiveDurations, serverVideoPath]);

    const handleAssignZone = useCallback((eventId: number, zone: number) => {
        setEvents((prev: LoggedEvent[]) => prev.map(evt =>
            evt.id === eventId ? { ...evt, zone, isPendingZone: false } : evt
        ));

        const eventToUpdate = events.find((e: LoggedEvent) => e.id === eventId);
        if (eventToUpdate) {
            socket?.emit('update-event', { id: eventId, zone, isPendingZone: false });
        }

        setSelectedPendingEvent(null);
        toast.success('Zone assigned successfully');
    }, [events, setEvents, socket, setSelectedPendingEvent]);

    const handleDismissPending = useCallback((eventId: number) => {
        setEvents((prev: LoggedEvent[]) => prev.map(evt =>
            evt.id === eventId ? { ...evt, isPendingZone: false } : evt
        ));
        toast.info('Zone assignment skipped');
    }, [setEvents]);

    const handleTeamUpload = (newTeams: Map<string, TeamRoster>) => {
        const updatedTeams = new Map(teams);
        newTeams.forEach((roster, teamName) => {
            updatedTeams.set(teamName, roster);
        });
        setTeams(updatedTeams);
        socket?.emit('sync-teams', Array.from(updatedTeams.entries()));
        if (newTeams.size > 0) setSelectedTeam('');
    };

    const handleTeamSelect = (teamId: string) => {
        setSelectedTeam(teamId);
        socket?.emit('select-team', teamId);
    };

    const handlePlayerSelect = (playerId: number) => {
        setEvents((prevEvents: LoggedEvent[]) => {
            const newEvents = [...prevEvents];
            let targetIndex = -1;
            if (editingEventId !== null) {
                targetIndex = newEvents.findIndex(e => e.id === editingEventId);
            } else {
                const searchLimit = Math.min(newEvents.length, 10);
                for (let i = searchLimit - 1; i >= 0; i--) {
                    if (!newEvents[i].player && !newEvents[i].isCalculated) {
                        targetIndex = i;
                        break;
                    }
                }
            }
            if (targetIndex !== -1) {
                const targetEvent = newEvents[targetIndex];
                const roster = teams.get(selectedTeam);
                const player = roster?.PlayerData.find(p => p.ID === playerId);
                if (player) {
                    const updatedEvent = {
                        ...targetEvent,
                        player: { id: player.ID, name: `${player.Forename} ${player.Surname}` },
                    };
                    newEvents[targetIndex] = updatedEvent;
                    socket?.emit('update-event', updatedEvent);
                    toast.success('Player Assigned', { description: `Assigned ${player.Surname} to ${targetEvent.eventName}` });
                    if (editingEventId !== null) setEditingEventId(null);
                }
            }
            return newEvents;
        });
    };

    const handleGameEvent = (eventName: string, source: string = 'Manual') => {
        const teamKeys = Array.from(teams.keys());
        const teamSide = (selectedTeam === (teamKeys[1]) ? "TEAM_B" : "TEAM_A") as "TEAM_A" | "TEAM_B";
        const newEvent: LoggedEvent = {
            id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
            timestamp: new Date().toISOString(),
            eventName,
            team: teamSide,
            buttonLabel: source,
            matchTime: formatTime(matchTimeRef.current),
        };
        handleEventLogged(newEvent);
    };

    const handleVoiceResult = (transcript: string) => {
        const lowerTranscript = transcript.toLowerCase();
        const number = parseNumber(lowerTranscript);
        if (number !== null) {
            const currentTeamRoster = teams.get(selectedTeam)?.PlayerData;
            if (currentTeamRoster) {
                const player = currentTeamRoster.find(p => p.Number === number);
                if (player) handlePlayerSelect(player.ID);
            }
        }
        let matchedCommand = null;
        if (matchCommand(lowerTranscript, COMMANDS.PASS)) matchedCommand = 'PASS';
        else if (matchCommand(lowerTranscript, COMMANDS.SHOOT)) matchedCommand = 'SHOT';
        else if (matchCommand(lowerTranscript, COMMANDS.GOAL)) matchedCommand = 'GOAL';
        else if (matchCommand(lowerTranscript, COMMANDS.FOUL)) matchedCommand = 'FOUL';
        else if (matchCommand(lowerTranscript, COMMANDS.OFFSIDE)) matchedCommand = 'OFFSIDE';
        else if (matchCommand(lowerTranscript, COMMANDS.PENALTY)) matchedCommand = 'PENALTY';
        else if (matchCommand(lowerTranscript, COMMANDS.CORNER)) matchedCommand = 'CORNER';
        else if (matchCommand(lowerTranscript, COMMANDS.SUBSTITUTION)) matchedCommand = 'SUBSTITUTION';

        if (matchedCommand) {
            handleGameEvent(matchedCommand, 'Voice');
            toast.success('Voice Command', { description: `Executed: ${matchedCommand}` });
        }
    };

    const toggleMatch = () => {
        if (!isMatchActive) {
            setIsMatchActive(true);
            if (useVideoMode) setIsVideoPlaying(true);
            if (!isListening) try { startListening(); } catch (e) { console.error(e); }
        } else {
            setIsMatchActive(false);
            if (useVideoMode) setIsVideoPlaying(false);
        }
    };

    const toggleWatchMatch = async () => {
        // This probably needs to access videoStream and setVideoStream from state
        const { videoStream, setVideoStream } = state;
        if (videoStream) {
            videoStream.getTracks().forEach((track: any) => track.stop());
            setVideoStream(null);
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' } as any, audio: false });
                setVideoStream(stream);
                stream.getVideoTracks()[0].onended = () => setVideoStream(null);
            } catch (err) { console.error('Error sharing screen:', err); }
        }
    };

    const handleExport = () => {
        if (events.length === 0) {
            toast.error('No events');
            return;
        }
        exportToCSV(events);
        toast.success('Exported to CSV');
    };

    return {
        handleEventLogged,
        handleAssignZone,
        handleDismissPending,
        handleTeamUpload,
        handleTeamSelect,
        handlePlayerSelect,
        handleGameEvent,
        handleVoiceResult,
        toggleMatch,
        toggleWatchMatch,
        handleExport,
        extractClip
    };
}
