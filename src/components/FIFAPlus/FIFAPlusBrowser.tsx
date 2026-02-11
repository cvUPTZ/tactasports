import React, { useState, useMemo } from 'react';
import { Search, Play, Calendar, Trophy, Globe, History, LayoutGrid, List, X, Info, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMatchContext } from "@/contexts/MatchContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FIFAPlusEvent {
    id: string;
    title: string;
    subtitle: string;
    thumbnail: string;
    type: 'live' | 'archive' | 'highlight';
    date: string;
    streamUrl: string;
    category: string;
}

const MOCK_EVENTS: FIFAPlusEvent[] = [
    {
        id: '1',
        title: 'FIFA World Cup 2026 Qualifiers',
        subtitle: 'Argentina vs Brazil',
        thumbnail: 'https://images.fifa.com/image/upload/t_l1/v1700147648/fifacom/Qualifiers_2026.jpg',
        type: 'live',
        date: 'LIVE NOW',
        streamUrl: 'https://demo.unified-streaming.com/k8s/live/stable/sintel.isml/.m3u8',
        category: 'Qualifiers'
    },
    {
        id: '2',
        title: 'FIFA Club World Cup',
        subtitle: 'Manchester City vs Al Ahly',
        thumbnail: 'https://images.fifa.com/image/upload/t_l1/v1698765432/fifacom/CWC_2023.jpg',
        type: 'archive',
        date: '20 Dec 2023',
        streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        category: 'Club World Cup'
    },
    {
        id: '3',
        title: 'FIFA Women\'s World Cup',
        subtitle: 'Spain vs England - Final',
        thumbnail: 'https://images.fifa.com/image/upload/t_l1/v1692523456/fifacom/WWC_Final.jpg',
        type: 'archive',
        date: '20 Aug 2023',
        streamUrl: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
        category: 'Women\'s World Cup'
    },
    {
        id: '4',
        title: 'U-17 World Cup Highlights',
        subtitle: 'Germany vs France',
        thumbnail: 'https://images.fifa.com/image/upload/t_l1/v1701543210/fifacom/U17_Final.jpg',
        type: 'highlight',
        date: '02 Dec 2023',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        category: 'U-17 World Cup'
    }
];

export function FIFAPlusBrowser() {
    const { setStreamUrl, setVideoMode, setUseVideoMode } = useMatchContext();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState<'all' | 'live' | 'archive'>('all');

    const filteredEvents = useMemo(() => {
        return MOCK_EVENTS.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filter === 'all' || event.type === filter;
            return matchesSearch && matchesFilter;
        });
    }, [searchTerm, filter]);

    const handleSelectEvent = (event: FIFAPlusEvent) => {
        if (user?.role === 'admin') {
            setStreamUrl(event.streamUrl);
            setVideoMode('fifaplus');
            setUseVideoMode(true);
            toast.success(`FIFA+ Selected: ${event.title} - ${event.subtitle}`);
        } else {
            toast.error('Only administrators can broadcast FIFA+ streams');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
            {/* Header / Search */}
            <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                            <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">FIFA+ Source</h2>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Digital Content Archive</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search events, matches, teams..."
                                className="bg-slate-800/50 border-white/10 pl-10 h-10 text-sm focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex items-center bg-slate-800/40 rounded-lg p-1 border border-white/5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8", viewMode === 'grid' ? "bg-slate-700 text-white" : "text-slate-400")}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8", viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-400")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 no-scrollbar">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className="rounded-full h-8 px-4 text-xs font-bold uppercase tracking-wider"
                    >
                        All Content
                    </Button>
                    <Button
                        variant={filter === 'live' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('live')}
                        className="rounded-full h-8 px-4 text-xs font-bold uppercase tracking-wider gap-2"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live
                    </Button>
                    <Button
                        variant={filter === 'archive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('archive')}
                        className="rounded-full h-8 px-4 text-xs font-bold uppercase tracking-wider"
                    >
                        Full Matches
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {filteredEvents.length > 0 ? (
                    <div className={cn(
                        "grid gap-6",
                        viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {filteredEvents.map(event => (
                            <div
                                key={event.id}
                                className={cn(
                                    "group relative bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10",
                                    viewMode === 'list' && "flex gap-6 h-48"
                                )}
                            >
                                {/* Thumbnail */}
                                <div className={cn(
                                    "relative overflow-hidden",
                                    viewMode === 'grid' ? "aspect-video" : "w-80 h-full"
                                )}>
                                    <img
                                        src={event.thumbnail}
                                        alt={event.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                                    {event.type === 'live' && (
                                        <Badge className="absolute top-3 left-3 bg-red-600 hover:bg-red-700 text-white border-none px-2 py-0.5 text-[10px] font-black italic">
                                            LIVE
                                        </Badge>
                                    )}

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                        <Button
                                            size="icon"
                                            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl scale-90 group-hover:scale-100 transition-transform"
                                            onClick={() => handleSelectEvent(event)}
                                        >
                                            <Play className="w-8 h-8 fill-current ml-1" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-5 flex flex-col justify-between flex-1">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-[9px] border-white/10 text-slate-400 font-bold uppercase py-0 leading-none">
                                                {event.category}
                                            </Badge>
                                            <span className="text-[10px] text-slate-500 font-mono italic">{event.date}</span>
                                        </div>
                                        <h3 className="font-bold text-slate-100 group-hover:text-primary transition-colors leading-tight mb-1">
                                            {event.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 font-medium">
                                            {event.subtitle}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-0 text-xs font-bold text-slate-500 hover:text-white transition-colors gap-2"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                            Details
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 group/link text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all gap-2"
                                            onClick={() => window.open(`https://www.fifa.com/fifaplus/en/watch/${event.id}`, '_blank')}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                                            Watch on FIFA+
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <Search className="w-8 h-8 text-slate-700" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No matching events found</h3>
                        <p className="text-slate-400 max-w-md mx-auto">
                            We couldn't find anything matching "{searchTerm}". Try checking your spelling or using more general terms.
                        </p>
                        <Button
                            variant="link"
                            className="mt-4 text-primary font-bold"
                            onClick={() => { setSearchTerm(''); setFilter('all'); }}
                        >
                            Reset Search
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer / Disclaimer */}
            <div className="p-4 border-t border-white/5 bg-slate-900/30 flex items-center justify-between px-6">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> Recent Activity</span>
                    <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> International Feed</span>
                </div>
                <div className="text-[10px] text-slate-600 italic">
                    All trademarks belong to their respective owners.
                </div>
            </div>
        </div>
    );
}
