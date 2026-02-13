import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Mic, MicOff, Play, Pause,
    ChevronDown, X, Settings,
    Save, RotateCcw, Layout, HelpCircle
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SequenceAssistantCompact } from '@/components/SequenceAssistant';
import { ViewType } from '@/components/AppSidebar';
import { cn } from '@/lib/utils';
import type { AnalysisMode } from '@/components/AnalysisModeSelector';

interface DashboardHeaderProps {
    userRole?: string;
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
    hasPermission: (permission: string) => boolean;
    trackingMode: AnalysisMode;
    setTrackingMode: (mode: AnalysisMode) => void;
    isMatchActive: boolean;
    toggleMatch: () => void;
    matchTime: number;
    formatTime: (seconds: number) => string;
    voiceLanguage: 'en' | 'fr' | 'ar';
    setVoiceLanguage: (lang: 'en' | 'fr' | 'ar') => void;
    isListening: boolean;
    toggleListening: () => void;
    isInRoom: boolean;
    joinVoiceRoom: () => void;
    leaveVoiceRoom: () => void;
    toggleMute: () => void;
    isMuted: boolean;
    peersCount: number;
    isEditMode: boolean;
    setIsEditMode: (mode: boolean) => void;
    saveLayout: () => void;
    resetLayout: () => void;
    onStartGuide?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userRole,
    activeView,
    setActiveView,
    hasPermission,
    trackingMode,
    setTrackingMode,
    isMatchActive,
    toggleMatch,
    matchTime,
    formatTime,
    voiceLanguage,
    setVoiceLanguage,
    isListening,
    toggleListening,
    isInRoom,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    isMuted,
    peersCount,
    isEditMode,
    setIsEditMode,
    saveLayout,
    resetLayout,
    onStartGuide
}) => {
    return (
        <div id="dashboard-header" className="h-12 border-b bg-card/95 backdrop-blur-md flex items-center px-4 select-none z-50 shrink-0 gap-4 justify-between shadow-sm">
            <div className="flex items-center gap-3">
                {userRole !== 'eye_spotter' && <SidebarTrigger className="h-8 w-8" />}
                <div className="h-4 w-px bg-border/60" />
                <div className="flex flex-col">
                    <h1 className="font-bold text-sm tracking-tight uppercase text-primary">
                        {activeView}
                    </h1>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none font-medium">Session Live</span>
                </div>
            </div>

            {/* Match Control */}
            <div className="flex items-center gap-2">
                <div id="analysis-mode-selector" className="flex items-center bg-muted/50 rounded-md p-0.5 border border-border/50 shadow-inner">
                    {hasPermission('dashboard.live.view') && (
                        <Button
                            variant={trackingMode === 'LIVE' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 text-[10px] px-2.5 rounded transition-all"
                            onClick={() => setTrackingMode('LIVE')}
                        >
                            LIVE
                        </Button>
                    )}
                    {hasPermission('dashboard.post.view') && (
                        <Button
                            variant={trackingMode === 'POST_MATCH' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-6 text-[10px] px-2.5 rounded transition-all"
                            onClick={() => setTrackingMode('POST_MATCH')}
                        >
                            POST-MATCH
                        </Button>
                    )}
                </div>

                <div id="match-timer-section" className="flex items-center gap-2 bg-card px-3 py-0.5 rounded-md border border-border shadow-sm">
                    <span className={`font-mono font-bold text-base min-w-[70px] text-center ${isMatchActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {formatTime(matchTime)}
                    </span>
                    <Button
                        size="icon"
                        className={`h-6 w-6 rounded-full shadow-sm transition-colors ${isMatchActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        onClick={toggleMatch}
                    >
                        {isMatchActive ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <SequenceAssistantCompact className="hidden md:flex" />

                {/* Language & Voice */}
                <div className="flex items-center gap-1.5">
                    <div className="relative group">
                        <select
                            className="h-7 pl-2 pr-6 bg-muted/50 border border-border rounded text-[11px] font-medium focus:outline-none appearance-none cursor-pointer hover:bg-muted transition-colors"
                            value={voiceLanguage}
                            onChange={(e) => setVoiceLanguage(e.target.value as any)}
                        >
                            <option value="en">EN</option>
                            <option value="fr">FR</option>
                            <option value="ar">AR</option>
                        </select>
                        <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-1.5 top-2 pointer-events-none group-hover:text-foreground" />
                    </div>

                    {hasPermission('dashboard.live.voice') && (
                        <Button
                            id="voice-commands-btn"
                            variant={isListening ? "default" : "outline"}
                            size="sm"
                            className={`h-7 gap-1.5 px-2 transition-all text-[11px] ${isListening ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-md animate-pulse' : 'text-muted-foreground'}`}
                            onClick={toggleListening}
                        >
                            {isListening ? <Mic size={12} /> : <MicOff size={12} />}
                            <span className="hidden lg:inline">Voice Cmd</span>
                        </Button>
                    )}

                    {/* Voice Room Controls */}
                    <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5 border border-border/50">
                        {!isInRoom ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={joinVoiceRoom}
                            >
                                <MicOff size={12} /> Join Room
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant={isMuted ? "destructive" : "secondary"}
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                                </Button>
                                <div className="px-2 text-[9px] font-mono text-primary flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    {peersCount + 1} User{peersCount !== 0 && 's'}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={leaveVoiceRoom}
                                >
                                    <X size={12} />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Layout Controls */}
                <div className="flex items-center gap-1">
                    {isEditMode ? (
                        <>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-green-400 hover:text-green-300 hover:bg-green-400/10" onClick={saveLayout}>
                                <Save className="h-4 w-4" /> <span className="hidden xl:inline">Save</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={resetLayout}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-white" onClick={() => setIsEditMode(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <Button id="layout-edit-btn" variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", isEditMode && "text-primary bg-primary/10")} onClick={() => setIsEditMode(true)}>
                            <Layout className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="h-4 w-px bg-border/60" />

                <Button id="settings-btn" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setActiveView('settings')}>
                    <Settings className="h-4 w-4" />
                </Button>

                {onStartGuide && (
                    <Button
                        id="help-button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                        onClick={onStartGuide}
                        title="Start Visual Guide"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};
