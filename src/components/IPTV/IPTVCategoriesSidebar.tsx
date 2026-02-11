import { Tv, ChevronLeft, ChevronRight } from "lucide-react";
import type { ChannelCategory } from "@/types/xtream";

interface IPTVCategoriesSidebarProps {
    categories: ChannelCategory[];
    selectedCategoryId: string;
    onCategorySelect: (categoryId: string) => void;
    isSidebarOpen: boolean;
    isMenuCollapsed: boolean;
    onToggleMenuCollapsed: () => void;
    totals: { totalStreams: number; totalCategories: number };
}

export const IPTVCategoriesSidebar = ({
    categories,
    selectedCategoryId,
    onCategorySelect,
    isSidebarOpen,
    isMenuCollapsed,
    onToggleMenuCollapsed,
    totals,
}: IPTVCategoriesSidebarProps) => {
    return (
        <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-900/95 backdrop-blur-md border-r border-white/10 transition-all duration-300 ease-in-out shadow-2xl shadow-black/40 lg:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                } ${isMenuCollapsed ? "w-16" : "w-64"}`}
        >
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                    {!isMenuCollapsed && (
                        <div className="flex items-center gap-2">
                            <Tv className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold text-white">IPTV</span>
                        </div>
                    )}
                    <button
                        onClick={onToggleMenuCollapsed}
                        className="rounded-md p-1.5 text-slate-400 hover:text-white transition-colors"
                        title={isMenuCollapsed ? "Expand menu" : "Collapse menu"}
                    >
                        {isMenuCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Stats */}
                {!isMenuCollapsed && (
                    <div className="p-3 border-b border-white/10">
                        <div className="flex gap-4 text-xs text-slate-400">
                            <span>{totals.totalCategories} categories</span>
                            <span>{totals.totalStreams} channels</span>
                        </div>
                    </div>
                )}

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => onCategorySelect(category.id)}
                            className={`w-full rounded-md p-2 mb-1 text-left transition-all ${selectedCategoryId === category.id
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                            title={category.name}
                        >
                            {isMenuCollapsed ? (
                                <span className="text-xs font-bold">
                                    {category.name.charAt(0).toUpperCase()}
                                </span>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate">
                                        {category.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {category.streams.length}
                                    </span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
};
