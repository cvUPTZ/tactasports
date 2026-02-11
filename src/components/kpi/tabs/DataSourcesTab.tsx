import { useKPI } from "@/contexts/KPIContext";

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

const fmtPct = (n: number) => n.toFixed(1) + '%';

export function DataSourcesTab() {
    const { kpi, metrics } = useKPI();
    const { y5, ltv, ltv_cac, breakEvenClients, tam } = metrics;

    const sources = [
        { metric: 'TAM (Total Addressable)', value: fmt(tam), source: 'ms.txt + bp.txt', calc: 'Sum of all segment sizes × respective ARPU' },
        { metric: 'Market Segments', value: `${kpi.marketSegments.reduce((sum, s) => sum + s.count, 0)} orgs`, source: 'ms.txt', calc: 'L1 Elite + L1 Std + L2 Prog + FAF' },
        { metric: 'ARPU Average', value: fmt(kpi.p_arpu), source: 'bp.txt', calc: 'Weighted average across pricing tiers' },
        { metric: 'Y5 Active Clients', value: y5.activeClients.toFixed(1), source: 'Calculated', calc: 'Active(n-1) × (1-Churn) + New(n)' },
        { metric: 'Churn Rate (stable)', value: fmtPct(kpi.ch_stable), source: 'bp.txt', calc: 'Industry benchmark for B2B SaaS' },
        { metric: 'CAC', value: fmt(kpi.s_cac * 1000), source: 'bp.txt + benchmarks', calc: 'Sales & marketing costs / new clients' },
        { metric: 'LTV', value: fmt(ltv), source: 'Calculated', calc: 'ARPU / Churn Rate' },
        { metric: 'LTV/CAC Ratio', value: ltv_cac.toFixed(1), source: 'bp.txt', calc: 'LTV / CAC (target >3:1)' },
        { metric: 'Gross Margin', value: kpi.f_margin + '%', source: 'bp.txt', calc: 'SaaS industry standard' },
        { metric: 'Team Headcount Y5', value: y5.headcount.toFixed(1), source: 'Calculated', calc: 'Base + (years × hire rate)' },
        { metric: 'Payroll Y5', value: fmt(y5.personnel), source: 'Calculated', calc: 'Headcount × salary × (1 + CNAS load)' },
        { metric: 'Break-even Clients', value: breakEvenClients.toFixed(0), source: 'Calculated', calc: 'Total costs / ARPU' },
        { metric: 'Seed Investment', value: fmt(kpi.inv_seed * 1000000), source: 'bp.txt', calc: 'Phase 1 validation funding' },
        { metric: 'Series A Target', value: fmt(kpi.inv_a * 1000000), source: 'bp.txt', calc: 'Phase 2 expansion funding' }
    ];

    return (
        <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg rounded-lg space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Data Sources & Calculations</h2>
                <p className="mb-6 text-sm text-slate-500">Complete methodology and source documentation for all metrics</p>
            </div>

            {/* PRIMARY METRICS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Primary Metrics & Sources</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Metric</th>
                            <th className="p-2 text-left">Current Value</th>
                            <th className="p-2 text-left">Source Document</th>
                            <th className="p-2 text-left">Calculation Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.map((s, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="p-2 font-medium text-slate-700">{s.metric}</td>
                                <td className="p-2 font-bold text-slate-900">{s.value}</td>
                                <td className="p-2 text-slate-500">{s.source}</td>
                                <td className="p-2 text-slate-500 text-xs">{s.calc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FORMULA REFERENCE */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Formula Reference</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Metric</th>
                            <th className="p-2 text-left">Formula</th>
                            <th className="p-2 text-left">Variables</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium">TAM</td>
                            <td className="p-2 font-mono text-xs">Σ(Segment Size × ARPU)</td>
                            <td className="p-2 text-slate-500">Market segments, pricing tiers</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Active Clients</td>
                            <td className="p-2 font-mono text-xs">Active(n-1) × (1-Churn) + New(n)</td>
                            <td className="p-2 text-slate-500">Previous clients, churn rate, new acquisitions</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">ARR</td>
                            <td className="p-2 font-mono text-xs">Active Clients × ARPU Average</td>
                            <td className="p-2 text-slate-500">Client count, average revenue per user</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">EBITDA</td>
                            <td className="p-2 font-mono text-xs">ARR - Total Operating Costs</td>
                            <td className="p-2 text-slate-500">Revenue, personnel, infrastructure, marketing, ops</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">LTV</td>
                            <td className="p-2 font-mono text-xs">ARPU / Churn Rate</td>
                            <td className="p-2 text-slate-500">Average revenue, stabilized churn</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* DOCUMENT FILES */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Document References</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Document</th>
                            <th className="p-2 text-left">Key Metrics Extracted</th>
                            <th className="p-2 text-left">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-bold">bp.txt</td>
                            <td className="p-2">Financial projections, cost structure, revenue model</td>
                            <td className="p-2 text-slate-500">Dec 2025</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-bold">bm.txt</td>
                            <td className="p-2">Business model canvas, value proposition, segments</td>
                            <td className="p-2 text-slate-500">Dec 2025</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-bold">ms.txt</td>
                            <td className="p-2">Market analysis, TAM/SAM/SOM, competition</td>
                            <td className="p-2 text-slate-500">Sep 2025</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
}
