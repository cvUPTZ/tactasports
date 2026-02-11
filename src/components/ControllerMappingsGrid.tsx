import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";
import { BUTTON_LABELS } from "@/hooks/useGamepad";
import { useEventConfig } from '@/contexts/EventConfigContext';
import { useMemo } from "react";

// Controller mapping categories for organized display
interface ControllerMapping {
    button: string;
    eventName: string;
    description: string;
    category: 'Basic' | 'Modifier' | 'Hold' | 'D-Pad';
    modifier?: string;
}

const getCategoryColor = (category: ControllerMapping['category']) => {
    switch (category) {
        case 'Basic': return 'bg-blue-500/10 border-blue-500/40 hover:border-blue-400';
        case 'Modifier': return 'bg-purple-500/10 border-purple-500/40 hover:border-purple-400';
        case 'Hold': return 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400';
        case 'D-Pad': return 'bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-400';
        default: return 'bg-zinc-800 border-zinc-700';
    }
};

const getCategoryBadgeVariant = (category: ControllerMapping['category']) => {
    switch (category) {
        case 'Basic': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'Modifier': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        case 'Hold': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        case 'D-Pad': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        default: return '';
    }
};

interface ControllerMappingsGridProps {
    onButtonPress?: (eventName: string, button: string) => void;
    pressedButtons?: number[];
}

export const ControllerMappingsGrid = ({ onButtonPress, pressedButtons = [] }: ControllerMappingsGridProps) => {
    const { events } = useEventConfig();

    const controllerMappings = useMemo(() => {
        const mappings: ControllerMapping[] = [];

        events.forEach(event => {
            if (!event.gamepadMappings) return;

            event.gamepadMappings.forEach(m => {
                // Focus on LIVE mode or generic inputs for this grid (or allow all)
                // If we want this grid to be mode-agnostic, we can include all.
                // Assuming this is primarily for reference or live input visualization.

                let category: ControllerMapping['category'] = 'Basic';
                let buttonLabel = BUTTON_LABELS[m.buttonIndex];

                if (m.modifier) {
                    category = 'Modifier';
                    buttonLabel = `${m.modifier}+${BUTTON_LABELS[m.buttonIndex]}`;
                } else if (m.isHold) {
                    category = 'Hold';
                    buttonLabel = `${BUTTON_LABELS[m.buttonIndex]} (Hold)`;
                } else if (m.buttonIndex >= 12 && m.buttonIndex <= 15) {
                    category = 'D-Pad';
                }

                mappings.push({
                    button: buttonLabel,
                    eventName: event.eventName,
                    description: event.label,
                    category: category,
                    modifier: m.modifier
                });
            });
        });

        // Deduplicate? Or maybe show overrides? 
        // For now, simple list is fine.
        return mappings;

    }, [events]);


    // Group mappings by category
    const basicMappings = controllerMappings.filter(m => m.category === 'Basic');
    const dpadMappings = controllerMappings.filter(m => m.category === 'D-Pad');
    const modifierMappings = controllerMappings.filter(m => m.category === 'Modifier');
    const holdMappings = controllerMappings.filter(m => m.category === 'Hold');

    const renderMappingCard = (mapping: ControllerMapping, idx: number) => (
        <Card
            key={`${mapping.button}-${idx}`}
            onClick={() => onButtonPress?.(mapping.eventName, mapping.button)}
            className={`p-1.5 border transition-all cursor-pointer select-none min-h-[54px] flex flex-col justify-center ${getCategoryColor(mapping.category)}`}
        >
            <div className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-xs font-mono font-bold text-primary leading-none">
                    {mapping.button}
                </span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground leading-tight line-clamp-2 font-medium">
                    {mapping.description}
                </span>
            </div>
        </Card>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    Controller Mappings
                </h3>
                <Badge variant="outline" className="text-[10px]">Live Config</Badge>
            </div>

            {/* Basic Buttons */}
            {basicMappings.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] ${getCategoryBadgeVariant('Basic')}`}>
                            Basic
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">Face, Shoulder, Triggers</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                        {basicMappings.map((m, i) => renderMappingCard(m, i))}
                    </div>
                </div>
            )}

            {/* D-Pad */}
            {dpadMappings.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] ${getCategoryBadgeVariant('D-Pad')}`}>
                            D-Pad
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">Tactical Phases</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {dpadMappings.map((m, i) => renderMappingCard(m, i))}
                    </div>
                </div>
            )}

            {/* Modifier Combos */}
            {modifierMappings.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] ${getCategoryBadgeVariant('Modifier')}`}>
                            Combos
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">RT+, LT+, View+</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                        {modifierMappings.map((m, i) => renderMappingCard(m, i))}
                    </div>
                </div>
            )}

            {/* Hold Events */}
            {holdMappings.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] ${getCategoryBadgeVariant('Hold')}`}>
                            Hold
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">500ms+ Press</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        {holdMappings.map((m, i) => renderMappingCard(m, i))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800 text-[9px] text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-blue-500/30 border border-blue-500/50" />
                    <span>Basic</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
                    <span>D-Pad</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-purple-500/30 border border-purple-500/50" />
                    <span>Combo</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                    <span>Hold</span>
                </div>
            </div>
        </div>
    );
};
