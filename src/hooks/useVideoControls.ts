import { useEffect, useState, useRef } from 'react';

interface UseVideoControlsProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    externalIsPlaying?: boolean;
    onPlayPause?: (isPlaying: boolean) => void;
    onTimeUpdate: (currentTime: number) => void;
}

interface UseVideoControlsReturn {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    togglePlay: () => void;
    handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    changePlaybackRate: () => void;
    skipTime: (seconds: number) => void;
    formatTime: (seconds: number) => string;
}

export const useVideoControls = ({
    videoRef,
    externalIsPlaying,
    onPlayPause,
    onTimeUpdate
}: UseVideoControlsProps): UseVideoControlsReturn => {
    const [localIsPlaying, setLocalIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : localIsPlaying;

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            onTimeUpdate(video.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handlePlay = () => {
            if (onPlayPause) onPlayPause(true);
            else setLocalIsPlaying(true);
        };

        const handlePause = () => {
            if (onPlayPause) onPlayPause(false);
            else setLocalIsPlaying(false);
        };

        const handleEnded = () => {
            if (onPlayPause) onPlayPause(false);
            else setLocalIsPlaying(false);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [onTimeUpdate, onPlayPause, videoRef]);

    // Sync external play state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying && video.paused) {
            video.play().catch(e => console.error("Play failed:", e));
        } else if (!isPlaying && !video.paused) {
            video.pause();
        }
    }, [isPlaying, videoRef]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        const newState = !isPlaying;
        if (onPlayPause) {
            onPlayPause(newState);
        } else {
            setLocalIsPlaying(newState);
        }

        if (newState) {
            video.play();
        } else {
            video.pause();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const time = parseFloat(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const vol = parseFloat(e.target.value);
        video.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const changePlaybackRate = () => {
        const video = videoRef.current;
        if (!video) return;

        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        video.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    };

    const skipTime = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;

        video.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        togglePlay,
        handleSeek,
        handleVolumeChange,
        toggleMute,
        changePlaybackRate,
        skipTime,
        formatTime
    };
};
