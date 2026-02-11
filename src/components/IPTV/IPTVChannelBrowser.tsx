import { useMemo, useState, useCallback, useEffect } from "react";
import { AlertCircle, RefreshCw, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IPTVVideoPlayerArea } from "./IPTVVideoPlayerArea";
import { IPTVCategoriesSidebar } from "./IPTVCategoriesSidebar";
import { IPTVChannelListPanel } from "./IPTVChannelListPanel";
import { IPTVMobileControls } from "./IPTVMobileControls";
import { useIPTVAuth } from "@/contexts/IPTVAuthContext";
import type { ChannelCategory, ChannelStream, IPTVCredentials } from "@/types/xtream";
import { useMatchContext } from "@/contexts/MatchContext";
import { useAuth } from "@/contexts/AuthContext";

const CACHE_KEY = "react-iptv-categories-cache";
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheData {
    categories: ChannelCategory[];
    timestamp: number;
    credentialsHash: string;
}

import { API_BASE_URL } from "@/utils/apiConfig";

// Xtream API client functions
const buildXtreamUrl = (
    searchParams: Record<string, string | number>,
    credentials: IPTVCredentials
) => {
    const url = new URL(credentials.apiBase);
    const params = new URLSearchParams({
        username: credentials.username,
        password: credentials.password,
        ...Object.fromEntries(
            Object.entries(searchParams).map(([key, value]) => [key, String(value)])
        ),
    });
    url.search = params.toString();

    // Route through our proxy to avoid CORS
    const proxiedUrl = `${API_BASE_URL}/api/proxy?url=${encodeURIComponent(url.toString())}`;
    return proxiedUrl;
};

const normaliseStreams = (
    streams: any[],
    credentials: IPTVCredentials
): ChannelStream[] => {
    const baseUrl = new URL(credentials.apiBase);
    const origin = `${baseUrl.protocol}//${baseUrl.host}`;

    return streams
        .map((stream) => {
            const streamType = stream.stream_type?.toLowerCase() ?? "live";
            const extension = streamType === "live" ? "m3u8" : "mp4";
            const folder = streamType === "live" ? "live" : "movie";
            const streamUrl = `${origin}/${folder}/${credentials.username}/${credentials.password}/${stream.stream_id}.${extension}`;

            return {
                id: stream.stream_id,
                name: stream.name,
                streamType,
                streamIcon: stream.stream_icon ?? null,
                added: stream.added,
                streamUrl,
            };
        })
        .sort((a, b) =>
            a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
        );
};

export function IPTVChannelBrowser() {
    const { credentials, isConfigured } = useIPTVAuth();
    const { setStreamUrl, setUseVideoMode, setVideoMode } = useMatchContext();
    const { user } = useAuth();
    const [categories, setCategories] = useState<ChannelCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const orderedCategories = useMemo(
        () =>
            [...categories].sort((a, b) =>
                a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
            ),
        [categories]
    );

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
        orderedCategories[0]?.id ?? ""
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [showChannelFavorites, setShowChannelFavorites] = useState(false);
    const [selectedStream, setSelectedStream] = useState<ChannelStream | null>(
        null
    );
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChannelListOpen, setIsChannelListOpen] = useState(false);
    const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
    const [isChannelPanelCollapsed, setIsChannelPanelCollapsed] = useState(false);

    const credentialsHash = useMemo(() => {
        if (!credentials) return "";
        return btoa(JSON.stringify(credentials)).slice(0, 16);
    }, [credentials]);

    const loadCategories = useCallback(
        async (forceRefresh = false) => {
            if (!credentials) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Check cache first
                if (!forceRefresh) {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const cacheData: CacheData = JSON.parse(cached);
                        const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
                        const isSameCredentials =
                            cacheData.credentialsHash === credentialsHash;

                        if (
                            !isExpired &&
                            isSameCredentials &&
                            cacheData.categories.length > 0
                        ) {
                            setCategories(cacheData.categories);
                            if (cacheData.categories.length > 0 && !selectedCategoryId) {
                                setSelectedCategoryId(cacheData.categories[0].id);
                            }
                            setIsLoading(false);
                            return;
                        }
                    }
                }

                // 1. Fetch live categories
                const categoryUrl = buildXtreamUrl(
                    { action: "get_live_categories" },
                    credentials
                );

                // 2. Fetch all live streams at once (Much faster than sequential)
                const streamsUrl = buildXtreamUrl(
                    { action: "get_live_streams" },
                    credentials
                );

                console.log("🚀 Optimizing IPTV loading: Fetching categories and all streams in parallel...");

                const [categoryResponse, streamsResponse] = await Promise.all([
                    fetch(categoryUrl),
                    fetch(streamsUrl)
                ]);

                if (!categoryResponse.ok || !streamsResponse.ok) {
                    throw new Error("Failed to fetch IPTV data");
                }

                const [rawCategories, rawStreams] = await Promise.all([
                    categoryResponse.json(),
                    streamsResponse.json()
                ]);

                console.log(`✅ Fetched ${rawCategories.length} categories and ${rawStreams.length} streams`);

                // 3. Group streams by category_id for efficient lookup
                const streamsByCategory: Record<string, any[]> = {};
                rawStreams.forEach((stream: any) => {
                    const catId = stream.category_id;
                    if (!streamsByCategory[catId]) {
                        streamsByCategory[catId] = [];
                    }
                    streamsByCategory[catId].push(stream);
                });

                // 4. Create the final categories list
                const categoriesWithStreams: ChannelCategory[] = rawCategories
                    .map((category: any, index: number) => {
                        const streams = streamsByCategory[category.category_id] || [];
                        return {
                            id: category.category_id,
                            name: category.category_name,
                            parentId: category.parent_id,
                            order: Number.parseInt(category.category_id, 10) || index,
                            streams: normaliseStreams(streams, credentials),
                        };
                    })
                    .filter((cat: ChannelCategory) => cat.streams.length > 0);

                const sortedCategories = categoriesWithStreams.sort((a, b) =>
                    a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
                );

                // Save to cache
                const cacheData: CacheData = {
                    categories: sortedCategories,
                    timestamp: Date.now(),
                    credentialsHash,
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                setCategories(sortedCategories);

                if (sortedCategories.length > 0 && !selectedCategoryId) {
                    setSelectedCategoryId(sortedCategories[0].id);
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Error loading categories"
                );
            } finally {
                setIsLoading(false);
            }
        },
        [credentials, selectedCategoryId, credentialsHash]
    );

    useEffect(() => {
        if (isConfigured && credentials) {
            loadCategories();
        } else {
            setIsLoading(false);
        }
    }, [loadCategories, isConfigured, credentials]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => {
            const next = !prev;
            if (next) setIsChannelListOpen(false);
            return next;
        });
    }, []);

    const toggleChannelList = useCallback(() => {
        setIsChannelListOpen((prev) => {
            const next = !prev;
            if (next) setIsSidebarOpen(false);
            return next;
        });
    }, []);

    const selectedCategory = useMemo(() => {
        if (!selectedCategoryId) return orderedCategories[0];
        return (
            orderedCategories.find(
                (category) => category.id === selectedCategoryId
            ) ?? orderedCategories[0]
        );
    }, [orderedCategories, selectedCategoryId]);

    const activeStreamId = selectedStream?.id ?? null;
    const totals = useMemo(
        () => ({
            totalStreams: categories.reduce(
                (acc, category) => acc + category.streams.length,
                0
            ),
            totalCategories: categories.length,
        }),
        [categories]
    );

    const handlePlayStream = useCallback((stream: ChannelStream) => {
        setSelectedStream(stream);
        setIsPlayerOpen(true);
        setIsChannelListOpen(false);

        // Synchronize for all collaborative roles if user is admin
        if (user?.role === 'admin') {
            setStreamUrl(stream.streamUrl);
            setVideoMode('live');
            setUseVideoMode(true);
            toast.success(`Broadcasting channel: ${stream.name}`);
        }
    }, [user, setStreamUrl, setVideoMode, setUseVideoMode]);

    const handleClosePlayer = useCallback(() => {
        setIsPlayerOpen(false);
        setSelectedStream(null);
    }, []);

    if (!isConfigured) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center max-w-md mx-4">
                    <div className="rounded-full bg-slate-500/20 p-6 mb-6 mx-auto w-fit">
                        <Tv className="h-12 w-12 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-4">
                        IPTV Not Configured
                    </h2>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        Please configure your IPTV service credentials to access channels.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">Loading IPTV data...</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadCategories(true)}
                        className="text-xs"
                    >
                        Force Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center max-w-md mx-4">
                    <div className="rounded-full bg-red-500/20 p-6 mb-6 mx-auto w-fit">
                        <AlertCircle className="h-12 w-12 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-4">
                        IPTV Data Failed to Load
                    </h2>
                    <p className="text-slate-300 mb-6 leading-relaxed">{error}</p>
                    <button
                        onClick={() => loadCategories(true)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors mx-auto"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
                <div className="text-center max-w-md mx-4">
                    <div className="rounded-full bg-slate-500/20 p-6 mb-6 mx-auto w-fit">
                        <Tv className="h-12 w-12 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-4">
                        No Categories Found
                    </h2>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        Your IPTV service doesn't have any categories or you don't have access.
                    </p>
                    <button
                        onClick={() => loadCategories(true)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors mx-auto"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-slate-950 lg:flex-row">
            <IPTVMobileControls
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
                onToggleChannelList={toggleChannelList}
            />

            {/* Sidebar Overlay (Mobile) */}
            {(isSidebarOpen || isChannelListOpen) && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => {
                        setIsSidebarOpen(false);
                        setIsChannelListOpen(false);
                    }}
                />
            )}

            <IPTVCategoriesSidebar
                categories={orderedCategories}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={(categoryId) => {
                    setSelectedCategoryId(categoryId);
                    setSearchTerm("");
                    setIsSidebarOpen(false);
                }}
                isSidebarOpen={isSidebarOpen}
                isMenuCollapsed={isMenuCollapsed}
                onToggleMenuCollapsed={() => setIsMenuCollapsed(!isMenuCollapsed)}
                totals={totals}
            />

            <IPTVChannelListPanel
                selectedCategory={selectedCategory}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                showChannelFavorites={showChannelFavorites}
                onToggleChannelFavorites={() =>
                    setShowChannelFavorites(!showChannelFavorites)
                }
                isChannelPanelCollapsed={isChannelPanelCollapsed}
                onToggleChannelPanelCollapsed={() =>
                    setIsChannelPanelCollapsed(!isChannelPanelCollapsed)
                }
                onPlayStream={handlePlayStream}
                activeStreamId={activeStreamId}
            />

            <IPTVVideoPlayerArea
                selectedStream={selectedStream}
                isPlayerOpen={isPlayerOpen}
                onClosePlayer={handleClosePlayer}
            />
        </div>
    );
}
