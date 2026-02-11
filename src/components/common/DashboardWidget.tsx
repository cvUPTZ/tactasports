import React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardWidgetProps {
    id: string;
    label?: string; // Human readable name for the edit overlay
    children: React.ReactNode;
    isEditMode: boolean;
    isHidden?: boolean;
    onToggleVisibility?: (id: string) => void;
    className?: string;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
    id,
    label,
    children,
    isEditMode,
    isHidden = false,
    onToggleVisibility,
    className
}) => {
    // If not editing and hidden, render nothing
    if (!isEditMode && isHidden) {
        return null;
    }

    return (
        <div className={cn(
            "relative transition-all duration-300",
            className,
            isEditMode && "ring-2 ring-dashed ring-slate-600 rounded-lg p-1",
            isEditMode && isHidden && "opacity-50 grayscale ring-red-900/50 bg-red-950/10"
        )}>
            {isEditMode && (
                <div className="absolute -top-3 left-3 z-[100] flex items-center gap-1">
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm border",
                        isHidden
                            ? "bg-red-950 text-red-400 border-red-800"
                            : "bg-slate-800 text-slate-200 border-slate-600"
                    )}>
                        {/* Drag handle placeholder for future */}
                        <GripHorizontal className="h-3 w-3 opacity-50 cursor-move" />
                        <span>{label || id}</span>

                        <div className="h-3 w-px bg-white/10 mx-1" />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleVisibility?.(id);
                            }}
                            className="hover:text-white transition-colors"
                        >
                            {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Content Overlay when hidden in edit mode to prevent interaction */}
            {isEditMode && isHidden && (
                <div className="absolute inset-0 z-[10] bg-slate-950/20 backdrop-blur-[1px] rounded-lg pointer-events-none" />
            )}

            {children}
        </div>
    );
};
