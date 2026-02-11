import { useKPI } from "@/contexts/KPIContext";
import { EditableCell } from "../EditableCell";

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

const fmtPct = (n: number) => n.toFixed(1) + '%';

function KPICard({ title, value, sub }: { title: string, value: string, sub: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
            <div className="mb-1 text-2xl font-extrabold text-slate-900">{value}</div>
            <div className="text-[11px] text-slate-400">{sub}</div>
        </div>
    );
}

export function UnitEconomicsTab() {
    const { kpi, metrics } = useKPI();
    const { y5, years, ltv, ltv_cac, paybackMonths, customerLifeMonths, nrr } = metrics;

    return (
        <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg rounded-lg space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Unit Economics & KPIs</h2>
                <div className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-800 border border-blue-200">
                    <strong>💡 Key Insight:</strong> LTV/CAC ratio of <span className="font-bold">{ltv_cac.toFixed(1)}:1</span> indicates <strong>{ltv_cac >= 3 ? 'healthy' : 'concerning'}</strong> unit economics.
                    However, long sales cycles ({kpi.s_cycle} months) require careful cash management.
                </div>
            </div>

            {/* CORE METRICS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Core Unit Economics</h3>
                <div className="grid grid-cols-5 gap-4">
                    <KPICard title="CAC" value={fmt(kpi.s_cac * 1000)} sub="Customer Acq. Cost" />
                    <KPICard title="LTV" value={fmt(ltv)} sub="Lifetime Value" />
                    <KPICard title="LTV/CAC" value={ltv_cac.toFixed(1)} sub="Target: >3:1" />
                    <KPICard title="Gross Margin" value={fmtPct(kpi.f_margin)} sub="SaaS standard: 80%+" />
                    <KPICard title="Payback" value={paybackMonths.toFixed(0)} sub="Months to recover CAC" />
                </div>
            </div>

            {/* GROWTH METRICS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Growth Metrics</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Metric</th>
                            <th className="p-2 text-right">Y1</th>
                            <th className="p-2 text-right">Y2</th>
                            <th className="p-2 text-right">Y3</th>
                            <th className="p-2 text-right">Y4</th>
                            <th className="p-2 text-right">Y5</th>
                            <th className="p-2 text-right">CAGR</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium">New Clients</td>
                            {['g_y1', 'g_y2', 'g_y3', 'g_y4', 'g_y5'].map(k => (
                                // @ts-ignore
                                <td key={k} className="p-2 text-right"><EditableCell value={kpi[k]} kpiKey={k as any} /></td>
                            ))}
                            <td className="p-2 text-right">-</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Active Clients</td>
                            {years.map(y => <td key={y.year} className="p-2 text-right">{y.activeClients.toFixed(1)}</td>)}
                            <td className="p-2 text-right">-</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">ARR (k DZD)</td>
                            {years.map(y => <td key={y.year} className="p-2 text-right">{fmt(y.arr)}</td>)}
                            <td className="p-2 text-right font-bold text-green-600">
                                {fmtPct((Math.pow(y5.arr / years[0].arr, 1 / 4) - 1) * 100)}
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Churn Rate</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.ch_y1} kpiKey="ch_y1" suffix="%" /></td>
                            <td className="p-2 text-right"><EditableCell value={kpi.ch_y2} kpiKey="ch_y2" suffix="%" /></td>
                            <td colSpan={3} className="p-2 text-center text-slate-500">
                                Stabilizes at <EditableCell value={kpi.ch_stable} kpiKey="ch_stable" suffix="%" className="inline-block" />
                            </td>
                            <td className="p-2 text-right">-</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* BENCHMARKS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Customer Metrics & Benchmarks</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Metric</th>
                            <th className="p-2 text-left">Your Value</th>
                            <th className="p-2 text-left">Industry Benchmark</th>
                            <th className="p-2 text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium">Churn Rate (stabilized)</td>
                            <td className="p-2"><EditableCell value={kpi.ch_stable} kpiKey="ch_stable" suffix="%" /></td>
                            <td className="p-2"><EditableCell value={kpi.bench_churn} kpiKey="bench_churn" type="text" /></td>
                            <td className="p-2">{kpi.ch_stable <= 10 ? '✅ Good' : '⚠️ High'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Net Revenue Retention</td>
                            <td className="p-2">{fmtPct(nrr)}</td>
                            <td className="p-2"><EditableCell value={kpi.bench_nrr} kpiKey="bench_nrr" type="text" /></td>
                            <td className="p-2">{nrr >= 100 ? '✅ Good' : '⚠️ Concern'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Customer Lifetime</td>
                            <td className="p-2">{customerLifeMonths.toFixed(0)} months</td>
                            <td className="p-2"><EditableCell value={kpi.bench_life} kpiKey="bench_life" type="text" /></td>
                            <td className="p-2">{customerLifeMonths >= 36 ? '✅ Good' : '⚠️ Short'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Avg Contract Value</td>
                            <td className="p-2"><EditableCell value={kpi.p_arpu} kpiKey="p_arpu" /></td>
                            <td className="p-2">-</td>
                            <td className="p-2">-</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* SALES EFFICIENCY */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Sales Efficiency</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Metric</th>
                            <th className="p-2 text-left">Value</th>
                            <th className="p-2 text-left">Target</th>
                            <th className="p-2 text-left">Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium">Sales Cycle</td>
                            <td className="p-2"><EditableCell value={kpi.s_cycle} kpiKey="s_cycle" suffix=" months" /></td>
                            <td className="p-2"><EditableCell value={kpi.target_cycle} kpiKey="target_cycle" type="text" /></td>
                            <td className="p-2">{kpi.s_cycle <= 9 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Lead Conversion</td>
                            <td className="p-2"><EditableCell value={kpi.s_lead} kpiKey="s_lead" suffix="%" /></td>
                            <td className="p-2"><EditableCell value={kpi.target_lead} kpiKey="target_lead" type="text" /></td>
                            <td className="p-2">{kpi.s_lead >= 30 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">Demo Conversion</td>
                            <td className="p-2"><EditableCell value={kpi.s_demo} kpiKey="s_demo" suffix="%" /></td>
                            <td className="p-2"><EditableCell value={kpi.target_demo} kpiKey="target_demo" type="text" /></td>
                            <td className="p-2">{kpi.s_demo >= 50 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium">POC Conversion</td>
                            <td className="p-2"><EditableCell value={kpi.s_poc} kpiKey="s_poc" suffix="%" /></td>
                            <td className="p-2"><EditableCell value={kpi.target_poc} kpiKey="target_poc" type="text" /></td>
                            <td className="p-2">{kpi.s_poc >= 60 ? '✅' : '⚠️'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
}
