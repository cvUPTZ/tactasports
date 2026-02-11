import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    Ruler,
    Crosshair,
    Target
} from 'lucide-react';
import { AnnotationType } from '@/hooks/useAnnotations';

export type DrawingTool = AnnotationType | 'select' | 'calibration';

interface AnnotationToolbarProps {
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
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
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
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const tools: Array<{ id: DrawingTool; icon: React.ReactNode; label: string }> = [
        { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Select' },
        { id: 'spotlight', icon: <Crosshair className="w-4 h-4 text-cyan-400" />, label: 'Spotlight' },
        { id: 'zone', icon: <Square className="w-4 h-4" />, label: 'Zone area' },
        { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow/Line' },
        { id: 'ruler', icon: <Ruler className="w-4 h-4" />, label: 'Distance Ruler' },
        { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
        { id: 'marker', icon: <User className="w-4 h-4" />, label: 'Marker' },
        { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
        { id: 'calibration', icon: <Target className="w-4 h-4 text-yellow-500" />, label: 'Pitch Calibration' },
    ];

    const presetColors = [
        '#FF0000', // Red
        '#00FF00', // Green
        '#22d3ee', // Cyan (Neon)
        '#FFFF00', // Yellow
        '#FF00FF', // Magenta
        '#FFFFFF', // White
        '#FB923C', // Orange
        '#000000', // Black
    ];

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
    };

    return (
        <div className="absolute top-16 right-4 bottom-24 bg-black/90 backdrop-blur-md rounded-xl p-3 flex flex-col items-center gap-4 z-50 border border-white/10 shadow-2xl overflow-y-auto custom-scrollbar max-w-[64px]">
            {/* Drawing Tools */}
            <div className="flex flex-col gap-2 w-full border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider text-center">Tools</span>
                {tools.map((tool) => (
                    <Button
                        key={tool.id}
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => onToolChange(tool.id)}
                        className={`h-10 w-10 transition-all ${activeTool === tool.id ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        title={tool.label}
                    >
                        {tool.icon}
                    </Button>
                ))}
            </div>

            {/* Properties */}
            <div className="flex flex-col gap-3 w-full border-b border-white/10 pb-4 items-center">
                <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider text-center">Style</span>

                {/* Color Picker Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title="Color"
                    />
                    {showColorPicker && (
                        <div className="absolute right-full mr-4 top-1/2 transform -translate-y-1/2 bg-black/95 border border-white/10 p-3 rounded-xl grid grid-cols-4 gap-2 shadow-xl w-48">
                            {presetColors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        onColorChange(c);
                                        setShowColorPicker(false);
                                    }}
                                    className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-sm"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Broadcast Style Toggles (Simplified representation - in real app we'd need props for these) */}
                <div className="flex flex-col gap-2">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10" title="Toggle Dash">
                        <span className="text-[8px] font-bold text-white/40">DASH</span>
                    </div>
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10" title="Toggle Glow">
                        <span className="text-[8px] font-bold text-cyan-400">GLOW</span>
                    </div>
                </div>

                {/* Stroke Width */}
                <div className="flex flex-col items-center gap-1 w-full px-1">
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={strokeWidth}
                        onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        title={`Width: ${strokeWidth}px`}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 w-full">
                <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider text-center">Actions</span>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onUndo}
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                        title="Undo"
                    >
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClear}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Clear All"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onExport}
                        className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                        title="Export"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                    <label className="h-8 w-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md cursor-pointer transition-colors" title="Import">
                        <Upload className="w-4 h-4" />
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileImport}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};
