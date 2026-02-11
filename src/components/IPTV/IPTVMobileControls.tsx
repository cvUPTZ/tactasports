import { Menu, List } from "lucide-react";

interface IPTVMobileControlsProps {
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    onToggleChannelList: () => void;
}

export const IPTVMobileControls = ({
    isSidebarOpen,
    onToggleSidebar,
    onToggleChannelList,
}: IPTVMobileControlsProps) => {
    return (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
            <button
                onClick={onToggleSidebar}
                className={`rounded-md p-2 transition-colors ${isSidebarOpen
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                title="Toggle categories"
            >
                <Menu className="h-5 w-5" />
            </button>

            <span className="text-white font-semibold">IPTV Player</span>

            <button
                onClick={onToggleChannelList}
                className="rounded-md p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Toggle channel list"
            >
                <List className="h-5 w-5" />
            </button>
        </div>
    );
};
