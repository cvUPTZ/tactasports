export interface Point { x: number; y: number; }

export const getMediaLayout = (containerRect: DOMRect, naturalWidth: number, naturalHeight: number) => {
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const containerAspect = containerWidth / containerHeight;
    const videoAspect = naturalWidth / naturalHeight;

    let renderWidth, renderHeight, offsetX, offsetY;

    if (videoAspect > containerAspect) {
        // Video is wider than container (bars top/bottom)
        renderWidth = containerWidth;
        renderHeight = containerWidth / videoAspect;
        offsetX = 0;
        offsetY = (containerHeight - renderHeight) / 2;
    } else {
        // Video is taller than container (bars left/right)
        renderHeight = containerHeight;
        renderWidth = containerHeight * videoAspect;
        offsetX = (containerWidth - renderWidth) / 2;
        offsetY = 0;
    }

    return { renderWidth, renderHeight, offsetX, offsetY };
};

// Converts Screen Click -> Natural Video Pixel
export const screenToVideo = (clientX: number, clientY: number, containerRect: DOMRect, natW: number, natH: number) => {
    const { renderWidth, renderHeight, offsetX, offsetY } = getMediaLayout(containerRect, natW, natH);
    const clickX = clientX - containerRect.left;
    const clickY = clientY - containerRect.top;

    return {
        x: ((clickX - offsetX) / renderWidth) * natW,
        y: ((clickY - offsetY) / renderHeight) * natH,
        isOutOfBounds: (clickX < offsetX || clickX > offsetX + renderWidth || clickY < offsetY || clickY > offsetY + renderHeight)
    };
};

// Converts Natural Video Pixel -> Screen Percentage (for CSS)
export const videoToCSS = (videoPt: Point, containerRect: DOMRect, natW: number, natH: number) => {
    const { renderWidth, renderHeight, offsetX, offsetY } = getMediaLayout(containerRect, natW, natH);
    const screenX = offsetX + (videoPt.x / natW) * renderWidth;
    const screenY = offsetY + (videoPt.y / natH) * renderHeight;

    return {
        left: `${(screenX / containerRect.width) * 100}%`,
        top: `${(screenY / containerRect.height) * 100}%`
    };
};