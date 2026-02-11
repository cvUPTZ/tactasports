import {
    LayoutDashboard,
    BarChart3,
    ShieldCheck,
    Activity,
    Users,
    Settings,
    ChevronRight,
    LogOut,
    Monitor,
    UserCog,
    Globe,
    FileVideo
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export type ViewType = "dashboard" | "analytics" | "qa" | "tactics" | "community" | "settings" | "monitoring" | "admin" | "video_manager";

interface AppSidebarProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

const items = [
    {
        title: "Dashboard",
        view: "dashboard" as ViewType,
        icon: LayoutDashboard,
        permission: "dashboard.view",
        description: "Live & Post-Match"
    },
    {
        title: "Live Stream",
        view: "dashboard" as ViewType, // Intentionally same view, but focuses stream
        icon: Monitor,
        permission: "dashboard.live.stream.view",
        description: "Broadcast Control"
    },
    {
        title: "Stats",
        view: "analytics" as ViewType,
        icon: BarChart3,
        permission: "analytics.view",
        description: "Data Trends"
    },
    {
        title: "Tactics",
        view: "tactics" as ViewType,
        icon: Activity,
        permission: "analytics.advanced",
        description: "Strategy Board"
    },
    {
        title: "Monitoring",
        view: "monitoring" as ViewType,
        icon: Monitor,
        permission: "monitoring.view",
        description: "System Health"
    },
    {
        title: "QA Suite",
        view: "qa" as ViewType,
        icon: ShieldCheck,
        permission: "qa.view",
        description: "Validation"
    },
    {
        title: "Community",
        view: "community" as ViewType,
        icon: Globe,
        permission: "community.view",
        description: "Hub"
    },
    {
        title: "Video Manager",
        view: "video_manager" as ViewType,
        icon: FileVideo,
        permission: "admin.view", // Restricted to admin permissions
        description: "Clips Library"
    },
    {
        title: "Admin Portal",
        path: "/admin",
        icon: UserCog,
        permission: "admin.view",
        description: "Configuration"
    }
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
    const { user, logout, hasPermission } = useAuth();
    const navigate = useNavigate();

    const filteredItems = items.filter(item => {
        if ('hidden' in item && (item as any).hidden) return false;
        if (!item.permission) return true;
        return hasPermission(item.permission);
    });

    return (
        <Sidebar collapsible="icon" className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20">
                        T
                    </div>
                    <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                        <span className="font-bold leading-none tracking-tight">Tacta</span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-70">
                            {user?.role.replace('_', ' ') || 'Pro Analytics'}
                        </span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 group-data-[collapsible=icon]:hidden">
                        Main Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={currentView === item.view || (item.path && window.location.pathname === item.path)}
                                        onClick={() => {
                                            if (item.path) {
                                                navigate(item.path);
                                            } else if (item.view) {
                                                onViewChange(item.view);
                                                if (window.location.pathname !== '/') {
                                                    navigate('/');
                                                }
                                            }
                                        }}
                                        className={`h-10 transition-all duration-200 ${currentView === item.view
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                    >
                                        <item.icon className={`h-4.5 w-4.5 ${currentView === item.view ? "animate-pulse" : ""}`} />
                                        <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                                            <span className="font-medium text-xs">{item.title}</span>
                                            {item.description && (
                                                <span className="text-[9px] text-muted-foreground/60 font-normal">{item.description}</span>
                                            )}
                                        </div>
                                        {currentView === item.view && (
                                            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50 group-data-[collapsible=icon]:hidden" />
                                        )}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-border/20">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={logout}
                            tooltip="Logout"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                            <span className="font-medium group-data-[collapsible=icon]:hidden">Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
