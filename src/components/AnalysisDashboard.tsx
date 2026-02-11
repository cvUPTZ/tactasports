import { LoggedEvent } from "@/hooks/useGamepad";
import { analyzeEvents, DerivedEvent } from "@/utils/analysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

interface AnalysisDashboardProps {
    events: LoggedEvent[];
    onJumpToTime: (time: number) => void;
}

export const AnalysisDashboard = ({ events, onJumpToTime }: AnalysisDashboardProps) => {
    const derivedEvents = analyzeEvents(events);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (derivedEvents.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Advanced Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        No advanced patterns detected yet. Log more events with spatial data (if available) to see analysis.
                    </p>
                    <div className="mt-4 p-2 bg-muted rounded text-xs font-mono">
                        <p>Debug Info:</p>
                        <p>Total Events: {events.length}</p>
                        <p>Events with Video Time: {events.filter(e => e.videoTime !== undefined).length}</p>
                        <p>Try logging 3 consecutive "Pass" events to test.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Advanced Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {derivedEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div>
                            <h4 className="font-semibold text-sm">{event.name}</h4>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                            <p className="text-xs font-mono mt-1">
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onJumpToTime(event.startTime)}
                            title="Play Clip"
                        >
                            <PlayCircle className="h-4 w-4 text-primary" />
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};
