import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, FileVideo, Calendar, Clock, RefreshCw, Layers } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoFile {
    filename: string;
    path: string;
    url: string;
    date: string;
    size: number;
}

export const VideoManager = () => {
    const [videos, setVideos] = useState<VideoFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);

    const fetchVideos = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/videos`);
            if (res.ok) {
                const data = await res.json();
                setVideos(data);
            }
        } catch (error) {
            console.error("Failed to fetch videos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderVideoGrid = (
        videoList: VideoFile[],
        loading: boolean,
        onSelect: (v: VideoFile) => void,
        fmtSize: (b: number) => string
    ) => {
        if (videoList.length === 0 && !loading) {
            return (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-xs">
                    <FileVideo className="w-8 h-8 mb-2 opacity-20" />
                    No extracted clips found.
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {videoList.map((video) => (
                    <Dialog key={video.path}>
                        <DialogTrigger asChild>
                            <div
                                className="group relative aspect-video bg-black/40 rounded-lg border border-white/5 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all hover:scale-[1.02]"
                                onClick={() => onSelect(video)}
                            >
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-purple-600/80 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <Play className="w-4 h-4 text-white fill-current" />
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                    <p className="text-[10px] font-bold text-white truncate">{video.filename}</p>
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-2 h-2" />
                                            {new Date(video.date).toLocaleDateString()}
                                        </span>
                                        <span>{fmtSize(video.size)}</span>
                                    </div>
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-black border-white/10 p-1">
                            <DialogHeader className="p-4 absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                                <DialogTitle className="text-white text-sm font-mono shadow-black drop-shadow-md">
                                    {video.filename}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="aspect-video w-full bg-black flex items-center justify-center overflow-hidden rounded-sm">
                                <video
                                    src={`${API_BASE_URL}${video.url}`}
                                    controls
                                    autoPlay
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="p-2 flex justify-between text-xs text-slate-400 font-mono bg-slate-900/50">
                                <span>{new Date(video.date).toLocaleString()}</span>
                                <span>{fmtSize(video.size)}</span>
                            </div>
                        </DialogContent>
                    </Dialog>
                ))}
            </div>
        );
    };

    return (
        <Card className="h-full bg-slate-950 border-white/10 flex flex-col">
            <CardHeader className="p-4 border-b border-white/10 bg-slate-900/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                    <FileVideo className="w-4 h-4 text-purple-400" />
                    Video Library
                    <Badge variant="outline" className="ml-2 bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {videos.length}
                    </Badge>
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchVideos} disabled={isLoading}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 bg-slate-950/30">
                <Tabs defaultValue="all" className="h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-900/20">
                        <Layers className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                        <TabsList className="bg-transparent p-0 h-auto gap-2">
                            <TabsTrigger value="all" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 border border-transparent data-[state=active]:border-purple-500/20 rounded-md px-3 py-1.5 h-auto text-xs">
                                All Clips
                            </TabsTrigger>
                            {Array.from(new Set(videos.map(v => v.path.split(/[/\\]/)[0]))).filter(c => c && !c.endsWith('.mp4')).sort().map(category => (
                                <TabsTrigger key={category} value={category} className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 border border-transparent data-[state=active]:border-blue-500/20 rounded-md px-3 py-1.5 h-auto text-xs uppercase">
                                    {category}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <TabsContent value="all" className="m-0 mt-0">
                            {renderVideoGrid(videos, isLoading, setSelectedVideo, formatSize)}
                        </TabsContent>
                        {Array.from(new Set(videos.map(v => v.path.split(/[/\\]/)[0]))).map(category => (
                            <TabsContent key={category} value={category} className="m-0 mt-0">
                                {renderVideoGrid(videos.filter(v => v.path.startsWith(category)), isLoading, setSelectedVideo, formatSize)}
                            </TabsContent>
                        ))}
                    </ScrollArea>
                </Tabs>
            </CardContent>
        </Card>
    );
};
