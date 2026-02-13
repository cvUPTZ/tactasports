import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import * as fabric from 'fabric';

interface ScribeStep {
    id: string;
    timestamp: number;
    imageUrl: string;
    targetLabel: string;
    action: string;
    context?: string;
}

interface ScribeContextType {
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    steps: ScribeStep[];
    clearSteps: () => void;
}

const ScribeContext = createContext<ScribeContextType | undefined>(undefined);

export const ScribeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [steps, setSteps] = useState<ScribeStep[]>([]);

    const startRecording = () => setIsRecording(true);
    const stopRecording = () => setIsRecording(false);
    const clearSteps = () => setSteps([]);

    const captureStep = useCallback(async (element: HTMLElement, label: string) => {
        if (!isRecording) return;

        try {
            // Find the nearest widget or reasonable container for context
            const container = element.closest('.dashboard-widget') ||
                element.closest('#dashboard-header') ||
                element.closest('#app-sidebar') ||
                document.body;

            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Relative position for annotation
            const relX = elementRect.left - containerRect.left;
            const relY = elementRect.top - containerRect.top;

            const htmlCanvas = await html2canvas(container as HTMLElement, {
                useCORS: true,
                scale: 1,
                // Don't capture the whole body if we can help it
            });

            // Use Fabric to Auto-Annotate v7 style
            const fabricCanvas = new fabric.StaticCanvas(undefined, {
                width: htmlCanvas.width,
                height: htmlCanvas.height
            });

            // v7 uses FabricImage and fromURL returns a Promise
            const img = await fabric.FabricImage.fromURL(htmlCanvas.toDataURL());

            fabricCanvas.add(img);

            // Add highlight box
            const rect = new fabric.Rect({
                left: relX,
                top: relY,
                width: elementRect.width,
                height: elementRect.height,
                fill: 'transparent',
                stroke: '#ef4444', // Tailwind red-500
                strokeWidth: 4,
                rx: 4,
                ry: 4
            });

            fabricCanvas.add(rect);
            fabricCanvas.renderAll();

            const step: ScribeStep = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                imageUrl: fabricCanvas.toDataURL({ format: 'png', multiplier: 1 }),
                targetLabel: label,
                action: 'Click',
            };

            setSteps(prev => [...prev, step]);
        } catch (err) {
            console.error('AutoScribe Capture Failed:', err);
        }
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Filter out clicks on the scribe controls themselves if needed
            if (target.closest('.scribe-ignore')) return;

            const label = target.getAttribute('aria-label') ||
                target.innerText ||
                target.title ||
                'Element';

            captureStep(target, label.trim());
        };

        window.addEventListener('click', handleClick, true);
        return () => window.removeEventListener('click', handleClick, true);
    }, [isRecording, captureStep]);

    const value = React.useMemo(() => ({
        isRecording,
        startRecording,
        stopRecording,
        steps,
        clearSteps
    }), [isRecording, steps]);

    return (
        <ScribeContext.Provider value={value}>
            {children}
        </ScribeContext.Provider>
    );
};

export const useScribe = () => {
    const context = useContext(ScribeContext);
    if (!context) throw new Error('useScribe must be used within ScribeProvider');
    return context;
};
