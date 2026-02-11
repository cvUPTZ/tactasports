import { useState, useCallback, useMemo } from 'react';
import { solveHomography, HomographyMatrix } from '../utils/homography';
import { useMatchContext } from '@/contexts/MatchContext';

// Point type
export interface Point {
    x: number;
    y: number;
}

// Annotation types
export type AnnotationType =
    | 'arrow'
    | 'circle'
    | 'rectangle'
    | 'text'
    | 'player-track'
    | 'ruler'
    | 'spotlight'
    | 'zone'
    | 'marker';

export interface AnnotationStyle {
    color: string;
    strokeWidth: number;
    opacity: number;
    fillOpacity?: number;
    dashed?: boolean;
    glow?: boolean;
}

export interface BaseAnnotation {
    id: string;
    type: AnnotationType;
    startTime: number;
    endTime: number;
    style: AnnotationStyle;
    pitchCoords?: { x: number; y: number; endX?: number; endY?: number; points?: Point[] };
}

export interface ArrowAnnotation extends BaseAnnotation {
    type: 'arrow';
    data: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
}

export interface CircleAnnotation extends BaseAnnotation {
    type: 'circle';
    data: {
        cx: number;
        cy: number;
        radius: number;
    };
}

export interface RectangleAnnotation extends BaseAnnotation {
    type: 'rectangle';
    data: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface TextAnnotation extends BaseAnnotation {
    type: 'text';
    data: {
        x: number;
        y: number;
        text: string;
        fontSize: number;
    };
}

export interface PlayerTrackAnnotation extends BaseAnnotation {
    type: 'player-track';
    data: {
        playerId: number;
        points: Array<{ time: number; x: number; y: number }>;
        manual: boolean;
    };
}

export interface RulerAnnotation extends BaseAnnotation {
    type: 'ruler';
    data: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        distanceMeters?: number;
    };
}

export interface SpotlightAnnotation extends BaseAnnotation {
    type: 'spotlight';
    data: {
        cx: number;
        cy: number;
        radius: number;
        height?: number;
    };
}

export interface ZoneAnnotation extends BaseAnnotation {
    type: 'zone';
    data: {
        points: Point[];
    };
}

export interface MarkerAnnotation extends BaseAnnotation {
    type: 'marker';
    data: {
        x: number;
        y: number;
        label?: string;
    };
}

export type Annotation =
    | ArrowAnnotation
    | CircleAnnotation
    | RectangleAnnotation
    | TextAnnotation
    | PlayerTrackAnnotation
    | RulerAnnotation
    | SpotlightAnnotation
    | ZoneAnnotation
    | MarkerAnnotation;

export interface UseAnnotationsReturn {
    annotations: Annotation[];
    activeAnnotations: Annotation[];
    calibration: {
        pairs: Array<{ src: Point; dst: Point }>;
        matrix: HomographyMatrix | null;
    };
    addAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
    deleteAnnotation: (id: string) => void;
    clearAnnotations: () => void;
    addCalibrationPair: (src: Point, dst: Point) => void;
    removeLastCalibrationPair: () => void;
    setCalibrationPairs: (pairs: Array<{ src: Point; dst: Point }>) => void;
    clearCalibration: () => void;
    exportAnnotations: () => string;
    importAnnotations: (json: string) => void;
}

export const useAnnotations = (currentTime: number): UseAnnotationsReturn => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const { setCalibrationMatrix } = useMatchContext();
    const [calibrationPairs, setCalibrationPairsState] = useState<Array<{ src: Point; dst: Point }>>([]);
    const [homographyMatrix, setHomographyMatrix] = useState<HomographyMatrix | null>(null);

    // Get annotations visible at current time
    const activeAnnotations = useMemo(() => {
        return annotations.filter(
            (ann) => currentTime >= ann.startTime && currentTime <= ann.endTime
        );
    }, [annotations, currentTime]);

    const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
        const id = `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newAnnotation = { ...annotation, id } as Annotation;
        setAnnotations((prev) => [...prev, newAnnotation]);
    }, []);

    const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
        setAnnotations((prev) =>
            prev.map((ann) => {
                if (ann.id !== id) return ann;

                // Type-safe update: ensure the update is compatible with the annotation type
                const updated = { ...ann, ...updates };

                // Validate that critical type-specific fields aren't corrupted
                if (updated.type !== ann.type) {
                    console.error('Cannot change annotation type');
                    return ann;
                }

                return updated as Annotation;
            })
        );
    }, []);

    const deleteAnnotation = useCallback((id: string) => {
        setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    }, []);

    const clearAnnotations = useCallback(() => {
        setAnnotations([]);
    }, []);

    const exportAnnotations = useCallback(() => {
        return JSON.stringify(annotations, null, 2);
    }, [annotations]);

    const importAnnotations = useCallback((json: string) => {
        try {
            const imported = JSON.parse(json) as Annotation[];
            setAnnotations(imported);
        } catch (error) {
            console.error('Failed to import annotations:', error);
        }
    }, []);

    const updateHomography = useCallback((pairs: Array<{ src: Point; dst: Point }>) => {
        if (pairs.length >= 4) {
            const src = pairs.map(p => p.src);
            const dst = pairs.map(p => p.dst);
            const matrix = solveHomography(src, dst);
            setHomographyMatrix(matrix);
            setCalibrationMatrix(matrix);
        } else {
            setHomographyMatrix(null);
            setCalibrationMatrix(null);
        }
    }, [setCalibrationMatrix]);

    const addCalibrationPair = useCallback((src: Point, dst: Point) => {
        setCalibrationPairsState((prev) => {
            const next = [...prev, { src, dst }];
            updateHomography(next);
            return next;
        });
    }, [updateHomography]);

    const setCalibrationPairs = useCallback((pairs: Array<{ src: Point; dst: Point }>) => {
        setCalibrationPairsState(pairs);
        updateHomography(pairs);
    }, [updateHomography]);

    const clearCalibration = useCallback(() => {
        setCalibrationPairsState([]);
        setHomographyMatrix(null);
        setCalibrationMatrix(null);
    }, [setCalibrationMatrix]);

    const removeLastCalibrationPair = useCallback(() => {
        setCalibrationPairsState((prev) => {
            const next = prev.slice(0, -1);
            updateHomography(next);
            return next;
        });
    }, [updateHomography]);

    return {
        annotations,
        activeAnnotations,
        calibration: {
            pairs: calibrationPairs,
            matrix: homographyMatrix
        },
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        clearAnnotations,
        addCalibrationPair,
        removeLastCalibrationPair,
        setCalibrationPairs,
        clearCalibration,
        exportAnnotations,
        importAnnotations,
    };
};