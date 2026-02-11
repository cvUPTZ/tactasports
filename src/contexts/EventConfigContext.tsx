import React, { createContext, useContext, useEffect, useState } from 'react';
import { EVENT_REGISTRY, EventDefinition } from '../config/eventRegistry';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/utils/apiConfig';

interface EventConfigContextType {
    events: EventDefinition[];
    isLoading: boolean;
    updateEvent: (updatedEvent: EventDefinition) => Promise<void>;
    resetToDefaults: () => Promise<void>;
    saveConfig: () => Promise<void>;
}

const EventConfigContext = createContext<EventConfigContextType | undefined>(undefined);

export const EventConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<EventDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchConfig = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/events-config`);
            if (!res.ok) throw new Error('Failed to fetch config');
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                setEvents(data);
            } else {
                // Determine if we should auto-init with defaults locally if server is empty
                console.log('No remote config found, using defaults.');
                setEvents(EVENT_REGISTRY);
            }
        } catch (err) {
            console.error('Failed to load event config:', err);
            // Fallback to static registry on error
            setEvents(EVENT_REGISTRY);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const saveConfig = async (newEvents = events) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/events-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvents)
            });
            if (!res.ok) throw new Error('Failed to save config');
            toast.success('Event configuration saved successfully');
        } catch (err) {
            console.error('Error saving config:', err);
            toast.error('Failed to save configuration');
        }
    };

    const updateEvent = async (updatedEvent: EventDefinition) => {
        const newEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        setEvents(newEvents);
        await saveConfig(newEvents);
    };

    const resetToDefaults = async () => {
        if (!confirm('Are you sure you want to reset all events to default settings?')) return;
        setEvents(EVENT_REGISTRY);
        await saveConfig(EVENT_REGISTRY);
        toast.info('Reset to default configuration');
    };

    return (
        <EventConfigContext.Provider value={{ events, isLoading, updateEvent, resetToDefaults, saveConfig: () => saveConfig() }}>
            {children}
        </EventConfigContext.Provider>
    );
};

export const useEventConfig = () => {
    const context = useContext(EventConfigContext);
    if (!context) throw new Error('useEventConfig must be used within EventConfigProvider');
    return context;
};
