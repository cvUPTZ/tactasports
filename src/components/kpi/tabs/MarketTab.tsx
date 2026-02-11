import { useKPI } from "@/contexts/KPIContext";
import { EditableCell } from "../EditableCell";
import { Plus, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { MarketSegment, Competitor, Risk } from "@/utils/kpiEngine";
import { SegmentSimulationDialog } from "../dialogs/SegmentSimulationDialog";
import { CompetitorDetailDialog } from "../dialogs/CompetitorDetailDialog";
import { RiskSimulationDialog } from "../dialogs/RiskSimulationDialog";
import { FunnelDrilldownDialog } from "../dialogs/FunnelDrilldownDialog";

const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
    return n.toFixed(0);
};

export function MarketTab() {
    const { kpi, metrics, updateKPI } = useKPI();
    const { tam, sam, som } = metrics;

    // Dialog State
    const [selectedSegment, setSelectedSegment] = useState<MarketSegment | null>(null);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
    const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
    const [funnelTargetCount, setFunnelTargetCount] = useState<number>(0);

    // Funnel Calculations
    const estimatedClients = (kpi.g_y1 + kpi.g_y2) / 2;
    const overallConv = (kpi.s_lead * kpi.s_demo * kpi.s_poc / 10000) / 100;
    const neededLeads = estimatedClients / overallConv;

    // Segment Handlers
    const updateSegment = (id: string, field: string, value: any) => {
        const newSegments = kpi.marketSegments.map(s => {
            if (s.id === id) return { ...s, [field]: Number(value) || value };
            return s;
        });
        updateKPI("marketSegments", newSegments);
    };

    const addSegment = () => {
        const newId = (Math.max(0, ...kpi.marketSegments.map(s => Number(s.id))) + 1).toString();
        const newSegments = [...kpi.marketSegments, {
            id: newId,
            name: "New Segment",
            count: 10,
            price: 50000,
            penRate: 10
        }];
        updateKPI("marketSegments", newSegments);
    };

    const deleteSegment = (id: string) => {
        const newSegments = kpi.marketSegments.filter(s => s.id !== id);
        updateKPI("marketSegments", newSegments);
    };

    // Calculate dynamic totals
    const totalOrgs = kpi.marketSegments.reduce((sum, s) => sum + s.count, 0);

    // Competitor Handlers
    const updateCompetitor = (id: string, field: string, value: any) => {
        const newComps = kpi.competitors.map(c => {
            if (c.id === id) return { ...c, [field]: value };
            return c;
        });
        updateKPI("competitors", newComps);
    };

    const addCompetitor = () => {
        const newId = (Math.max(0, ...kpi.competitors.map(s => Number(s.id))) + 1).toString();
        const newComps = [...kpi.competitors, {
            id: newId,
            name: "New Competitor",
            threat: "Med",
            strength: "Strength",
            advantage: "Our Advantage"
        }];
        updateKPI("competitors", newComps);
    };

    const deleteCompetitor = (id: string) => {
        updateKPI("competitors", kpi.competitors.filter(c => c.id !== id));
    };

    // Risk Handlers
    const updateRisk = (id: string, field: string, value: any) => {
        const newRisks = kpi.risks.map(r => {
            if (r.id === id) return { ...r, [field]: field === 'prob' || field === 'impactLevel' ? Number(value) : value };
            return r;
        });
        updateKPI("risks", newRisks);
    };

    const addRisk = () => {
        const newId = (Math.max(0, ...kpi.risks.map(s => Number(s.id))) + 1).toString();
        const newRisks = [...kpi.risks, {
            id: newId,
            name: "New Risk",
            prob: 30,
            impactLevel: 2,
            impact: "Medium",
            score: 0.6,
            mitigation: "Mitigation plan"
        }];
        updateKPI("risks", newRisks);
    };

    const deleteRisk = (id: string) => {
        updateKPI("risks", kpi.risks.filter(r => r.id !== id));
    };


    return (
        <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg rounded-lg space-y-8 relative">

            {/* Simulation Dialogs */}
            <SegmentSimulationDialog
                isOpen={!!selectedSegment}
                onClose={() => setSelectedSegment(null)}
                segment={selectedSegment}
                kpi={kpi}
            />
            <CompetitorDetailDialog
                isOpen={!!selectedCompetitor}
                onClose={() => setSelectedCompetitor(null)}
                competitor={selectedCompetitor}
            />
            <RiskSimulationDialog
                isOpen={!!selectedRisk}
                onClose={() => setSelectedRisk(null)}
                risk={selectedRisk}
            />
            <FunnelDrilldownDialog
                isOpen={!!selectedFunnelStage}
                onClose={() => setSelectedFunnelStage(null)}
                stage={selectedFunnelStage}
                targetCount={funnelTargetCount}
            />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Market Analysis & Segmentation</h2>
                <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-700 flex justify-between items-center">
                    <span>✎ All blue underlined values are editable. Click <Eye size={12} className="inline" /> to view simulation details.</span>
                </div>
            </div>

            {/* MARKET STRUCTURE */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                    <span>Market Structure</span>
                    <button onClick={addSegment} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                        <Plus size={12} /> Add Segment
                    </button>
                </h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Segment</th>
                            <th className="p-2 text-right">Organizations</th>
                            <th className="p-2 text-right">ARPU (DZD/y)</th>
                            <th className="p-2 text-right">TAM Contrib</th>
                            <th className="p-2 text-right">Target Pen.</th>
                            <th className="p-2 text-right">SOM Target</th>
                            <th className="p-2 w-16 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpi.marketSegments.map(seg => (
                            <tr key={seg.id} className="hover:bg-slate-50 group">
                                <td className="p-2 font-medium">
                                    <EditableCell value={seg.name} onChange={(v) => updateSegment(seg.id, 'name', v)} type="text" />
                                </td>
                                <td className="p-2 text-right">
                                    <EditableCell value={seg.count} onChange={(v) => updateSegment(seg.id, 'count', v)} />
                                </td>
                                <td className="p-2 text-right">
                                    <EditableCell value={seg.price} onChange={(v) => updateSegment(seg.id, 'price', v)} />
                                </td>
                                <td className="p-2 text-right text-slate-500">{fmt(seg.count * seg.price)}</td>
                                <td className="p-2 text-right">
                                    <EditableCell value={seg.penRate} onChange={(v) => updateSegment(seg.id, 'penRate', v)} suffix="%" />
                                </td>
                                <td className="p-2 text-right font-medium">{fmt(seg.count * seg.price * (seg.penRate / 100))}</td>
                                <td className="p-2 text-center flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedSegment(seg)} className="text-blue-400 hover:text-blue-600" title="View Simulation">
                                        <Eye size={14} />
                                    </button>
                                    <button onClick={() => deleteSegment(seg.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <td className="p-2">TOTAL</td>
                            <td className="p-2 text-right">{totalOrgs}</td>
                            <td className="p-2 text-right">-</td>
                            <td className="p-2 text-right">{fmt(tam)}</td>
                            <td className="p-2 text-right">-</td>
                            <td className="p-2 text-right">{fmt(som)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FUNNEL */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2">Customer Acquisition Funnel</h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Stage</th>
                            <th className="p-2 text-right">Conversion Rate</th>
                            <th className="p-2 text-right">Average Time</th>
                            <th className="p-2 text-right">Annual Target</th>
                            <th className="p-2 w-16 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Lead Generation</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_lead} kpiKey="s_lead" suffix="%" /></td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_lead_time} kpiKey="s_lead_time" type="text" /></td>
                            <td className="p-2 text-right">{Math.ceil(neededLeads)}+ leads</td>
                            <td className="p-2 text-center">
                                <button onClick={() => { setSelectedFunnelStage("Lead Generation"); setFunnelTargetCount(Math.ceil(neededLeads)); }} className="text-blue-400 hover:text-blue-600" title="View Leads">
                                    <Eye size={14} />
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">Demo/Discovery</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_demo} kpiKey="s_demo" suffix="%" /></td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_demo_time} kpiKey="s_demo_time" type="text" /></td>
                            <td className="p-2 text-right">{Math.ceil(neededLeads * kpi.s_lead / 100)}+ demos</td>
                            <td className="p-2 text-center">
                                <button onClick={() => { setSelectedFunnelStage("Demo/Discovery"); setFunnelTargetCount(Math.ceil(neededLeads * kpi.s_lead / 100)); }} className="text-blue-400 hover:text-blue-600" title="View Demos">
                                    <Eye size={14} />
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td className="p-2 font-medium text-blue-600">POC/Pilot</td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_poc} kpiKey="s_poc" suffix="%" /></td>
                            <td className="p-2 text-right"><EditableCell value={kpi.s_poc_time} kpiKey="s_poc_time" type="text" /></td>
                            <td className="p-2 text-right">{Math.ceil(neededLeads * kpi.s_lead / 100 * kpi.s_demo / 100)}+ POCs</td>
                            <td className="p-2 text-center">
                                <button onClick={() => { setSelectedFunnelStage("POC/Pilot"); setFunnelTargetCount(Math.ceil(neededLeads * kpi.s_lead / 100 * kpi.s_demo / 100)); }} className="text-blue-400 hover:text-blue-600" title="View POCs">
                                    <Eye size={14} />
                                </button>
                            </td>
                        </tr>
                        <tr className="bg-green-50">
                            <td className="p-2 font-bold text-green-700">Paid Customer</td>
                            <td className="p-2 text-right font-bold text-green-700">{(overallConv * 100).toFixed(1)}%</td>
                            <td className="p-2 text-right text-green-700">Contract signed</td>
                            <td className="p-2 text-right font-bold text-green-700">{estimatedClients.toFixed(1)} clients</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* COMPETITORS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                    <span>Competitive Positioning</span>
                    <button onClick={addCompetitor} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                        <Plus size={12} /> Add
                    </button>
                </h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Competitor</th>
                            <th className="p-2 text-left">Threat Level</th>
                            <th className="p-2 text-left">Key Strength</th>
                            <th className="p-2 text-left">Our Advantage</th>
                            <th className="p-2 w-16 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpi.competitors.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 group">
                                <td className="p-2 font-medium">
                                    <EditableCell value={c.name} onChange={(v) => updateCompetitor(c.id, 'name', v)} type="text" />
                                </td>
                                <td className="p-2">
                                    <EditableCell value={c.threat} onChange={(v) => updateCompetitor(c.id, 'threat', v)} type="text" />
                                </td>
                                <td className="p-2">
                                    <EditableCell value={c.strength} onChange={(v) => updateCompetitor(c.id, 'strength', v)} type="text" />
                                </td>
                                <td className="p-2">
                                    <EditableCell value={c.advantage} onChange={(v) => updateCompetitor(c.id, 'advantage', v)} type="text" />
                                </td>
                                <td className="p-2 text-center flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedCompetitor(c)} className="text-blue-400 hover:text-blue-600" title="View Details">
                                        <Eye size={14} />
                                    </button>
                                    <button onClick={() => deleteCompetitor(c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RISKS */}
            <div>
                <h3 className="mb-4 text-lg font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                    <span>Risk Assessment Matrix</span>
                    <button onClick={addRisk} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                        <Plus size={12} /> Add
                    </button>
                </h3>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-2 text-left">Risk Factor</th>
                            <th className="p-2 text-right">Probability</th>
                            <th className="p-2 text-left">Impact Level</th>
                            <th className="p-2 text-left">Risk Score</th>
                            <th className="p-2 text-left">Mitigation</th>
                            <th className="p-2 w-16 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpi.risks.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 group">
                                <td className="p-2 font-medium">
                                    <EditableCell value={r.name} onChange={(v) => updateRisk(r.id, 'name', v)} type="text" />
                                </td>
                                <td className="p-2 text-right">
                                    <EditableCell value={r.prob} onChange={(v) => updateRisk(r.id, 'prob', v)} suffix="%" />
                                </td>
                                <td className="p-2 text-center">
                                    <EditableCell value={r.impactLevel} onChange={(v) => updateRisk(r.id, 'impactLevel', v)} suffix="/10" />
                                </td>
                                <td className="p-2 font-bold">
                                    {(r.prob * r.impactLevel / 100).toFixed(1)}
                                </td>
                                <td className="p-2 text-xs text-slate-500">
                                    <EditableCell value={r.mitigation} onChange={(v) => updateRisk(r.id, 'mitigation', v)} type="text" />
                                </td>
                                <td className="p-2 text-center flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedRisk(r)} className="text-blue-400 hover:text-blue-600" title="View Risk Analysis">
                                        <Eye size={14} />
                                    </button>
                                    <button onClick={() => deleteRisk(r.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
