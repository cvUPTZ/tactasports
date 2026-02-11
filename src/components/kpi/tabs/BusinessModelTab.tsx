import { useKPI } from "@/contexts/KPIContext";

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

export function BusinessModelTab() {
    const { kpi, metrics } = useKPI();
    const { breakEvenClients } = metrics;

    return (
        <div className="mx-auto w-[210mm] min-h-auto bg-white p-[20mm] shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Business Model Canvas</h2>
            <p className="mb-6 text-sm text-slate-500">Complete business model visualization with live data integration</p>

            <div className="grid grid-cols-5 gap-3">
                {/* KEY PARTNERS */}
                <div className="row-span-2 rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">🤝 Key Partners</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li><strong>Institutional:</strong> FAF, LFP, DTN</li>
                        <li><strong>Technical:</strong> ISSAL NET (hosting), Chargily Pay</li>
                        <li><strong>Training:</strong> ESSTS, former internationals</li>
                    </ul>
                </div>

                {/* KEY ACTIVITIES */}
                <div className="rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">🔧 Key Activities</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>Product development (MVP)</li>
                        <li>Consultative selling</li>
                        <li>Integrated training</li>
                        <li>Compliance management</li>
                    </ul>
                </div>

                {/* VALUE PROPOSITION */}
                <div className="rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">💎 Value Proposition</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>✅ 100% Law 25-11 compliant</li>
                        <li>🌍 AR/FR interface</li>
                        <li>🎓 Guaranteed adoption training</li>
                        <li>👨‍💼 Premium on-site support</li>
                        <li>📊 Local football expertise</li>
                    </ul>
                </div>

                {/* CUSTOMER RELATIONS */}
                <div className="rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">🤗 Customer Relations</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>Dedicated account mgmt (1:8-10)</li>
                        <li>Mandatory in-person training</li>
                        <li>24/7 post-training support</li>
                        <li>Community building</li>
                    </ul>
                </div>

                {/* CUSTOMER SEGMENTS */}
                <div className="row-span-2 rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">👥 Customer Segments</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        {kpi.marketSegments.map(s => (
                            <li key={s.id}><strong>{s.name} ({s.count}):</strong> {fmt(s.price)} DZD</li>
                        ))}
                    </ul>
                </div>

                {/* KEY RESOURCES */}
                <div className="rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">🎯 Key Resources</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>Expert local team (CEO, CTO, Training)</li>
                        <li>Compliant infrastructure (local hosting)</li>
                        <li>IP (methodology, interfaces)</li>
                        <li>Institutional relations (FAF/LFP)</li>
                    </ul>
                </div>

                {/* CHANNELS */}
                <div className="col-span-2 rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">📡 Channels</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li><strong>B2B Direct ({kpi.ch_b2b}%):</strong> Relationship prospecting, long cycles</li>
                        <li><strong>Institutional ({kpi.ch_inst}%):</strong> FAF/LFP endorsements</li>
                        <li><strong>Inter-Club ({kpi.ch_ref}%):</strong> Ambassador program</li>
                    </ul>
                </div>

                {/* REVENUE STREAMS */}
                <div className="col-span-2 rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">💰 Revenue Streams</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li><strong>SaaS Subscriptions ({kpi.rev_saas}%):</strong> Varies by segment ({fmt(Math.min(...kpi.marketSegments.map(s => s.price)))} - {fmt(Math.max(...kpi.marketSegments.map(s => s.price)))} DZD)</li>
                        <li><strong>Training & Certification ({kpi.rev_train}%):</strong> Recurring annual fees</li>
                        <li><strong>Professional Services ({kpi.rev_prof}%):</strong> Consulting, customization</li>
                        <li><strong>ARPU Average:</strong> {fmt(kpi.p_arpu)} DZD/year</li>
                    </ul>
                </div>

                {/* COST STRUCTURE */}
                <div className="col-span-2 rounded bg-slate-50 p-4 border border-slate-200 text-xs">
                    <h4 className="mb-2 font-bold text-blue-600 uppercase tracking-wide">💸 Cost Structure</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li><strong>Fixed Costs Dominant:</strong> Break-even at {breakEvenClients.toFixed(0)} customers</li>
                        <li><strong>Team Salaries ({kpi.c_pay_pct}%):</strong> Main cost item</li>
                        <li><strong>Infrastructure ({kpi.c_infra_pct}%):</strong> Hosting, security, compliance</li>
                        <li><strong>Marketing & Sales ({kpi.c_mkt_pct}%):</strong> Prospecting, events, travel</li>
                        <li><strong>Operations ({kpi.c_ops_pct}%):</strong> Support, admin, legal</li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
