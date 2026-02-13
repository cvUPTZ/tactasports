import React, { useEffect } from 'react';

interface VideoBackgroundProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    videoStream: MediaStream | null;
}

export function VideoBackground({ videoRef, videoStream }: VideoBackgroundProps) {
    useEffect(() => {
        if (videoRef.current && videoStream) {
            if (videoRef.current.srcObject !== videoStream) {
                videoRef.current.srcObject = videoStream;
            }
            videoRef.current.play().catch(error => {
                if (error.name !== 'AbortError') {
                    console.warn("Video background play interrupted or failed:", error);
                }
            });
        }
    }, [videoStream, videoRef]);

    if (!videoStream) return null;

    return (
        <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
        />
    );
}
