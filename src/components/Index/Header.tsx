// src/components/Index/Header.tsx - Application header with timer and controls
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Monitor, X, Wifi, WifiOff, Download, BarChart2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket as useSocketContext } from '@/contexts/SocketContext';
import { useMatchContext } from '@/contexts/MatchContext';
import { AnalysisMode } from '@/components/AnalysisModeSelector';
import { PostMatchAnalysisPanel } from '@/components/PostMatchAnalysisPanel';
import { EventMappingReference } from '@/components/EventMappingReference';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchFeedPopover } from './MatchFeedPopover';
import { LoggedEvent } from "@/hooks/useGamepad";

interface HeaderProps {
    matchTime: number;
    formatTime: (seconds: number) => string;
    onToggleMatch: () => void;
    onToggleWatchMatch: () => void;
    onTogglePiP: () => void;
    videoStream: MediaStream | null;
    pipWindow: Window | null;
    voiceLanguage: 'en' | 'fr' | 'ar';
    onVoiceLanguageChange: (lang: 'en' | 'fr' | 'ar') => void;
    isListening: boolean;
    onToggleListening: () => void;
    isSupported: boolean;
    isBroadcasting: boolean;
    onStartAudioBroadcast: () => void;
    onStopAudioBroadcast: () => void;
    remoteAudioStream: MediaStream | null;
    trackingMode: AnalysisMode;
    setTrackingMode: (mode: AnalysisMode) => void;
    onAnalysisComplete: (results: any) => void;
    events: LoggedEvent[];
    teamNames: { teamA: string, teamB: string };
    onUndoEvent?: (eventId: number) => void;
    onEventClick?: (event: LoggedEvent) => void;
}

export function Header({
    matchTime,
    formatTime,
    onToggleMatch,
    onToggleWatchMatch,
    onTogglePiP,
    videoStream,
    pipWindow,
    voiceLanguage,
    onVoiceLanguageChange,
    isListening,
    onToggleListening,
    isSupported,
    isBroadcasting,
    onStartAudioBroadcast,
    onStopAudioBroadcast,
    remoteAudioStream,
    trackingMode,
    setTrackingMode,
    onAnalysisComplete,
    events,
    teamNames,
    onUndoEvent,
    onEventClick,
}: HeaderProps) {
    const { user, role } = useAuth();
    const { isConnected, role: socketRole } = useSocketContext();
    const { isMatchActive } = useMatchContext();
    const navigate = useNavigate();

    return (
        <div className={`border-b border-border p-2 md:p-4 bg-card relative z-10 transition-colors duration-300 ${videoStream ? 'bg-black/40 backdrop-blur-sm border-white/10 text-white' : ''}`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                {/* Title & Connection Status */}
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                    <h1 className="flex items-center gap-2">
                        <img src="/logo.png" alt="Tacta" className="h-8 md:h-10 w-auto object-contain" />
                    </h1>

                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span className="hidden sm:inline">{isConnected ? 'Synced' : 'Offline'}</span>
                    </div>
                </div>

                {/* Match Timer */}
                <div className="flex items-center gap-2 md:gap-4 md:ml-8 md:border-l md:pl-8 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl md:text-3xl font-mono font-bold tabular-nums text-primary">
                            {formatTime(matchTime)}
                        </span>
                        <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Match Time</span>
                    </div>
                    <Button
                        variant={isMatchActive ? 'secondary' : 'default'}
                        size="sm"
                        onClick={onToggleMatch}
                        className="min-w-[80px] md:min-w-[120px] text-xs md:text-sm"
                    >
                        {isMatchActive ? 'Pause' : matchTime === 0 ? 'Start' : 'Resume'}
                    </Button>
                </div>

                {/* Analysis Mode & Controls - Centered or Near Title */}
                {(role === 'admin' || role === 'tactical_analyst' || role === 'quality_controller') && (
                    <div className="flex items-center gap-4 border-l pl-4 ml-4">
                        <Tabs
                            value={trackingMode}
                            onValueChange={(val) => setTrackingMode(val as AnalysisMode)}
                            className="w-auto"
                        >
                            <TabsList className="grid w-full grid-cols-2 h-8">
                                <TabsTrigger value="LIVE" className="text-xs px-3">Live</TabsTrigger>
                                <TabsTrigger value="POST_MATCH" className="text-xs px-3">Post-Match</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {trackingMode === 'POST_MATCH' && (role === 'admin' || role === 'tactical_analyst') && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2 h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md">
                                        <span className="text-lg">✨</span>
                                        New Analysis
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                    <DialogTitle>New Analysis</DialogTitle>
                                    <PostMatchAnalysisPanel
                                        onAnalysisComplete={(results) => {
                                            onAnalysisComplete(results);
                                            // Close dialog ideally, but for now just pass through
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex flex-wrap items-center gap-1 md:gap-2 w-full md:w-auto">


                    <MatchFeedPopover
                        events={events}
                        teamNames={teamNames}
                        onUndoEvent={onUndoEvent}
                        onEventClick={onEventClick}
                    />

                    {/* Analytics Button */}
                    {(role === 'admin' || role === 'tactical_analyst') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/analytics')}
                            className="gap-1 text-xs"
                            title="Go to Analytics Dashboard"
                        >
                            <BarChart2 className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </Button>
                    )}

                    {/* Event Mapping Reference */}
                    {(role === 'admin' || role === 'operational_analyst') && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-xs"
                                    title="View Event Mappings"
                                >
                                    <Zap className="h-3 w-3 md:h-4 md:w-4" />
                                    <span className="hidden sm:inline">Mappings</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                                <DialogTitle>Event Mapping Reference</DialogTitle>
                                <EventMappingReference mode="ALL" compact={false} />
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Watch Match Button */}
                    <Button
                        variant={videoStream ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={onToggleWatchMatch}
                        className="gap-1 text-xs"
                        title={videoStream ? 'Stop Watching' : 'Watch Match (HUD Mode)'}
                    >
                        {videoStream ? <X className="h-3 w-3 md:h-4 md:w-4" /> : <Monitor className="h-3 w-3 md:h-4 md:w-4" />}
                        <span className="hidden sm:inline">{videoStream ? 'Stop Match' : 'Watch Match'}</span>
                    </Button>

                    {/* Audio Broadcast Button */}
                    {socketRole === 'broadcaster' && (
                        <Button
                            variant={isBroadcasting ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={isBroadcasting ? onStopAudioBroadcast : onStartAudioBroadcast}
                            className="gap-1 text-xs"
                        >
                            {isBroadcasting ? <MicOff className="h-3 w-3 md:h-4 md:w-4 animate-pulse" /> : <Mic className="h-3 w-3 md:h-4 md:w-4" />}
                            <span className="hidden sm:inline">{isBroadcasting ? 'Broadcasting' : 'Broadcast Audio'}</span>
                        </Button>
                    )}

                    {socketRole === 'viewer' && remoteAudioStream && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                            <Mic className="w-3 h-3 animate-pulse" />
                            <span className="hidden sm:inline">Receiving Audio</span>
                        </div>
                    )}

                    {/* Pop Out Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onTogglePiP}
                        className="gap-1 text-xs hidden md:flex"
                        title={pipWindow ? 'Restore to Tab' : 'Pop Out Window'}
                    >
                        <Download className="h-3 w-3 md:h-4 md:w-4 rotate-180" />
                        <span className="hidden lg:inline">{pipWindow ? 'Restore' : 'Pop Out'}</span>
                    </Button>

                    {/* Voice Controls */}
                    {isSupported && (
                        <div className="flex items-center gap-1 md:gap-2">
                            <Select value={voiceLanguage} onValueChange={onVoiceLanguageChange}>
                                <SelectTrigger className="w-[70px] md:w-[100px] h-8 md:h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="fr">Français</SelectItem>
                                    <SelectItem value="ar">العربية</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant={isListening ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={onToggleListening}
                                className="gap-1 text-xs"
                            >
                                {isListening ? <MicOff className="h-3 w-3 md:h-4 md:w-4 animate-pulse" /> : <Mic className="h-3 w-3 md:h-4 md:w-4" />}
                                <span className="hidden sm:inline">{isListening ? 'Stop Voice' : 'Voice'}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
