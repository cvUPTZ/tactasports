import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useIndexEffects(state: any) {
    const {
        socket,
        matchTime,
        isMatchActive,
        audioRef,
        remoteAudioStream,
        videoRef,
        videoStream,
        isSessionStarted,
        sessionMode,
        setSessionMode,
        user,
        joinVoiceRoom
    } = state;

    // Sync Timer with Socket
    useEffect(() => {
        socket?.emit('sync-timer', { matchTime, isMatchActive });
    }, [isMatchActive, matchTime, socket]);

    // Handle Remote Audio
    useEffect(() => {
        if (audioRef.current && remoteAudioStream) {
            if (audioRef.current.srcObject !== remoteAudioStream) {
                audioRef.current.srcObject = remoteAudioStream;
                audioRef.current.play().catch((err: any) => console.error('Error playing audio:', err));
            }
        }
    }, [remoteAudioStream, audioRef]);

    // Handle Local Video Stream
    useEffect(() => {
        if (videoRef.current && videoStream) {
            if (videoRef.current.srcObject !== videoStream) {
                videoRef.current.srcObject = videoStream;
            }
        }
    }, [videoStream, videoRef]);

    // Auto-join collaboration mode
    useEffect(() => {
        if (isSessionStarted && sessionMode === null && user?.role !== 'admin') {
            setSessionMode('collab');
            joinVoiceRoom();
            toast.info('Joining live collaboration session...');
        }
    }, [isSessionStarted, sessionMode, user, joinVoiceRoom, setSessionMode]);
}
