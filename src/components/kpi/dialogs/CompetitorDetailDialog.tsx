import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Competitor } from "@/utils/kpiEngine";

interface CompetitorDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    competitor: Competitor | null;
}

export function CompetitorDetailDialog({ isOpen, onClose, competitor }: CompetitorDetailDialogProps) {
    if (!competitor) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        🛡️ Competitor Intelligence
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <div className="p-4 bg-slate-900 text-white rounded-lg shadow-md">
                        <div className="text-sm text-slate-400 uppercase font-bold text-center mb-1">Competitor Name</div>
                        <div className="text-2xl font-bold text-center text-blue-400">{competitor.name}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-red-50 border border-red-100 rounded">
                            <div className="text-xs text-red-600 font-bold uppercase mb-1">Threat Level</div>
                            <div className="font-bold text-red-800">{competitor.threat}</div>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-100 rounded">
                            <div className="text-xs text-red-600 font-bold uppercase mb-1">Their Strength</div>
                            <div className="text-sm text-red-800 leading-tight">{competitor.strength}</div>
                        </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs text-green-700 font-bold uppercase mb-2">Our Winning Advantage</div>
                        <div className="font-medium text-green-900">
                            {competitor.advantage}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
