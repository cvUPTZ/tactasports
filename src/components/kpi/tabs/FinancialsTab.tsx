import { useKPI } from "@/contexts/KPIContext";
import { EditableCell } from "../EditableCell";

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

export function FinancialsTab() {
    const { kpi, metrics } = useKPI();
    const { years, cashFlow, y5, breakEvenClients, breakEvenARR } = metrics;

    return (
        <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg rounded-lg space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Financial Projections & P&L</h2>
                <div className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-900 border border-amber-200">
                    <strong>⚠️ Break-Even Analysis:</strong> Break-even requires <strong>{breakEvenClients.toFixed(0)} clients</strong> generating <strong>{fmt(breakEvenARR)} DZD ARR</strong>.
                    Phase 1 TAM limitation makes standalone profitability challenging. Phase 2 expansion essential for long-term viability.
                </div>
            </div>

            {/* P&L */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">5-Year P&L Statement (Projections)</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Year</th>
                            <th className="p-2 text-right">Clients</th>
                            <th className="p-2 text-right">ARR</th>
                            <th className="p-2 text-right">Personnel</th>
                            <th className="p-2 text-right">Other OpEx</th>
                            <th className="p-2 text-right">EBITDA</th>
                            <th className="p-2 text-right">Tax</th>
                            <th className="p-2 text-right">Net Income</th>
                        </tr>
                    </thead>
                    <tbody>
                        {years.map(y => (
                            <tr key={y.year}>
                                <td className="p-2 font-bold text-slate-700">Y{y.year}</td>
                                <td className="p-2 text-right">{y.activeClients.toFixed(1)}</td>
                                <td className="p-2 text-right font-medium">{fmt(y.arr)}</td>
                                <td className="p-2 text-right text-slate-500">{fmt(y.personnel)}</td>
                                <td className="p-2 text-right text-slate-500">{fmt(y.infrastructure + y.marketing + y.operations)}</td>
                                <td className="p-2 text-right font-medium">{fmt(y.ebitda)}</td>
                                <td className="p-2 text-right text-slate-400">{fmt(y.tax)}</td>
                                <td className={`p-2 text-right font-bold ${y.netIncome > 0 ? "text-green-600" : "text-red-500"}`}>
                                    {fmt(y.netIncome)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CASH FLOW */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Cash Flow Analysis</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Year</th>
                            <th className="p-2 text-right">Cash In</th>
                            <th className="p-2 text-right">Cash Out</th>
                            <th className="p-2 text-right">Net Cash Flow</th>
                            <th className="p-2 text-right">Cumulative Cash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cashFlow.map(c => (
                            <tr key={c.year}>
                                <td className="p-2 font-bold text-slate-700">Y{c.year}</td>
                                <td className="p-2 text-right text-green-700">{fmt(c.cashIn)}</td>
                                <td className="p-2 text-right text-red-700">{fmt(c.cashOut)}</td>
                                <td className={`p-2 text-right font-medium ${c.netCashFlow > 0 ? "text-green-600" : "text-red-600"}`}>
                                    {fmt(c.netCashFlow)}
                                </td>
                                <td className="p-2 text-right text-blue-700 font-bold">{fmt(c.cumulativeCash)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* REVENUE STREAMS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Revenue Breakdown by Stream</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Stream</th>
                            <th className="p-2 text-right">Mix (%)</th>
                            <th className="p-2 text-right">Y1 Revenue</th>
                            <th className="p-2 text-right">Y5 Revenue</th>
                            <th className="p-2 text-right">Margin</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">SaaS Subscriptions</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.rev_saas} kpiKey="rev_saas" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(years[0].arr * kpi.rev_saas / 100)}</td>
                            <td className="p-2 text-right font-bold">{fmt(y5.arr * kpi.rev_saas / 100)}</td>
                            <td className="p-2 text-right text-slate-500">85%</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Training & Certification</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.rev_train} kpiKey="rev_train" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(years[0].arr * kpi.rev_train / 100)}</td>
                            <td className="p-2 text-right font-bold">{fmt(y5.arr * kpi.rev_train / 100)}</td>
                            <td className="p-2 text-right text-slate-500">90%</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Professional Services</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.rev_prof} kpiKey="rev_prof" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(years[0].arr * kpi.rev_prof / 100)}</td>
                            <td className="p-2 text-right font-bold">{fmt(y5.arr * kpi.rev_prof / 100)}</td>
                            <td className="p-2 text-right text-slate-500">65%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* COST STRUCTURE */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Cost Structure Detail</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Category</th>
                            <th className="p-2 text-right">Alloc. (%)</th>
                            <th className="p-2 text-right">Y1 Cost</th>
                            <th className="p-2 text-right">Y5 Cost</th>
                            <th className="p-2 text-right">Growth</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Team Salaries</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.c_pay_pct} kpiKey="c_pay_pct" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(y5.personnel * (years[0].totalCosts / y5.totalCosts))}</td>
                            <td className="p-2 text-right">{fmt(y5.personnel)}</td>
                            <td className="p-2 text-right text-slate-500">
                                +{((y5.personnel / (y5.personnel * (years[0].totalCosts / y5.totalCosts)) - 1) * 100).toFixed(0)}%
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Infrastructure</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.c_infra_pct} kpiKey="c_infra_pct" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(y5.infrastructure * (years[0].totalCosts / y5.totalCosts))}</td>
                            <td className="p-2 text-right">{fmt(y5.infrastructure)}</td>
                            <td className="p-2 text-right text-slate-500">
                                +{((y5.infrastructure / (y5.infrastructure * (years[0].totalCosts / y5.totalCosts)) - 1) * 100).toFixed(0)}%
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Marketing & Sales</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.c_mkt_pct} kpiKey="c_mkt_pct" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(y5.marketing * (years[0].totalCosts / y5.totalCosts))}</td>
                            <td className="p-2 text-right">{fmt(y5.marketing)}</td>
                            <td className="p-2 text-right text-slate-500">
                                +{((y5.marketing / (y5.marketing * (years[0].totalCosts / y5.totalCosts)) - 1) * 100).toFixed(0)}%
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Operations</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.c_ops_pct} kpiKey="c_ops_pct" suffix="%" /></td>
                            <td className="p-2 text-right">{fmt(y5.operations * (years[0].totalCosts / y5.totalCosts))}</td>
                            <td className="p-2 text-right">{fmt(y5.operations)}</td>
                            <td className="p-2 text-right text-slate-500">
                                +{((y5.operations / (y5.operations * (years[0].totalCosts / y5.totalCosts)) - 1) * 100).toFixed(0)}%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
}
