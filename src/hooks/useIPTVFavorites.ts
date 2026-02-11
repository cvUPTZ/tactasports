import { useState, useCallback, useEffect } from "react";
import type { ChannelStream } from "@/types/xtream";

const FAVORITES_KEY = "react-iptv-favorites";

export function useIPTVFavorites() {
    const [favorites, setFavorites] = useState<number[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAVORITES_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    const saveFavorites = useCallback((newFavorites: number[]) => {
        setFavorites(newFavorites);
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        } catch {
            // Ignore storage errors
        }
    }, []);

    const isChannelFavorite = useCallback(
        (channelId: number) => favorites.includes(channelId),
        [favorites]
    );

    const toggleChannelFavorite = useCallback(
        (channelId: number) => {
            const newFavorites = favorites.includes(channelId)
                ? favorites.filter((id) => id !== channelId)
                : [...favorites, channelId];
            saveFavorites(newFavorites);
        },
        [favorites, saveFavorites]
    );

    const getFavoriteChannels = useCallback(
        (streams: ChannelStream[]) =>
            streams.filter((stream) => favorites.includes(stream.id)),
        [favorites]
    );

    return {
        favorites,
        isChannelFavorite,
        toggleChannelFavorite,
        getFavoriteChannels,
    };
}
