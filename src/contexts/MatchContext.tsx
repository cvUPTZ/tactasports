// src/contexts/MatchContext.tsx - Match state management with State Machine
import { createContext, useContext, useState, useRef, useCallback, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import { LoggedEvent } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { toast } from 'sonner';

// State Machine imports
import {
    MatchState,
    createInitialState,
    processEvent as processStateEvent,
    isInTransitionWindow,
    getTransitionTimeRemaining,
    getStateLabel,
    TeamId
} from '@/utils/MatchStateMachine';

import {
    PossessionChain,
    PossessionManager,
    createPossessionManager,
    startNewPossession,
    addEventToChain,
    endPossession,
    calculateChainStats,
    ChainStats
} from '@/utils/PossessionChain';

import {
    SequencePredictorState,
    Prediction,
    createSequencePredictor,
    recordEvent as recordPredictorEvent,
    getPredictions,
    savePatternsToStorage,
    getLearningStats,
    LearningStats
} from '@/utils/SequencePredictor';

interface VideoState {
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    videoUrl: string;
}

interface MatchContextType {
    // Events
    events: LoggedEvent[];
    setEvents: Dispatch<SetStateAction<LoggedEvent[]>>;

    // Teams
    teams: Map<string, TeamRoster>;
    setTeams: Dispatch<SetStateAction<Map<string, TeamRoster>>>;
    selectedTeam: string;
    setSelectedTeam: Dispatch<SetStateAction<string>>;

    // Match Time
    matchTime: number;
    setMatchTime: Dispatch<SetStateAction<number>>;
    isMatchActive: boolean;
    setIsMatchActive: Dispatch<SetStateAction<boolean>>;

    // Video
    videoFile: File | null;
    setVideoFile: Dispatch<SetStateAction<File | null>>;
    remoteVideoUrl: string | null;
    setRemoteVideoUrl: Dispatch<SetStateAction<string | null>>;
    videoTime: number;
    setVideoTime: Dispatch<SetStateAction<number>>;
    useVideoMode: boolean;
    setUseVideoMode: Dispatch<SetStateAction<boolean>>;
    seekTime: number | null;
    setSeekTime: Dispatch<SetStateAction<number | null>>;
    isVideoPlaying: boolean;
    setIsVideoPlaying: Dispatch<SetStateAction<boolean>>;
    videoMode: 'upload' | 'live' | 'fifaplus';
    setVideoMode: Dispatch<SetStateAction<'upload' | 'live' | 'fifaplus'>>;
    showAnalysisView: boolean;
    setShowAnalysisView: Dispatch<SetStateAction<boolean>>;
    isSessionStarted: boolean;
    setIsSessionStarted: Dispatch<SetStateAction<boolean>>;

    // Analysis
    analysisResults: any;
    setAnalysisResults: Dispatch<SetStateAction<any>>;
    calibrationMatrix: number[][] | null;
    setCalibrationMatrix: Dispatch<SetStateAction<number[][] | null>>;
    realtimeDetections: any[];
    setRealtimeDetections: Dispatch<SetStateAction<any[]>>;

    // UI State
    editingEventId: number | null;
    setEditingEventId: Dispatch<SetStateAction<number | null>>;
    lastEventButtonLabel: string | undefined;
    setLastEventButtonLabel: Dispatch<SetStateAction<string | undefined>>;

    // ─────────────────────────────────────────────────────────────────────────
    // STATE MACHINE
    // ─────────────────────────────────────────────────────────────────────────
    matchState: MatchState;
    processEvent: (event: LoggedEvent) => {
        newState: MatchState;
        possessionId?: number;
        predictions: Prediction[];
        isInTransition: boolean;
    };
    isInTransition: boolean;
    transitionTimeRemaining: number;
    stateLabel: string;

    // ─────────────────────────────────────────────────────────────────────────
    // POSSESSION CHAINS
    // ─────────────────────────────────────────────────────────────────────────
    currentPossession: PossessionChain | null;
    possessionHistory: PossessionChain[];
    chainStats: ChainStats | null;

    // ─────────────────────────────────────────────────────────────────────────
    // SEQUENCE PREDICTIONS
    // ─────────────────────────────────────────────────────────────────────────
    predictions: Prediction[];
    learningStats: LearningStats | null;
    resetPredictions: () => void;

    possessionId?: number;
    // Stream
    streamUrl: string;
    setStreamUrl: (url: string) => void;
    useStreamProxy: boolean;
    setUseStreamProxy: (use: boolean) => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
    // -------------------------------------------------------------------------
    // EXISTING STATE
    // -------------------------------------------------------------------------
    const [events, setEvents] = useState<LoggedEvent[]>([]);
    const [teams, setTeams] = useState<Map<string, TeamRoster>>(new Map());
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [lastEventButtonLabel, setLastEventButtonLabel] = useState<string>();

    const [matchTime, setMatchTime] = useState(0);
    const [isMatchActive, setIsMatchActive] = useState(false);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [remoteVideoUrl, setRemoteVideoUrl] = useState<string | null>(null);
    const [videoTime, setVideoTime] = useState(0);
    const [useVideoMode, setUseVideoMode] = useState(false);
    const [seekTime, setSeekTime] = useState<number | null>(null);
    const [analysisResults, setAnalysisResults] = useState<any>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoMode, setVideoMode] = useState<'upload' | 'live' | 'fifaplus'>('upload');
    const [showAnalysisView, setShowAnalysisView] = useState(false);
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [calibrationMatrix, setCalibrationMatrix] = useState<number[][] | null>(null);
    const [realtimeDetections, setRealtimeDetections] = useState<any[]>([]);

    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [streamUrl, setStreamUrl] = useState<string>(() => {
        try {
            return localStorage.getItem('matchStreamUrl') || (import.meta as any).env.VITE_DEFAULT_STREAM_URL || "";
        } catch (e) {
            return (import.meta as any).env.VITE_DEFAULT_STREAM_URL || "";
        }
    });
    const [useStreamProxy, setUseStreamProxy] = useState<boolean>(() => {
        try {
            return localStorage.getItem('matchUseStreamProxy') === 'true';
        } catch (e) {
            return false;
        }
    });

    // -------------------------------------------------------------------------
    // STATE MACHINE STATE
    // -------------------------------------------------------------------------
    const [matchState, setMatchState] = useState<MatchState>(createInitialState);
    const matchStateRef = useRef<MatchState>(matchState);

    // -------------------------------------------------------------------------
    // POSSESSION CHAIN STATE
    // -------------------------------------------------------------------------
    const [possessionManager, setPossessionManager] = useState<PossessionManager>(createPossessionManager);
    const possessionManagerRef = useRef<PossessionManager>(possessionManager);

    // -------------------------------------------------------------------------
    // SEQUENCE PREDICTOR STATE
    // -------------------------------------------------------------------------
    const [predictorState, setPredictorState] = useState<SequencePredictorState>(createSequencePredictor);
    const predictorRef = useRef<SequencePredictorState>(predictorState);
    const [predictions, setPredictions] = useState<Prediction[]>([]);

    // Socket for synchronization
    const { socket, role, connected } = useSocketContext();

    // Keep refs in sync
    matchStateRef.current = matchState;
    possessionManagerRef.current = possessionManager;
    predictorRef.current = predictorState;

    // ─────────────────────────────────────────────────────────────────────────
    // SOCKET SYNCHRONIZATION
    // ─────────────────────────────────────────────────────────────────────────

    // Broadcast state updates (Broadcaster only)
    useEffect(() => {
        if (socket && connected && role === 'broadcaster') {
            socket.emit('match-state-sync', {
                matchState,
                possessionManager,
                predictions,
                streamUrl,
                useStreamProxy,
                videoMode,
                useVideoMode,
                isSessionStarted
            });
        }
    }, [matchState, possessionManager, predictions, streamUrl, useStreamProxy, socket, connected, role]);

    // Receive state updates (Viewer/Monitoring only)
    useEffect(() => {
        if (!socket) return;

        const handleRemoteSync = (data: any) => {
            if (role === 'viewer') {
                if (data.matchState) {
                    setMatchState(data.matchState);
                    matchStateRef.current = data.matchState;
                }
                if (data.possessionManager) {
                    setPossessionManager(data.possessionManager);
                    possessionManagerRef.current = data.possessionManager;
                }
                if (data.predictions) {
                    setPredictions(data.predictions);
                }
                if (data.streamUrl !== undefined) {
                    setStreamUrl(data.streamUrl);
                }
                if (data.useStreamProxy !== undefined) {
                    setUseStreamProxy(data.useStreamProxy);
                }
                if (data.videoMode !== undefined) {
                    setVideoMode(data.videoMode);
                }
                if (data.useVideoMode !== undefined) {
                    setUseVideoMode(data.useVideoMode);
                }
                if (data.isSessionStarted !== undefined) {
                    setIsSessionStarted(data.isSessionStarted);
                }
            }
        };

        socket.on('match-state-remote-sync', handleRemoteSync);
        return () => {
            socket.off('match-state-remote-sync', handleRemoteSync);
        };
    }, [socket, role]);

    // -------------------------------------------------------------------------
    // CORE PROCESS EVENT FUNCTION
    // -------------------------------------------------------------------------
    const processEvent = useCallback((event: LoggedEvent) => {
        // 1. Process through state machine
        const { newState, transition } = processStateEvent(matchStateRef.current, event);
        setMatchState(newState);
        matchStateRef.current = newState;

        // 2. Update possession chains
        let newPossessionManager = possessionManagerRef.current;

        // Check for possession-changing events
        if (event.eventName === 'interception') {
            // RB - Start new possession
            newPossessionManager = startNewPossession(
                newPossessionManager,
                event.team as TeamId,
                event,
                newState
            );
        } else if (event.eventName === 'turnover') {
            // LB - End current possession (lost)
            newPossessionManager = endPossession(newPossessionManager, 'LOSS');
        } else if (event.eventName === 'shot_start') {
            // Shot taken - mark in chain
            newPossessionManager = addEventToChain(newPossessionManager, event, newState);
        } else if (event.eventName === 'goal') {
            // Goal - end possession with goal outcome
            newPossessionManager = endPossession(newPossessionManager, 'GOAL');
        } else if (event.eventName === 'foul' || event.eventName === 'offside') {
            // Set piece - end current possession
            newPossessionManager = endPossession(newPossessionManager, 'SET_PIECE');
        } else {
            // Regular event - add to current chain
            newPossessionManager = addEventToChain(newPossessionManager, event, newState);
        }

        setPossessionManager(newPossessionManager);
        possessionManagerRef.current = newPossessionManager;

        // Alert for consecutive passes (>= 5)
        if (newPossessionManager.currentChain && newPossessionManager.currentChain.passCount >= 5 && event.eventName.includes('pass')) {
            toast.success(`${newPossessionManager.currentChain.team === 'TEAM_A' ? 'Algeria' : 'Nigeria'} - Sequence Alert: ${newPossessionManager.currentChain.passCount} Consecutive Passes!`, {
                icon: '⚽',
                duration: 3000,
                position: 'top-center'
            });
        }

        // 3. Update sequence predictor
        const newPredictorState = recordPredictorEvent(predictorRef.current, event.eventName);
        setPredictorState(newPredictorState);
        predictorRef.current = newPredictorState;

        // 4. Get new predictions
        const newPredictions = getPredictions(newPredictorState);
        setPredictions(newPredictions);

        const inTransition = isInTransitionWindow(newState);

        // Log state change for debugging
        console.log(`🎯 State: ${getStateLabel(newState)} | Chain: ${newPossessionManager.currentChain?.id || 'none'}`);

        return {
            newState,
            possessionId: newPossessionManager.currentChain?.id,
            predictions: newPredictions,
            isInTransition: inTransition
        };
    }, []);

    // -------------------------------------------------------------------------
    // COMPUTED VALUES
    // -------------------------------------------------------------------------
    const isInTransition = isInTransitionWindow(matchState);
    const transitionTimeRemaining = getTransitionTimeRemaining(matchState);
    const stateLabel = getStateLabel(matchState);

    const currentPossession = possessionManager.currentChain;
    const possessionHistory = possessionManager.completedChains;

    const chainStats = possessionHistory.length > 0
        ? calculateChainStats(possessionHistory)
        : null;

    const learningStats = predictorState.totalEventsProcessed > 0
        ? getLearningStats(predictorState)
        : null;

    useEffect(() => {
        if (streamUrl) {
            try {
                localStorage.setItem('matchStreamUrl', streamUrl);
            } catch (e) { /* ignore */ }
        }
    }, [streamUrl]);

    useEffect(() => {
        try {
            localStorage.setItem('matchUseStreamProxy', useStreamProxy.toString());
        } catch (e) { /* ignore */ }
    }, [useStreamProxy]);

    // -------------------------------------------------------------------------
    // RESET PREDICTIONS
    // -------------------------------------------------------------------------
    const resetPredictions = useCallback(() => {
        const freshPredictor = createSequencePredictor();
        setPredictorState(freshPredictor);
        predictorRef.current = freshPredictor;
        setPredictions([]);
        savePatternsToStorage(freshPredictor);
    }, []);

    return (
        <MatchContext.Provider
            value={{
                // Existing
                events,
                setEvents,
                teams,
                setTeams,
                selectedTeam,
                setSelectedTeam,
                matchTime,
                setMatchTime,
                isMatchActive,
                setIsMatchActive,
                videoFile,
                setVideoFile,
                remoteVideoUrl,
                setRemoteVideoUrl,
                videoTime,
                setVideoTime,
                useVideoMode,
                setUseVideoMode,
                seekTime,
                setSeekTime,
                isVideoPlaying,
                setIsVideoPlaying,
                videoMode,
                setVideoMode,
                showAnalysisView,
                setShowAnalysisView,
                isSessionStarted,
                setIsSessionStarted,
                analysisResults,
                setAnalysisResults,
                calibrationMatrix,
                setCalibrationMatrix,
                realtimeDetections,
                setRealtimeDetections,
                editingEventId,
                setEditingEventId,
                lastEventButtonLabel,
                setLastEventButtonLabel,

                // State Machine
                matchState,
                processEvent,
                isInTransition,
                transitionTimeRemaining,
                stateLabel,

                // Possession Chains
                currentPossession,
                possessionHistory,
                chainStats,

                // Predictions
                predictions,
                learningStats,
                resetPredictions,

                // Stream
                streamUrl,
                setStreamUrl,
                useStreamProxy,
                setUseStreamProxy,
            }}
        >
            {children}
        </MatchContext.Provider>
    );
}

export function useMatchContext() {
    const context = useContext(MatchContext);
    if (!context) {
        throw new Error('useMatchContext must be used within MatchProvider');
    }
    return context;
}
