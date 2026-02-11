import React, { useState, useMemo } from 'react';
import { useEventConfig } from '@/contexts/EventConfigContext';
import { BUTTON_LABELS } from '@/hooks/useGamepad';

const MappingOverlay = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { events } = useEventConfig();

    const { liveMappings, postMatchMappings } = useMemo(() => {
        const live: any[] = [];
        const post: any[] = [];

        events.forEach(event => {
            if (!event.gamepadMappings) return;

            event.gamepadMappings.forEach(m => {
                const label = m.modifier ? `${m.modifier}+${BUTTON_LABELS[m.buttonIndex]}` : BUTTON_LABELS[m.buttonIndex];
                const item = {
                    eventName: event.eventName,
                    eventDescription: event.label,
                    buttonLabel: label
                };

                if (m.mode === 'LIVE' || m.mode === 'BOTH') {
                    live.push(item);
                }
                if (m.mode === 'POST' || m.mode === 'BOTH') {
                    post.push(item);
                }
            });
        });

        // Sort by button index/label stability if needed, but registry order is usually fine
        return { liveMappings: live, postMatchMappings: post };
    }, [events]);

    if (!isOpen) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50 bg-black/50 text-white p-2 rounded cursor-pointer hover:bg-black/70 text-xs"
                onClick={() => setIsOpen(true)}
            >
                Show Mappings
            </div>
        );
    }

    return (
        <div className="fixed top-0 right-0 h-screen w-80 bg-black/20 backdrop-blur-sm z-50 p-4 overflow-y-auto text-white border-l border-white/10 shadow-2xl transition-all duration-300 pointer-events-none hover:pointer-events-auto hover:bg-black/40">
            <div className="flex justify-between items-center mb-4 pointer-events-auto">
                <h2 className="text-sm font-bold uppercase tracking-wider text-green-400">Tacta Control Map</h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                >
                    Hide
                </button>
            </div>

            <div className="space-y-6">
                {/* LIVE MODE */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 mb-2 border-b border-white/10 pb-1">Live Mode (Gamepad)</h3>
                    <div className="grid gap-2 text-xs">
                        {liveMappings.map((m, i) => (
                            <div key={`${m.eventName}-${i}`} className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                                <span className="text-gray-300 font-mono">{m.eventDescription}</span>
                                <span className="font-bold bg-white/10 px-1.5 rounded text-green-300 min-w-[24px] text-center">{m.buttonLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* POST MATCH MODE */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 mb-2 border-b border-white/10 pb-1">Post-Match (Keyboard)</h3>
                    <div className="grid gap-2 text-xs">
                        {/* Hardcoded visual reference for Keyboard since it's not in the mappings array yet */}
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Play / Pause</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">Space</span>
                        </div>
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Pass End</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">1</span>
                        </div>
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Key Pass</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">Shift+1</span>
                        </div>
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Assist</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">Ctrl+1</span>
                        </div>
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Shot Outcome</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">2</span>
                        </div>
                        <div className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                            <span className="text-gray-300">Tactical Tags (Q/W/E/R/Z)</span>
                            <span className="font-bold bg-white/10 px-1.5 rounded text-yellow-300">Keys</span>
                        </div>
                    </div>

                    <h3 className="text-xs font-semibold text-gray-400 mt-4 mb-2 border-b border-white/10 pb-1">Post-Match (Gamepad)</h3>
                    <div className="grid gap-2 text-xs">
                        {postMatchMappings.map((m, i) => (
                            <div key={`${m.eventName}-${i}`} className="flex justify-between items-center hover:bg-white/5 p-1 rounded">
                                <span className="text-gray-300 font-mono">{m.eventDescription}</span>
                                <span className="font-bold bg-white/10 px-1.5 rounded text-blue-300 min-w-[24px] text-center">{m.buttonLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MappingOverlay;
