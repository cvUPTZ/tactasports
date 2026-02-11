import React from 'react';
import { SemanticAnalytics } from '@/components/analytics/SemanticAnalytics';
import { StatisticsDashboard } from '@/components/StatisticsDashboard';
import { LoggedEvent } from '@/hooks/useGamepad';

interface AnalyticsViewProps {
    events: LoggedEvent[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ events }) => {
    return (
        <div className="flex-1 p-0 overflow-y-auto custom-scrollbar bg-background/50 backdrop-blur-3xl">
            <SemanticAnalytics events={events} />
            <div className="p-6 pt-0">
                <StatisticsDashboard events={events} isFullPage />
            </div>
        </div>
    );
};
