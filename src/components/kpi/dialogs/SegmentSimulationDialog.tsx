import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KPIModel, MarketSegment } from "@/utils/kpiEngine";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface SegmentSimulationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    segment: MarketSegment | null;
    kpi: KPIModel;
}

export function SegmentSimulationDialog({ isOpen, onClose, segment, kpi }: SegmentSimulationDialogProps) {
    if (!segment) return null;

    // Generate constituents if they don't exist
    const constituents = segment.constituents && segment.constituents.length > 0
        ? segment.constituents
        : Array.from({ length: segment.count }).map((_, i) => ({
            id: `gen-${i}`,
            name: `${segment.name} - Organization ${i + 1}`,
            tier: "Standard",
            revenue: segment.price,
            status: "Prospect" as const
        }));

    // Simulation Data for the chart
    const years = [1, 2, 3, 4, 5];
    const targetClients = segment.count * (segment.penRate / 100);
    const yearlyData = years.map(y => {
        const progress = y / 5;
        const clients = Math.ceil(targetClients * progress);
        const revenue = clients * segment.price;
        return { year: y, clients, revenue };
    });

    const chartData = {
        labels: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
        datasets: [
            {
                label: 'Projected Revenue (DZD)',
                data: yearlyData.map(d => d.revenue),
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.5)',
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        📋 Granular Data: <span className="text-blue-600">{segment.name}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Detailed breakdown of the {segment.count} organizations in this segment.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Left: Granular Table */}
                    <div className="md:col-span-2 space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            Entity List <span className="text-xs font-normal text-slate-500">({constituents.length} rows)</span>
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                    <tr>
                                        <th className="p-3">Entity Name</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Potential ARPU</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {constituents.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{c.name}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.status === 'Active' ? 'bg-green-100 text-green-700' :
                                                        c.status === 'Lead' ? 'bg-blue-100 text-blue-700' :
                                                            c.status === 'Prospect' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-600">
                                                {c.revenue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold border-t">
                                    <tr>
                                        <td className="p-3" colSpan={2}>TOTAL SEGMENT POTENTIAL</td>
                                        <td className="p-3 text-right text-blue-600">
                                            {(segment.count * segment.price).toLocaleString()} DZD
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Right: Summary & Simulation */}
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-800 text-sm mb-3 uppercase tracking-wider">Market Summary</h4>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-[10px] text-blue-600 font-bold">TARGET PENETRATION</div>
                                    <div className="text-xl font-black text-blue-900">{segment.penRate}%</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-blue-600 font-bold">SOM TARGET (Y5)</div>
                                    <div className="text-xl font-black text-blue-900">
                                        {((segment.count * segment.price * segment.penRate) / 100).toLocaleString()} DZD
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 text-sm mb-3 uppercase tracking-wider">Growth Simulation</h4>
                            <div className="h-[150px] w-full">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                            <div className="mt-4 space-y-2">
                                {yearlyData.map(d => (
                                    <div key={d.year} className="flex justify-between text-xs border-b border-slate-100 pb-1">
                                        <span className="text-slate-500 font-medium">Year {d.year}</span>
                                        <span className="font-bold text-slate-700">{d.revenue.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
