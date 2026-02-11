import React from 'react';
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
    Target,
    Crosshair,
    Zap,
    Map
} from 'lucide-react';
import { AnnotationType } from '@/hooks/useAnnotations';
import { DrawingTool } from './AnnotationToolbar';
import { cn } from '@/lib/utils';

interface TacticalAnnotationSidebarProps {
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

export const TacticalAnnotationSidebar: React.FC<TacticalAnnotationSidebarProps> = ({
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
    const toolGroups = [
        {
            name: "Selection",
            tools: [
                { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Selection' },
                { id: 'calibration', icon: <Target className="w-4 h-4 text-yellow-500" />, label: 'Calibration' },
            ]
        },
        {
            name: "Tactical Tools",
            tools: [
                { id: 'spotlight', icon: <Crosshair className="w-4 h-4 text-cyan-400" />, label: 'Spotlight' },
                { id: 'zone', icon: <Map className="w-4 h-4" />, label: 'Tactical Zone' },
                { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Tactical Line' },
                { id: 'ruler', icon: <Ruler className="w-4 h-4" />, label: 'Distance' },
            ]
        },
        {
            name: "Shapes & Text",
            tools: [
                { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
                { id: 'marker', icon: <User className="w-4 h-4 text-orange-400" />, label: 'Player Marker' },
                { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Annotation' },
            ]
        }
    ];

    const broadcastColors = [
        { name: 'Power Red', hex: '#FF3B30' },
        { name: 'Neon Green', hex: '#34C759' },
        { name: 'Tactical Blue', hex: '#007AFF' },
        { name: 'Safety Yellow', hex: '#FFD60A' },
        { name: 'Cyber Cyan', hex: '#00FBFF' },
        { name: 'Direct Orange', hex: '#FF9F0A' },
        { name: 'Clean White', hex: '#FFFFFF' },
        { name: 'Stealth Black', hex: '#000000' },
    ];

    return (
        <div className="absolute top-16 right-4 bottom-24 bg-slate-900/40 backdrop-blur-2xl rounded-2xl p-4 flex flex-col gap-6 z-50 border border-white/10 shadow-2xl overflow-y-auto custom-scrollbar w-[80px] select-none hover:w-[220px] transition-all duration-300 group/sidebar">
            <div className="flex items-center gap-3 px-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <Zap className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">Tactical OS</span>
            </div>

            {toolGroups.map((group, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase text-white/40 font-black tracking-widest px-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                        {group.name}
                    </span>
                    <div className="flex flex-col gap-1">
                        {group.tools.map((tool) => (
                            <Button
                                key={tool.id}
                                variant={activeTool === tool.id ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onToolChange(tool.id as DrawingTool)}
                                className={cn(
                                    "h-10 justify-start px-3 transition-all rounded-xl",
                                    activeTool === tool.id
                                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <div className="min-w-[24px] flex justify-center">
                                    {tool.icon}
                                </div>
                                <span className="ml-3 text-xs font-bold opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">
                                    {tool.label}
                                </span>
                            </Button>
                        ))}
                    </div>
                </div>
            ))}

            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase text-white/40 font-black tracking-widest px-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                    Palette
                </span>
                <div className="grid grid-cols-2 group-hover/sidebar:grid-cols-4 gap-2 px-1">
                    {broadcastColors.map((c) => (
                        <button
                            key={c.hex}
                            onClick={() => onColorChange(c.hex)}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-125",
                                color === c.hex ? "border-white scale-110 shadow-lg" : "border-white/10"
                            )}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase text-white/40 font-black tracking-widest px-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
                    Thickness
                </span>
                <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={strokeWidth}
                    onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t border-white/5 pt-4">
                <div className="flex gap-1 group-hover/sidebar:flex-row flex-col items-center group-hover/sidebar:justify-between">
                    <Button variant="ghost" size="icon" onClick={onUndo} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClear} className="h-8 w-8 text-red-400 hover:bg-red-400/10 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onExport} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg">
                        <Download className="h-4 w-4" />
                    </Button>
                    <label className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5">
                        <Upload className="h-4 w-4" />
                        <input type="file" accept=".json" onChange={(e) => onImport(e.target.files![0])} className="hidden" />
                    </label>
                </div>
            </div>
        </div>
    );
};
