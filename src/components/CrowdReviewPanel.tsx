import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, ANALYSIS_API_URL } from '@/utils/apiConfig';
import {
    Users,
    Send,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MessageSquare,
    RefreshCw
} from 'lucide-react';

interface CrowdReviewPanelProps {
    videoFile: File | null;
    currentVideoTime: number;
    matchName?: string;
    preSelectedEvent?: string;
}

interface ClipStatus {
    clip_id: number;
    filename: string;
    stage: string;
    status: string;
    consensus_event: string | null;
    vote_count: number;
    required_votes: number;
    vote_breakdown: Record<string, number>;
}

export const CrowdReviewPanel: React.FC<CrowdReviewPanelProps> = ({
    videoFile,
    currentVideoTime,
    matchName = "Unknown Match",
    preSelectedEvent
}) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingClips, setPendingClips] = useState<ClipStatus[]>([]);
    const [customTimestamp, setCustomTimestamp] = useState<string>('');
    const eventType = preSelectedEvent || 'General';

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const parseTimeToSeconds = (timeStr: string): number | null => {
        const match = timeStr.match(/^(\d+):(\d{2})$/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        const num = parseFloat(timeStr);
        return isNaN(num) ? null : num;
    };

    const handleSendToCrowd = async (timestampSeconds?: number) => {
        if (!videoFile) {
            toast({
                title: "No Video",
                description: "Please load a video file first",
                variant: "destructive"
            });
            return;
        }

        const timestamp = timestampSeconds ?? currentVideoTime;
        setIsSubmitting(true);

        try {
            // Use FormData to upload video file
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('timestamp_seconds', timestamp.toString());
            formData.append('match_name', matchName);
            formData.append('event_type', eventType === 'General' ? '' : eventType);
            formData.append('window_seconds', '10.0');

            const response = await fetch(`${ANALYSIS_API_URL}/api/crowd/request-review-upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "📹 Sent to Crowd!",
                    description: `Clip at ${formatTime(timestamp)} queued for fan annotation.`
                });

                // Add to pending clips list
                setPendingClips(prev => [...prev, {
                    clip_id: data.clip_id,
                    filename: data.clip_filename,
                    stage: 'crowd_voting',
                    status: 'pending',
                    consensus_event: null,
                    vote_count: 0,
                    required_votes: 10,
                    vote_breakdown: {}
                }]);
            } else {
                throw new Error(data.error || 'Failed to send clip');
            }
        } catch (error) {
            console.error('Crowd review error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to send clip for review",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckStatus = async (clipId: number) => {
        try {
            const response = await fetch(`${ANALYSIS_API_URL}/api/crowd/status/${clipId}`);
            const data = await response.json();

            if (data.success) {
                setPendingClips(prev => prev.map(clip =>
                    clip.clip_id === clipId ? {
                        ...clip,
                        stage: data.stage,
                        status: data.status,
                        consensus_event: data.consensus_event,
                        vote_count: data.vote_count,
                        vote_breakdown: data.vote_breakdown
                    } : clip
                ));
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const handleSendCustomTimestamp = () => {
        const seconds = parseTimeToSeconds(customTimestamp);
        if (seconds !== null) {
            handleSendToCrowd(seconds);
            setCustomTimestamp('');
        } else {
            toast({
                title: "Invalid Format",
                description: "Use MM:SS or seconds (e.g., 45:30 or 2730)",
                variant: "destructive"
            });
        }
    };

    return (
        <Card className="p-4 bg-card/50 border-2 border-primary/20 mt-3">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Crowd Annotation</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                    {pendingClips.length} pending
                </Badge>
            </div>

            {preSelectedEvent && (
                <div className="mb-4 p-2 bg-primary/5 rounded border border-primary/20">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                        Active Event Context
                    </label>
                    <Badge variant="secondary" className="text-[11px] font-bold uppercase">
                        {preSelectedEvent}
                    </Badge>
                </div>
            )}

            {/* Quick Send - Current Timestamp */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleSendToCrowd()}
                        disabled={isSubmitting || !videoFile}
                        className="flex-1 gap-2"
                        variant="default"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Send to Fans ({formatTime(currentVideoTime)})
                    </Button>
                </div>

                {/* Custom Timestamp */}
                <div className="flex gap-2">
                    <Input
                        placeholder="MM:SS or seconds"
                        value={customTimestamp}
                        onChange={(e) => setCustomTimestamp(e.target.value)}
                        className="h-9 text-xs"
                    />
                    <Button
                        onClick={handleSendCustomTimestamp}
                        disabled={!customTimestamp || isSubmitting}
                        variant="outline"
                        size="sm"
                        className="h-9"
                    >
                        <Clock className="w-4 h-4" />
                    </Button>
                </div>

                {!videoFile && (
                    <p className="text-[10px] text-muted-foreground text-center">
                        Load a video to enable crowd annotation
                    </p>
                )}
            </div>

            {/* Pending Clips */}
            {pendingClips.length > 0 && (
                <div className="mt-4 space-y-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                        Pending Reviews
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {pendingClips.map(clip => (
                            <div
                                key={clip.clip_id}
                                className="p-2 bg-muted/50 rounded-lg border border-border/50 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono">#{clip.clip_id}</span>
                                    <div className="flex items-center gap-2">
                                        {clip.status === 'confirmed' ? (
                                            <Badge variant="default" className="bg-green-500 text-[10px]">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                {clip.consensus_event}
                                            </Badge>
                                        ) : clip.status === 'ambiguous' ? (
                                            <Badge variant="destructive" className="text-[10px]">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Ambiguous
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px]">
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                {clip.vote_count}/{clip.required_votes} votes
                                            </Badge>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={() => handleCheckStatus(clip.clip_id)}
                                            title="Refresh status"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Vote Breakdown */}
                                {Object.keys(clip.vote_breakdown).length > 0 && (
                                    <div className="mt-2 flex gap-1 flex-wrap">
                                        {Object.entries(clip.vote_breakdown).map(([event, count]) => (
                                            <Badge key={event} variant="outline" className="text-[9px]">
                                                {event}: {count}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};
