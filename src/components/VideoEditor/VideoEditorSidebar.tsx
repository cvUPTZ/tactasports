import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MousePointer2,
    ArrowRight,
    Circle,
    Square,
    Type,
    User,
    Trash2,
    Undo,
    Download,
    Upload,
    Video,
    Scissors
} from 'lucide-react';
import { AnnotationType } from '@/hooks/useAnnotations';

export type DrawingTool = AnnotationType | 'select';

interface VideoEditorSidebarProps {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
    color: string;
    onColorChange: (color: string) => void;
    strokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    onClear: () => void;
    onUndo: () => void;
    onExport: () => void;
    onImport: (file: File) => void;
    events?: any[]; // Replace with correct type
}

export const VideoEditorSidebar: React.FC<VideoEditorSidebarProps> = ({
    activeTool,
    onToolChange,
    color,
    onColorChange,
    strokeWidth,
    onStrokeWidthChange,
    onClear,
    onUndo,
    onExport,
    onImport,
    events = []
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const tools: Array<{ id: DrawingTool; icon: React.ReactNode; label: string }> = [
        { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select' },
        { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow' },
        { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
        { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
        { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
        { id: 'player-track', icon: <User className="w-4 h-4" />, label: 'Track Player' },
    ];

    const presetColors = [
        '#FF0000', // Red
        '#00FF00', // Green
        '#0000FF', // Blue
        '#FFFF00', // Yellow
        '#FF00FF', // Magenta
        '#00FFFF', // Cyan
        '#FFFFFF', // White
        '#000000', // Black
    ];

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Video Editor</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">

                    {/* Tools Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {tools.map((tool) => (
                                <Button
                                    key={tool.id}
                                    variant={activeTool === tool.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onToolChange(tool.id)}
                                    className={`w-full justify-start gap-2 ${activeTool === tool.id ? '' : 'text-muted-foreground'}`}
                                >
                                    {tool.icon}
                                    <span className="text-xs">{tool.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Styling Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Style</h3>
                        <div className="flex items-center gap-4">
                            {/* Color Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm transition-transform hover:scale-110"
                                    style={{ backgroundColor: color }}
                                    title="Active Color"
                                />
                                {showColorPicker && (
                                    <div className="absolute top-10 left-0 z-50 bg-popover border border-border p-3 rounded-xl grid grid-cols-4 gap-2 shadow-xl w-48">
                                        {presetColors.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    onColorChange(c);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-8 h-8 rounded-full border border-border hover:scale-110 transition-transform shadow-sm"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stroke Width Slider */}
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Thickness</span>
                                    <span>{strokeWidth}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={strokeWidth}
                                    onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={onUndo} className="flex-1 gap-2">
                                <Undo className="w-4 h-4" /> Undo
                            </Button>
                            <Button variant="outline" size="sm" onClick={onClear} className="flex-1 gap-2 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" /> Clear
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={onExport} className="flex-1 gap-2">
                                <Download className="w-4 h-4" /> Export
                            </Button>
                            <label className="flex-1">
                                <Button variant="secondary" size="sm" className="w-full gap-2 pointer-events-none" asChild>
                                    <div>
                                        <Upload className="w-4 h-4" /> Import
                                    </div>
                                </Button>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileImport}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Clips Section (Placeholder) */}
                    <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clips</h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Scissors className="w-3 h-3" />
                            </Button>
                        </div>
                        <div className="text-center py-8 text-sm text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border">
                            No clips created yet
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    );
};
