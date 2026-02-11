import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from './index';
import { useAnnotations } from '@/hooks/useAnnotations';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationInteractionLayer } from './AnnotationInteractionLayer';
import { DrawingTool } from './AnnotationToolbar';
import { PlayerTracker } from './PlayerTracker';
import { CalibrationInterface } from './CalibrationInterface';
import { Button } from '@/components/ui/button';
import { Pen, X } from 'lucide-react';
import { LoggedEvent, QuickSelectorState } from '@/hooks/useGamepad';
import { TeamRoster } from '@/types/player';
import { TacticalAnnotationSidebar } from './TacticalAnnotationSidebar';
import { cn } from '@/lib/utils';
import { LayoutConfig } from '@/hooks/useDashboardLayout';

interface AnnotatedVideoPlayerProps {
    videoFile: File | null;
    videoUrl?: string | null;
    events: LoggedEvent[];
    onTimeUpdate: (currentTime: number) => void;
    onEventMarkerClick?: (event: LoggedEvent) => void;
    seekTo?: number | null;
    isPlaying?: boolean;
    onPlayPause?: (isPlaying: boolean) => void;
    onSeekComplete?: () => void;
    onSeek?: (time: number) => void;
    axes?: number[];
    buttons?: GamepadButton[];
    teams?: Map<string, TeamRoster>;
    selectedTeam?: string;
    teamNames?: { teamA: string; teamB: string };
    onPlayerSelect?: (playerId: number) => void;
    trackingData?: any; // AI tracking data
    quickSelectorState?: QuickSelectorState;
    timelineVariant?: 'minimal' | 'pro';
    showLiveToasts?: boolean;
    analysisMode?: 'LIVE' | 'POST_MATCH';
    isEditMode?: boolean;
    layoutConfig?: LayoutConfig;
    onToggleVisibility?: (id: string) => void;
}

export const AnnotatedVideoPlayer: React.FC<AnnotatedVideoPlayerProps> = (props) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [showAnnotationMode, setShowAnnotationMode] = useState(false);
    const [showPlayerTracker, setShowPlayerTracker] = useState(false);
    const [activeTool, setActiveTool] = useState<DrawingTool>('select');
    const [annotationColor, setAnnotationColor] = useState('#FF0000');
    const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState(3);
    const [trackingData, setTrackingData] = useState<any>(props.trackingData);
    const [showCalibration, setShowCalibration] = useState(false);
    const [videoDimensions, setVideoDimensions] = useState({ width: 1920, height: 1080 });
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract actual video/image dimensions from the file and create local URL
    useEffect(() => {
        if (!props.videoFile) {
            setLocalVideoUrl(null);
            return;
        }

        const isImage = props.videoFile.type.startsWith('image/');
        const url = URL.createObjectURL(props.videoFile);
        setLocalVideoUrl(url); // Store the URL for CalibrationInterface

        if (isImage) {
            const img = new Image();
            img.onload = () => {
                setVideoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = url;
        } else {
            const video = document.createElement('video');
            video.onloadedmetadata = () => {
                setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
            };
            video.src = url;
        }

        // Cleanup: revoke URL when file changes or component unmounts
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [props.videoFile]);

    // Sync tracking data from props
    useEffect(() => {
        if (props.trackingData) {
            setTrackingData(props.trackingData);
        }
    }, [props.trackingData]);

    const {
        annotations,
        activeAnnotations,
        calibration,
        addAnnotation,
        deleteAnnotation,
        clearAnnotations,
        addCalibrationPair,
        removeLastCalibrationPair,
        setCalibrationPairs,
        clearCalibration,
        exportAnnotations,
        importAnnotations,
    } = useAnnotations(currentTime);

    const handleTimeUpdate = useCallback((time: number) => {
        setCurrentTime(time);
        props.onTimeUpdate(time);
    }, [props.onTimeUpdate]);

    const handleExport = () => {
        const json = exportAnnotations();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotations.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const json = e.target?.result as string;
            importAnnotations(json);
        };
        reader.readAsText(file);
    };

    const handleTrackPlayer = (playerId: number, points: Array<{ time: number; x: number; y: number }>) => {
        addAnnotation({
            type: 'player-track',
            startTime: points[0].time,
            endTime: points[points.length - 1].time,
            data: {
                playerId,
                points,
                manual: true,
            },
            style: {
                color: annotationColor,
                strokeWidth: annotationStrokeWidth,
                opacity: 0.8,
            },
        });
        setShowPlayerTracker(false);
    };

    const handleUndo = () => {
        if (annotations.length > 0) {
            deleteAnnotation(annotations[annotations.length - 1].id);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-full">
            {/* Base Video Player */}
            <VideoPlayer
                {...props}
                currentTime={currentTime}
                timelineVariant={props.timelineVariant}
                onTimeUpdate={handleTimeUpdate}
                onAnalysisComplete={(data) => setTrackingData(data)}
                showLiveToasts={props.showLiveToasts}
                analysisMode={props.analysisMode}
                isEditMode={props.isEditMode}
                layoutConfig={props.layoutConfig}
                onToggleVisibility={props.onToggleVisibility}
            />

            {/* Annotation Canvas Overlay (Existing Annotations) */}
            {showAnnotationMode && (
                <AnnotationCanvas
                    annotations={activeAnnotations}
                    videoWidth={videoDimensions.width}
                    videoHeight={videoDimensions.height}
                    calibrationMatrix={calibration.matrix}
                    calibrationPoints={calibration.pairs.map(p => p.src)}
                    onAnnotationClick={(id) => console.log('Clicked annotation:', id)}
                />
            )}

            {/* Interaction Layer (Drawing) */}
            {showAnnotationMode && activeTool !== 'select' && activeTool !== 'calibration' && !showPlayerTracker && (
                <AnnotationInteractionLayer
                    activeTool={activeTool}
                    color={annotationColor}
                    strokeWidth={annotationStrokeWidth}
                    videoWidth={videoDimensions.width}
                    videoHeight={videoDimensions.height}
                    currentTime={currentTime}
                    calibration={calibration}
                    onAddAnnotation={addAnnotation}
                />
            )}

            {/* Calibration Interface Modal */}
            {showCalibration && (
                <CalibrationInterface
                    videoUrl={localVideoUrl || props.videoUrl}
                    isImage={props.videoFile?.type.startsWith('image/') ?? false}
                    currentTime={currentTime}
                    currentPairs={calibration.pairs}
                    onAddPair={addCalibrationPair}
                    onRemoveLast={removeLastCalibrationPair}
                    onClear={clearCalibration}
                    onClose={() => setShowCalibration(false)}
                />
            )}

            {/* Player Tracker */}
            {showPlayerTracker && (
                <PlayerTracker
                    trackingData={trackingData}
                    currentTime={currentTime}
                    videoWidth={1920}
                    videoHeight={1080}
                    onTrackPlayer={handleTrackPlayer}
                    onClose={() => setShowPlayerTracker(false)}
                />
            )}

            {/* Annotation Sidebar */}
            {showAnnotationMode && !showPlayerTracker && (
                <TacticalAnnotationSidebar
                    activeTool={activeTool}
                    onToolChange={(tool) => {
                        if (tool === 'calibration') {
                            setShowCalibration(true);
                        } else {
                            setActiveTool(tool);
                            if (tool === 'player-track') {
                                setShowPlayerTracker(true);
                            }
                        }
                    }}
                    color={annotationColor}
                    onColorChange={setAnnotationColor}
                    strokeWidth={annotationStrokeWidth}
                    onStrokeWidthChange={setAnnotationStrokeWidth}
                    onClear={clearAnnotations}
                    onUndo={handleUndo}
                    onExport={handleExport}
                    onImport={handleImport}
                />
            )}

            {/* Annotation Mode Toggle - Redesigned */}
            {!showCalibration && !showPlayerTracker && (
                <Button
                    variant={showAnnotationMode ? 'default' : 'secondary'}
                    onClick={() => setShowAnnotationMode(!showAnnotationMode)}
                    className={cn(
                        "absolute top-6 left-1/2 -translate-x-1/2 z-40 h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border",
                        showAnnotationMode
                            ? "bg-red-500 hover:bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/20"
                            : "bg-slate-900/80 hover:bg-slate-800 border-white/10 text-white backdrop-blur-md"
                    )}
                >
                    {showAnnotationMode ? (
                        <>
                            <X className="w-4 h-4 mr-2" />
                            Exit Design Mode
                        </>
                    ) : (
                        <>
                            <Pen className="w-4 h-4 mr-2 text-cyan-400" />
                            Tactical Layers
                        </>
                    )}
                </Button>
            )}
        </div>
    );
};
