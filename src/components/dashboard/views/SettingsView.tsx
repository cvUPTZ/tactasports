import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ButtonMappingConfig } from '@/components/ButtonMappingConfig';
import { LoggedEvent } from '@/hooks/useGamepad';

interface SettingsViewProps {
    mappings: Record<string, string>;
    pressedButtons: Set<string>;
    updateMapping: (button: string, action: string) => void;
    resetMappings: () => void;
    events: LoggedEvent[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    mappings,
    pressedButtons,
    updateMapping,
    resetMappings,
    events
}) => {
    return (
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
            <Card className="bg-card/30 backdrop-blur-md">
                <CardHeader><CardTitle>Button Mappings</CardTitle></CardHeader>
                <CardContent>
                    <ButtonMappingConfig
                        mappings={mappings}
                        pressedButtons={pressedButtons}
                        onUpdateMapping={updateMapping}
                        onResetMappings={resetMappings}
                    />
                </CardContent>
            </Card>
            <Card className="bg-card/30 backdrop-blur-md">
                <CardHeader><CardTitle>System Log</CardTitle></CardHeader>
                <CardContent className="h-[400px] overflow-y-auto font-mono text-[10px]">
                    {events.map((e, idx) => (
                        <div key={idx} className="border-b border-border/50 py-1 flex justify-between">
                            <span>[{e.timestamp.split('T')[1].split('.')[0]}] {e.eventName}</span>
                            <span className="text-muted-foreground">{e.team}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
