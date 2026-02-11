import React, { useState, useEffect, useRef } from 'react';
import { GamepadModifier } from '@/config/eventRegistry';

interface VisualGamepadConfigProps {
    value?: {
        buttonIndex: number;
        modifier?: GamepadModifier;
    };
    onChange?: (value: { buttonIndex: number; modifier?: GamepadModifier }) => void;
    showDebug?: boolean;
    compact?: boolean;
}

const VisualGamepadConfig: React.FC<VisualGamepadConfigProps> = ({
    value,
    onChange,
    showDebug = true,
    compact = false
}) => {
    const [gamepad, setGamepad] = useState<Gamepad | null>(null);
    const [buttons, setButtons] = useState<readonly GamepadButton[]>([]);
    const [axes, setAxes] = useState<readonly number[]>([]);
    const lastInteractionRef = useRef<number>(0);

    useEffect(() => {
        let animationId: number;

        const getModifierFromIndex = (index: number): GamepadModifier | undefined => {
            const map: Record<number, GamepadModifier> = {
                4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'View', 9: 'Menu',
                12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right'
            };
            return map[index];
        };

        const updateGamepad = () => {
            const gamepads = navigator.getGamepads();
            const gp = gamepads[0];

            if (gp) {
                setGamepad(gp);
                setButtons(gp.buttons);
                setAxes(gp.axes);

                // Handle binding logic if in picker mode
                if (onChange) {
                    gp.buttons.forEach((btn, i) => {
                        if (btn.pressed && Date.now() - lastInteractionRef.current > 300) {
                            // Determine modifiers
                            let modifier: GamepadModifier | undefined;
                            if (gp.buttons[4].pressed) modifier = 'LB';
                            else if (gp.buttons[5].pressed) modifier = 'RB';
                            else if (gp.buttons[6].value > 0.5) modifier = 'LT';
                            else if (gp.buttons[7].value > 0.5) modifier = 'RT';
                            else if (gp.buttons[8].pressed) modifier = 'View';
                            else if (gp.buttons[9].pressed) modifier = 'Menu';
                            else if (gp.buttons[12].pressed) modifier = 'D-Up';
                            else if (gp.buttons[13].pressed) modifier = 'D-Down';
                            else if (gp.buttons[14].pressed) modifier = 'D-Left';
                            else if (gp.buttons[15].pressed) modifier = 'D-Right';

                            // Only trigger if it's not a sole modifier press
                            const isModifier = [4, 5, 6, 7, 8, 9, 12, 13, 14, 15].includes(i);
                            if (!isModifier || (isModifier && modifier && modifier !== getModifierFromIndex(i))) {
                                onChange({ buttonIndex: i, modifier });
                                lastInteractionRef.current = Date.now();
                            }
                        }
                    });
                }
            }

            animationId = requestAnimationFrame(updateGamepad);
        };

        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad);
            updateGamepad();
        });

        window.addEventListener('gamepaddisconnected', () => {
            setGamepad(null);
            setButtons([]);
            setAxes([]);
        });

        updateGamepad();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [onChange]);

    const isPressed = (index: number) => buttons[index]?.pressed || false;
    const getPressure = (index: number) => buttons[index]?.value || 0;

    const isSelected = (index: number) => value?.buttonIndex === index;
    const isModifierActive = (mod: GamepadModifier) => value?.modifier === mod;

    const getButtonClass = (index: number, activeColor: string = 'fill-blue-500 stroke-blue-400', idleColor: string = 'fill-white/10 stroke-white/20') => {
        if (isPressed(index)) return 'fill-emerald-500 stroke-emerald-400';
        if (isSelected(index)) return activeColor;
        return idleColor;
    };

    const containerClasses = compact
        ? "bg-zinc-950/30 rounded-xl p-4 border border-zinc-800/50"
        : "max-w-4xl w-full bg-zinc-950/50 rounded-2xl p-8 backdrop-blur-sm border border-zinc-800";

    return (
        <div className={compact ? "" : "min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-8"}>
            <div className={compact ? "" : "max-w-4xl w-full"}>
                {!compact && (
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">Gamepad Visualizer</h1>
                        <p className="text-zinc-400">
                            {gamepad ? `Connected: ${gamepad.id}` : 'No gamepad detected - Press any button to connect'}
                        </p>
                    </div>
                )}

                <div className={containerClasses}>
                    {/* Controller SVG */}
                    <div className="flex justify-center mb-6">
                        <svg width={compact ? "400" : "520"} height={compact ? "350" : "500"} viewBox="0 0 520 500" className="select-none max-w-full h-auto">
                            {/* Controller body */}
                            <path
                                d="M505.765,151.733c-16.255-10.392-4.528-16.329-21.353-29.193c-16.824-12.864-85.104-34.639-96.983-24.743 s-25.233,11.873-25.233,11.873h-72.112h-0.122h-72.118c0,0-13.36-1.977-25.233-11.873c-11.873-9.896-80.16,11.873-96.983,24.743 c-16.824,12.864-5.098,18.801-21.353,29.193C58.02,162.125,15.467,305.619,15.467,305.619s-55.417,159.824,43.544,179.12 c0,0,24.248-15.336,45.025-40.079c20.784-24.743,61.353-59.872,83.128-60.368c21.298-0.483,99.389-0.019,102.792,0l0,0 c0,0,0.024,0,0.061,0c0.043,0,0.062,0,0.062,0l0,0c3.403-0.019,81.494-0.483,102.792,0c21.769,0.496,62.345,35.625,83.128,60.368 s45.024,40.079,45.024,40.079c98.961-19.296,43.544-179.12,43.544-179.12S522.02,162.125,505.765,151.733z"
                                className="fill-zinc-900 stroke-zinc-700 stroke-2"
                            />

                            {/* LB Button */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="100" y="80" width="50" height="20" rx="5"
                                    className={`stroke-2 ${getButtonClass(4, isModifierActive('LB') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                />
                                <text x="125" y="90" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">LB</text>
                            </g>

                            {/* RB Button */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="370" y="80" width="50" height="20" rx="5"
                                    className={`stroke-2 ${getButtonClass(5, isModifierActive('RB') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                />
                                <text x="395" y="90" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">RB</text>
                            </g>

                            {/* LT Button */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="80" y="50" width="50" height="18" rx="5"
                                    className={`stroke-2 ${getButtonClass(6, isModifierActive('LT') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                    style={{ opacity: 0.3 + (getPressure(6) * 0.7) }}
                                />
                                <text x="105" y="59" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">LT</text>
                            </g>

                            {/* RT Button */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <rect
                                    x="390" y="50" width="50" height="18" rx="5"
                                    className={`stroke-2 ${getButtonClass(7, isModifierActive('RT') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                    style={{ opacity: 0.3 + (getPressure(7) * 0.7) }}
                                />
                                <text x="415" y="59" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">RT</text>
                            </g>

                            {/* Left D-pad */}
                            <g transform="translate(142, 211)">
                                <path d="M -15 -5 L -5 -5 L -5 -15 L 5 -15 L 5 -5 L 15 -5 L 15 5 L 5 5 L 5 15 L -5 15 L -5 5 L -15 5 Z" className="fill-zinc-800 stroke-zinc-700" />
                                {/* Up */}
                                <rect x="-5" y="-20" width="10" height="10" rx="4" className={`stroke-2 ${getButtonClass(12, isModifierActive('D-Up') ? 'fill-blue-500 stroke-blue-400' : 'fill-transparent stroke-transparent', 'fill-transparent stroke-transparent')}`} />
                                {/* Down */}
                                <rect x="-5" y="10" width="10" height="10" rx="4" className={`stroke-2 ${getButtonClass(13, isModifierActive('D-Down') ? 'fill-blue-500 stroke-blue-400' : 'fill-transparent stroke-transparent', 'fill-transparent stroke-transparent')}`} />
                                {/* Left */}
                                <rect x="-20" y="-5" width="10" height="10" rx="4" className={`stroke-2 ${getButtonClass(14, isModifierActive('D-Left') ? 'fill-blue-500 stroke-blue-400' : 'fill-transparent stroke-transparent', 'fill-transparent stroke-transparent')}`} />
                                {/* Right */}
                                <rect x="10" y="-5" width="10" height="10" rx="4" className={`stroke-2 ${getButtonClass(15, isModifierActive('D-Right') ? 'fill-blue-500 stroke-blue-400' : 'fill-transparent stroke-transparent', 'fill-transparent stroke-transparent')}`} />
                                <circle r="2" className="fill-zinc-600" />
                            </g>

                            {/* Right buttons (ABXY) */}
                            <g transform="translate(365, 251)">
                                {/* A Button */}
                                <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <circle
                                        cx="0" cy="20" r="13"
                                        className={`stroke-2 ${getButtonClass(0, 'fill-green-500 stroke-green-400', 'fill-green-900/50 stroke-green-500/50')}`}
                                    />
                                    <text x="0" y="20" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">A</text>
                                </g>
                                {/* B Button */}
                                <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <circle
                                        cx="20" cy="0" r="13"
                                        className={`stroke-2 ${getButtonClass(1, 'fill-red-500 stroke-red-400', 'fill-red-900/50 stroke-red-500/50')}`}
                                    />
                                    <text x="20" y="0" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">B</text>
                                </g>
                                {/* X Button */}
                                <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <circle
                                        cx="-20" cy="0" r="13"
                                        className={`stroke-2 ${getButtonClass(2, 'fill-blue-500 stroke-blue-400', 'fill-blue-900/50 stroke-blue-500/50')}`}
                                    />
                                    <text x="-20" y="0" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">X</text>
                                </g>
                                {/* Y Button */}
                                <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <circle
                                        cx="0" cy="-20" r="13"
                                        className={`stroke-2 ${getButtonClass(3, 'fill-yellow-500 stroke-yellow-400', 'fill-yellow-900/50 stroke-yellow-500/50')}`}
                                    />
                                    <text x="0" y="-20" textAnchor="middle" dominantBaseline="middle" className="text-[12px] fill-white pointer-events-none font-bold">Y</text>
                                </g>
                            </g>

                            {/* Select/Start buttons */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <circle
                                    cx="220" cy="200" r="8"
                                    className={`stroke-2 ${getButtonClass(8, isModifierActive('View') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                />
                                <text x="220" y="200" textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-white pointer-events-none font-bold">⏸</text>
                            </g>
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <circle
                                    cx="300" cy="200" r="8"
                                    className={`stroke-2 ${getButtonClass(9, isModifierActive('Menu') ? 'fill-blue-500 stroke-blue-400' : undefined)}`}
                                />
                                <text x="300" y="200" textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-white pointer-events-none font-bold">☰</text>
                            </g>

                            {/* Left Analog Stick */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <circle
                                    cx={142 + (axes[0] || 0) * 10}
                                    cy={170 + (axes[1] || 0) * 10}
                                    r="20"
                                    className={`stroke-2 ${getButtonClass(10, 'fill-blue-500 stroke-blue-400', 'fill-white/10 stroke-zinc-600')}`}
                                />
                                <text
                                    x={142 + (axes[0] || 0) * 10}
                                    y={170 + (axes[1] || 0) * 10}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[12px] fill-white pointer-events-none font-bold"
                                >
                                    L3
                                </text>
                            </g>

                            {/* Right Analog Stick */}
                            <g className="cursor-pointer hover:opacity-80 transition-opacity">
                                <circle
                                    cx={315 + (axes[2] || 0) * 10}
                                    cy={300 + (axes[3] || 0) * 10}
                                    r="20"
                                    className={`stroke-2 ${getButtonClass(11, 'fill-blue-500 stroke-blue-400', 'fill-white/10 stroke-zinc-600')}`}
                                />
                                <text
                                    x={315 + (axes[2] || 0) * 10}
                                    y={300 + (axes[3] || 0) * 10}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[12px] fill-white pointer-events-none font-bold"
                                >
                                    R3
                                </text>
                            </g>
                        </svg>
                    </div>

                    {/* Debug Info */}
                    {showDebug && gamepad && (
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div className="bg-zinc-900/80 rounded-lg p-4 border border-zinc-800">
                                <h3 className="text-white font-semibold mb-3 border-b border-zinc-700 pb-2">Buttons</h3>
                                <div className="space-y-1 text-zinc-400 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {buttons.map((btn, i) => (
                                        <div key={i} className="flex justify-between items-center py-0.5">
                                            <span className="font-mono text-[10px] opacity-70">
                                                {i === 4 ? 'LB' : i === 5 ? 'RB' : i === 6 ? 'LT' : i === 7 ? 'RT' :
                                                    i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'X' : i === 3 ? 'Y' :
                                                        i === 12 ? 'Up' : i === 13 ? 'Down' : i === 14 ? 'Left' : i === 15 ? 'Right' :
                                                            `Btn ${i}`}:
                                            </span>
                                            <span className={`${btn.pressed ? 'text-emerald-400 font-bold' : ''} transition-colors min-w-[120px] text-right`}>
                                                {btn.pressed ? 'Pressed' : 'Released'} ({btn.value.toFixed(2)})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-zinc-900/80 rounded-lg p-4 border border-zinc-800">
                                <h3 className="text-white font-semibold mb-3 border-b border-zinc-700 pb-2">Axes</h3>
                                <div className="space-y-1 text-zinc-400">
                                    {axes.map((axis, i) => (
                                        <div key={i} className="flex justify-between items-center py-0.5">
                                            <span className="font-mono text-[10px] opacity-70">
                                                {i === 0 ? 'LX' : i === 1 ? 'LY' : i === 2 ? 'RX' : i === 3 ? 'RY' : `Axis ${i}`}:
                                            </span>
                                            <span className={`font-mono ${Math.abs(axis) > 0.1 ? 'text-blue-400' : ''}`}>
                                                {axis.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualGamepadConfig;