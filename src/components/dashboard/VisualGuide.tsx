import React, { useEffect, useRef } from 'react';
import Shepherd from 'shepherd.js';
import '@/styles/shepherd.css';

interface VisualGuideProps {
    run: boolean;
    onFinish: () => void;
}

export const VisualGuide: React.FC<VisualGuideProps> = ({ run, onFinish }) => {
    const tourRef = useRef<Shepherd.Tour | null>(null);

    useEffect(() => {
        // Initialize Tour
        tourRef.current = new Shepherd.Tour({
            defaultStepOptions: {
                classes: 'shepherd-element shadow-2xl',
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: {
                    enabled: true
                },
                modalOverlayOpeningPadding: 8,
                modalOverlayOpeningRadius: 8,
            },
            useModalOverlay: true
        });

        const tour = tourRef.current;

        // --- Step 1: Welcome ---
        tour.addStep({
            id: 'welcome',
            title: 'Welcome to Tacta!',
            text: 'Let\'s take a deep dive into the dashboard to master soccer analysis.',
            classes: 'shepherd-element shepherd-welcome shadow-2xl',
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Skip',
                    action: tour.cancel
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Get Started',
                    action: tour.next
                }
            ]
        });

        // --- Step 2: Session Mode ---
        tour.addStep({
            id: 'session-mode',
            title: 'Session Mode',
            text: 'Your first choice: <b>Collaboration</b> for voice-linked team analysis, or <b>Individual Work</b> for solo tagging.',
            attachTo: {
                element: '#session-mode-modal',
                on: 'bottom'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 3: Sidebar ---
        tour.addStep({
            id: 'sidebar',
            title: 'Global Navigation',
            text: 'Access the Dashboard, Analytics, QA Suite, and more from this centralized hub.',
            attachTo: {
                element: '#app-sidebar',
                on: 'right'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 4: Analysis Mode Selector ---
        tour.addStep({
            id: 'analysis-mode',
            title: 'Analysis Context',
            text: 'Switch between <b>LIVE</b> for real-time tagging and <b>POST-MATCH</b> for deep retrospective analysis.',
            attachTo: {
                element: '#analysis-mode-selector',
                on: 'bottom'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 5: Match Timer ---
        tour.addStep({
            id: 'match-timer',
            title: 'Match Synchronization',
            text: 'Control the match clock. All tagged events are automatically timestamped based on this duration.',
            attachTo: {
                element: '#match-timer-section',
                on: 'bottom'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 6: Voice Commands ---
        tour.addStep({
            id: 'voice-cmd',
            title: 'Hands-Free Tagging',
            text: 'Activate <b>Voice Cmd</b> to tag events using your voice while keeping your eyes on the action.',
            attachTo: {
                element: '#voice-commands-btn',
                on: 'bottom'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 7: Team Tools ---
        tour.addStep({
            id: 'team-tools',
            title: 'Squad Management',
            text: 'Upload rosters and switch between active teams to ensure accurate player-event attribution.',
            attachTo: {
                element: '#team-grid-section',
                on: 'right'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 8: Voice Buffer ---
        tour.addStep({
            id: 'voice-buffer',
            title: 'Real-time Feedback',
            text: 'The <b>Voice Buffer</b> shows phonetic feedback as you speak, ensuring your commands are accurately recognized.',
            attachTo: {
                element: '#live-voice-buffer',
                on: 'bottom'
            },
            canClickTarget: false,
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 9: Controller Config ---
        tour.addStep({
            id: 'controller-config',
            title: 'Custom Configuration',
            text: 'Review active mappings or customize your gamepad/keyboard layout to suit your tagging style.',
            attachTo: {
                element: '#controller-config-section',
                on: 'right'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 10: Video Player ---
        tour.addStep({
            id: 'main-video',
            title: 'Visual Core',
            text: 'This is where the magic happens. Connect to a live stream or local file for frame-by-frame analysis.',
            attachTo: {
                element: '#main-video',
                on: 'top'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 11: Prediction Engine ---
        tour.addStep({
            id: 'predictor',
            title: 'AI Prediction Engine',
            text: 'Our AI analyzes patterns to suggest the most likely next event, speeding up your workflow significantly.',
            attachTo: {
                element: '#predictor-stats',
                on: 'left'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 12: Event Log ---
        tour.addStep({
            id: 'event-log',
            title: 'Live Event Log',
            text: 'Every tagged moment appears here. Review, edit, or undo events instantly to maintain data integrity.',
            attachTo: {
                element: '#event-log-container',
                on: 'left'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 13: Context Review ---
        tour.addStep({
            id: 'context-review',
            title: 'Context & Review',
            text: 'Select players from the roster or deep-dive into video clips for verification and coaching bits.',
            attachTo: {
                element: '#context-review-section',
                on: 'left'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // --- Step 14: Help & Support ---
        tour.addStep({
            id: 'help',
            title: 'Always Available',
            text: 'Need a refresher? Restart this tour or access detailed help documentation anytime from the header.',
            attachTo: {
                element: '#help-button',
                on: 'bottom'
            },
            buttons: [
                {
                    classes: 'shepherd-button-secondary shepherd-button',
                    text: 'Back',
                    action: tour.back
                },
                {
                    classes: 'shepherd-button-primary shepherd-button',
                    text: 'Finish',
                    action: tour.complete
                }
            ]
        });

        // Events
        tour.on('complete', () => {
            console.log("[Tour] Complete event fired");
            onFinish();
        });

        tour.on('cancel', () => {
            console.log("[Tour] Cancel event fired");
            onFinish();
        });

        return () => {
            console.log("[Tour] Cleaning up tour instance...");
            if (tourRef.current) {
                // Remove listeners to prevent cleanup from triggering onFinish
                tourRef.current.off('complete');
                tourRef.current.off('cancel');
                tourRef.current.cancel();
            }
        };
    }, [onFinish]);

    useEffect(() => {
        if (run && tourRef.current) {
            console.log("[Tour] Starting tour via run prop");
            // Check if any element in the sequence is missing (Optional: Shepherd handles this, but logging helps)
            tourRef.current.start();
        } else if (!run && tourRef.current && tourRef.current.isActive()) {
            console.log("[Tour] Stopping tour via run prop");
            tourRef.current.cancel();
        }
    }, [run]);

    return null; // Shepherd handles its own rendering
};
