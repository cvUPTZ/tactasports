import { Tv } from "lucide-react";
import { IPTVVideoPlayer } from "./IPTVVideoPlayer";
import type { ChannelStream } from "@/types/xtream";

interface IPTVVideoPlayerAreaProps {
    selectedStream: ChannelStream | null;
    isPlayerOpen: boolean;
    onClosePlayer: () => void;
}

export const IPTVVideoPlayerArea = ({
    selectedStream,
    isPlayerOpen,
    onClosePlayer,
}: IPTVVideoPlayerAreaProps) => {
    return (
        <div className="flex-1 flex flex-col min-w-0">
            {selectedStream && isPlayerOpen ? (
                <div className="h-full w-full bg-black">
                    <IPTVVideoPlayer
                        streamUrl={selectedStream.streamUrl}
                        channelName={selectedStream.name}
                        isOpen={true}
                        onClose={onClosePlayer}
                        isEmbedded={true}
                    />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-900/50">
                    <div className="text-center text-slate-400">
                        <Tv className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                        <h3 className="text-lg font-semibold mb-2">Video Player</h3>
                        <p className="text-sm">Select a channel to play</p>
                    </div>
                </div>
            )}
        </div>
    );
};
