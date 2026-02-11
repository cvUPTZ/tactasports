import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";

interface VideoControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    togglePlay: () => void;
    handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    changePlaybackRate: () => void;
    skipTime: (seconds: number) => void;
    formatTime: (seconds: number) => string;
}

export const VideoControls = ({
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    changePlaybackRate,
    skipTime,
    formatTime
}: VideoControlsProps) => {
    return (
        <div className="space-y-2 p-2 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground min-w-[45px]">
                    {formatTime(currentTime)}
                </span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) 100%)`
                    }}
                />
                <span className="text-xs text-muted-foreground min-w-[45px]">
                    {formatTime(duration)}
                </span>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => skipTime(-10)} title="Back 10s">
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={togglePlay}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => skipTime(10)} title="Forward 10s">
                        <SkipForward className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleMute}>
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1"
                    />
                    <Button variant="ghost" size="sm" onClick={changePlaybackRate}>
                        <span className="text-xs">{playbackRate}x</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
