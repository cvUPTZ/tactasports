// src/components/ui/TipbarGroup.tsx - Container for grouped tipbar buttons
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface TipbarGroupProps {
    children: ReactNode;
    label?: string;
    className?: string;
}

export function TipbarGroup({ children, label, className }: TipbarGroupProps) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            {label && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 hidden lg:inline">
                    {label}
                </span>
            )}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 border border-border/50">
                {children}
            </div>
        </div>
    );
}

interface TipbarSeparatorProps {
    className?: string;
}

export function TipbarSeparator({ className }: TipbarSeparatorProps) {
    return <div className={cn('h-4 w-px bg-border', className)} />;
}
