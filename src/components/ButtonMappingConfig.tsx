import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamepadButtonMapping, BUTTON_LABELS } from "@/hooks/useGamepad";
import { useEventConfig } from '@/contexts/EventConfigContext'; // New import
import { POST_MATCH_KEYBOARD_MAPPINGS } from "@/components/KeyboardShortcutsGrid";
import { Gamepad2, RotateCcw, Settings2, Keyboard, Monitor, Zap, Timer } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface ButtonMappingConfigProps {
    mappings: GamepadButtonMapping[];
    pressedButtons: number[];
    onUpdateMapping: (index: number, eventName: string) => void;
    onResetMappings: () => void;
}

export const ButtonMappingConfig = ({ mappings, pressedButtons, onUpdateMapping, onResetMappings }: ButtonMappingConfigProps) => {
    const [listeningFor, setListeningFor] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { events } = useEventConfig(); // Use Context

    // Derive static lists from dynamic registry
    const { combos, holds } = useMemo(() => {
        const c: any[] = [];
        const h: any[] = [];

        events.forEach(e => {
            if (!e.gamepadMappings) return;
            e.gamepadMappings.forEach(m => {
                if (m.modifier) {
                    c.push({
                        buttonLabel: `${m.modifier}+${BUTTON_LABELS[m.buttonIndex]}`,
                        eventName: e.eventName,
                        eventDescription: e.label
                    });
                } else if (m.isHold) {
                    h.push({
                        buttonLabel: `Hold ${BUTTON_LABELS[m.buttonIndex]}`,
                        eventName: e.eventName,
                        eventDescription: e.label
                    });
                }
            });
        });
        return { combos: c, holds: h };
    }, [events]);

    useEffect(() => {
        if (listeningFor && pressedButtons.length > 0) {
            const buttonIndex = pressedButtons[0];
            onUpdateMapping(buttonIndex, listeningFor);
            setListeningFor(null);
        }
    }, [pressedButtons, listeningFor, onUpdateMapping]);

    const renderMappingItem = (mapping: GamepadButtonMapping) => (
        <div key={mapping.eventName} className="flex flex-col p-2 border rounded-md bg-secondary/20 hover:bg-secondary/40 transition-colors">
            <div className="flex justify-between items-start mb-1 gap-2">
                <span className="font-medium text-xs truncate text-primary flex-1" title={mapping.eventName}>
                    {mapping.eventName.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap ${listeningFor === mapping.eventName ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                    {mapping.index === -1 ? "-" : (BUTTON_LABELS[mapping.index] || `B${mapping.index}`)}
                </span>
            </div>
            <div className="text-[9px] text-muted-foreground truncate mb-2" title={mapping.eventDescription}>
                {mapping.eventDescription}
            </div>
            <Button
                variant={listeningFor === mapping.eventName ? "destructive" : "outline"}
                size="sm"
                className="h-6 text-[10px] w-full"
                onClick={() => setListeningFor(mapping.eventName)}
                disabled={listeningFor !== null && listeningFor !== mapping.eventName}
            >
                {listeningFor === mapping.eventName ? "Cancel" : "Remap"}
            </Button>
        </div>
    );

    const renderStaticItem = (label: string, eventName: string, description: string, icon?: any) => (
        <div key={eventName} className="flex flex-col p-2 border border-dashed rounded-md bg-muted/10 opacity-80">
            <div className="flex justify-between items-start mb-1 gap-2">
                <span className="font-medium text-xs truncate text-primary flex-1" title={eventName}>
                    {eventName.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                    {label}
                </span>
            </div>
            <div className="text-[9px] text-muted-foreground truncate mb-2 flex items-center gap-1">
                {icon}
                {description}
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full cursor-not-allowed" disabled>
                Dynamic
            </Button>
        </div>
    );

    // Group Keyboard Mappings
    const keyboardCategories = POST_MATCH_KEYBOARD_MAPPINGS.reduce((acc, curr) => {
        const cat = curr.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, typeof POST_MATCH_KEYBOARD_MAPPINGS>);


    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setListeningFor(null);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    Controller Config
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-primary" />
                        Input Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure your bindings for Gamepad and Keyboard.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="controller" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="controller" className="gap-2">
                            <Gamepad2 className="w-4 h-4" /> Controller
                        </TabsTrigger>
                        <TabsTrigger value="keyboard" className="gap-2">
                            <Keyboard className="w-4 h-4" /> Keyboard
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="controller" className="flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                            {/* Face Buttons Group */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Face & Triggers
                                </h4>
                                <div className="grid gap-2">
                                    {mappings.filter(m => (m.index >= 0 && m.index <= 3) || (m.index >= 4 && m.index <= 7)).map(renderMappingItem)}
                                </div>
                            </div>

                            {/* D-Pad & System */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> D-Pad & System
                                </h4>
                                <div className="grid gap-2">
                                    {mappings.filter(m => (m.index >= 12 && m.index <= 15) || (m.index >= 8 && m.index <= 11)).map(renderMappingItem)}
                                </div>
                            </div>

                            {/* Combos Group */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-yellow-500" /> Combos (Dynamic)
                                </h4>
                                <div className="grid gap-2">
                                    {combos.map((combo, idx) =>
                                        renderStaticItem(
                                            combo.buttonLabel,
                                            combo.eventName,
                                            combo.eventDescription
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Holds Group */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <Timer className="w-3 h-3 text-purple-500" /> Holds (Dynamic)
                                </h4>
                                <div className="grid gap-2">
                                    {holds.map((hold, idx) =>
                                        renderStaticItem(
                                            hold.buttonLabel,
                                            hold.eventName,
                                            hold.eventDescription
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="keyboard" className="flex-1 overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                            {Object.entries(keyboardCategories).map(([category, items]) => (
                                <div key={category} className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <Keyboard className="w-3 h-3" /> {category}
                                    </h4>
                                    <div className="grid gap-2">
                                        {items.map((item, idx) => (
                                            <div key={`${item.eventName}-${idx}`} className="flex flex-col p-2 border rounded-md bg-secondary/10 opacity-90">
                                                <div className="flex justify-between items-start mb-1 gap-2">
                                                    <span className="font-medium text-xs truncate text-primary flex-1">
                                                        {item.description}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground whitespace-nowrap border border-white/5">
                                                        {item.modifier ? `${item.modifier}+` : ''}{item.key}
                                                    </span>
                                                </div>
                                                <div className="text-[9px] text-muted-foreground truncate flex items-center justify-between">
                                                    <span>{item.eventName}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-500/80 text-xs text-center">
                            Keyboard bindings are currently standard and follow the TACTA Analysis Protocol. Re-binding coming soon.
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {pressedButtons.length > 0
                            ? `Pressed: ${pressedButtons.map(b => BUTTON_LABELS[b] || b).join(", ")}`
                            : "Press controller buttons to test input"}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onResetMappings} className="text-destructive hover:text-destructive">
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Reset Defaults
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
