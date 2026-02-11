import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radio, Activity, Target, Gamepad2, Mouse, Keyboard } from 'lucide-react';

export type AnalysisMode = 'LIVE' | 'POST_MATCH';

interface AnalysisModeSelectorProps {
    mode: AnalysisMode;
    onModeChange: (mode: AnalysisMode) => void;
    disabled?: boolean;
    hasEvents?: boolean;
}

export function AnalysisModeSelector({
    mode,
    onModeChange,
    disabled = false,
    hasEvents = false
}: AnalysisModeSelectorProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingMode, setPendingMode] = useState<AnalysisMode | null>(null);

    const handleModeChange = (newMode: AnalysisMode) => {
        if (hasEvents && newMode !== mode) {
            setPendingMode(newMode);
            setShowConfirm(true);
        } else {
            onModeChange(newMode);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            onModeChange(pendingMode);
            setShowConfirm(false);
            setPendingMode(null);
        }
    };

    return (
        <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-2">
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Analysis Mode
                    </h3>
                    <div className={`px-2 py-1 rounded text-xs font-mono ${mode === 'LIVE'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        }`}>
                        {mode}
                    </div>
                </div>

                {/* Mode Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    {/* LIVE Mode */}
                    <button
                        onClick={() => handleModeChange('LIVE')}
                        disabled={disabled}
                        className={`
              relative p-3 rounded-lg border-2 transition-all
              ${mode === 'LIVE'
                                ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20'
                                : 'border-border/50 bg-card/50 hover:border-red-500/50'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Radio className={`h-5 w-5 ${mode === 'LIVE' ? 'text-red-400' : 'text-muted-foreground'}`} />
                            <div className="text-xs font-bold">LIVE</div>
                            <div className="flex gap-1">
                                <Gamepad2 className="h-3 w-3 text-muted-foreground" />
                            </div>
                        </div>
                        {mode === 'LIVE' && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </button>

                    {/* POST-MATCH Mode */}
                    <button
                        onClick={() => handleModeChange('POST_MATCH')}
                        disabled={disabled}
                        className={`
              relative p-3 rounded-lg border-2 transition-all
              ${mode === 'POST_MATCH'
                                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                                : 'border-border/50 bg-card/50 hover:border-blue-500/50'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Target className={`h-5 w-5 ${mode === 'POST_MATCH' ? 'text-blue-400' : 'text-muted-foreground'}`} />
                            <div className="text-xs font-bold">POST-MATCH</div>
                            <div className="flex gap-1">
                                <Gamepad2 className="h-3 w-3 text-muted-foreground" />
                                <Mouse className="h-3 w-3 text-muted-foreground" />
                                <Keyboard className="h-3 w-3 text-muted-foreground" />
                            </div>
                        </div>
                        {mode === 'POST_MATCH' && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                        )}
                    </button>
                </div>

                {/* Mode Description */}
                <div className={`p-2 rounded text-xs ${mode === 'LIVE'
                        ? 'bg-red-500/5 border border-red-500/20'
                        : 'bg-blue-500/5 border border-blue-500/20'
                    }`}>
                    {mode === 'LIVE' ? (
                        <div className="space-y-1">
                            <div className="font-semibold text-red-400">⚡ Fast Tagging</div>
                            <ul className="text-muted-foreground space-y-0.5 ml-4">
                                <li>• Controller only (8-12 events)</li>
                                <li>• No player/position selection</li>
                                <li>• Speed over precision</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="font-semibold text-blue-400">🎯 Detailed Analysis</div>
                            <ul className="text-muted-foreground space-y-0.5 ml-4">
                                <li>• Controller + Mouse + Keyboard</li>
                                <li>• Full event details (30-50 events)</li>
                                <li>• Player & position tracking</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Confirmation Dialog */}
                {showConfirm && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <Card className="p-6 max-w-md space-y-4 border-2 border-primary">
                            <h3 className="text-lg font-bold">Switch Analysis Mode?</h3>
                            <p className="text-sm text-muted-foreground">
                                {pendingMode === 'LIVE' ? (
                                    <>
                                        Switching to <span className="text-red-400 font-semibold">LIVE mode</span> will:
                                        <ul className="mt-2 space-y-1 ml-4">
                                            <li>• Remove player and position data from events</li>
                                            <li>• Simplify event types to 8-12 core events</li>
                                            <li>• Enable fast controller-only logging</li>
                                        </ul>
                                    </>
                                ) : (
                                    <>
                                        Switching to <span className="text-blue-400 font-semibold">POST-MATCH mode</span> will:
                                        <ul className="mt-2 space-y-1 ml-4">
                                            <li>• Allow adding player and position details</li>
                                            <li>• Enable all 30-50 event types</li>
                                            <li>• Require mouse/keyboard for full details</li>
                                        </ul>
                                    </>
                                )}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        setShowConfirm(false);
                                        setPendingMode(null);
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmModeChange}
                                    className="flex-1"
                                >
                                    Confirm Switch
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </Card>
    );
}
