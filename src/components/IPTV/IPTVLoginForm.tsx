import { useState, type FormEvent } from "react";
import {
    Eye,
    EyeOff,
    Lock,
    User,
    AlertCircle,
    Server,
    Globe,
    Settings,
} from "lucide-react";
import { useIPTVAuth } from "@/contexts/IPTVAuthContext";
import type { IPTVCredentials } from "@/types/xtream";

export function IPTVLoginForm() {
    const [apiBase, setApiBase] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [sessionCookie, setSessionCookie] = useState("");
    const [userAgent, setUserAgent] = useState("");
    const [streamReferer, setStreamReferer] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { configureIPTV } = useIPTVAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (!apiBase.trim() || !username.trim() || !password.trim()) {
                setError("API Base URL, username, and password are required");
                return;
            }

            try {
                new URL(apiBase);
            } catch {
                setError("Please enter a valid API Base URL");
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, 300));

            const credentials: IPTVCredentials = {
                apiBase: apiBase.trim(),
                username: username.trim(),
                password: password.trim(),
                sessionCookie: sessionCookie.trim() || undefined,
                userAgent: userAgent.trim() || undefined,
                streamReferer: streamReferer.trim() || undefined,
            };

            configureIPTV(credentials);
        } catch (err) {
            setError("An error occurred while saving configuration");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card/40 backdrop-blur-md rounded-xl border border-border/50 p-6 shadow-2xl max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-4">
                    <Settings className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                    IPTV Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                    Configure your Xtream Codes IPTV service
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="apiBase" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        API Base URL *
                    </label>
                    <div className="relative">
                        <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            id="apiBase"
                            type="url"
                            value={apiBase}
                            onChange={(e) => setApiBase(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                            placeholder="http://server.com:8080/player_api.php"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="username" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Username *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                placeholder="Username"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Password *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 pr-10 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                placeholder="Password"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="button"
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline mb-2"
                        onClick={() => {
                            const el = document.getElementById('advanced-options');
                            if (el) el.classList.toggle('hidden');
                        }}
                    >
                        Advanced Options
                    </button>

                    <div id="advanced-options" className="hidden space-y-4 pt-2 border-t border-border/30">
                        <div>
                            <label htmlFor="sessionCookie" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                Session Cookie
                            </label>
                            <input
                                id="sessionCookie"
                                type="text"
                                value={sessionCookie}
                                onChange={(e) => setSessionCookie(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                placeholder="capp_name_session=..."
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="userAgent" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                User Agent
                            </label>
                            <input
                                id="userAgent"
                                type="text"
                                value={userAgent}
                                onChange={(e) => setUserAgent(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                placeholder="Mozilla/5.0..."
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="streamReferer" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                Stream Referer
                            </label>
                            <input
                                id="streamReferer"
                                type="url"
                                value={streamReferer}
                                onChange={(e) => setStreamReferer(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
                                placeholder="http://server.com/"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !apiBase || !username || !password}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-white text-sm font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-[0.98]"
                >
                    {isLoading ? "Configuring..." : "Save Configuration"}
                </button>
            </form>
        </div>
    );
}
