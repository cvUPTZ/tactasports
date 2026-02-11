import React, { useRef, useState } from 'react';

interface Point {
    x: number;
    y: number;
}

// Standard FIFA pitch landmarks in meters (105x68m pitch)
const PITCH_LANDMARKS = [
    // Corners (4)
    { x: 0, y: 0, name: 'Corner: Top-Left' },
    { x: 105, y: 0, name: 'Corner: Top-Right' },
    { x: 105, y: 68, name: 'Corner: Bottom-Right' },
    { x: 0, y: 68, name: 'Corner: Bottom-Left' },

    // Halfway Line (3)
    { x: 52.5, y: 0, name: 'Halfway: Top' },
    { x: 52.5, y: 34, name: 'Halfway: Center' },
    { x: 52.5, y: 68, name: 'Halfway: Bottom' },

    // Center Circle (Perimeter points)
    { x: 43.35, y: 34, name: 'Center Circle: Left' },
    { x: 61.65, y: 34, name: 'Center Circle: Right' },
    { x: 52.5, y: 24.85, name: 'Center Circle: Top' },
    { x: 52.5, y: 43.15, name: 'Center Circle: Bottom' },

    // Left Penalty Area
    { x: 11, y: 34, name: 'Left Penalty Spot' },
    { x: 0, y: 13.84, name: 'Left Penalty: Top' },
    { x: 0, y: 54.16, name: 'Left Penalty: Bottom' },
    { x: 16.5, y: 13.84, name: 'Left Penalty Area: Far-Top' },
    { x: 16.5, y: 54.16, name: 'Left Penalty Area: Far-Bottom' },

    // Left Goal Area
    { x: 0, y: 24.84, name: 'Left Goal Area: Top' },
    { x: 0, y: 43.16, name: 'Left Goal Area: Bottom' },
    { x: 5.5, y: 24.84, name: 'Left Goal Area: Far-Top' },
    { x: 5.5, y: 43.16, name: 'Left Goal Area: Far-Bottom' },

    // Right Penalty Area
    { x: 94, y: 34, name: 'Right Penalty Spot' },
    { x: 105, y: 13.84, name: 'Right Penalty: Top' },
    { x: 105, y: 54.16, name: 'Right Penalty: Bottom' },
    { x: 88.5, y: 13.84, name: 'Right Penalty Area: Far-Top' },
    { x: 88.5, y: 54.16, name: 'Right Penalty Area: Far-Bottom' },

    // Right Goal Area
    { x: 105, y: 24.84, name: 'Right Goal Area: Top' },
    { x: 105, y: 43.16, name: 'Right Goal Area: Bottom' },
    { x: 99.5, y: 24.84, name: 'Right Goal Area: Far-Top' },
    { x: 99.5, y: 43.16, name: 'Right Goal Area: Far-Bottom' },

    // Intermediate Side Points (29-point system often uses 1/4 and 3/4 points)
    { x: 26.25, y: 0, name: 'Top Touchline: 1/4' },
    { x: 78.75, y: 0, name: 'Top Touchline: 3/4' },
    { x: 26.25, y: 68, name: 'Bottom Touchline: 1/4' },
    { x: 78.75, y: 68, name: 'Bottom Touchline: 3/4' },
];

interface PitchMapProps {
    className?: string;
    onPointClick?: (point: Point) => void;
    onPlayerClick?: (player: { x: number; y: number; team: string; id?: number | string }) => void;
    selectedPoint?: Point | null;
    playerPositions?: Array<{ x: number; y: number; team: string; id?: number | string }>;
    calibrationPoints?: Array<{ pitch: Point; label: number }>;
    showLandmarks?: boolean;
}

export default function PitchMap({
    className = '',
    onPointClick,
    onPlayerClick,
    selectedPoint,
    playerPositions = [],
    calibrationPoints = [],
    showLandmarks = true
}: PitchMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
    const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onPointClick || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 105;
        const y = ((e.clientY - rect.top) / rect.height) * 68;

        onPointClick({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 105;
        const y = ((e.clientY - rect.top) / rect.height) * 68;
        setHoverPoint({ x, y });
    };

    const handleLandmarkClick = (landmark: { x: number; y: number; name: string }, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPointClick) {
            onPointClick({ x: landmark.x, y: landmark.y });
        }
    };

    return (
        <div className={`relative aspect-[105/68] rounded-xl overflow-hidden shadow-2xl ${className}`}>
            {/* Outer border with stadium effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-700 to-gray-900 p-4">
                <div className="relative w-full h-full rounded-lg overflow-hidden shadow-inner">
                    <svg
                        ref={svgRef}
                        viewBox="0 0 105 68"
                        className="w-full h-full cursor-crosshair"
                        onClick={handleClick}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoverPoint(null)}
                    >
                        <defs>
                            {/* Grass texture gradient */}
                            <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#1a5c2e" />
                                <stop offset="50%" stopColor="#247a3d" />
                                <stop offset="100%" stopColor="#1a5c2e" />
                            </linearGradient>

                            {/* Radial gradient for center spotlight */}
                            <radialGradient id="spotlight" cx="50%" cy="50%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                                <stop offset="70%" stopColor="rgba(255,255,255,0)" />
                            </radialGradient>

                            {/* Shadow filter */}
                            <filter id="shadow">
                                <feDropShadow dx="0" dy="0.2" stdDeviation="0.3" floodOpacity="0.5" />
                            </filter>

                            {/* Glow filter for selected point */}
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            {/* Net pattern */}
                            <pattern id="netPattern" width="1.5" height="1.5" patternUnits="userSpaceOnUse">
                                <path d="M 0 0 L 1.5 1.5 M 1.5 0 L 0 1.5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.1" />
                            </pattern>
                        </defs>

                        {/* Base grass field */}
                        <rect x="0" y="0" width="105" height="68" fill="url(#grassGradient)" />

                        {/* Grass stripes for realistic look */}
                        {[...Array(15)].map((_, i) => (
                            <rect
                                key={`stripe-${i}`}
                                x={i * 7}
                                y="0"
                                width="7"
                                height="68"
                                fill={i % 2 === 0 ? "rgba(26,92,46,0.3)" : "rgba(36,122,61,0.3)"}
                            />
                        ))}

                        {/* Subtle vignette effect */}
                        <rect x="0" y="0" width="105" height="68" fill="url(#spotlight)" />

                        {/* Outer boundary */}
                        <rect x="2" y="2" width="101" height="64" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Center Line */}
                        <line x1="52.5" y1="2" x2="52.5" y2="66" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Center Circle */}
                        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Center Spot */}
                        <circle cx="52.5" cy="34" r="0.4" fill="white" opacity="0.95" filter="url(#shadow)" />

                        {/* Left Penalty Area */}
                        <rect x="2" y="13.5" width="16.5" height="41" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Right Penalty Area */}
                        <rect x="86.5" y="13.5" width="16.5" height="41" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Left Goal Area */}
                        <rect x="2" y="23.5" width="5.5" height="21" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Right Goal Area */}
                        <rect x="97" y="23.5" width="5.5" height="21" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" filter="url(#shadow)" />

                        {/* Left Penalty Spot */}
                        <circle cx="13" cy="34" r="0.4" fill="white" opacity="0.95" filter="url(#shadow)" />

                        {/* Right Penalty Spot */}
                        <circle cx="92" cy="34" r="0.4" fill="white" opacity="0.95" filter="url(#shadow)" />

                        {/* Left Penalty Arc */}
                        <path
                            d="M 18.5 24.85 A 9.15 9.15 0 0 1 18.5 43.15"
                            fill="none"
                            stroke="white"
                            strokeWidth="0.25"
                            opacity="0.95"
                            filter="url(#shadow)"
                        />

                        {/* Right Penalty Arc */}
                        <path
                            d="M 86.5 24.85 A 9.15 9.15 0 0 0 86.5 43.15"
                            fill="none"
                            stroke="white"
                            strokeWidth="0.25"
                            opacity="0.95"
                            filter="url(#shadow)"
                        />

                        {/* Corner Arcs */}
                        <path d="M 2 3 A 1 1 0 0 0 3 2" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" />
                        <path d="M 2 65 A 1 1 0 0 1 3 66" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" />
                        <path d="M 103 3 A 1 1 0 0 1 102 2" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" />
                        <path d="M 103 65 A 1 1 0 0 0 102 66" fill="none" stroke="white" strokeWidth="0.25" opacity="0.95" />

                        {/* Corner Flags */}
                        <g filter="url(#shadow)">
                            <line x1="2.5" y1="2.5" x2="2.5" y2="0.5" stroke="#888" strokeWidth="0.15" />
                            <path d="M 2.5 0.5 L 3.5 1 L 2.5 1.5 Z" fill="#fbbf24" />

                            <line x1="2.5" y1="65.5" x2="2.5" y2="67.5" stroke="#888" strokeWidth="0.15" />
                            <path d="M 2.5 67.5 L 3.5 67 L 2.5 66.5 Z" fill="#fbbf24" />

                            <line x1="102.5" y1="2.5" x2="102.5" y2="0.5" stroke="#888" strokeWidth="0.15" />
                            <path d="M 102.5 0.5 L 101.5 1 L 102.5 1.5 Z" fill="#fbbf24" />

                            <line x1="102.5" y1="65.5" x2="102.5" y2="67.5" stroke="#888" strokeWidth="0.15" />
                            <path d="M 102.5 67.5 L 101.5 67 L 102.5 66.5 Z" fill="#fbbf24" />
                        </g>

                        {/* Left Goal */}
                        <g filter="url(#shadow)">
                            <rect x="-2" y="26.5" width="4" height="15" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
                            <rect x="-2" y="26.5" width="4" height="15" fill="url(#netPattern)" opacity="0.4" />
                            <line x1="-2" y1="26.5" x2="2" y2="28" stroke="white" strokeWidth="0.15" opacity="0.5" />
                            <line x1="-2" y1="41.5" x2="2" y2="40" stroke="white" strokeWidth="0.15" opacity="0.5" />
                        </g>

                        {/* Right Goal */}
                        <g filter="url(#shadow)">
                            <rect x="103" y="26.5" width="4" height="15" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
                            <rect x="103" y="26.5" width="4" height="15" fill="url(#netPattern)" opacity="0.4" />
                            <line x1="107" y1="26.5" x2="103" y2="28" stroke="white" strokeWidth="0.15" opacity="0.5" />
                            <line x1="107" y1="41.5" x2="103" y2="40" stroke="white" strokeWidth="0.15" opacity="0.5" />
                        </g>

                        {/* Player/Ball Positions */}
                        {playerPositions.map((player, idx) => {
                            const isBall = player.team === 'BALL';
                            return (
                                <g key={`player-${idx}`} filter="url(#shadow)">
                                    <circle
                                        cx={player.x}
                                        cy={player.y}
                                        r={isBall ? "0.8" : "1.2"}
                                        fill={isBall ? "#fbbf24" : (player.team === 'A' ? '#ef4444' : '#3b82f6')}
                                        stroke="white"
                                        strokeWidth={isBall ? "0.15" : "0.25"}
                                        className="cursor-pointer transition-all hover:r-[1.5]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onPlayerClick) {
                                                onPlayerClick(player);
                                            }
                                        }}
                                    />
                                    {!isBall && (
                                        <circle
                                            cx={player.x}
                                            cy={player.y}
                                            r="1.8"
                                            fill="none"
                                            stroke={player.team === 'A' ? '#ef4444' : '#3b82f6'}
                                            strokeWidth="0.15"
                                            opacity="0.3"
                                        />
                                    )}
                                    {isBall && (
                                        <circle
                                            cx={player.x}
                                            cy={player.y}
                                            r="1.2"
                                            fill="none"
                                            stroke="#fbbf24"
                                            strokeWidth="0.1"
                                            opacity="0.5"
                                            className="animate-pulse"
                                        />
                                    )}
                                </g>
                            );
                        })}

                        {/* Calibration Points */}
                        {calibrationPoints.map((point, idx) => (
                            <g key={`calib-${idx}`} filter="url(#shadow)">
                                <circle
                                    cx={point.pitch.x}
                                    cy={point.pitch.y}
                                    r="1.5"
                                    fill="#eab308"
                                    stroke="white"
                                    strokeWidth="0.3"
                                />
                                <text
                                    x={point.pitch.x}
                                    y={point.pitch.y}
                                    dy="0.5"
                                    textAnchor="middle"
                                    fontSize="1.5"
                                    fill="black"
                                    fontWeight="bold"
                                >
                                    {point.label}
                                </text>
                            </g>
                        ))}

                        {/* Predefined Landmark Markers */}
                        {showLandmarks && PITCH_LANDMARKS.map((landmark, idx) => (
                            <g
                                key={`landmark-${idx}`}
                                className="cursor-pointer"
                                onClick={(e) => handleLandmarkClick(landmark, e)}
                                onMouseEnter={() => setHoveredLandmark(landmark.name)}
                                onMouseLeave={() => setHoveredLandmark(null)}
                            >
                                <circle
                                    cx={landmark.x}
                                    cy={landmark.y}
                                    r="1.2"
                                    fill={hoveredLandmark === landmark.name ? '#22c55e' : 'rgba(59, 130, 246, 0.8)'}
                                    stroke="white"
                                    strokeWidth="0.2"
                                    className="transition-all duration-150"
                                />
                                {hoveredLandmark === landmark.name && (
                                    <circle
                                        cx={landmark.x}
                                        cy={landmark.y}
                                        r="2"
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="0.3"
                                        className="animate-pulse"
                                    />
                                )}
                            </g>
                        ))}

                        {/* Selected Point Indicator */}
                        {selectedPoint && (
                            <g filter="url(#glow)">
                                <circle
                                    cx={selectedPoint.x}
                                    cy={selectedPoint.y}
                                    r="1.5"
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="0.4"
                                    className="animate-pulse"
                                />
                                <circle
                                    cx={selectedPoint.x}
                                    cy={selectedPoint.y}
                                    r="2.5"
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="0.2"
                                    opacity="0.5"
                                    className="animate-pulse"
                                />
                            </g>
                        )}
                    </svg>

                    {/* Hover Coordinates Display */}
                    {hoverPoint && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none border border-white/20 shadow-lg">
                            <span className="font-mono">
                                X: {hoverPoint.x.toFixed(1)} • Y: {hoverPoint.y.toFixed(1)}
                            </span>
                        </div>
                    )}

                    {/* Hovered Landmark Tooltip */}
                    {hoveredLandmark && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-600/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none border border-white/30 shadow-lg font-medium">
                            {hoveredLandmark}
                        </div>
                    )}
                </div>
            </div>

            {/* Stadium Atmosphere - Corner Lights */}
            <div className="absolute top-0 left-0 w-4 h-4 bg-yellow-200/20 blur-xl rounded-full"></div>
            <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-200/20 blur-xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 bg-yellow-200/20 blur-xl rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-200/20 blur-xl rounded-full"></div>
        </div>
    );
}