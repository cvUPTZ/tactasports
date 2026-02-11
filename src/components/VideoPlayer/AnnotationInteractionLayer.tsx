import React, { useState, useRef } from 'react';
import { Annotation, AnnotationStyle } from '@/hooks/useAnnotations';
import { AnnotationCanvas } from './AnnotationCanvas';
import { DrawingTool } from './AnnotationToolbar';
import { transformPoint, Point, HomographyMatrix } from '@/utils/homography';
import { screenToVideo } from '@/utils/coords';

interface AnnotationInteractionLayerProps {
    activeTool: DrawingTool;
    color: string;
    strokeWidth: number;
    videoWidth: number;
    videoHeight: number;
    currentTime: number;
    calibration: { pairs: Array<{ src: Point; dst: Point }>; matrix: HomographyMatrix | null };
    onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
}

export const AnnotationInteractionLayer: React.FC<AnnotationInteractionLayerProps> = ({
    activeTool, color, strokeWidth, videoWidth, videoHeight, currentTime, calibration, onAddAnnotation
}) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        console.log('InteractionLayer: MouseDown', { activeTool, clientX: e.clientX, clientY: e.clientY });
        if (activeTool === 'select' || activeTool === 'calibration') return;

        const rect = containerRef.current!.getBoundingClientRect();
        const coords = screenToVideo(e.clientX, e.clientY, rect, videoWidth, videoHeight);
        console.log('InteractionLayer: calculated coords', coords);

        if (coords.isOutOfBounds) {
            console.log('InteractionLayer: Out of bounds');
            return;
        }
        setStartPoint(coords);
        setCurrentPoint(coords);
        setIsDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !startPoint) return;
        const coords = screenToVideo(e.clientX, e.clientY, containerRef.current!.getBoundingClientRect(), videoWidth, videoHeight);
        // console.log('Drawing move...', coords);
        setCurrentPoint(coords);
    };

    const handleMouseUp = () => {
        if (!isDrawing || !startPoint || !currentPoint) return;

        // Broadcast styles by default for demo/integrated feel
        const style: AnnotationStyle = {
            color,
            strokeWidth,
            opacity: 1,
            fillOpacity: 0.25,
            glow: activeTool === 'spotlight' || activeTool === 'arrow',
            dashed: activeTool === 'ruler'
        };

        let annotation: any = null;
        let pitchCoords: any = null;

        if (calibration.matrix) {
            const p1 = transformPoint(startPoint, calibration.matrix);
            const p2 = transformPoint(currentPoint, calibration.matrix);

            if (activeTool === 'arrow') {
                annotation = { type: 'arrow', data: { x1: startPoint.x, y1: startPoint.y, x2: currentPoint.x, y2: currentPoint.y } };
                pitchCoords = { x: p1.x, y: p1.y, endX: p2.x, endY: p2.y };
            } else if (activeTool === 'circle') {
                const radiusMeters = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                annotation = { type: 'circle', data: { cx: startPoint.x, cy: startPoint.y, radius: radiusMeters * 10 } };
                pitchCoords = { x: p1.x, y: p1.y };
            } else if (activeTool === 'spotlight') {
                const radiusMeters = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                annotation = { type: 'spotlight', data: { cx: startPoint.x, cy: startPoint.y, radius: radiusMeters * 12 } };
                pitchCoords = { x: p1.x, y: p1.y };
            } else if (activeTool === 'zone') {
                // Create a rectangle in pitch space
                const xMin = Math.min(p1.x, p2.x);
                const xMax = Math.max(p1.x, p2.x);
                const yMin = Math.min(p1.y, p2.y);
                const yMax = Math.max(p1.y, p2.y);
                const rectPoints = [
                    { x: xMin, y: yMin },
                    { x: xMax, y: yMin },
                    { x: xMax, y: yMax },
                    { x: xMin, y: yMax }
                ];
                annotation = { type: 'zone', data: { points: [] } };
                pitchCoords = { points: rectPoints };
            } else if (activeTool === 'marker') {
                annotation = { type: 'marker', data: { x: currentPoint.x, y: currentPoint.y, label: "INFO" } };
                pitchCoords = { x: p2.x, y: p2.y };
            }
        }

        if (annotation) {
            onAddAnnotation({
                ...annotation,
                startTime: currentTime,
                endTime: currentTime + 8,
                style,
                pitchCoords
            });
        }

        setIsDrawing(false);
        setStartPoint(null);
    };

    // Generate preview annotation while dragging
    const previewAnnotation = React.useMemo(() => {
        if (!isDrawing || !startPoint || !currentPoint) return null;

        const style: AnnotationStyle = {
            color,
            strokeWidth,
            opacity: 0.7, // Slightly transparent during draw
            fillOpacity: 0.2,
            glow: activeTool === 'spotlight' || activeTool === 'arrow',
            dashed: activeTool === 'ruler'
        };

        let data: any = {};
        let pitchCoords: any = null;

        if (calibration.matrix) {
            const p1 = transformPoint(startPoint, calibration.matrix);
            const p2 = transformPoint(currentPoint, calibration.matrix);

            if (activeTool === 'arrow') {
                data = { x1: startPoint.x, y1: startPoint.y, x2: currentPoint.x, y2: currentPoint.y };
                pitchCoords = { x: p1.x, y: p1.y, endX: p2.x, endY: p2.y };
            } else if (activeTool === 'circle') {
                const radiusMeters = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                data = { cx: startPoint.x, cy: startPoint.y, radius: radiusMeters * 10 }; // Approx pixel fallback
                pitchCoords = { x: p1.x, y: p1.y };
            } else if (activeTool === 'spotlight') {
                const radiusMeters = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                data = { cx: startPoint.x, cy: startPoint.y, radius: radiusMeters * 12 };
                pitchCoords = { x: p1.x, y: p1.y };
            } else if (activeTool === 'zone') {
                // Zone preview - simple rect for now
                const xMin = Math.min(p1.x, p2.x);
                const xMax = Math.max(p1.x, p2.x);
                const yMin = Math.min(p1.y, p2.y);
                const yMax = Math.max(p1.y, p2.y);
                const rectPoints = [
                    { x: xMin, y: yMin },
                    { x: xMax, y: yMin },
                    { x: xMax, y: yMax },
                    { x: xMin, y: yMax }
                ];
                data = { points: [] }; // Points will be computed by canvas from pitchCoords
                pitchCoords = { points: rectPoints };
            } else if (activeTool === 'marker') {
                data = { x: currentPoint.x, y: currentPoint.y, label: "INFO" };
                pitchCoords = { x: p2.x, y: p2.y };
            } else if (activeTool === 'ruler') {
                data = { x1: startPoint.x, y1: startPoint.y, x2: currentPoint.x, y2: currentPoint.y };
                pitchCoords = { x: p1.x, y: p1.y, endX: p2.x, endY: p2.y };
            }
        } else {
            // Fallback for non-calibrated (pixel space)
            if (activeTool === 'arrow') data = { x1: startPoint.x, y1: startPoint.y, x2: currentPoint.x, y2: currentPoint.y };
            else if (activeTool === 'circle') data = { cx: startPoint.x, cy: startPoint.y, radius: Math.hypot(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y) };
            else if (activeTool === 'ruler') data = { x1: startPoint.x, y1: startPoint.y, x2: currentPoint.x, y2: currentPoint.y };
        }

        if (Object.keys(data).length === 0 && !pitchCoords) return null;

        return {
            id: 'preview',
            type: activeTool as Annotation['type'],
            data,
            style,
            pitchCoords,
            startTime: 0,
            endTime: 0
        } as Annotation;

    }, [isDrawing, startPoint, currentPoint, activeTool, color, strokeWidth, calibration.matrix]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-[100] cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            {/* Canvas for rendering drawings - calibration points now rendered by AnnotationCanvas */}
            <AnnotationCanvas
                annotations={previewAnnotation ? [previewAnnotation] : []}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                calibrationPoints={calibration.pairs.map(p => p.src)}
                calibrationMatrix={calibration.matrix}
            />
        </div>
    );
};