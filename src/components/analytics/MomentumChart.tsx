import { useMemo } from "react";
import { LoggedEvent } from "@/hooks/useGamepad";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";

interface MomentumChartProps {
    events: LoggedEvent[];
}

export const MomentumChart = ({ events }: MomentumChartProps) => {
    // Weighted Event Scoring
    const getWeight = (e: LoggedEvent) => {
        const name = e.eventName.toLowerCase();
        let w = 0;
        if (name.includes('goal')) w = 10;
        else if (name.includes('shot')) w = 5;
        else if (name.includes('dangerous') || name.includes('final_third')) w = 3;
        else if (name.includes('cross')) w = 2;
        else if (name.includes('pass')) w = 1;
        else if (name.includes('interception') || name.includes('recovery')) w = 2;
        else if (name.includes('turnover') || name.includes('loss')) w = -2;
        else if (name.includes('foul')) w = -1;
        else if (name.includes('card')) w = -5;
        return e.team === "TEAM_A" ? w : -w;
    };

    const data = useMemo(() => {
        return events.map((e, i) => {
            const windowStart = Math.max(0, i - 10);
            const window = events.slice(windowStart, i + 1);
            const sum = window.reduce((acc, curr) => acc + getWeight(curr), 0);
            return {
                time: e.matchTime || i,
                momentum: sum / window.length,
                name: e.eventName
            };
        });
    }, [events]);

    // Take last 50 events for "Live" view
    const recentData = data.slice(-40);

    return (
        <div className="w-full h-full min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentData}>
                    <defs>
                        <linearGradient id="colorMomentum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[-1, 1]} hide />
                    <Tooltip />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Area
                        type="monotone"
                        dataKey="momentum"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorMomentum)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
