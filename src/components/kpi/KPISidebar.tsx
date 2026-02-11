import { ChevronDown, Printer, Save, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useKPI } from "@/contexts/KPIContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ConfigGroup = ({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) => (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="border-b border-slate-700">
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-slate-800 px-5 py-3 text-xs font-bold uppercase text-slate-100 hover:bg-slate-700">
            {title}
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-slate-900 p-5 space-y-2">
            {children}
        </CollapsibleContent>
    </Collapsible>
);

const Inp = ({ label, id, type = "number", step }: { label: string, id: string, type?: string, step?: string }) => {
    const { kpi, updateKPI } = useKPI();
    // @ts-ignore
    const value = kpi[id];

    return (
        <div className="flex items-center justify-between gap-2 text-xs">
            <label className="flex-1 text-slate-300">{label}</label>
            <input
                type={type}
                step={step}
                value={value}
                onChange={(e) => updateKPI(id as any, e.target.value)}
                className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right font-mono text-white focus:border-blue-500 focus:outline-none"
            />
        </div>
    );
};

export function KPISidebar() {
    const { resetDefaults, exportData } = useKPI();
    const [openSection, setOpenSection] = useState<string>("market");

    const toggle = (section: string) => {
        setOpenSection(openSection === section ? "" : section);
    };

    return (
        <div className="flex h-screen w-[400px] flex-col border-r border-slate-700 bg-slate-800 text-white overflow-y-auto">
            <div className="border-b border-slate-700 bg-slate-900/50 p-5">
                <h1 className="text-xl font-extrabold text-white">
                    SportData<span className="text-blue-500">Analytics</span>
                    <span className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white">KPI Engine v2.5</span>
                </h1>
                <p className="mt-2 text-xs text-slate-400">Interactive Business Model Calculator</p>
            </div>

            <ConfigGroup title="1. Growth & Adoption" isOpen={openSection === "growth"} onToggle={() => toggle("growth")}>
                <Inp label="New clients Y1" id="g_y1" />
                <Inp label="New clients Y2" id="g_y2" />
                <Inp label="New clients Y3" id="g_y3" />
                <Inp label="New clients Y4" id="g_y4" />
                <Inp label="New clients Y5" id="g_y5" />
                <Inp label="Churn Y1 (%)" id="ch_y1" />
                <Inp label="Churn Y2 (%)" id="ch_y2" />
                <Inp label="Churn stable (%)" id="ch_stable" />
            </ConfigGroup>

            <ConfigGroup title="4. Revenue Streams" isOpen={openSection === "revenue"} onToggle={() => toggle("revenue")}>
                <Inp label="SaaS subscriptions (%)" id="rev_saas" />
                <Inp label="Training & cert (%)" id="rev_train" />
                <Inp label="Prof services (%)" id="rev_prof" />
            </ConfigGroup>

            <ConfigGroup title="5. Operating Costs" isOpen={openSection === "costs"} onToggle={() => toggle("costs")}>
                <Inp label="Team headcount Y1" id="c_head" />
                <Inp label="Hires per year" id="c_hire" step="0.1" />
                <Inp label="Net salary/mo (DZD)" id="c_sal" />
                <Inp label="CNAS load (%)" id="tax_cnas" />
                <Inp label="Payroll % of costs" id="c_pay_pct" />
                <Inp label="Infra % of costs" id="c_infra_pct" />
                <Inp label="Marketing % of costs" id="c_mkt_pct" />
                <Inp label="Ops % of costs" id="c_ops_pct" />
            </ConfigGroup>

            <ConfigGroup title="6. Sales KPIs" isOpen={openSection === "sales"} onToggle={() => toggle("sales")}>
                <Inp label="Sales cycle (months)" id="s_cycle" />
                <Inp label="Lead→Demo conv (%)" id="s_lead" />
                <Inp label="Demo→POC conv (%)" id="s_demo" />
                <Inp label="POC→Client conv (%)" id="s_poc" />
                <Inp label="Sales comm (%)" id="s_comm" />
                <Inp label="CAC (k DZD)" id="s_cac" />
            </ConfigGroup>

            <ConfigGroup title="7. Distribution Channels" isOpen={openSection === "channels"} onToggle={() => toggle("channels")}>
                <Inp label="B2B Direct (%)" id="ch_b2b" />
                <Inp label="Institutional (%)" id="ch_inst" />
                <Inp label="Inter-club ref (%)" id="ch_ref" />
            </ConfigGroup>

            <ConfigGroup title="8. Fiscal & Cash Flow" isOpen={openSection === "fiscal"} onToggle={() => toggle("fiscal")}>
                <Inp label="Payment delay (mo)" id="cash_delay" />
                <Inp label="TVA (%)" id="tax_tva" />
                <Inp label="IBS corp tax (%)" id="tax_ibs" />
                <Inp label="Gross margin (%)" id="f_margin" />
            </ConfigGroup>

            <ConfigGroup title="9. Unit Economics" isOpen={openSection === "unit"} onToggle={() => toggle("unit")}>
                <Inp label="LTV (k DZD)" id="u_ltv" />
                <Inp label="LTV/CAC target" id="u_ltv_cac" step="0.1" />
                <Inp label="Break-even clients" id="u_breakeven" />
            </ConfigGroup>

            <ConfigGroup title="10. Funding Strategy" isOpen={openSection === "funding"} onToggle={() => toggle("funding")}>
                <Inp label="Seed ask (M DZD)" id="inv_seed" step="0.1" />
                <Inp label="Pre-money val (M DZD)" id="inv_pre" step="0.1" />
                <Inp label="Series A ask (M DZD)" id="inv_a" step="0.5" />
                <Inp label="Phase 1 budget (k DZD)" id="bud_p1" />
                <Inp label="Phase 2 budget (k DZD)" id="bud_p2" />
                <Inp label="Phase 3 budget (k DZD)" id="bud_p3" />
            </ConfigGroup>

            <div className="mt-auto border-t border-slate-700 p-5 space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700" onClick={exportData}>
                        <Save className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="outline" className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700" onClick={resetDefaults}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                </div>
            </div>
        </div>
    );
}
