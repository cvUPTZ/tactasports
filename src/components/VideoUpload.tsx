import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoUploadProps {
    onVideoUpload: (file: File) => void;
    currentVideo: File | null;
    onClearVideo: () => void;
}

export const VideoUpload = ({ onVideoUpload, currentVideo, onClearVideo }: VideoUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndUpload(file);
        }
    };

    const validateAndUpload = (file: File) => {
        // Check if it's a video or image file
        if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
            toast({
                title: "Invalid File",
                description: "Please select a valid video or image file",
                variant: "destructive"
            });
            return;
        }

        // Check file size (max 2GB)
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
        if (file.size > maxSize) {
            toast({
                title: "File Too Large",
                description: "Video file must be less than 2GB",
                variant: "destructive"
            });
            return;
        }

        onVideoUpload(file);
        toast({
            title: "Video Loaded",
            description: `${file.name} ready for analysis`
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            validateAndUpload(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="flex items-center gap-2">
            {!currentVideo ? (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="gap-1 text-xs"
                        title="Upload match video/image"
                    >
                        <Upload className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Upload Media</span>
                    </Button>
                </>
            ) : (
                <div className="flex items-center gap-1">
                    <Video className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    <span className="text-xs hidden md:inline max-w-[100px] truncate" title={currentVideo.name}>
                        {currentVideo.name}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearVideo}
                        className="h-6 w-6 p-0"
                        title="Clear video"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </div>
    );
};
