import React from 'react';
import { cn } from '@/lib/utils';
import { PitchThird, ThirdsZoneState } from '@/hooks/useGamepad';

interface ZoneIndicatorProps {
    thirdsZone: ThirdsZoneState;
    className?: string;
}

// Zone labels for display (optional)
const ZONE_LABELS = [
    '', // 0 index placeholder
    '1', '2', '3', '4', '5', '6',       // Defense
    '7', '8', '9', '10', '11', '12',    // Midfield
    '13', '14', '15', '16', '17', '18'  // Attack
];

/**
 * ZoneIndicator - Compact 6x3 mini-map showing active third and preview zone
 * 
 * Layout (from left to right = Defense -> Attack):
 * 
 *  Defense (LT)   |    Midfield    |   Attack (RT)
 *  [1] [2] [3]    |  [7] [8] [9]   | [13][14][15]
 *  [4] [5] [6]    | [10][11][12]   | [16][17][18]
 */
export const ZoneIndicator: React.FC<ZoneIndicatorProps> = ({ thirdsZone, className }) => {
    const { activeThird, previewZone, confirmedZone } = thirdsZone;

    // Generate zone grid (3 columns for thirds, 6 zones each = 2 rows x 3 cols per third)
    const renderZone = (zone: number) => {
        const isActive = previewZone === zone;
        const isConfirmed = confirmedZone === zone;

        // Determine which third this zone belongs to
        const zoneThird: PitchThird = zone <= 6 ? 'DEFENSE' : zone <= 12 ? 'MIDFIELD' : 'ATTACK';
        const isInActiveThird = zoneThird === activeThird;

        return (
            <div
                key={zone}
                className={cn(
                    "w-6 h-5 flex items-center justify-center text-[8px] font-bold rounded-sm transition-all duration-150",
                    // Base styling
                    "bg-black/40 border border-white/10",
                    // Active third highlight
                    isInActiveThird && "border-primary/50 bg-primary/10",
                    // Preview zone (stick pointing here)
                    isActive && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30 z-10",
                    // Confirmed zone
                    isConfirmed && !isActive && "bg-green-500/30 border-green-500/50 text-green-400"
                )}
            >
                {zone}
            </div>
        );
    };

    const renderThird = (third: PitchThird, startZone: number, label: string) => {
        const isActive = activeThird === third;

        return (
            <div className="flex flex-col items-center gap-0.5">
                <span className={cn(
                    "text-[7px] font-black uppercase tracking-wider transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/50"
                )}>
                    {label}
                </span>
                <div className="grid grid-cols-3 gap-0.5">
                    {/* Row 1: Top zones */}
                    {renderZone(startZone)}
                    {renderZone(startZone + 1)}
                    {renderZone(startZone + 2)}
                    {/* Row 2: Bottom zones */}
                    {renderZone(startZone + 3)}
                    {renderZone(startZone + 4)}
                    {renderZone(startZone + 5)}
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "flex items-center gap-1 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 shadow-xl",
            className
        )}>
            {/* Defense Third */}
            {renderThird('DEFENSE', 1, 'LT: DEF')}

            {/* Divider */}
            <div className="w-px h-10 bg-white/10" />

            {/* Midfield Third */}
            {renderThird('MIDFIELD', 7, 'MID')}

            {/* Divider */}
            <div className="w-px h-10 bg-white/10" />

            {/* Attack Third */}
            {renderThird('ATTACK', 13, 'RT: ATK')}
        </div>
    );
};
