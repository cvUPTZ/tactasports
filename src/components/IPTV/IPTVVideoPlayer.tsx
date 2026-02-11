import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Play,
    Pause,
    RotateCcw,
    Loader2,
    Radio, // Added for the transfer button icon
} from "lucide-react";
import Hls from "hls.js";

import { API_BASE_URL } from "@/utils/apiConfig";
import { useMatchContext } from "@/contexts/MatchContext"; // Import context to communicate with LiveStreamPlayer
import { toast } from "sonner"; // Assuming you use sonner for feedback as seen in LiveStreamPlayer

interface IPTVVideoPlayerProps {
    streamUrl: string;
    channelName: string;
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
}

export function IPTVVideoPlayer({
    streamUrl,
    channelName,
    isOpen,
    onClose,
    isEmbedded = false,
}: IPTVVideoPlayerProps) {
    const { setStreamUrl } = useMatchContext(); // Access the global stream state
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Function to transfer current stream to the main LiveStreamPlayer and close IPTV player
    const handleSendToLivePlayer = () => {
        setStreamUrl(streamUrl);
        toast.success(`Transferred "${channelName}" to Live Player`);
        // Close the IPTV player after transferring (unless embedded)
        if (!isEmbedded) {
            onClose();
        }
    };

    const loadStream = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        setIsPlaying(false);

        try {
            // ALWAYS use proxy for the stream manifest
            const normalizedStreamUrl = `${API_BASE_URL}/api/proxy?url=${encodeURIComponent(streamUrl)}`;

            const video = videoRef.current;
            if (!video) return;

            // Reset video element
            try {
                video.pause();
                video.currentTime = 0;
                video.src = "";
                video.load(); // Force reset
            } catch { }

            // Wait a bit for video element to reset
            await new Promise(resolve => setTimeout(resolve, 100));

            if (Hls.isSupported()) {
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }

                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 5,
                    debug: false, // Set to true to see more logs

                    // Important: Configure fragLoadingTimeOut and manifestLoadingTimeOut
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 10000,
                    levelLoadingTimeOut: 10000,

                    xhrSetup: (xhr, url) => {
                        // Proxy all segment requests
                        let finalUrl = url;

                        if (url && !url.includes("/api/proxy")) {
                            finalUrl = `${API_BASE_URL}/api/proxy?url=${encodeURIComponent(url)}`;
                        }

                        // Override the URL for this request
                        const originalOpen = xhr.open;
                        xhr.open = function (method: string, requestUrl: string) {
                            // Use our proxied URL instead
                            return originalOpen.call(this, method, finalUrl);
                        };

                        // Set safe headers
                        try {
                            xhr.setRequestHeader("Accept", "*/*");
                        } catch (e) {
                            console.warn('Failed to set Accept header:', e);
                        }
                    },
                });

                hlsRef.current = hls;

                // HLS Events
                hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    console.log('[HLS] Media attached to video element');
                });

                hls.on(Hls.Events.MANIFEST_PARSED, async (event, data) => {
                    console.log('[HLS] Manifest parsed, levels:', data.levels.length);
                    setIsLoading(false);
                    setHasError(false);

                    try {
                        // Try to play the video
                        await video.play();
                        console.log('[HLS] Playback started');
                    } catch (error) {
                        console.error('[HLS] Autoplay failed:', error);
                    }
                });

                hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                    console.log('[HLS] Level loaded:', data.level, 'fragments:', data.details.fragments.length);
                });

                hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
                    console.log('[HLS] Loading fragment:', data.frag.sn);
                });

                hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                    console.log('[HLS] Fragment loaded:', data.frag.sn);
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('[HLS] Error:', data.type, data.details, data.fatal);

                    if (data.fatal) {
                        setIsLoading(false);

                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('[HLS] Fatal network error, trying to recover');
                                // Try to recover from network error
                                setTimeout(() => {
                                    if (hlsRef.current) {
                                        hlsRef.current.startLoad();
                                    }
                                }, 1000);
                                break;

                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('[HLS] Fatal media error, trying to recover');
                                // Try to recover from media error
                                if (hlsRef.current) {
                                    hlsRef.current.recoverMediaError();
                                }
                                break;

                            default:
                                // Cannot recover
                                setHasError(true);
                                setIsPlaying(false);
                                if (videoRef.current) {
                                    videoRef.current.pause();
                                }
                                if (hlsRef.current) {
                                    hlsRef.current.destroy();
                                    hlsRef.current = null;
                                }
                                break;
                        }
                    }
                });

                // Attach media FIRST, then load source
                hls.attachMedia(video);

                // Wait for media to be attached
                await new Promise<void>((resolve) => {
                    hls.once(Hls.Events.MEDIA_ATTACHED, () => resolve());
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(), 5000);
                });

                // Now load the source
                console.log('[HLS] Loading source:', normalizedStreamUrl);
                hls.loadSource(normalizedStreamUrl);

            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                // Native HLS support (Safari)
                console.log('[Native] Using native HLS support');
                video.src = normalizedStreamUrl;

                video.addEventListener('loadedmetadata', () => {
                    console.log('[Native] Metadata loaded');
                    setIsLoading(false);
                }, { once: true });

                video.addEventListener('canplay', async () => {
                    console.log('[Native] Can play');
                    try {
                        await video.play();
                    } catch (e) {
                        console.error('[Native] Play failed:', e);
                    }
                }, { once: true });

            } else {
                throw new Error("HLS is not supported in this browser");
            }
        } catch (error) {
            console.error('[Player] Load stream error:', error);
            setIsLoading(false);
            setHasError(true);
            setIsPlaying(false);
            if (videoRef.current) {
                videoRef.current.pause();
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        }
    }, [streamUrl]);

    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    }, [isPlaying]);

    const handleMouseMove = useCallback(() => {
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const handlePlayPause = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (video.paused) {
                if (isLoading || hasError) return;
                await video.play();
            } else {
                video.pause();
            }
        } catch { }

        resetControlsTimeout();
    }, [hasError, isLoading, resetControlsTimeout]);

    const handleVolumeChange = useCallback(
        (newVolume: number) => {
            const video = videoRef.current;
            if (!video) return;

            setVolume(newVolume);
            video.volume = newVolume;
            setIsMuted(newVolume === 0);
            resetControlsTimeout();
        },
        [resetControlsTimeout]
    );

    const handleMuteToggle = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isMuted) {
            video.volume = 0.8;
            setVolume(0.8);
            setIsMuted(false);
        } else {
            video.volume = 0;
            setIsMuted(true);
        }
        resetControlsTimeout();
    }, [isMuted, resetControlsTimeout]);

    const handleFullscreen = useCallback(() => {
        const container = playerContainerRef.current;
        if (!container) return;

        const fullscreenElement =
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).msFullscreenElement;

        if (!fullscreenElement) {
            const requestFullscreen =
                container.requestFullscreen ||
                (container as any).webkitRequestFullscreen ||
                (container as any).msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(container);
            }
        } else {
            const exitFullscreen =
                document.exitFullscreen ||
                (document as any).webkitExitFullscreen ||
                (document as any).msExitFullscreen;

            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }

        resetControlsTimeout();
    }, [resetControlsTimeout]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreenElement =
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement;

            setIsFullscreen(Boolean(fullscreenElement));

            if (!fullscreenElement) {
                setShowControls(true);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener(
                "webkitfullscreenchange",
                handleFullscreenChange
            );
            document.removeEventListener(
                "MSFullscreenChange",
                handleFullscreenChange
            );
        };
    }, []);

    const handleRestart = async () => {
        const video = videoRef.current;
        if (!video) return;

        if (hasError) {
            setHasError(false);
            setIsLoading(true);
            setIsPlaying(false);

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }

            try {
                video.pause();
                video.currentTime = 0;
                video.src = "";
                video.load();
            } catch { }

            setTimeout(() => loadStream(), 200);
        } else {
            try {
                video.currentTime = 0;
                if (!video.paused) await video.play();
            } catch { }
        }
        resetControlsTimeout();
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen && !isEmbedded) {
                onClose();
            } else if (event.key === " " && isOpen) {
                event.preventDefault();
                handlePlayPause();
            } else if (event.key === "f" && isOpen) {
                event.preventDefault();
                handleFullscreen();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            if (!isEmbedded) {
                document.body.style.overflow = "hidden";
            }
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (!isEmbedded) {
                document.body.style.overflow = "unset";
            }
        };
    }, [handleFullscreen, handlePlayPause, isEmbedded, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !videoRef.current) return;

        loadStream();

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [isOpen, loadStream]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            console.log('[Video] Play event');
            setIsPlaying(true);
        };

        const handlePause = () => {
            console.log('[Video] Pause event');
            setIsPlaying(false);
        };

        const handleError = (e: Event) => {
            console.error('[Video] Error event:', e);
            setIsLoading(false);
            setHasError(true);
            setIsPlaying(false);
            if (videoRef.current) {
                videoRef.current.pause();
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };

        const handleWaiting = () => {
            console.log('[Video] Waiting for data');
        };

        const handleCanPlay = () => {
            console.log('[Video] Can play');
        };

        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);
        video.addEventListener("error", handleError);
        video.addEventListener("waiting", handleWaiting);
        video.addEventListener("canplay", handleCanPlay);

        return () => {
            video.removeEventListener("play", handlePlay);
            video.removeEventListener("pause", handlePause);
            video.removeEventListener("error", handleError);
            video.removeEventListener("waiting", handleWaiting);
            video.removeEventListener("canplay", handleCanPlay);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const playerContent = (
        <div
            ref={playerContainerRef}
            className={`flex h-full w-full items-center justify-center overflow-hidden bg-black ${isFullscreen ? "" : "rounded-lg"
                }`}
        >
            <div
                className={`relative flex w-full items-center justify-center bg-black ${!isFullscreen && "aspect-video"
                    }`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                    if (isPlaying) {
                        setShowControls(false);
                    }
                }}
            >
                <video
                    ref={videoRef}
                    className="h-full w-full object-contain bg-black"
                    autoPlay
                    muted={isMuted}
                    playsInline
                    crossOrigin="anonymous"
                />

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-white">
                                    Loading Stream
                                </p>
                                <p className="text-sm text-slate-300 mt-1">Please wait...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-6 text-center max-w-md mx-4">
                            <div className="relative">
                                <div className="rounded-full bg-red-500/20 p-6">
                                    <X className="h-12 w-12 text-red-400" />
                                </div>
                                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    Stream Failed to Load
                                </h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    This channel is currently unavailable or there is a temporary
                                    issue. Check the console for details.
                                </p>
                            </div>
                            <button
                                onClick={handleRestart}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Controls Overlay */}
                <div
                    className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
                        }`}
                >
                    {/* Top Controls */}
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-medium text-white bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                                    LIVE
                                </span>
                            </div>
                            <h2 className="text-sm font-semibold text-white truncate max-w-xs">
                                {channelName}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Transfer to LiveStreamPlayer Button */}
                            <button
                                onClick={handleSendToLivePlayer}
                                className="flex items-center gap-2 rounded-lg bg-blue-600/80 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors backdrop-blur-sm shadow-lg border border-blue-400/30"
                                title="Send to Main Player"
                            >
                                <Radio className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">SEND TO LIVE PLAYER</span>
                            </button>

                            <button
                                onClick={handleMuteToggle}
                                className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </button>
                            {!isEmbedded && (
                                <button
                                    onClick={onClose}
                                    className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                    title="Close (ESC)"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePlayPause}
                                    className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                >
                                    {isPlaying ? (
                                        <Pause className="h-4 w-4" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                </button>

                                <button
                                    onClick={handleRestart}
                                    className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                    title="Restart"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </button>

                                <div className="flex items-center gap-2 ml-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) =>
                                            handleVolumeChange(parseFloat(e.target.value))
                                        }
                                        className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleFullscreen}
                                    className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                                    title="Fullscreen (F)"
                                >
                                    {isFullscreen ? (
                                        <Minimize className="h-4 w-4" />
                                    ) : (
                                        <Maximize className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isEmbedded) {
        return playerContent;
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="w-full h-full max-w-5xl max-h-[80vh] px-4 flex items-center">
                {playerContent}
            </div>
        </div>,
        document.body);
}