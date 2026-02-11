import { useKPI } from "@/contexts/KPIContext";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler
} from "chart.js";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler
);

function KPICard({ title, value, sub }: { title: string, value: string, sub: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
            <div className="mb-1 text-2xl font-extrabold text-slate-900">{value}</div>
            <div className="text-[11px] text-slate-400">{sub}</div>
        </div>
    );
}

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

const fmtPct = (n: number) => n.toFixed(1) + '%';

export function DashboardTab() {
    const { metrics, kpi } = useKPI();
    const { y5, years, cashFlow } = metrics;

    // Charts Data
    const revenueData = {
        labels: years.map(y => `Y${y.year}`),
        datasets: [
            { label: 'ARR', data: years.map(y => y.arr / 1000), backgroundColor: '#10b981', stack: 'revenue' },
            { label: 'Personnel', data: years.map(y => y.personnel / 1000), backgroundColor: '#ef4444', stack: 'costs' },
            { label: 'Other OpEx', data: years.map(y => (y.totalCosts - y.personnel) / 1000), backgroundColor: '#f59e0b', stack: 'costs' }
        ]
    };

    const cashData = {
        labels: cashFlow.map(c => `Y${c.year}`),
        datasets: [{
            label: 'Cumulative Cash',
            data: cashFlow.map(c => c.cumulativeCash / 1000),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const } }
    };

    let alertColor = "bg-green-100 text-green-800";
    let alertText = `✅ PROFITABLE: Y5 net income of ${fmt(y5.netIncome)} DZD with ${fmtPct(y5.margin)} margin. Strong unit economics support expansion.`;

    if (metrics.minCash < 0) {
        alertColor = "bg-red-100 text-red-800";
        alertText = `⚠️ CASH DEFICIT: Minimum cash balance reaches ${fmt(metrics.minCash)} DZD. Additional funding required before Phase 1 completion.`;
    } else if (y5.netIncome < 0) {
        alertColor = "bg-amber-100 text-amber-800";
        alertText = `⚠️ VALIDATION PHASE: Y5 net loss of ${fmt(Math.abs(y5.netIncome))} DZD. Phase 1 serves as market validation. Series A expansion to Maghreb essential for profitability.`;
    }

    return (
        <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg rounded-lg">
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Executive Dashboard</h2>
            <p className="mb-6 text-sm text-slate-500">
                Live 5-year projection engine. <span className="text-blue-600 font-medium">Tip: Use the sidebar to update the model.</span>
            </p>

            <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${alertColor}`}>
                {alertText}
            </div>

            <h3 className="mb-4 mt-8 border-b-2 border-slate-200 pb-2 text-lg font-bold text-slate-900">Key Performance Indicators (Year 5)</h3>
            <div className="grid grid-cols-5 gap-4 mb-8">
                <KPICard title="ARR" value={fmt(y5.arr)} sub="DZD Annual Recurring" />
                <KPICard title="Active Clients" value={y5.activeClients.toFixed(1)} sub="After churn" />
                <KPICard title="Net Margin" value={fmtPct(y5.margin)} sub="EBITDA margin" />
                <KPICard title="LTV/CAC" value={metrics.ltv_cac.toFixed(1)} sub="Unit economics" />
                <KPICard title="Cash Position" value={fmt(metrics.minCash)} sub="Minimum runway" />
            </div>

            <h3 className="mb-4 mt-8 border-b-2 border-slate-200 pb-2 text-lg font-bold text-slate-900">5-Year Revenue & Cost Projection</h3>
            <div className="h-[300px] w-full mb-8">
                {/* @ts-ignore */}
                <Bar data={revenueData} options={options} />
            </div>

            <h3 className="mb-4 mt-8 border-b-2 border-slate-200 pb-2 text-lg font-bold text-slate-900">Cash Flow Evolution</h3>
            <div className="h-[300px] w-full mb-8">
                <Line data={cashData} options={options} />
            </div>

            <h3 className="mb-4 mt-8 border-b-2 border-slate-200 pb-2 text-lg font-bold text-slate-900">Market Penetration Progress</h3>
            <div className="grid grid-cols-5 gap-4">
                <KPICard title="TAM" value={fmt(metrics.tam)} sub="Total addressable" />
                <KPICard title="SAM" value={fmt(metrics.sam)} sub="Serviceable addressable" />
                <KPICard title="SOM" value={fmt(metrics.som)} sub="Serviceable obtainable" />
                <KPICard title="Penetration" value={fmtPct((y5.arr / metrics.tam) * 100)} sub="Of TAM" />
                <KPICard title="Market Share" value={fmtPct((y5.activeClients / kpi.marketSegments.reduce((sum, s) => sum + s.count, 0)) * 100)} sub="Target segment" />
            </div>
        </div>
    );
}
