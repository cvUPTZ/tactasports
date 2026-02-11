import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type TrackingMode = 'LIVE' | 'POST_MATCH';

interface TrackingModeSelectorProps {
    mode: TrackingMode;
    onModeChange: (mode: TrackingMode) => void;
    disabled?: boolean;
}

export const TrackingModeSelector: React.FC<TrackingModeSelectorProps> = ({
    mode,
    onModeChange,
    disabled = false
}) => {
    return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Mode de Tracking</h3>
                <Badge variant={mode === 'LIVE' ? 'default' : 'secondary'}>
                    {mode === 'LIVE' ? '🟢 LIVE' : '📊 POST-MATCH'}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* LIVE Mode */}
                <Button
                    variant={mode === 'LIVE' ? 'default' : 'outline'}
                    onClick={() => onModeChange('LIVE')}
                    disabled={disabled}
                    className={`h-auto flex-col items-start p-4 ${mode === 'LIVE' ? 'ring-2 ring-primary' : ''
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎮</span>
                        <span className="font-bold text-base">LIVE</span>
                    </div>
                    <div className="text-xs text-left space-y-1 opacity-90">
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Tagging temps réel</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Stats simples</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Grille 18 zones</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-red-500">✗</span>
                            <span>Tracking XY</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-red-500">✗</span>
                            <span>Métriques avancées</span>
                        </div>
                    </div>
                </Button>

                {/* POST-MATCH Mode */}
                <Button
                    variant={mode === 'POST_MATCH' ? 'default' : 'outline'}
                    onClick={() => onModeChange('POST_MATCH')}
                    disabled={disabled}
                    className={`h-auto flex-col items-start p-4 ${mode === 'POST_MATCH' ? 'ring-2 ring-primary' : ''
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">📊</span>
                        <span className="font-bold text-base">POST-MATCH</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">BETA</Badge>
                    </div>
                    <div className="text-xs text-left space-y-1 opacity-90">
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Tracking automatique</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Positions XY précises</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>xG, xThreat, VAEP</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Heatmaps auto</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Export complet</span>
                        </div>
                    </div>
                </Button>
            </div>

            {/* Mode Description */}
            <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">
                    {mode === 'LIVE' ? (
                        <>
                            <strong>Mode LIVE :</strong> Tagging manuel en temps réel pendant le match.
                            Idéal pour le coaching en direct et les décisions tactiques immédiates.
                        </>
                    ) : (
                        <>
                            <strong>Mode POST-MATCH :</strong> Analyse vidéo complète avec tracking automatique.
                            Génère des métriques avancées (xG, xThreat, VAEP) et des heatmaps détaillées.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};
