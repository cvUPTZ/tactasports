import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeyboardMapping {
    key: string;
    modifier?: 'Ctrl' | 'Shift' | 'Alt';
    eventName: string;
    description: string;
    category?: string;
}

export const POST_MATCH_KEYBOARD_MAPPINGS: KeyboardMapping[] = [
    // POSSESSION EVENTS (1 key)
    { key: '1', eventName: 'pass_end', description: 'Pass Completed', category: 'Possession' },
    { key: '1', modifier: 'Shift', eventName: 'key_pass', description: 'Key Pass', category: 'Possession' },
    { key: '1', modifier: 'Ctrl', eventName: 'assist', description: 'Assist', category: 'Possession' },
    { key: '1', modifier: 'Alt', eventName: 'pre_assist', description: 'Pre-Assist', category: 'Possession' },

    // SHOT EVENTS (2 key)
    { key: '2', eventName: 'shot_outcome', description: 'Shot Outcome', category: 'Shots' },
    { key: '2', modifier: 'Shift', eventName: 'goal', description: 'Goal Scored', category: 'Shots' },

    // DRIBBLING EVENTS (3 key)
    { key: '3', eventName: 'dribble_success', description: 'Dribble Success', category: 'Dribbling' },
    { key: '3', modifier: 'Shift', eventName: 'dribble_fail', description: 'Dribble Failure', category: 'Dribbling' },

    // DEFENSIVE EVENTS (4-5 keys)
    { key: '4', eventName: 'duel_ground', description: 'Ground Duel', category: 'Defense' },
    { key: '5', eventName: 'duel_aerial', description: 'Aerial Duel', category: 'Defense' },

    // PRESSING EVENTS (P key)
    { key: 'P', eventName: 'pressing_success', description: 'Pressing Success', category: 'Defense' },
    { key: 'P', modifier: 'Shift', eventName: 'pressing_fail', description: 'Pressing Failure', category: 'Defense' },

    // TACTICAL PHASES (Q, W, E, M, L keys)
    { key: 'Q', eventName: 'phase_buildup_end', description: 'Build-Up Phase', category: 'Phases' },
    { key: 'W', eventName: 'phase_consolidation', description: 'Consolidation', category: 'Phases' },
    { key: 'E', eventName: 'phase_final_third', description: 'Final Third', category: 'Phases' },
    { key: 'M', eventName: 'phase_midblock', description: 'Mid Block', category: 'Phases' },
    { key: 'L', eventName: 'phase_lowblock', description: 'Low Block', category: 'Phases' },

    // TRANSITIONS (Z key)
    { key: 'Z', eventName: 'transition_end', description: 'Transition End', category: 'Transitions' },

    // OFF-BALL MOVEMENT (O, T, D keys)
    { key: 'O', eventName: 'off_ball_run', description: 'Off-Ball Run', category: 'Off-Ball' },
    { key: 'O', modifier: 'Shift', eventName: 'overlap', description: 'Overlap', category: 'Off-Ball' },
    { key: 'O', modifier: 'Alt', eventName: 'underlap', description: 'Underlap', category: 'Off-Ball' },
    { key: 'T', eventName: 'third_man_run', description: 'Third Man Run', category: 'Off-Ball' },
    { key: 'D', eventName: 'dummy_run', description: 'Dummy Run', category: 'Off-Ball' },

    // PERFORMANCE METRICS (C, R keys)
    { key: 'C', eventName: 'chance_created', description: 'Chance Created', category: 'Performance' },
    { key: 'R', eventName: 'pressing_resistance', description: 'Press Resistance', category: 'Tactical' },

    // WORKFLOW (F, Enter, Backspace keys)
    { key: 'F', eventName: 'timestamp_fix', description: 'Fix Timestamp', category: 'Workflow' },
    { key: 'Enter', eventName: 'ai_accept', description: 'AI Accept', category: 'Workflow' },
    { key: 'Backspace', eventName: 'ai_reject', description: 'AI Reject', category: 'Workflow' },
];

interface KeyboardShortcutsGridProps {
    onKeyPress?: (eventName: string, key: string) => void;
}

export const KeyboardShortcutsGrid = ({ onKeyPress }: KeyboardShortcutsGridProps) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keyboard Shortcuts</h3>
                <Badge variant="outline" className="text-[10px]">Live & Post-Match</Badge>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
                {POST_MATCH_KEYBOARD_MAPPINGS.map((mapping, idx) => {
                    const label = mapping.modifier
                        ? `${mapping.modifier}+${mapping.key}`
                        : mapping.key;

                    return (
                        <Card
                            key={`${mapping.key}-${mapping.modifier || ''}-${idx}`}
                            onClick={() => onKeyPress?.(mapping.eventName, label)}
                            className="p-1.5 border border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-primary/50 cursor-pointer transition-all text-center select-none"
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm font-mono font-bold text-primary">
                                    {label}
                                </span>
                                <span className="text-[9px] text-muted-foreground leading-tight line-clamp-1">
                                    {mapping.description}
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
