import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface LayoutConfig {
    [key: string]: {
        hidden: boolean;
        order?: number; // Future proofing for reordering
    };
}

const STORAGE_KEY = 'tacta_dashboard_layout_v1';

export const useDashboardLayout = () => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({});

    // Load config on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setLayoutConfig(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load dashboard layout', e);
        }
    }, []);

    const toggleComponentVisibility = useCallback((id: string) => {
        setLayoutConfig(prev => {
            const current = prev[id] || { hidden: false };
            return {
                ...prev,
                [id]: { ...current, hidden: !current.hidden }
            };
        });
    }, []);

    const saveLayout = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutConfig));
            toast.success('Dashboard layout saved');
            setIsEditMode(false);
        } catch (e) {
            toast.error('Failed to save layout');
        }
    }, [layoutConfig]);

    const resetLayout = useCallback(() => {
        setLayoutConfig({});
        localStorage.removeItem(STORAGE_KEY);
        toast.info('Layout reset to default');
    }, []);

    return {
        isEditMode,
        setIsEditMode,
        layoutConfig,
        toggleComponentVisibility,
        saveLayout,
        resetLayout
    };
};
