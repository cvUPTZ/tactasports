// src/components/Index/VideoBackground.tsx - HUD mode video background
import { RefObject } from 'react';

interface VideoBackgroundProps {
    videoRef: RefObject<HTMLVideoElement>;
    videoStream: MediaStream | null;
}

export function VideoBackground({ videoRef, videoStream }: VideoBackgroundProps) {
    if (!videoStream) return null;

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
        />
    );
}
