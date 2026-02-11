import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || "/";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
            {/* Background elements for premium feel */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-delay-1000" />

            <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl relative z-10">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                        <ShieldCheck size={32} />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            Tacta Pro
                        </CardTitle>
                        <CardDescription className="text-muted-foreground/80 font-medium">
                            Enter your credentials to access the analytics suite
                        </CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 animate-in fade-in zoom-in-95 duration-200">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="analyst_name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-background/30 border-border/40 h-11 focus:ring-primary/40 focus:border-primary/40 transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-background/30 border-border/40 h-11 focus:ring-primary/40 focus:border-primary/40 transition-all"
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button
                            className="w-full h-11 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <LogIn size={18} />
                                    Sign In
                                </span>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* Version info or footer link */}
            <div className="absolute bottom-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                Authorized Access Only • v2.4.0
            </div>
        </div>
    );
};

export default Login;
