// src/hooks/useMatchTimer.ts - Match timer logic
import { useEffect, useRef } from 'react';
import { useMatchContext } from '@/contexts/MatchContext';

export function useMatchTimer() {
    const { matchTime, setMatchTime, isMatchActive, useVideoMode, videoTime } = useMatchContext();
    const matchTimeRef = useRef(0);
    const videoTimeRef = useRef(0);

    // Match timer interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isMatchActive && !useVideoMode) {
            interval = setInterval(() => {
                setMatchTime(prev => {
                    const newTime = prev + 1;
                    matchTimeRef.current = newTime;
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isMatchActive, useVideoMode, setMatchTime]);

    // Sync match time with video time
    useEffect(() => {
        if (useVideoMode) {
            videoTimeRef.current = videoTime;
            const timeInSeconds = Math.floor(videoTime);
            if (matchTimeRef.current !== timeInSeconds) {
                setMatchTime(timeInSeconds);
                matchTimeRef.current = timeInSeconds;
            }
        }
    }, [videoTime, useVideoMode, setMatchTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return { matchTimeRef, videoTimeRef, formatTime };
}
