import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { IPTVCredentials } from "@/types/xtream";

interface IPTVAuthContextType {
    isConfigured: boolean;
    credentials: IPTVCredentials | null;
    configureIPTV: (credentials: IPTVCredentials) => void;
    clearConfiguration: () => void;
    isLoading: boolean;
}

const IPTVAuthContext = createContext<IPTVAuthContextType | undefined>(undefined);
const IPTV_STORAGE_KEY = "react-iptv-credentials";

export function IPTVAuthProvider({ children }: { children: ReactNode }) {
    const [isConfigured, setIsConfigured] = useState(false);
    const [credentials, setCredentials] = useState<IPTVCredentials | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedCredentials = localStorage.getItem(IPTV_STORAGE_KEY);
            if (storedCredentials) {
                const parsedCredentials = JSON.parse(storedCredentials);
                setCredentials(parsedCredentials);
                setIsConfigured(true);
            } else {
                // Auto-configure from .env if available
                const defaultStreamUrl = import.meta.env.VITE_DEFAULT_STREAM_URL;
                if (defaultStreamUrl) {
                    try {
                        const url = new URL(defaultStreamUrl);
                        const username = url.searchParams.get("username");
                        const password = url.searchParams.get("password");

                        if (username && password) {
                            // Force output=m3u8 for compatibility with Hls.js
                            url.searchParams.set("output", "m3u8");

                            const apiBase = `${url.protocol}//${url.host}/player_api.php`;
                            const autoCredentials = {
                                apiBase,
                                username,
                                password
                            };
                            setCredentials(autoCredentials);
                            setIsConfigured(true);
                            console.log("📺 IPTV Auto-configured from .env (Forced output=m3u8)");
                        }
                    } catch (e) {
                        console.error("❌ Failed to parse VITE_DEFAULT_STREAM_URL:", e);
                    }
                }
            }
        } catch {
            // Ignore parse errors
        } finally {
            setIsLoading(false);
        }
    }, []);

    const configureIPTV = (newCredentials: IPTVCredentials) => {
        setCredentials(newCredentials);
        setIsConfigured(true);
        try {
            localStorage.setItem(IPTV_STORAGE_KEY, JSON.stringify(newCredentials));
        } catch {
            // Ignore storage errors
        }
    };

    const clearConfiguration = () => {
        setCredentials(null);
        setIsConfigured(false);
        try {
            localStorage.removeItem(IPTV_STORAGE_KEY);
            localStorage.removeItem("react-iptv-categories-cache");
        } catch {
            // Ignore storage errors
        }
    };

    return (
        <IPTVAuthContext.Provider
            value={{
                isConfigured,
                credentials,
                configureIPTV,
                clearConfiguration,
                isLoading,
            }}
        >
            {children}
        </IPTVAuthContext.Provider>
    );
}

export function useIPTVAuth() {
    const context = useContext(IPTVAuthContext);
    if (context === undefined) {
        throw new Error("useIPTVAuth must be used within an IPTVAuthProvider");
    }
    return context;
}
