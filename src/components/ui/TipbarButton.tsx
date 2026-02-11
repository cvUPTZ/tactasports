// src/components/ui/TipbarButton.tsx - Compact tipbar button component
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipbarButtonProps {
    icon: LucideIcon;
    tooltip: string;
    onClick?: () => void;
    active?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    disabled?: boolean;
    className?: string;
    badge?: string | number;
    animate?: boolean;
}

export function TipbarButton({
    icon: Icon,
    tooltip,
    onClick,
    active = false,
    variant = 'outline',
    disabled = false,
    className,
    badge,
    animate = false,
}: TipbarButtonProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={active ? 'default' : variant}
                        size="sm"
                        onClick={onClick}
                        disabled={disabled}
                        className={cn(
                            'h-8 w-8 p-0 relative transition-all hover:scale-105',
                            active && 'ring-2 ring-primary ring-offset-2',
                            className
                        )}
                    >
                        <Icon className={cn('h-4 w-4', animate && 'animate-pulse')} />
                        {badge !== undefined && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                                {badge}
                            </span>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
