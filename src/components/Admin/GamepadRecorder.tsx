import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2 } from 'lucide-react';
import { BUTTON_LABELS } from '@/hooks/useGamepad';
import { GamepadModifier } from '@/config/eventRegistry';
import { cn } from '@/lib/utils';

interface GamepadRecorderProps {
    value: {
        buttonIndex: number;
        modifier?: GamepadModifier;
    };
    onChange: (value: { buttonIndex: number; modifier?: GamepadModifier }) => void;
}

export const GamepadRecorder = ({ value, onChange }: GamepadRecorderProps) => {
    const [isListening, setIsListening] = useState(false);
    const requestRef = useRef<number>();

    // Track previous button states to detect "fresh" presses
    const prevButtonsRef = useRef<boolean[]>(new Array(16).fill(false));
    const [debugPressed, setDebugPressed] = useState<number[]>([]);

    useEffect(() => {
        if (!isListening) {
            cancelAnimationFrame(requestRef.current!);
            setDebugPressed([]);
            return;
        }

        // SYNC INITIAL STATE to avoid triggering on buttons already held down
        const initialGamepads = navigator.getGamepads();
        const initialGamepad = Array.from(initialGamepads).find(gp => gp !== null);
        if (initialGamepad) {
            initialGamepad.buttons.forEach((btn, i) => {
                prevButtonsRef.current[i] = btn.pressed || (typeof btn.value === 'number' && btn.value > 0.5);
            });
        }

        const pollGamepad = () => {
            const gamepads = navigator.getGamepads();
            const gamepad = Array.from(gamepads).find(gp => gp !== null);

            if (gamepad) {
                // Debug Helper: Show currently pressed physical buttons
                const currentPressedIndices = gamepad.buttons
                    .map((b, i) => (b.pressed || b.value > 0.5) ? i : -1)
                    .filter(i => i !== -1);

                // Only update state if changed to avoid render thrashing
                if (JSON.stringify(currentPressedIndices) !== JSON.stringify(debugPressed)) {
                    setDebugPressed(currentPressedIndices);
                }

                // Check modifiers first
                // RT: 7, LT: 6, RB: 5, LB: 4, View: 8
                const rt = gamepad.buttons[7]?.pressed || gamepad.buttons[7]?.value > 0.5;
                const lt = gamepad.buttons[6]?.pressed || gamepad.buttons[6]?.value > 0.5;
                const rb = gamepad.buttons[5]?.pressed;
                const lb = gamepad.buttons[4]?.pressed;
                const view = gamepad.buttons[8]?.pressed; // View is often used as modifier in this app

                let activeModifier: GamepadModifier | undefined;
                if (rt) activeModifier = 'RT';
                else if (lt) activeModifier = 'LT';
                else if (rb) activeModifier = 'RB';
                else if (lb) activeModifier = 'LB';
                else if (view) activeModifier = 'View';

                // Check for Face Button Press (on rising edge)
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    const btn = gamepad.buttons[i];
                    const isPressed = btn.pressed || (typeof btn.value === 'number' && btn.value > 0.5); // value check for triggers acting as buttons

                    // If pressed now but wasn't before -> RISING EDGE
                    if (isPressed && !prevButtonsRef.current[i]) {

                        // IGNORE modifier buttons themselves if they are being used *as* buttons while we are looking for a combo
                        // But if NO modifier is held, maybe we want to map the bumper itself?
                        // Let's decide: If logic is "Modifier + Button", we capture the *other* button.
                        // If I just press "A", activeModifier is undefined.
                        // If I press "RT" (held) then "A", activeModifier is RT, button is A.

                        // What if I just want to map "RT" as the button?
                        // Then activeModifier would be RT. But the rising edge is index 7.

                        // Filter out the button index if it matches the active modifier's index to avoid confusion?
                        // RT=7, LT=6, RB=5, LB=4, View=8.

                        let isModifierIndex = false;
                        if (activeModifier === 'RT' && i === 7) isModifierIndex = true;
                        if (activeModifier === 'LT' && i === 6) isModifierIndex = true;
                        if (activeModifier === 'RB' && i === 5) isModifierIndex = true;
                        if (activeModifier === 'LB' && i === 4) isModifierIndex = true;
                        if (activeModifier === 'View' && i === 8) isModifierIndex = true;

                        if (!isModifierIndex) {
                            // Valid binding found!
                            onChange({
                                buttonIndex: i,
                                modifier: activeModifier
                            });
                            setIsListening(false);
                            return; // Stop polling
                        }
                    }

                    // Update prev state
                    prevButtonsRef.current[i] = isPressed;
                }
            }

            requestRef.current = requestAnimationFrame(pollGamepad);
        };

        requestRef.current = requestAnimationFrame(pollGamepad);

        return () => cancelAnimationFrame(requestRef.current!);
    }, [isListening, onChange]);

    // Format display
    const buttonLabel = BUTTON_LABELS[value.buttonIndex] || `Btn ${value.buttonIndex}`;
    const displayLabel = value.modifier ? `${value.modifier} + ${buttonLabel}` : buttonLabel;

    return (
        <div className="w-full">
            <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                className={cn(
                    "w-full font-mono text-xs justify-between transition-all",
                    isListening ? "animate-pulse border-red-500 bg-red-500/10 text-red-500" : "bg-black/50 border-white/10"
                )}
                onClick={() => setIsListening(!isListening)}
            >
                <span className="flex items-center gap-2">
                    {isListening ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Listening...
                        </>
                    ) : (
                        <>
                            <Gamepad2 className="w-3 h-3 text-muted-foreground" />
                            {displayLabel}
                        </>
                    )}
                </span>
                {isListening && <span className="text-[9px] opacity-70">Press btn</span>}
            </Button>
            {isListening && debugPressed.length > 0 && (
                <div className="text-[9px] text-muted-foreground mt-1 text-center font-mono">
                    Raw Inputs: {debugPressed.join(', ')}
                </div>
            )}
        </div>
    );
};
