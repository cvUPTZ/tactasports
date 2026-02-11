import React from 'react';
import { Users, Play, Mic, MicOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VoicePeer {
    id: string;
    name: string;
    role: string;
}

interface AdminWaitingRoomProps {
    connectedPeers: VoicePeer[];
    onStartSession: () => void;
}

export const AdminWaitingRoom: React.FC<AdminWaitingRoomProps> = ({ connectedPeers, onStartSession }) => {
    return (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-card shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center border-b border-border/50 pb-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Waiting Room</CardTitle>
                    <CardDescription>
                        Waiting for testers to join the voice room.
                    </CardDescription>
                </CardHeader>

                <CardContent className="py-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            <span>Connected Users</span>
                            <span>{connectedPeers.length} Online</span>
                        </div>

                        <div className="bg-muted/30 rounded-lg border border-border/50 p-2 min-h-[120px] max-h-[200px] overflow-y-auto space-y-1">
                            {connectedPeers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8 opacity-50">
                                    <MicOff size={24} className="mb-2" />
                                    <span className="text-xs">No users connected yet...</span>
                                </div>
                            ) : (
                                connectedPeers.map((peer, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-card border border-border/50 shadow-sm animate-in slide-in-from-bottom-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                                            <Mic size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-foreground">{peer.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">{peer.role}</div>
                                            <div className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Connected
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/50 flex flex-col gap-3">
                    <Button
                        className="w-full gap-2 font-bold tracking-wide"
                        size="lg"
                        onClick={onStartSession}
                    >
                        <Play size={16} fill="currentColor" /> START SESSION
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                        You can start the session at any time. Late joiners can still connect.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};
