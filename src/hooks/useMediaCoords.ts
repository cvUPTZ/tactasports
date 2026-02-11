import { useCallback } from 'react';

export const useMediaCoords = (naturalWidth: number, naturalHeight: number) => {
    const getCoordinates = useCallback((e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement>) => {
        if (!containerRef.current || naturalWidth === 0) return { x: 0, y: 0 };

        const rect = containerRef.current.getBoundingClientRect();
        const containerAspect = rect.width / rect.height;
        const mediaAspect = naturalWidth / naturalHeight;

        let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;

        if (mediaAspect > containerAspect) {
            // Letterboxed (Bars top/bottom)
            renderWidth = rect.width;
            renderHeight = rect.width / mediaAspect;
            offsetX = 0;
            offsetY = (rect.height - renderHeight) / 2;
        } else {
            // Pillarboxed (Bars left/right)
            renderHeight = rect.height;
            renderWidth = rect.height * mediaAspect;
            offsetX = (rect.width - renderWidth) / 2;
            offsetY = 0;
        }

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert click to 0-1 normalized range within the actual media area
        const normX = (clickX - offsetX) / renderWidth;
        const normY = (clickY - offsetY) / renderHeight;

        // Convert to natural video pixels
        return {
            x: normX * naturalWidth,
            y: normY * naturalHeight,
            isOutOfBounds: normX < 0 || normX > 1 || normY < 0 || normY > 1
        };
    }, [naturalWidth, naturalHeight]);

    return { getCoordinates };
};