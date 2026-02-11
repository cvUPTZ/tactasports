import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMatchContext } from '@/contexts/MatchContext';
import { Card } from '@/components/ui/card';
import { X, RotateCcw, Undo2, Wand2, Loader2, AlertCircle } from 'lucide-react';
import PitchMap from '../PitchMap';
import { Point, screenToVideo, videoToCSS } from '@/utils/coords';
import {
    detectPitchKeypoints,
    detectPlayers,
    keypointsToCalibrationPairs,
    getKeypointName,
    fileToBase64,
    CalibrationPair,
    DetectedPlayer
} from '@/utils/roboflowApi';

interface CalibrationInterfaceProps {
    videoUrl?: string | null;
    isImage?: boolean;
    currentTime?: number;
    onAddPair: (src: Point, dst: Point) => void;
    onRemoveLast: () => void;
    onClear: () => void;
    onClose: () => void;
    currentPairs: Array<{ src: Point; dst: Point }>;
    onAutoDetect?: (pairs: Array<{ src: Point; dst: Point }>) => void;
}

export const CalibrationInterface: React.FC<CalibrationInterfaceProps> = ({
    videoUrl, isImage = false, currentTime = 0, onAddPair, onRemoveLast, onClear, onClose, currentPairs, onAutoDetect
}) => {
    const [pendingSrc, setPendingSrc] = useState<Point | null>(null);
    const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
    const [isDetecting, setIsDetecting] = useState(false);
    const { setRealtimeDetections } = useMatchContext();
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [autoDetectedPairs, setAutoDetectedPairs] = useState<CalibrationPair[]>([]);
    const [detectedPlayers, setDetectedPlayers] = useState<DetectedPlayer[]>([]);
    const [useHighContrast, setUseHighContrast] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        setVideoDims({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight });
        e.currentTarget.currentTime = currentTime;
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setVideoDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
    };

    // Synchronize video currentTime
    useEffect(() => {
        if (!isImage && videoRef.current && currentTime !== undefined) {
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime, isImage]);

    // Auto-trigger player detection when we have enough pairs
    useEffect(() => {
        if (currentPairs.length >= 4 && detectedPlayers.length === 0 && !isDetecting) {
            runPlayerDetection();
        }
    }, [currentPairs.length]);

    const captureFrame = async (): Promise<string> => {
        const canvas = document.createElement('canvas');
        if (isImage && imgRef.current) {
            canvas.width = imgRef.current.naturalWidth;
            canvas.height = imgRef.current.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            ctx.drawImage(imgRef.current, 0, 0);
        } else if (videoRef.current) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            ctx.drawImage(videoRef.current, 0, 0);
        } else {
            throw new Error('No media element available');
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        return dataUrl.split(',')[1];
    };

    const runPlayerDetection = async (pairs = currentPairs) => {
        if (!videoUrl || pairs.length < 4) return;
        try {
            const imageBase64 = await captureFrame();
            const playerResult = await detectPlayers(imageBase64, undefined, useHighContrast);
            if (playerResult.success) {
                setDetectedPlayers(playerResult.players);
                setRealtimeDetections(playerResult.players);
            }
        } catch (e) {
            console.warn('On-demand player detection failed:', e);
        }
    };

    const handleVideoClick = (e: React.MouseEvent) => {
        if (!containerRef.current || videoDims.w === 0) return;
        const coords = screenToVideo(e.clientX, e.clientY, containerRef.current.getBoundingClientRect(), videoDims.w, videoDims.h);
        if (!coords.isOutOfBounds) setPendingSrc({ x: coords.x, y: coords.y });
    };

    const handleAutoDetect = async () => {
        setIsDetecting(true);
        setDetectionError(null);
        try {
            const imageBase64 = await captureFrame();
            const result = await detectPitchKeypoints(imageBase64);

            if (!result.predictions || result.predictions.length === 0) {
                setDetectionError('No pitch keypoints detected. Try with a clearer view of the pitch.');
                return;
            }

            const pairs = keypointsToCalibrationPairs(result.predictions, 0.3);
            if (pairs.length === 0) {
                setDetectionError('Detected keypoints could not be mapped to pitch coordinates.');
                return;
            }

            setAutoDetectedPairs(pairs);
            pairs.forEach(pair => onAddPair(pair.src, pair.dst));

            // Also detect players
            const playerResult = await detectPlayers(imageBase64, undefined, useHighContrast);
            if (playerResult.success) {
                setDetectedPlayers(playerResult.players);
                setRealtimeDetections(playerResult.players);
            }

            if (onAutoDetect) {
                onAutoDetect(pairs.map(p => ({ src: p.src, dst: p.dst })));
            }
        } catch (error) {
            console.error('Auto-detection failed:', error);
            setDetectionError(error instanceof Error ? error.message : 'Detection failed. Check API configuration.');
        } finally {
            setIsDetecting(false);
        }
    };

    const renderDot = (pt: Point, label: string | number, colorClass: string, confidence?: number) => {
        if (!containerRef.current || videoDims.w === 0) return null;
        const style = videoToCSS(pt, containerRef.current.getBoundingClientRect(), videoDims.w, videoDims.h);
        return (
            <div
                key={`${pt.x}-${pt.y}-${label}`}
                className={`absolute w-5 h-5 ${colorClass} rounded-full border border-white flex items-center justify-center text-[9px] font-bold shadow-lg -translate-x-1/2 -translate-y-1/2 z-20`}
                style={style}
                title={confidence ? `Confidence: ${(confidence * 100).toFixed(0)}%` : undefined}
            >
                {label}
            </div>
        );
    };

    const isAutoDetected = (pair: { src: Point; dst: Point }) => {
        return autoDetectedPairs.some(ap =>
            Math.abs(ap.src.x - pair.src.x) < 5 && Math.abs(ap.src.y - pair.src.y) < 5
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md">
            <Card className="w-full max-w-6xl bg-zinc-950 border-zinc-800 text-white overflow-hidden flex flex-col h-[85vh]">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">Calibration Step {currentPairs.length + 1}</h2>
                        {autoDetectedPairs.length > 0 && (
                            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                                {autoDetectedPairs.length} auto-detected
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-zinc-900 rounded-md border border-zinc-800">
                            <input
                                type="checkbox"
                                id="high-contrast"
                                checked={useHighContrast}
                                onChange={(e) => setUseHighContrast(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="high-contrast" className="text-xs font-medium text-zinc-300 cursor-pointer">
                                High Contrast Teams
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleAutoDetect}
                                disabled={isDetecting || !videoUrl}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isDetecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Detecting...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Auto-Detect
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onRemoveLast} disabled={currentPairs.length === 0}>
                                <Undo2 className="w-4 h-4 mr-2" /> Undo
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { onClear(); setAutoDetectedPairs([]); setDetectedPlayers([]); }}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {detectionError && (
                    <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-red-300">{detectionError}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setDetectionError(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                <div className="flex-1 flex gap-6 p-6 overflow-hidden bg-black/50">
                    <div ref={containerRef} className="relative flex-1 bg-zinc-900 rounded-xl overflow-hidden cursor-crosshair border border-zinc-800" onClick={handleVideoClick}>
                        {videoUrl && (isImage
                            ? <img ref={imgRef} src={videoUrl} onLoad={handleImageLoad} className="w-full h-full object-contain pointer-events-none" alt="Calibration" crossOrigin="anonymous" />
                            : <video ref={videoRef} src={videoUrl} onLoadedMetadata={handleLoadedMetadata} className="w-full h-full object-contain pointer-events-none" crossOrigin="anonymous" />
                        )}

                        {isDetecting && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-3" />
                                    <p className="text-white font-medium">Detecting pitch keypoints...</p>
                                    <p className="text-zinc-400 text-sm">Using Roboflow AI</p>
                                </div>
                            </div>
                        )}

                        {pendingSrc && renderDot(pendingSrc, "!", "bg-yellow-500 animate-pulse")}
                        {currentPairs.map((pair, i) => {
                            const isAuto = isAutoDetected(pair);
                            return renderDot(
                                pair.src,
                                i + 1,
                                isAuto ? "bg-green-500" : "bg-blue-600",
                                isAuto ? autoDetectedPairs.find(ap => Math.abs(ap.src.x - pair.src.x) < 5)?.confidence : undefined
                            );
                        })}
                    </div>
                    <div className="w-[420px] flex flex-col gap-4">
                        <PitchMap
                            className="flex-1"
                            onPointClick={(dst) => {
                                if (pendingSrc) {
                                    onAddPair(pendingSrc, dst);
                                    setPendingSrc(null);
                                }
                            }}
                            calibrationPoints={currentPairs.map((p, i) => ({ pitch: p.dst, label: i + 1 }))}
                            playerPositions={detectedPlayers.map(p => ({
                                x: p.pitch_coords ? p.pitch_coords[0] : -1,
                                y: p.pitch_coords ? p.pitch_coords[1] : -1,
                                team: p.team
                            })).filter(p => p.x !== -1)}
                        />

                        <div className="bg-zinc-900/50 rounded-lg p-3 text-xs">
                            <p className="text-zinc-400 mb-2 font-medium">Legend:</p>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                                    <span className="text-zinc-300">Auto</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-600 rounded-full border border-white"></div>
                                    <span className="text-zinc-300">Manual</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
                                    <span className="text-zinc-300">Pending</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center">
                    <p className="text-xs text-zinc-500">
                        {currentPairs.length >= 4
                            ? `✓ ${currentPairs.length} points mapped - calibration ready`
                            : `Need at least 4 points (${4 - currentPairs.length} more required)`
                        }
                    </p>
                    <Button disabled={currentPairs.length < 4} onClick={onClose} className="px-12 bg-blue-600 hover:bg-blue-700">
                        Save Calibration
                    </Button>
                </div>
            </Card>
        </div>
    );
};