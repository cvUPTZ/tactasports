import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Risk } from "@/utils/kpiEngine";

interface RiskSimulationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    risk: Risk | null;
}

export function RiskSimulationDialog({ isOpen, onClose, risk }: RiskSimulationDialogProps) {
    if (!risk) return null;

    const score = risk.prob * risk.impactLevel / 100;
    const severityColor = score > 2.5 ? "bg-red-500" : score > 1.5 ? "bg-orange-500" : "bg-yellow-500";
    const severityText = score > 2.5 ? "Critical" : score > 1.5 ? "High" : "Moderate";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        ⚠️ Risk Analysis: <span className="text-red-600">{risk.name}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded border border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-bold">Probability</div>
                            <div className="text-3xl font-bold text-slate-800">{risk.prob}%</div>
                            <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${risk.prob}%` }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded border border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-bold">Impact Level</div>
                            <div className="text-3xl font-bold text-slate-800">{risk.impactLevel}<span className="text-sm text-slate-400">/10</span></div>
                            <div className="w-full bg-slate-200 h-2 rounded-full mt-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${risk.impactLevel * 10}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-100 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-slate-500">CALCULATED RISK SCORE</div>
                            <div className="text-4xl font-black text-slate-900">{score.toFixed(1)}</div>
                        </div>
                        <div className={`px-4 py-2 rounded text-white font-bold ${severityColor}`}>
                            {severityText} Risk
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">Mitigation Strategy</h4>
                        <div className="p-4 border border-green-200 bg-green-50 rounded text-green-800">
                            " {risk.mitigation} "
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
