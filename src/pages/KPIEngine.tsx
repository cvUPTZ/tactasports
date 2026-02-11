import { useState } from "react";
import { KPISidebar } from "@/components/kpi/KPISidebar";
import { DashboardTab } from "@/components/kpi/tabs/DashboardTab";

import { MarketTab } from "@/components/kpi/tabs/MarketTab";
import { FinancialsTab } from "@/components/kpi/tabs/FinancialsTab";
import { UnitEconomicsTab } from "@/components/kpi/tabs/UnitEconomicsTab";
import { BusinessModelTab } from "@/components/kpi/tabs/BusinessModelTab";
import { DataSourcesTab } from "@/components/kpi/tabs/DataSourcesTab";

export default function KPIEngine() {
    const [activeTab, setActiveTab] = useState("dash");

    const tabs = [
        { id: "dash", label: "📊 Dashboard", Component: DashboardTab },
        { id: "market", label: "🎯 Market Analysis", Component: MarketTab },
        { id: "finance", label: "💰 Financials", Component: FinancialsTab },
        { id: "metrics", label: "📈 Unit Economics", Component: UnitEconomicsTab },
        { id: "bmc", label: "🏢 Business Model", Component: BusinessModelTab },
        { id: "data", label: "📋 Data Sources", Component: DataSourcesTab },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.Component || DashboardTab;

    return (
        <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
            <KPISidebar />

            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex h-16 items-center gap-8 border-b border-slate-200 bg-white px-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex h-full items-center border-b-2 px-1 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-blue-600"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-10 print:p-0 print:overflow-visible">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
}
