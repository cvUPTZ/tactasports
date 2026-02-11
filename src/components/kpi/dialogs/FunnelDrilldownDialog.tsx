import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KPIModel } from "@/utils/kpiEngine";

interface FunnelDrilldownDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stage: string | null;
    targetCount: number;
}

export function FunnelDrilldownDialog({ isOpen, onClose, stage, targetCount }: FunnelDrilldownDialogProps) {
    if (!stage) return null;

    // Generate dummy data based on the stage and target count
    const entities = Array.from({ length: Math.min(targetCount, 20) }).map((_, i) => {
        const companies = ["ES Setif", "MC Alger", "JS Kabylie", "CR Belouizdad", "USM Alger", "CS Constantine", "MC Oran", "JS Saoura", "ASO Chlef", "US Biskra"];
        const contacts = ["Ahmed Z.", "Mohamed K.", "Yassine B.", "Karim H.", "Omar F.", "Said M.", "Amine T.", "Rachid S.", "Walid G.", "Hamza L."];

        return {
            id: `funnel-${i}`,
            company: companies[i % companies.length] + (i >= companies.length ? ` (${Math.floor(i / companies.length) + 1})` : ""),
            contact: contacts[i % contacts.length],
            value: 150000 + (Math.random() * 100000),
            probability: stage === "Lead Generation" ? 10 : stage === "Demo/Discovery" ? 30 : 60,
            date: new Date(Date.now() + (Math.random() * 90 * 24 * 60 * 60 * 1000)).toLocaleDateString()
        };
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        🎯 Funnel Drilldown: <span className="text-blue-600">{stage}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Showing top {entities.length} active {stage.toLowerCase()} entities (Target: {targetCount}).
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b sticky top-0">
                            <tr>
                                <th className="p-3">Company / Org</th>
                                <th className="p-3">Primary Contact</th>
                                <th className="p-3 text-right">Deal Value</th>
                                <th className="p-3 text-right">Probability</th>
                                <th className="p-3 text-right">Est. Close</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {entities.map((e) => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">{e.company}</td>
                                    <td className="p-3 text-slate-600">{e.contact}</td>
                                    <td className="p-3 text-right font-mono text-slate-700">{e.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} DZD</td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-blue-500 h-full" style={{ width: `${e.probability}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold">{e.probability}%</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right text-slate-500">{e.date}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t">
                            <tr>
                                <td className="p-3" colSpan={2}>PIPELINE VALUE (Top 20)</td>
                                <td className="p-3 text-right text-blue-600">
                                    {entities.reduce((sum, e) => sum + e.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} DZD
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
