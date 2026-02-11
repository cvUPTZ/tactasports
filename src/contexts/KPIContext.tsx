import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initialKPI, KPIModel, calculateKPIs, EngineResult } from '../utils/kpiEngine';

interface KPIContextType {
    kpi: KPIModel;
    metrics: EngineResult;
    updateKPI: (key: keyof KPIModel, value: any) => void;
    resetDefaults: () => void;
    exportData: () => void;
}

const KPIContext = createContext<KPIContextType | undefined>(undefined);

export function KPIProvider({ children }: { children: ReactNode }) {
    const [kpi, setKpi] = useState<KPIModel>(initialKPI);
    const [metrics, setMetrics] = useState<EngineResult>(calculateKPIs(initialKPI));

    useEffect(() => {
        setMetrics(calculateKPIs(kpi));
    }, [kpi]);

    const updateKPI = (key: keyof KPIModel, value: any) => {
        setKpi(prev => {
            const newVal = typeof prev[key] === 'number' ? Number(value) : value;
            return { ...prev, [key]: newVal };
        });
    };

    const resetDefaults = () => {
        setKpi(initialKPI);
    };

    const exportData = () => {
        const data = { timestamp: new Date().toISOString(), inputs: kpi, results: metrics };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sportdata_kpis_${Date.now()}.json`;
        a.click();
    };

    return (
        <KPIContext.Provider value={{ kpi, metrics, updateKPI, resetDefaults, exportData }}>
            {children}
        </KPIContext.Provider>
    );
}

export function useKPI() {
    const context = useContext(KPIContext);
    if (!context) {
        throw new Error('useKPI must be used within KPIProvider');
    }
    return context;
}
