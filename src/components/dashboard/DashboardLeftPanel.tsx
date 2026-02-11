import React from 'react';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from '@/components/common/DashboardWidget';
import { SpotterPingPanel } from '@/components/SpotterPingPanel';
import { PlayerUpload } from '@/components/PlayerUpload';
import { TeamGrid } from '@/components/TeamGrid';
import { ButtonMappingConfig } from '@/components/ButtonMappingConfig';
import { ControllerMappingsGrid } from '@/components/ControllerMappingsGrid';
import { KeyboardShortcutsGrid } from '@/components/KeyboardShortcutsGrid';
import { TeamRoster } from '@/types/player';
import type { AnalysisMode } from '@/components/AnalysisModeSelector';
import { LayoutConfig } from '@/hooks/useDashboardLayout';

interface DashboardLeftPanelProps {
    userRole?: string;
    isEditMode: boolean;
    layoutConfig: LayoutConfig;
    toggleComponentVisibility: (id: string) => void;
    // Team Props
    teams: Map<string, TeamRoster>;
    selectedTeam: string;
    onTeamUpload: (teams: Map<string, TeamRoster>) => void;
    onSelectTeam: (teamId: string) => void;
    // Tagger Props
    trackingMode: AnalysisMode;
    keyboardBuffer: string;
    showMappings: boolean;
    mappings: Record<string, string>;  // FIXED: Changed from GamepadButtonMapping[]
    pressedButtons: Set<string>;  // FIXED: Changed from number[]
    onUpdateMapping: (button: string, action: string) => void;  // FIXED: Changed parameters from (index: number, eventName: string)
    onResetMappings: () => void;
    handleGameEvent: (eventName: string, source?: string) => void;
    // Local Edit Mode for mappings
    isEditingMode: boolean;
    setIsEditingMode: (mode: boolean) => void;
    hasPermission: (permission: string) => boolean;
}

export const DashboardLeftPanel: React.FC<DashboardLeftPanelProps> = ({
    userRole,
    isEditMode,
    layoutConfig,
    toggleComponentVisibility,
    teams,
    selectedTeam,
    onTeamUpload,
    onSelectTeam,
    trackingMode,
    keyboardBuffer,
    showMappings,
    mappings,
    pressedButtons,
    onUpdateMapping,
    onResetMappings,
    handleGameEvent,
    isEditingMode,
    setIsEditingMode,
    hasPermission
}) => {
    return (
        <div className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col gap-3 h-full min-h-0">
            {userRole === 'eye_spotter' ? (
                <DashboardWidget
                    id="spotter-panel"
                    label="Spotter Panel"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['spotter-panel']?.hidden}
                    onToggleVisibility={toggleComponentVisibility}
                    className="h-full"
                >
                    <SpotterPingPanel />
                </DashboardWidget>
            ) : (
                <DashboardWidget
                    id="left-tools"
                    label="Team Tools"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['left-tools']?.hidden}
                    onToggleVisibility={toggleComponentVisibility}
                    className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 no-scrollbar"
                >
                    {userRole !== 'live_tagger' && <PlayerUpload onUpload={onTeamUpload} />}
                    {teams.size > 0 && <TeamGrid teams={Array.from(teams.keys())} selectedTeam={selectedTeam} onSelectTeam={onSelectTeam} />}

                    {trackingMode === 'LIVE' && keyboardBuffer && (
                        <div className="bg-black/90 border border-primary p-2 rounded-lg text-center shadow-lg">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Voice Buffer</span>
                            <div className="text-2xl font-mono font-bold text-primary mt-0.5">#{keyboardBuffer}</div>
                        </div>
                    )}

                    {showMappings && (trackingMode === 'LIVE' || trackingMode === 'POST_MATCH') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                            {trackingMode === 'POST_MATCH' && hasPermission('dashboard.post.edit') && (
                                <Button variant={isEditingMode ? "secondary" : "outline"} size="sm" className="w-full h-7 text-[11px]" onClick={() => setIsEditingMode(!isEditingMode)}>
                                    {isEditingMode ? "Exit Edit" : "Edit Events"}
                                </Button>
                            )}
                            {trackingMode === 'LIVE' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Overlays</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-7 px-2 gap-2 text-[10px] font-bold uppercase transition-all",
                                                    layoutConfig['live-stats']?.hidden ? "text-slate-500" : "text-cyan-400 bg-cyan-400/10"
                                                )}
                                                onClick={() => toggleComponentVisibility('live-stats')}
                                            >
                                                <Radio className="h-3 w-3" />
                                                Live Stats
                                            </Button>
                                        </div>
                                        <ButtonMappingConfig
                                            mappings={mappings}
                                            pressedButtons={pressedButtons}
                                            onUpdateMapping={onUpdateMapping}
                                            onResetMappings={onResetMappings}
                                        />
                                    </div>
                                    <ControllerMappingsGrid
                                        onButtonPress={(eventName, button) => handleGameEvent(eventName, button)}
                                        pressedButtons={pressedButtons}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="px-1 flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Overlays</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2 gap-2 text-[10px] font-bold uppercase transition-all",
                                                layoutConfig['live-stats']?.hidden ? "text-slate-500" : "text-cyan-400 bg-cyan-400/10"
                                            )}
                                            onClick={() => toggleComponentVisibility('live-stats')}
                                        >
                                            <Radio className="h-3 w-3" />
                                            Live Stats
                                        </Button>
                                    </div>
                                    <KeyboardShortcutsGrid onKeyPress={(eventName, key) => handleGameEvent(eventName, `Key:${key}`)} />
                                </div>
                            )}
                        </div>
                    )}
                </DashboardWidget>
            )}
        </div>
    );
};
