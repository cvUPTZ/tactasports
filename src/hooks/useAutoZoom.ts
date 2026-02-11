import { useEffect, useRef, useState } from 'react';

interface UseAutoZoomProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isPlaying: boolean;
}

interface UseAutoZoomReturn {
    autoZoomEnabled: boolean;
    setAutoZoomEnabled: (enabled: boolean) => void;
    zoomLevel: number;
    panPosition: { x: number; y: number };
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useAutoZoom = ({ videoRef, isPlaying }: UseAutoZoomProps): UseAutoZoomReturn => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [autoZoomEnabled, setAutoZoomEnabled] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });

    // Video-Based Auto-Zoom (analyzes video frames - no calibration needed)
    useEffect(() => {
        if (!autoZoomEnabled || !videoRef.current || !canvasRef.current) {
            // Reset zoom if auto-zoom is disabled
            if (!autoZoomEnabled && zoomLevel !== 1) {
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
            }
            return;
        }

        const analyzeFrame = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (!canvas || !video || video.paused || video.ended) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Sample at low resolution for performance
            canvas.width = 320;
            canvas.height = 180;

            try {
                ctx.drawImage(video, 0, 0, 320, 180);
                const imageData = ctx.getImageData(0, 0, 320, 180);
                const pixels = imageData.data;

                let greenPixels = 0;
                const totalPixels = pixels.length / 4;

                // Track non-green pixels (players, ball, etc.) for focus detection
                let focusX = 0;
                let focusY = 0;
                let focusCount = 0;

                // Detect green field pixels and non-green focus points
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];

                    // Calculate position in frame
                    const pixelIndex = i / 4;
                    const x = (pixelIndex % 320) / 320; // 0-1
                    const y = Math.floor(pixelIndex / 320) / 180; // 0-1

                    // IGNORE TOP 30% of frame (crowd/stands area)
                    if (y < 0.3) continue;

                    // Green detection: g > r && g > b && g > threshold
                    if (g > r && g > b && g > 60) {
                        greenPixels++;
                    } else {
                        // Non-green pixel (potential player/ball)
                        // Only consider pixels in the field area (lower 70% of frame)

                        // Weight brighter pixels more (likely to be players/ball)
                        const brightness = (r + g + b) / 3;

                        // Filter: bright enough but not too bright (avoid ads/graphics)
                        if (brightness > 80 && brightness < 240) {
                            focusX += x * brightness;
                            focusY += y * brightness;
                            focusCount += brightness;
                        }
                    }
                }

                const fieldRatio = greenPixels / totalPixels;

                // Calculate focus point (center of action)
                let targetX = 50; // Default center
                let targetY = 50;

                if (focusCount > 0) {
                    targetX = (focusX / focusCount) * 100; // Convert to 0-100
                    targetY = (focusY / focusCount) * 100;
                }

                // High field ratio = wide shot = zoom in
                if (fieldRatio > 0.4) {
                    setZoomLevel(2.5);
                    // Pan to focus point
                    setPanPosition({
                        x: (50 - targetX) * 1.5,
                        y: (50 - targetY) * 1.5
                    });
                } else if (fieldRatio > 0.25) {
                    setZoomLevel(1.8);
                    setPanPosition({
                        x: (50 - targetX) * 0.8,
                        y: (50 - targetY) * 0.8
                    });
                } else {
                    setZoomLevel(1);
                    setPanPosition({ x: 0, y: 0 });
                }
            } catch (err) {
                console.error('Frame analysis error:', err);
            }
        };

        // Analyze frames every 500ms
        const interval = setInterval(analyzeFrame, 500);

        // Initial analysis
        analyzeFrame();

        return () => clearInterval(interval);
    }, [autoZoomEnabled, isPlaying, videoRef]);

    return {
        autoZoomEnabled,
        setAutoZoomEnabled,
        zoomLevel,
        panPosition,
        canvasRef
    };
};
