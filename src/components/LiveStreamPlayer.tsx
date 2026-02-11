import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Play, Pause, Volume2, Maximize,
    Monitor, Camera, Gamepad2, Radio, Loader2, AlertCircle,
    LinkIcon, Unlink, X, RefreshCw, ChevronDown, ChevronUp, Settings2,
    RotateCcw, RotateCw, Timer, Activity as ActivityIcon
} from 'lucide-react';
import { Toaster } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMatchContext } from '@/contexts/MatchContext';
import { toast } from "sonner";
import Hls from 'hls.js';
import { cn } from '@/lib/utils';
import { StatisticsDashboard } from './StatisticsDashboard';

// Feature flag to disable OBS integration
const OBS_ENABLED = false;

const SCENE_MAPPINGS: Record<string, string[]> = {
    "Game Capture": ["Game Capture", "Capture de jeu", "Game", "Jeu", "Game Capture Source"],
    "Camera Feed": ["Camera Feed", "Périphérique de capture vidéo", "Camera", "Caméra", "Video Capture Device"],
    "Display Capture": ["Display Capture", "Capture d'écran", "Screen", "Écran", "Display", "Monitor"]
};

import { DashboardWidget } from './common/DashboardWidget';
import { LayoutConfig } from '@/hooks/useDashboardLayout';

export interface LiveStreamPlayerRef {
    toggleRecording: () => Promise<void>;
    handleSourceSwitch: (sourceName: string) => Promise<void>;
}

export const LiveStreamPlayer = React.forwardRef<LiveStreamPlayerRef, {
    onClose?: () => void,
    events?: any[],
    showLiveToasts?: boolean,
    variant?: 'default' | 'streamlined',
    isEditMode?: boolean,
    layoutConfig?: LayoutConfig,
    onToggleVisibility?: (id: string) => void
}>(({ onClose, events = [], showLiveToasts = true, variant = 'default', isEditMode = false, layoutConfig = {}, onToggleVisibility }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);
    const obsRef = useRef<any>(null);
    const { socket } = useSocketContext();
    const { user } = useAuth();
    const {
        streamUrl, setStreamUrl, useStreamProxy, setUseStreamProxy,
        matchTime, currentPossession, events: allEvents
    } = useMatchContext();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    const isAdmin = user?.role === 'admin';

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLiveFeedback, setShowLiveFeedback] = useState(true);
    const hlsRef = useRef<Hls | null>(null);
    const lastSwitchedSceneRef = useRef<string | null>(null);
    const lastSwitchTimeRef = useRef<number>(0);

    // OBS State
    const [obsConnected, setObsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [obsAddress, setObsAddress] = useState(`ws://${window.location.hostname}:4455`);
    const [obsPassword, setObsPassword] = useState("");
    const [isConnectingObs, setIsConnectingObs] = useState(false);
    const [availableScenes, setAvailableScenes] = useState<string[]>([]);
    const [useProxy] = useState(window.location.protocol === 'https:');
    const [showObsSettings, setShowObsSettings] = useState(false);
    const proxyCallbacks = useRef<Map<string, {
        resolve: (val: any) => void,
        reject: (err: any) => void,
        timeout: NodeJS.Timeout
    }>>(new Map());

    /* ---------------------------------------------------------
       SOCKET CONNECTION MONITOR
    --------------------------------------------------------- */
    useEffect(() => {
        if (!socket) {
            console.warn('⚠️ Socket is null');
            return;
        }

        const onConnect = () => {
            console.log('✅ Socket connected:', socket.id);
        };

        const onConnectError = (err: any) => {
            console.error('❌ Socket connection error:', err);
            setError(`Socket connection error: ${err.message || 'Unknown error'}`);
        };

        const onDisconnect = (reason: string) => {
            console.warn('🔌 Socket disconnected:', reason);
            if (obsConnected) {
                setObsConnected(false);
                setIsRecording(false);
                setError('Socket disconnected. OBS connection lost.');
            }
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', onDisconnect);

        // Log current connection status
        console.log('📡 Socket status:', {
            connected: socket.connected,
            id: socket.id
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket, obsConnected]);

    /* ---------------------------------------------------------
       HLS STREAM INITIALIZATION - New IPTV Implementation
    --------------------------------------------------------- */
    useEffect(() => {
        const video = videoRef.current;
        console.log('🔄 Player useEffect triggered', {
            hasVideo: !!video,
            streamUrl,
            useStreamProxy,
            isLoading
        });

        if (!video || !streamUrl) {
            console.log('⚠️ Skipping player init: video or streamUrl missing');
            return;
        }

        setIsLoading(true);
        setError(null);

        // Determine the final URL to load
        let finalUrl = streamUrl;

        // Auto-enable proxy if on HTTPS and stream is HTTP
        const isPageHttps = window.location.protocol === 'https:';
        const isStreamHttp = streamUrl.startsWith('http:');

        // Detect massive playlists that shouldn't be loaded directly
        if (streamUrl.includes('type=m3u')) {
            setError("Playlist Mode: Please use the 'Channels' browser to select a specific live channel.");
            setIsLoading(false);
            return;
        }

        // Get stream origin for headers
        let streamOrigin = "";
        try {
            const streamUrlObj = new URL(streamUrl);
            streamOrigin = streamUrlObj.origin;
        } catch {
            streamOrigin = "http://tgrpro25.xyz:8080";
        }

        // Force proxy for live streams to avoid strict CORS from providers
        const shouldProxy = true;

        if (shouldProxy) {
            const rawBase = (import.meta as any).env.VITE_API_BASE_URL;
            const baseUrl = rawBase && !rawBase.includes('localhost') ? rawBase : window.location.origin;

            finalUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(streamUrl)}`;
            console.log('🛡️ Using CORS Proxy for stream (Auto-detected if HTTPS):', finalUrl);

            if (isPageHttps && isStreamHttp && !useStreamProxy) {
                console.log('🔄 Auto-switching to proxy due to Mixed Content (HTTPS -> HTTP)');
                setUseStreamProxy(true);
            }
        } else {
            console.log('🌐 Loading stream DIRECTLY (No Proxy):', finalUrl);
        }

        if (Hls.isSupported()) {
            console.log('📦 Initializing HLS.js with new IPTV config...');
            if (hlsRef.current) {
                console.log('🗑️ Destroying old HLS instance');
                hlsRef.current.destroy();
            }

            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 5,
                debug: import.meta.env.DEV,
                xhrSetup: (xhr, url) => {
                    const shouldProxy = useStreamProxy || (isPageHttps && url.startsWith('http:'));

                    if (shouldProxy) {
                        let finalXhrUrl = url;

                        // If URL is not pointing to our proxy, make it so
                        if (url && !url.includes("/api/proxy")) {
                            const rawBase = (import.meta as any).env.VITE_API_BASE_URL;
                            const baseUrl = rawBase && !rawBase.includes('localhost') ? rawBase : window.location.origin;
                            finalXhrUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(url)}`;

                            // Use a trick to change the request URL for XHR
                            const originalOpen = xhr.open;
                            xhr.open = function () {
                                const args = Array.prototype.slice.call(arguments);
                                args[1] = finalXhrUrl;
                                return originalOpen.apply(this, args as any);
                            };
                        }
                    }

                    // Set headers for upstream server via proxy
                    try {
                        xhr.setRequestHeader(
                            "User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
                        );
                        xhr.setRequestHeader("Accept", "*/*");
                        if (streamOrigin) {
                            xhr.setRequestHeader("Referer", `${streamOrigin}/`);
                        }
                    } catch (e) {
                        // Headers may fail in some contexts
                    }
                },
            });

            hls.loadSource(finalUrl);
            hls.attachMedia(video);
            hlsRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ HLS Manifest Parsed Success');
                video.play().catch((e) => {
                    console.log("Autoplay blocked/failed:", e.message);
                });
                setIsLoading(false);
                setIsPlaying(true);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('❌ HLS Error Event:', data.type, data.details, data.fatal);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error("Fatal network error - recovering...");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("Fatal media error - recovering...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("Unrecoverable error - destroying");
                            hls.destroy();
                            hlsRef.current = null;
                            setError(`Video Stream Error: ${data.details}`);
                            setIsLoading(false);
                            setIsPlaying(false);
                            break;
                    }
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('🍎 Initializing Native Safari HLS...');
            video.src = finalUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play();
                setIsLoading(false);
                setIsPlaying(true);
            });
        } else {
            console.error('🚫 HLS is NOT supported in this browser');
            setError("Your browser does not support HLS playback.");
            setIsLoading(false);
        }

        return () => {
            if (hlsRef.current) {
                console.log('♻️ Cleaning up HLS on effect exit');
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [streamUrl, useStreamProxy]);



    /* ---------------------------------------------------------
       OBS CONNECTION - IMPROVED ERROR HANDLING
    --------------------------------------------------------- */
    const connectToOBS = async () => {
        console.log('=== CONNECT TO OBS STARTED ===');
        console.log('Socket connected:', socket?.connected);
        console.log('OBS Address:', obsAddress);
        console.log('Has Password:', !!obsPassword);
        console.log('Use Proxy:', useProxy);

        setIsConnectingObs(true);
        setError(null);

        try {
            // Validate inputs first
            if (!obsAddress.trim()) {
                throw new Error("OBS address is required");
            }

            if (useProxy) {
                if (!socket || !socket.connected) {
                    throw new Error("Socket connection not available. Please refresh the page and try again.");
                }

                console.log('📤 Emitting obs-proxy-connect event...');
                socket.emit('obs-proxy-connect', {
                    address: obsAddress.trim(),
                    password: obsPassword
                });

                console.log('✅ obs-proxy-connect event emitted successfully');

                // Set a connection timeout
                const connectionTimeout = setTimeout(() => {
                    console.error('⏰ OBS connection timeout triggered');
                    if (isConnectingObs) {
                        setError("OBS connection timeout. Please check if OBS is running and the WebSocket server is enabled.");
                        setIsConnectingObs(false);
                    }
                }, 15000); // 15 second timeout for initial connection

                // Store timeout to clear it later
                (window as any).__obsConnectionTimeout = connectionTimeout;

            } else {
                throw new Error("Direct OBS connection requires HTTP. Please use the proxy mode or switch to HTTP.");
            }

        } catch (err: any) {
            console.error("=== CONNECT TO OBS FAILED ===");
            setError(`Failed to connect to OBS: ${err.message || "Unknown error"}`);
            setIsConnectingObs(false);
        }
    };

    const refreshScenes = async (silent = false) => {
        if (!obsConnected) return;
        try {
            if (!silent) console.log('🔄 Refreshing OBS scene list...');
            const response = await callOBS("GetSceneList");
            if (response && response.scenes) {
                const sceneNames = response.scenes.map((s: any) => s.sceneName);
                setAvailableScenes(sceneNames);
                if (!silent) {
                    console.log('📋 Available OBS Scenes:', sceneNames);
                    toast.success("Scene list updated", { duration: 2000 });
                }
                return sceneNames;
            }
        } catch (err) {
            console.warn('Failed to fetch OBS scenes:', err);
            if (!silent) toast.error("Failed to refresh scenes");
        }
        return [];
    };

    // Improved Proxy Event Listeners
    useEffect(() => {
        if (!socket) {
            console.warn('⚠️ Socket not available for OBS listeners');
            return;
        }

        const onConnected = async ({ address }: { address: string }) => {
            console.log("✅ Connected to OBS via Proxy:", address);

            // Clear connection timeout
            if ((window as any).__obsConnectionTimeout) {
                clearTimeout((window as any).__obsConnectionTimeout);
                delete (window as any).__obsConnectionTimeout;
            }

            setObsConnected(true);
            setIsConnectingObs(false);
            setError(null);

            // Fetch available scenes
            await refreshScenes(true);

            // Save settings on successful connection
            try {
                localStorage.setItem('obsAddress', obsAddress);
                localStorage.setItem('obsPassword', obsPassword);
            } catch (e) {
                console.warn('Failed to save OBS settings to localStorage:', e);
            }

            toast.success("OBS Connected Successfully");
        };

        const onDisconnected = () => {
            console.log("❌ OBS Proxy Disconnected");
            setObsConnected(false);
            setIsRecording(false);
            obsRef.current = null;

            // Clear all pending callbacks
            proxyCallbacks.current.forEach(({ timeout, reject }) => {
                clearTimeout(timeout);
                reject(new Error("OBS disconnected"));
            });
            proxyCallbacks.current.clear();

            toast.error("OBS Disconnected");
        };

        const onError = ({ message, code, requestId }: {
            message?: string,
            code?: string,
            requestId?: string
        }) => {
            console.error("❌ OBS Proxy Error:", { message, code, requestId });

            // Clear connection timeout
            if ((window as any).__obsConnectionTimeout) {
                clearTimeout((window as any).__obsConnectionTimeout);
                delete (window as any).__obsConnectionTimeout;
            }

            if (requestId && proxyCallbacks.current.has(requestId)) {
                const callback = proxyCallbacks.current.get(requestId);
                if (callback) {
                    clearTimeout(callback.timeout);
                    callback.reject(new Error(message || 'OBS request failed'));
                    proxyCallbacks.current.delete(requestId);
                }
            } else {
                let displayMessage = message || 'An unknown error occurred';
                if (code === 'ECONNREFUSED') displayMessage = 'Cannot connect to OBS. Check if OBS is running and WebSocket is enabled.';
                else if (code === 'ETIMEDOUT') displayMessage = 'Connection timeout. Check OBS address and firewall.';

                setError(`OBS Error: ${displayMessage}`);
                setIsConnectingObs(false);
                toast.error(displayMessage);
            }
        };

        const onProxyEvent = ({ event, data }: { event: string, data: any }) => {
            console.log('📡 OBS Event:', event, data);
            if (event === 'RecordStateChanged') {
                const newState = data.outputActive;
                setIsRecording(newState);
                toast.success(newState ? "Recording started" : "Recording stopped");
            } else if (event === 'SceneListChanged' || event === 'SceneNameChanged') {
                refreshScenes(true);
            }
        };

        const onProxyResponse = ({ response, requestId }: { response: any, requestId: string }) => {
            if (proxyCallbacks.current.has(requestId)) {
                const callback = proxyCallbacks.current.get(requestId);
                if (callback) {
                    clearTimeout(callback.timeout);
                    callback.resolve(response);
                    proxyCallbacks.current.delete(requestId);
                }
            }
        };

        socket.on('obs-proxy-connected', onConnected);
        socket.on('obs-proxy-disconnected', onDisconnected);
        socket.on('obs-proxy-error', onError);
        socket.on('obs-proxy-event', onProxyEvent);
        socket.on('obs-proxy-response', onProxyResponse);

        return () => {
            socket.off('obs-proxy-connected', onConnected);
            socket.off('obs-proxy-disconnected', onDisconnected);
            socket.off('obs-proxy-error', onError);
            socket.off('obs-proxy-event', onProxyEvent);
            socket.off('obs-proxy-response', onProxyResponse);
        };
    }, [socket, obsAddress, obsPassword, obsConnected]);

    const callOBS = async (requestType: string, requestData?: any): Promise<any> => {
        if (!obsConnected) throw new Error("OBS not connected");
        if (!socket || !socket.connected) throw new Error("Socket connection lost");

        const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (proxyCallbacks.current.has(requestId)) {
                    proxyCallbacks.current.delete(requestId);
                    reject(new Error(`OBS request timeout: ${requestType}`));
                }
            }, 15000);

            proxyCallbacks.current.set(requestId, { resolve, reject, timeout });
            socket.emit('obs-proxy-call', { requestType, requestData, requestId });
        });
    };

    const disconnectOBS = async () => {
        if (socket) socket.emit('obs-proxy-disconnect');
        setObsConnected(false);
        setIsRecording(false);
        obsRef.current = null;
        proxyCallbacks.current.forEach(({ timeout }) => clearTimeout(timeout));
        proxyCallbacks.current.clear();
    };

    const toggleRecording = async () => {
        if (!obsConnected) return toast.error("OBS not connected");
        try {
            if (isRecording) {
                await callOBS("StopRecord");
                setIsRecording(false);
            } else {
                await callOBS("StartRecord");
                setIsRecording(true);
            }
        } catch (err: any) {
            const msg = `Recording error: ${err.message || "Unknown error"}`;
            setError(msg);
            toast.error(msg);
        }
    };

    const handleSourceSwitch = async (sourceName: string) => {
        if (!obsConnected) {
            toast.error("OBS not connected");
            return;
        }

        // UI Guard: Prevent double-triggering or loops
        const now = Date.now();
        if (lastSwitchedSceneRef.current === sourceName && (now - lastSwitchTimeRef.current) < 2000) {
            console.log(`⚠️ Guard: Skipping redundant switch to "${sourceName}"`);
            return;
        }

        lastSwitchedSceneRef.current = sourceName;
        lastSwitchTimeRef.current = now;

        try {
            const variations = SCENE_MAPPINGS[sourceName] || [sourceName];
            let targetScene = "";
            let currentScenes = availableScenes;

            // Step 0: If scene list is empty, refresh it
            if (currentScenes.length === 0) {
                currentScenes = await refreshScenes(true);
            }

            console.log(`🔍 Attempting switch for: ${sourceName} (Variations: ${variations.join(', ')})`);

            const findMatch = (scenes: string[]) => {
                // 1. Direct Match
                for (const v of variations) {
                    const match = scenes.find(s => s.toLowerCase() === v.toLowerCase());
                    if (match) return match;
                }
                // 2. Partial Match
                for (const v of variations) {
                    const match = scenes.find(s => s.toLowerCase().includes(v.toLowerCase()));
                    if (match) return match;
                }
                return "";
            };

            targetScene = findMatch(currentScenes);

            // Step 3: If still no match, refresh and try one more time
            if (!targetScene) {
                console.log('🧐 No match in current list. Refreshing scenes and retrying...');
                currentScenes = await refreshScenes(true);
                targetScene = findMatch(currentScenes);
            }

            // Step 4: Fallback - Search inside scenes for sources
            if (!targetScene) {
                console.log('🔎 Searching within scene items...');
                toast.loading("Scanning OBS for matching source...", { duration: 2000 });
                for (const sceneName of currentScenes) {
                    try {
                        const response = await callOBS("GetSceneItemList", { sceneName });
                        if (response && response.sceneItems) {
                            for (const item of response.sceneItems) {
                                const itemName = (item.sourceName || item.itemName) as string;
                                const isMatch = variations.some(v =>
                                    itemName.toLowerCase() === v.toLowerCase() ||
                                    itemName.toLowerCase().includes(v.toLowerCase())
                                );
                                if (isMatch) {
                                    targetScene = sceneName;
                                    console.log(`✨ Found source match "${itemName}" in scene "${sceneName}"`);
                                    break;
                                }
                            }
                        }
                    } catch (err) { /* ignore */ }
                    if (targetScene) break;
                }
            }

            // Step 5: Verify targetScene is actually a scene
            if (targetScene && !currentScenes.includes(targetScene)) {
                targetScene = currentScenes.find(s => s.toLowerCase() === targetScene.toLowerCase()) || "";
            }

            if (!targetScene) {
                throw new Error(`Could not find a scene mapped to "${sourceName}". Available: ${currentScenes.join(', ')}`);
            }

            console.log(`🔄 Finalizing OBS switch to scene: ${targetScene}`);
            await callOBS("SetCurrentProgramScene", { sceneName: targetScene });
            toast.success(`Switched to scene: ${targetScene}`);
        } catch (err: any) {
            console.error(`Failed to switch to ${sourceName}:`, err);
            let displayMsg = err.message || "Unknown error";
            if (displayMsg.includes("is not a scene")) displayMsg = `Target "${sourceName}" is not a valid OBS scene.`;
            toast.error(`Switch error: ${displayMsg}`);
        }
    };

    React.useImperativeHandle(ref, () => ({
        toggleRecording,
        handleSourceSwitch
    }));

    /* ---------------------------------------------------------
       LOAD SAVED OBS SETTINGS
    --------------------------------------------------------- */
    useEffect(() => {
        try {
            const savedAddress = localStorage.getItem('obsAddress');
            const savedPassword = localStorage.getItem('obsPassword');
            if (savedAddress) setObsAddress(savedAddress);
            if (savedPassword) setObsPassword(savedPassword);
        } catch (e) { /* ignore */ }
    }, []);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) video.pause();
        else video.play();
    };

    const handleVolumeChange = (values: number[]) => {
        const video = videoRef.current;
        if (!video) return;
        const vol = values[0];
        video.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const toggleFullscreen = () => {
        const container = fullscreenContainerRef.current;
        if (!container) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else container.requestFullscreen();
    };

    const seek = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, video.currentTime + seconds);
    };

    const lastEvent = allEvents[0];
    const [showEventOverlay, setShowEventOverlay] = useState(false);

    useEffect(() => {
        if (lastEvent) {
            setShowEventOverlay(true);
            const timer = setTimeout(() => setShowEventOverlay(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastEvent?.id]);

    if (variant === 'streamlined') {
        return (
            <div
                ref={fullscreenContainerRef}
                className="relative w-full h-full bg-black group overflow-hidden"
            >
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted={isMuted}
                    playsInline
                    crossOrigin="anonymous"
                />

                {/* Fullscreen Toaster */}
                {showLiveFeedback && <Toaster position="top-center" expand={true} richColors closeButton />}

                {/* Event Name Overlay (Top Left) */}
                {showLiveFeedback && showEventOverlay && lastEvent && (
                    <div className="absolute top-6 left-6 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="bg-black/60 backdrop-blur-xl border border-primary/40 rounded-xl p-4 shadow-2xl flex items-center gap-4">
                            <div className="bg-primary/20 p-2.5 rounded-lg border border-primary/30">
                                <ActivityIcon className="w-6 h-6 text-primary animate-pulse" />
                            </div>
                            <div>
                                <div className="text-[10px] text-primary font-bold uppercase tracking-widest leading-none mb-1">Last Action</div>
                                <div className="text-xl font-black text-white uppercase tracking-tight leading-none italic">
                                    {lastEvent.eventName.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                    {lastEvent.player?.name ? `#${lastEvent.player.id} ${lastEvent.player.name}` : lastEvent.team.replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics Dashboard Overlay */}
                <DashboardWidget
                    id="live-stats"
                    label="Live Stats Overlay"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['live-stats']?.hidden}
                    onToggleVisibility={onToggleVisibility}
                    className="absolute top-4 left-4 z-[45]"
                >
                    <StatisticsDashboard events={events} isOverlay={true} />
                </DashboardWidget>

                {/* Match Timer & Chain Overlay (Top Right) */}
                <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                        <Timer className="w-4 h-4 text-primary" />
                        <span className="text-2xl font-mono font-bold text-white tracking-widest leading-none">
                            {formatTime(matchTime || 0)}
                        </span>
                    </div>

                    {currentPossession && currentPossession.passCount > 0 && (
                        <div className="bg-primary/95 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 border border-primary animate-in fade-in slide-in-from-right-4">
                            <Gamepad2 className="w-3.5 h-3.5 text-white" />
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                {currentPossession.passCount} PASSES
                            </span>
                            <div className="w-px h-3 bg-white/30 mx-1" />
                            <span className="text-[10px] text-white/80 font-medium">
                                {currentPossession.buildUpSpeed || 'MEDIUM'} SPEED
                            </span>
                        </div>
                    )}
                </div>

                {/* Streamlined Controls Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-between p-4 z-40">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest text-white uppercase">Live Stream</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-white hover:bg-white/20 hover:scale-110 transition-transform"
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:text-white"
                                onClick={() => seek(-5)}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:text-white"
                                onClick={() => seek(5)}
                            >
                                <RotateCw className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 flex-1 px-2">
                            <Volume2 className="w-5 h-5 text-slate-300" />
                            <Slider
                                value={[volume]}
                                max={1}
                                step={0.01}
                                onValueChange={handleVolumeChange}
                                className="w-full cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {onClose && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-10 w-10 text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-10 w-10 transition-all", showLiveFeedback ? "text-primary" : "text-white/40")}
                                onClick={() => setShowLiveFeedback(!showLiveFeedback)}
                                title="Toggle Live Feedback"
                            >
                                <Radio className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-white hover:bg-white/20 transition-all"
                                onClick={toggleFullscreen}
                            >
                                <Maximize className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Loading/Error states for streamlined mode */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center">
                        <div className="space-y-2">
                            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                            <p className="text-xs text-slate-300">{error}</p>
                            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className="w-full max-w-4xl mx-auto bg-slate-900 text-white border-slate-800">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Radio className="w-6 h-6 text-red-500" />
                        Live Stream Player
                    </h2>
                    <div className="flex items-center gap-2">
                        {streamUrl && isPlaying && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
                        {obsConnected && isRecording && <Badge variant="destructive" className="bg-red-600 animate-pulse">REC</Badge>}
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="stream-url" className="text-slate-400 uppercase text-xs font-bold tracking-wider flex items-center gap-2">
                                <Settings2 className="w-3 h-3 text-blue-400" />
                                Stream Configuration
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="stream-url"
                                    value={streamUrl}
                                    onChange={(e) => setStreamUrl(e.target.value)}
                                    placeholder="Paste your .m3u8 or .ts link here..."
                                    className="bg-slate-950 border-slate-800 h-9 text-xs flex-1 shadow-inner focus:border-blue-500/50 transition-colors"
                                />
                                <Button size="sm" variant="outline" className="h-9 px-3 text-[10px] border-slate-700 hover:bg-slate-800" onClick={() => setStreamUrl("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8")}>
                                    Test Link
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-blue-900/10 border border-blue-500/20 rounded-md px-3 py-2">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] h-4 bg-blue-500/10 text-blue-400 border-blue-500/30">CORS Bypass</Badge>
                                    <Label className="text-[11px] font-bold text-slate-300">Enable Stream Proxy</Label>
                                </div>
                                <p className="text-[9px] text-slate-500">Enable if the video fails to load or shows a "CORS" error.</p>
                            </div>
                            <Switch
                                checked={useStreamProxy}
                                onCheckedChange={setUseStreamProxy}
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>

                        {OBS_ENABLED && (
                            <div className="border-t border-slate-800/50 pt-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowObsSettings(!showObsSettings)}
                                    className="w-full flex items-center justify-between h-8 px-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Monitor className={`w-3.5 h-3.5 ${obsConnected ? 'text-green-500' : 'text-slate-600'}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">OBS Integration (Optional)</span>
                                    </div>
                                    {showObsSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>

                                {showObsSettings && (
                                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] text-slate-500 uppercase font-semibold">WebSocket Connection</Label>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={obsConnected ? "default" : "outline"} className={`text-[9px] px-1.5 h-4 ${obsConnected ? "bg-green-600 border-none" : "text-slate-500 border-slate-800"}`}>
                                                    {obsConnected ? "Connected" : "Disconnected"}
                                                </Badge>
                                                <Badge variant={socket?.connected ? "default" : "outline"} className={`text-[9px] px-1.5 h-4 ${socket?.connected ? "bg-blue-600 border-none" : "text-slate-500 border-slate-800"}`}>
                                                    Socket: {socket?.connected ? "OK" : "Error"}
                                                </Badge>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="bg-red-900/10 border border-red-500/20 rounded p-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-[10px] text-red-400 whitespace-pre-line leading-relaxed">{error}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 text-[9px] text-red-400 hover:bg-red-500/10">Dismiss</Button>
                                                            <Button variant="ghost" size="sm" onClick={() => { setError(null); connectToOBS(); }} className="h-6 text-[9px] text-red-400 hover:bg-red-500/10 font-bold">Retry</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="obs-address" className="text-[9px] text-slate-500 ml-1">WebSocket Address</Label>
                                                <Input id="obs-address" value={obsAddress} onChange={(e) => setObsAddress(e.target.value)} placeholder="ws://localhost:4455" className="bg-slate-950 border-slate-800 h-8 text-xs focus:ring-1 focus:ring-slate-700" disabled={obsConnected || isConnectingObs} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="obs-password" className="text-[9px] text-slate-500 ml-1">Password</Label>
                                                <Input id="obs-password" type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="Optional" className="bg-slate-950 border-slate-800 h-8 text-xs focus:ring-1 focus:ring-slate-700" disabled={obsConnected || isConnectingObs} />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 border-t border-slate-800 pt-3">
                                            <Button onClick={obsConnected ? disconnectOBS : connectToOBS} disabled={isConnectingObs} variant={obsConnected ? "destructive" : "default"} className="flex-1 h-8 text-xs font-bold uppercase tracking-wider">
                                                {isConnectingObs ? <><Loader2 className="w-3 h-3 animate-spin mr-2" />Connecting...</> : obsConnected ? <><Unlink className="w-3 h-3 mr-2" />Disconnect</> : <><LinkIcon className="w-3 h-3 mr-2" />Connect OBS</>}
                                            </Button>
                                            {obsConnected && (
                                                <Button onClick={toggleRecording} variant={isRecording ? "destructive" : "outline"} className="flex-1 h-8 text-xs font-bold uppercase tracking-wider border-red-500/30 text-red-400 hover:bg-red-950/20">
                                                    <Radio className={`w-3 h-3 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                                                    {isRecording ? "Stop Record" : "Start Record"}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                                <Label className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Quick Select Scenes</Label>
                                                <Button variant="ghost" size="sm" onClick={() => refreshScenes()} className="h-5 text-[9px] text-slate-500 hover:text-white" disabled={!obsConnected}>
                                                    <RefreshCw className="w-2.5 h-2.5 mr-1" /> Sync
                                                </Button>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button variant="outline" size="sm" className="h-7 text-[9px] flex-1 border-slate-800 hover:bg-slate-800" disabled={!obsConnected} onClick={() => handleSourceSwitch("Game Capture")}>
                                                    <Gamepad2 className="w-3 h-3 mr-1.5" /> Game
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-7 text-[9px] flex-1 border-slate-800 hover:bg-slate-800" disabled={!obsConnected} onClick={() => handleSourceSwitch("Camera Feed")}>
                                                    <Camera className="w-3 h-3 mr-1.5" /> Camera
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-7 text-[9px] flex-1 border-slate-800 hover:bg-slate-800" disabled={!obsConnected} onClick={() => handleSourceSwitch("Display Capture")}>
                                                    <Monitor className="w-3 h-3 mr-1.5" /> Screen
                                                </Button>
                                            </div>

                                            {obsConnected && availableScenes.length > 0 && (
                                                <div className="flex gap-1.5 flex-wrap pt-1">
                                                    {availableScenes.map(sceneName => (
                                                        <Button key={sceneName} variant="ghost" size="sm" className="h-6 px-2 text-[9px] bg-slate-950 border border-slate-800/50 hover:bg-slate-800 whitespace-nowrap" onClick={() => handleSourceSwitch(sceneName)}>
                                                            {sceneName}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div ref={fullscreenContainerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-2xl group">
                    <video ref={videoRef} className="w-full h-full object-contain" playsInline />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20" disabled={isLoading}>
                                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </Button>
                            <div className="flex items-center gap-2 flex-1">
                                <Volume2 className="w-4 h-4 text-slate-300" />
                                <Slider value={[volume]} max={1} step={0.1} onValueChange={handleVolumeChange} className="w-24" />
                            </div>
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                                <Maximize className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Video Player Section */}
            </CardContent>
        </Card>
    );
});

LiveStreamPlayer.displayName = "LiveStreamPlayer";