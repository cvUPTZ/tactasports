import React from 'react';
import { Users, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SessionModeModalProps {
    onSelectMode: (mode: 'collab' | 'individual') => void;
}

export const SessionModeModal: React.FC<SessionModeModalProps> = ({ onSelectMode }) => {
    return (
        <div id="session-mode-modal" className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-3xl w-full bg-card shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center pb-8 border-b border-border/50">
                    <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
                        Select Session Mode
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Choose how you would like to work in this session.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 p-8">

                    {/* Collaboration Mode */}
                    <button
                        className="group relative flex flex-col items-center justify-center p-8 h-64 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-center space-y-4"
                        onClick={() => onSelectMode('collab')}
                    >
                        <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                            <Users size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">Collaboration</h3>
                            <p className="text-sm text-muted-foreground">
                                Join the Voice Room and collaborate with others in real-time.
                            </p>
                        </div>
                        <div className="absolute bottom-6 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                                Start Session <ArrowRight size={12} />
                            </span>
                        </div>
                    </button>

                    {/* Individual Mode */}
                    <button
                        className="group relative flex flex-col items-center justify-center p-8 h-64 border-2 border-border rounded-xl hover:border-muted-foreground/50 hover:bg-secondary/50 transition-all duration-200 text-center space-y-4"
                        onClick={() => onSelectMode('individual')}
                    >
                        <div className="p-4 rounded-full bg-secondary text-secondary-foreground group-hover:bg-muted-foreground group-hover:text-white transition-colors duration-200">
                            <User size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold group-hover:text-foreground transition-colors">Individual Work</h3>
                            <p className="text-sm text-muted-foreground">
                                Work offline or independently without voice features.
                            </p>
                        </div>
                        <div className="absolute bottom-6 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Enter Dashboard <ArrowRight size={12} />
                            </span>
                        </div>
                    </button>

                </CardContent>
            </Card>
        </div>
    );
};
