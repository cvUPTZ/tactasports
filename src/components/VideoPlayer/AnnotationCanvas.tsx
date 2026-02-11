import React from 'react';
import { Annotation, Point } from '@/hooks/useAnnotations';
import { HomographyMatrix, invertHomography, transformPoint } from '@/utils/homography';

interface AnnotationCanvasProps {
    annotations: Annotation[];
    videoWidth: number;
    videoHeight: number;
    calibrationMatrix?: HomographyMatrix | null;
    calibrationPoints?: Point[];
    onAnnotationClick?: (id: string) => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
    annotations,
    videoWidth,
    videoHeight,
    calibrationMatrix,
    calibrationPoints,
    onAnnotationClick,
}) => {
    const renderAnnotation = (annotation: Annotation) => {
        const { id, type, style } = annotation;
        const commonProps = {
            stroke: style.color,
            strokeWidth: style.strokeWidth,
            opacity: style.opacity,
            fill: 'none',
            strokeDasharray: style.dashed ? '8,4' : 'none',
            className: style.glow ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : '',
            onClick: () => onAnnotationClick?.(id),
            style: { cursor: onAnnotationClick ? 'pointer' : 'default' },
        };

        const invMatrix = calibrationMatrix ? invertHomography(calibrationMatrix) : null;

        /** Helper to get screen point from pitch coords */
        const getScreenPoint = (p: Point): Point => {
            if (!invMatrix) return p;
            return transformPoint(p, invMatrix);
        };

        /** Helper to render a perspective-correct circle (ellipse) on the pitch */
        const renderPerspectiveCircle = (cx: number, cy: number, radiusMeters: number, fill?: boolean) => {
            if (!invMatrix) {
                // Fallback: simple circle with approximate pixel radius
                const pixelRadius = radiusMeters * 10; // Standardized scale factor
                return <circle key={id} cx={cx} cy={cy} r={pixelRadius} {...commonProps} fill={fill ? style.color : 'none'} fillOpacity={fill ? (style.fillOpacity || 0.2) : 0} />;
            }

            const points: Point[] = [];
            const segments = 32;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const px = cx + radiusMeters * Math.cos(angle);
                const py = cy + radiusMeters * Math.sin(angle);
                points.push(getScreenPoint({ x: px, y: py }));
            }
            const d = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
            return <path key={id} d={d} {...commonProps} fill={fill ? style.color : 'none'} fillOpacity={fill ? (style.fillOpacity || 0.2) : 0} />;
        };

        switch (type) {
            case 'arrow': {
                let { x1, y1, x2, y2 } = annotation.data;

                if (annotation.pitchCoords && annotation.pitchCoords.endX !== undefined && annotation.pitchCoords.endY !== undefined && invMatrix) {
                    const pt1 = getScreenPoint({ x: annotation.pitchCoords.x, y: annotation.pitchCoords.y });
                    const pt2 = getScreenPoint({ x: annotation.pitchCoords.endX, y: annotation.pitchCoords.endY });
                    x1 = pt1.x; y1 = pt1.y; x2 = pt2.x; y2 = pt2.y;
                }

                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowLength = 15;
                const arrowAngle = Math.PI / 6;

                return (
                    <g key={id} {...commonProps}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} />
                        <line
                            x1={x2}
                            y1={y2}
                            x2={x2 - arrowLength * Math.cos(angle - arrowAngle)}
                            y2={y2 - arrowLength * Math.sin(angle - arrowAngle)}
                        />
                        <line
                            x1={x2}
                            y1={y2}
                            x2={x2 - arrowLength * Math.cos(angle + arrowAngle)}
                            y2={y2 - arrowLength * Math.sin(angle + arrowAngle)}
                        />
                    </g>
                );
            }

            case 'circle': {
                if (annotation.pitchCoords && invMatrix) {
                    // Radius is stored in pixels, convert to meters (assuming 10 pixels = 1 meter)
                    const radiusMeters = annotation.data.radius / 10;
                    return renderPerspectiveCircle(annotation.pitchCoords.x, annotation.pitchCoords.y, radiusMeters, true);
                }

                return (
                    <circle
                        key={id}
                        {...commonProps}
                        cx={annotation.data.cx}
                        cy={annotation.data.cy}
                        r={annotation.data.radius}
                        fill={style.color}
                        fillOpacity={style.fillOpacity || 0.1}
                    />
                );
            }

            case 'spotlight': {
                const { radius } = annotation.data;
                const px = annotation.pitchCoords?.x || 0;
                const py = annotation.pitchCoords?.y || 0;

                if (!invMatrix) return null;

                const baseCenter = getScreenPoint({ x: px, y: py });
                // Convert radius to meters for consistent rendering
                const radiusMeters = radius / 10;
                const groundRing = renderPerspectiveCircle(px, py, radiusMeters, true);

                // Visual height approximation
                const topCenter = { x: baseCenter.x, y: baseCenter.y - 100 };

                return (
                    <g key={id}>
                        <defs>
                            <linearGradient id={`grad-${id}`} x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor={style.color} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={style.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        {groundRing}
                        <path
                            d={`M ${baseCenter.x - 30} ${baseCenter.y} L ${topCenter.x - 20} ${topCenter.y} L ${topCenter.x + 20} ${topCenter.y} L ${baseCenter.x + 30} ${baseCenter.y} Z`}
                            fill={`url(#grad-${id})`}
                            stroke="none"
                            style={{ filter: 'blur(4px)' }}
                        />
                    </g>
                );
            }

            case 'zone': {
                const { points } = annotation.data;
                let screenPoints = points;

                if (annotation.pitchCoords?.points && invMatrix) {
                    screenPoints = annotation.pitchCoords.points.map(p => getScreenPoint(p));
                }

                if (screenPoints.length < 3) return null;

                const d = `M ${screenPoints[0].x} ${screenPoints[0].y} ` + screenPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';

                return (
                    <path
                        key={id}
                        {...commonProps}
                        d={d}
                        fill={style.color}
                        fillOpacity={style.fillOpacity || 0.3}
                        strokeDasharray={style.dashed ? '10,5' : 'none'}
                    />
                );
            }

            case 'marker': {
                let { x, y, label } = annotation.data;
                if (annotation.pitchCoords && invMatrix) {
                    const pt = getScreenPoint({ x: annotation.pitchCoords.x, y: annotation.pitchCoords.y });
                    x = pt.x; y = pt.y;
                }
                return (
                    <g key={id} {...commonProps}>
                        <circle cx={x} cy={y} r={6} fill={style.color} stroke="white" strokeWidth="2" />
                        {label && (
                            <text
                                x={x}
                                y={y - 12}
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                                style={{ filter: 'drop-shadow(0 0 4px black)' }}
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            }

            case 'rectangle': {
                let { x, y, width, height } = annotation.data;

                if (annotation.pitchCoords && annotation.pitchCoords.endX !== undefined && annotation.pitchCoords.endY !== undefined && invMatrix) {
                    const pt1 = getScreenPoint({ x: annotation.pitchCoords.x, y: annotation.pitchCoords.y });
                    const pt2 = getScreenPoint({ x: annotation.pitchCoords.endX, y: annotation.pitchCoords.endY });
                    x = Math.min(pt1.x, pt2.x);
                    y = Math.min(pt1.y, pt2.y);
                    width = Math.abs(pt2.x - pt1.x);
                    height = Math.abs(pt2.y - pt1.y);
                }

                return (
                    <rect
                        key={id}
                        {...commonProps}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={style.color}
                        fillOpacity={style.fillOpacity || 0.1}
                    />
                );
            }

            case 'text': {
                const { x, y, text, fontSize } = annotation.data;
                return (
                    <text
                        key={id}
                        {...commonProps}
                        x={x}
                        y={y}
                        fontSize={fontSize}
                        fill={style.color}
                        stroke="none"
                        fontFamily="Arial, sans-serif"
                        fontWeight="bold"
                        textAnchor="middle"
                    >
                        {text}
                    </text>
                );
            }

            case 'player-track': {
                const { points } = annotation.data;
                if (points.length < 2) return null;

                const pathData = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                return (
                    <g key={id} {...commonProps}>
                        <path d={pathData} fill="none" />
                        {points.map((p, i) => (
                            <circle
                                key={`${id}-point-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r={3}
                                fill={style.color}
                                opacity={style.opacity}
                            />
                        ))}
                    </g>
                );
            }

            case 'ruler': {
                let { x1, y1, x2, y2 } = annotation.data;
                let distMeters: string;

                if (annotation.pitchCoords && annotation.pitchCoords.endX !== undefined && annotation.pitchCoords.endY !== undefined && invMatrix) {
                    const pt1 = getScreenPoint({ x: annotation.pitchCoords.x, y: annotation.pitchCoords.y });
                    const pt2 = getScreenPoint({ x: annotation.pitchCoords.endX, y: annotation.pitchCoords.endY });
                    x1 = pt1.x; y1 = pt1.y; x2 = pt2.x; y2 = pt2.y;

                    const dx = annotation.pitchCoords.endX - annotation.pitchCoords.x;
                    const dy = annotation.pitchCoords.endY - annotation.pitchCoords.y;
                    distMeters = Math.sqrt(dx * dx + dy * dy).toFixed(1);
                } else {
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const distPx = Math.sqrt(dx * dx + dy * dy);
                    // Use consistent scale factor
                    distMeters = (distPx / 10).toFixed(1);
                }

                return (
                    <g key={id} {...commonProps}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="5,5" />
                        <circle cx={x1} cy={y1} r={4} fill={style.color} />
                        <circle cx={x2} cy={y2} r={4} fill={style.color} />

                        <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 - 12}
                            fill="black"
                            fontSize="14"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ filter: 'drop-shadow(0 0 2px white)' }}
                        >
                            {distMeters}m
                        </text>
                        <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 - 12}
                            fill={style.color}
                            fontSize="14"
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            {distMeters}m
                        </text>
                    </g>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg
                className="max-w-full max-h-full"
                viewBox={`0 0 ${videoWidth} ${videoHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                    pointerEvents: onAnnotationClick ? 'auto' : 'none',
                    aspectRatio: `${videoWidth} / ${videoHeight}`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
            >
                {annotations.map(renderAnnotation)}

                {calibrationPoints && calibrationPoints.map((p, i) => (
                    <g key={`calib-pt-${i}`}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            fill="#eab308"
                            stroke="white"
                            strokeWidth="1.5"
                        />
                        <text
                            x={p.x}
                            y={p.y + 15}
                            fill="#eab308"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ filter: 'drop-shadow(0 0 2px black)' }}
                        >
                            PT {i + 1}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};