// src/hooks/usePictureInPicture.ts - Picture-in-Picture window management
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function usePictureInPicture() {
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const { toast } = useToast();

    const setupWindow = (win: Window) => {
        // Copy all stylesheets to PiP window
        [...document.styleSheets].forEach(styleSheet => {
            try {
                if (styleSheet.href) {
                    const link = win.document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = styleSheet.href;
                    win.document.head.appendChild(link);
                } else {
                    const style = win.document.createElement('style');
                    [...styleSheet.cssRules].forEach(rule => {
                        style.appendChild(win.document.createTextNode(rule.cssText));
                    });
                    win.document.head.appendChild(style);
                }
            } catch (e) {
                console.error('Error copying style:', e);
            }
        });

        // Handle window close
        win.addEventListener('pagehide', () => setPipWindow(null));
        win.addEventListener('unload', () => setPipWindow(null));

        setPipWindow(win);
    };

    const togglePiP = async () => {
        if (pipWindow) {
            pipWindow.close();
            setPipWindow(null);
            return;
        }

        // Try Document Picture-in-Picture API first
        if ('documentPictureInPicture' in window) {
            try {
                const pip = await (window as any).documentPictureInPicture.requestWindow({
                    width: 1000,
                    height: 800,
                });
                setupWindow(pip);
                return;
            } catch (err) {
                console.warn('Document PiP failed, falling back to popup:', err);
            }
        }

        // Fallback to popup window
        try {
            const popup = window.open('', 'SoccerLoggerPopup', 'width=1000,height=800,popup=yes');
            if (popup) {
                if (!popup.document.body) {
                    popup.document.write('<body></body>');
                }
                popup.document.title = 'Soccer Event Logger (Overlay)';
                setupWindow(popup);
            } else {
                toast({
                    title: 'Popup Blocked',
                    description: 'Please allow popups for this site to use the overlay.',
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Failed to open popup:', err);
            toast({
                title: 'Error',
                description: 'Failed to open Pop-out window.',
                variant: 'destructive',
            });
        }
    };

    return { pipWindow, togglePiP };
}
