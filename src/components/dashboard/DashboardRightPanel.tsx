import React from 'react';
import { toast } from 'sonner';
import { LayoutTemplate } from 'lucide-react';
import { DashboardWidget } from '@/components/common/DashboardWidget';
import { LoggerAuditPanel } from '@/components/LoggerAuditPanel';
import { PredictorStats } from '@/components/SequenceAssistant';
import { EventLog } from '@/components/EventLog';
import { PlayerSelectionSidebar } from '@/components/PlayerSelectionSidebar';
import { CrowdReviewPanel } from '@/components/CrowdReviewPanel';
import { SafetyBoundary } from '@/components/common/SafetyBoundary';
import { LoggedEvent } from '@/hooks/useGamepad';
import { LayoutConfig } from '@/hooks/useDashboardLayout';
import { TeamRoster } from '@/types/player';
import type { AnalysisMode } from '@/components/AnalysisModeSelector';

interface DashboardRightPanelProps {
    userRole?: string;
    isEditMode: boolean;
    layoutConfig: LayoutConfig;
    toggleComponentVisibility: (id: string) => void;
    // Data
    events: LoggedEvent[];
    setEvents: React.Dispatch<React.SetStateAction<LoggedEvent[]>>;
    teams: Map<string, TeamRoster>;
    selectedTeam: string;
    teamNames: { teamA: string; teamB: string };
    // Actions
    onPlayerSelect: (playerId: number) => void;
    // State
    trackingMode: AnalysisMode;
    useVideoMode: boolean;
    videoFile: File | null;
    videoTime: number;
    lastEventButtonLabel?: string | null;
}

export const DashboardRightPanel: React.FC<DashboardRightPanelProps> = ({
    userRole,
    isEditMode,
    layoutConfig,
    toggleComponentVisibility,
    events,
    setEvents,
    teams,
    selectedTeam,
    teamNames,
    onPlayerSelect,
    trackingMode,
    useVideoMode,
    videoFile,
    videoTime,
    lastEventButtonLabel
}) => {
    // Only show for non-eyespotters (logic from Index.tsx)
    if (userRole === 'eye_spotter') return null;

    return (
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-3 h-full min-h-0">
            {userRole === 'logger' ? (
                <DashboardWidget
                    id="logger-audit"
                    label="Logger Audit"
                    isEditMode={isEditMode}
                    isHidden={layoutConfig['logger-audit']?.hidden}
                    onToggleVisibility={toggleComponentVisibility}
                    className="flex-1"
                >
                    <LoggerAuditPanel
                        systemEvents={events}
                        onExport={() => toast.success("Audit Report Exported")}
                    />
                </DashboardWidget>
            ) : (
                <>
                    <DashboardWidget
                        id="predictor-stats"
                        label="Prediction Engine"
                        isEditMode={isEditMode}
                        isHidden={layoutConfig['predictor-stats']?.hidden}
                        onToggleVisibility={toggleComponentVisibility}
                        className="shrink-0"
                    >
                        <PredictorStats className="shrink-0" />
                    </DashboardWidget>

                    <DashboardWidget
                        id="event-log"
                        label="Event Log"
                        isEditMode={isEditMode}
                        isHidden={layoutConfig['event-log']?.hidden}
                        onToggleVisibility={toggleComponentVisibility}
                        className="flex-1 min-h-0"
                    >
                        <div id="event-log-container" className="h-full">
                            <SafetyBoundary name="EventLog">
                                <EventLog
                                    events={events}
                                    onUndoEvent={(id) => {
                                        setEvents(prev => prev.filter(e => e.id !== id));
                                        toast.success("Event removed from log");
                                    }}
                                    onMissedEvent={() => {
                                        const newEvent: LoggedEvent = {
                                            id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                                            timestamp: new Date().toISOString(),
                                            eventName: "missed_event",
                                            team: selectedTeam as any || "TEAM_A",
                                            buttonLabel: "LOGGER",
                                            isMissed: true,
                                            mode: trackingMode as any
                                        };
                                        setEvents(prev => [...prev, newEvent]);
                                        toast.warning("Missed event recorded in audit log");
                                    }}
                                    onToggleDelay={(eventId: number) => {
                                        setEvents(prev => prev.map(e =>
                                            e.id === eventId ? { ...e, isDelayed: !e.isDelayed } : e
                                        ));
                                        toast.info("Event delay flag toggled");
                                    }}
                                    teamNames={teamNames}
                                />
                            </SafetyBoundary>
                        </div>
                    </DashboardWidget>

                    <DashboardWidget
                        id="right-panel-bottom"
                        label="Context & Review"
                        isEditMode={isEditMode}
                        isHidden={layoutConfig['right-panel-bottom']?.hidden}
                        onToggleVisibility={toggleComponentVisibility}
                        className="flex-1 min-h-0 overflow-y-auto pl-1 no-scrollbar"
                    >
                        <div id="context-review-section" className="h-full">
                            {teams.get(selectedTeam) ? (
                                <SafetyBoundary name="PlayerSelectionSidebar">
                                    <PlayerSelectionSidebar
                                        players={teams.get(selectedTeam)!.PlayerData}
                                        selectedPlayerId={null}
                                        onSelectPlayer={onPlayerSelect}
                                        teamName={selectedTeam}
                                    />
                                </SafetyBoundary>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 border border-dashed rounded-lg bg-card/30">
                                    <LayoutTemplate className="w-8 h-8 mb-2" />
                                    <span className="text-[10px] font-medium text-center">Select a team<br />to view roster</span>
                                </div>
                            )}

                            {useVideoMode && trackingMode === 'POST_MATCH' && (
                                <CrowdReviewPanel
                                    videoFile={videoFile}
                                    currentVideoTime={videoTime}
                                    matchName={Array.from(teams.keys()).join(' vs ') || 'Unknown Match'}
                                    preSelectedEvent={lastEventButtonLabel}
                                />
                            )}
                        </div>
                    </DashboardWidget>
                </>
            )}
        </div>
    );
};
