import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface VisualGuideProps {
    run: boolean;
    onFinish: () => void;
}

export const VisualGuide: React.FC<VisualGuideProps> = ({ run, onFinish }) => {
    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            content: (
                <div className="text-left">
                    <h3 className="text-lg font-bold mb-2">Welcome to Tacta!</h3>
                    <p className="text-sm text-muted-foreground">
                        Let's take a quick tour of the dashboard to help you get started with soccer analysis.
                    </p>
                </div>
            ),
            disableBeacon: true,
        },
        {
            target: '#app-sidebar',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Navigation</h3>
                    <p className="text-xs text-muted-foreground">
                        Quickly switch between the Dashboard, Analytics, QA Suite, and other specialized views.
                    </p>
                </div>
            ),
            placement: 'right',
        },
        {
            target: '#dashboard-header',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Match Control</h3>
                    <p className="text-xs text-muted-foreground">
                        Switch between LIVE and POST-MATCH modes, control the match timer, and manage layout settings.
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#left-tools',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Team Tools</h3>
                    <p className="text-xs text-muted-foreground">
                        Upload team rosters, select active teams, and view controller/keyboard mappings for event tagging.
                    </p>
                </div>
            ),
            placement: 'right',
        },
        {
            target: '#main-video',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Video & Media</h3>
                    <p className="text-xs text-muted-foreground">
                        Upload video files or connect to a live broadcast for analysis. This is your primary workspace.
                    </p>
                </div>
            ),
            placement: 'top',
        },
        {
            target: '#event-log',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Event Log</h3>
                    <p className="text-xs text-muted-foreground">
                        All tagged events appear here in real-time. You can undo, edit, or flag missed events.
                    </p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '#predictor-stats',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Sequence Assistant</h3>
                    <p className="text-xs text-muted-foreground">
                        AI-powered predictions for the next likely event to help you tag faster and more accurately.
                    </p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '#help-button',
            content: (
                <div className="text-left">
                    <h3 className="text-sm font-bold mb-1 uppercase tracking-tight">Need Help?</h3>
                    <p className="text-xs text-muted-foreground">
                        You can restart this tour anytime by clicking the help icon in the header.
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            onFinish();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#16a34a', // matches Tailwind's green-600
                    backgroundColor: '#0f172a', // matches slate-900
                    textColor: '#f8fafc', // matches slate-50
                    arrowColor: '#0f172a',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonBack: {
                    marginRight: 10,
                    color: '#94a3b8', // slate-400
                },
                buttonNext: {
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '8px 16px',
                    borderRadius: '6px'
                },
                buttonSkip: {
                    fontSize: '12px',
                    color: '#94a3b8'
                }
            }}
        />
    );
};
