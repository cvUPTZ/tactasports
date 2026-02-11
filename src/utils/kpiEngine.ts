export interface Constituent {
    id: string;
    name: string;
    tier: string;
    revenue: number;
    status: 'Active' | 'Lead' | 'Prospect' | 'Churned';
}

export interface MarketSegment {
    id: string;
    name: string;
    count: number;     // Number of organizations
    price: number;     // ARPU/Price
    penRate: number;   // Target penetration rate (0-100)
    constituents?: Constituent[]; // Drilldown data
}

export interface Competitor {
    id: string;
    name: string;
    threat: string;
    strength: string;
    advantage: string;
}

export interface Risk {
    id: string;
    name: string;
    prob: number; // 0-100
    impact: string; // Low/Med/High/Critical
    impactLevel: number; // 1-10
    score: number;
    mitigation: string;
}

export interface KPIModel {
    // Market
    marketSegments: MarketSegment[];
    // Competitors
    competitors: Competitor[];
    // Risks
    risks: Risk[];

    // Pricing (globals / averages)
    p_arpu: number;
    // Growth
    g_y1: number; g_y2: number; g_y3: number; g_y4: number; g_y5: number;
    ch_y1: number; ch_y2: number; ch_stable: number; g_pen: number;
    // Revenue mix
    rev_saas: number; rev_train: number; rev_prof: number;
    // Costs
    c_head: number; c_hire: number; c_sal: number; tax_cnas: number;
    c_pay_pct: number; c_infra_pct: number; c_mkt_pct: number; c_ops_pct: number;
    // Sales
    s_cycle: number; s_lead: number; s_demo: number; s_poc: number; s_comm: number; s_cac: number;
    s_lead_time: string; s_demo_time: string; s_poc_time: string; // New editable times

    // Channels
    ch_b2b: number; ch_inst: number; ch_ref: number;
    // Fiscal
    cash_delay: number; tax_tva: number; tax_ibs: number; f_margin: number;
    // Unit econ
    u_ltv: number; u_ltv_cac: number; u_breakeven: number;
    // Investment
    inv_seed: number; inv_pre: number; inv_a: number;
    bud_p1: number; bud_p2: number; bud_p3: number;

    // Benchmarks & Targets
    bench_churn: string;
    bench_nrr: string;
    bench_life: string;
    target_cycle: string;
    target_lead: string;
    target_demo: string;
    target_poc: string;
    target_conv: string;
}

const LIGUE_1_CLUBS: Constituent[] = [
    { id: '1', name: "CR Belouizdad", tier: "Elite", revenue: 216000, status: "Active" },
    { id: '2', name: "MC Alger", tier: "Elite", revenue: 216000, status: "Active" },
    { id: '3', name: "USM Alger", tier: "Elite", revenue: 216000, status: "Lead" },
    { id: '4', name: "JS Kabylie", tier: "Elite", revenue: 216000, status: "Lead" },
    { id: '5', name: "ES Setif", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '6', name: "MC Oran", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '7', name: "CS Constantine", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '8', name: "Paradou AC", tier: "Elite", revenue: 216000, status: "Active" },
    { id: '9', name: "JS Saoura", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '10', name: "ASO Chlef", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '11', name: "US Biskra", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '12', name: "NC Magra", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '13', name: "MC El Bayadh", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '14', name: "USM Khenchela", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '15', name: "ES Ben Aknoun", tier: "Elite", revenue: 216000, status: "Prospect" },
    { id: '16', name: "US Souf", tier: "Elite", revenue: 216000, status: "Prospect" }
];

export const initialKPI: KPIModel = {
    // Market
    marketSegments: [
        { id: '1', name: 'Ligue 1 Elite', count: 16, price: 216000, penRate: 67, constituents: LIGUE_1_CLUBS },
        { id: '2', name: 'Ligue 1 Standard', count: 32, price: 144000, penRate: 30 },
        { id: '3', name: 'Ligue 2 Progressive', count: 8, price: 72000, penRate: 17 },
        { id: '4', name: 'FAF Centers', count: 6, price: 100000, penRate: 75 }
    ],
    // Competitors
    competitors: [
        { id: '1', name: "Stats Perform/Opta", threat: "High", strength: "Global leader, 30+ sports", advantage: "Local compliance, FAF relations" },
        { id: '2', name: "Sportradar", threat: "High", strength: "85+ sports, video integration", advantage: "First-mover, training integration" },
        { id: '3', name: "Excel/Manual tools", threat: "Medium", strength: "Zero cost, familiarity", advantage: "Automation, compliance, insights" },
        { id: '4', name: "Hudl/Wyscout", threat: "Low", strength: "Video analysis focus", advantage: "Full SaaS platform, local support" }
    ],
    // Risks
    risks: [
        { id: '1', name: "Adoption Resistance", prob: 70, impact: "High", impactLevel: 3, score: 2.1, mitigation: "POC programs, FAF endorsement" },
        { id: '2', name: "Competitor Entry", prob: 40, impact: "High", impactLevel: 3, score: 1.2, mitigation: "Community moat, exclusive partnerships" },
        { id: '3', name: "Regulatory Change", prob: 30, impact: "Medium", impactLevel: 2, score: 0.6, mitigation: "Flexible architecture, legal monitoring" },
        { id: '4', name: "Validation Failure", prob: 40, impact: "Critical", impactLevel: 4, score: 1.6, mitigation: "Milestone-based funding, pivot" }
    ],

    // Pricing
    p_arpu: 150000,
    // Growth
    g_y1: 6, g_y2: 5, g_y3: 3, g_y4: 3, g_y5: 2,
    ch_y1: 15, ch_y2: 12, ch_stable: 8, g_pen: 30,
    // Revenue mix
    rev_saas: 70, rev_train: 25, rev_prof: 5,
    // Costs
    c_head: 3, c_hire: 0.5, c_sal: 60000, tax_cnas: 35,
    c_pay_pct: 63, c_infra_pct: 10, c_mkt_pct: 14, c_ops_pct: 13,
    // Sales
    s_cycle: 6, s_lead: 40, s_demo: 60, s_poc: 70, s_comm: 5, s_cac: 48,
    s_lead_time: "1-2 months", s_demo_time: "2-4 weeks", s_poc_time: "3-6 months",
    // Channels
    ch_b2b: 80, ch_inst: 15, ch_ref: 5,
    // Fiscal
    cash_delay: 3, tax_tva: 19, tax_ibs: 19, f_margin: 85,
    // Unit econ
    u_ltv: 425, u_ltv_cac: 8.9, u_breakeven: 25,
    // Investment
    inv_seed: 1.0, inv_pre: 4.0, inv_a: 17.5,
    bud_p1: 400, bud_p2: 800, bud_p3: 600,

    // Benchmarks & Targets
    bench_churn: "5-10% (B2B SaaS)",
    bench_nrr: "100-120%",
    bench_life: "36-60 months",

    target_cycle: "6-9 months",
    target_lead: "30-50%",
    target_demo: "50-70%",
    target_poc: "60-80%",
    target_conv: "10-20%"
};

export interface YearProjection {
    year: number;
    newClients: number;
    churnRate: number;
    activeClients: number;
    arpu: number;
    arr: number;
    headcount: number;
    personnel: number;
    infrastructure: number;
    marketing: number;
    operations: number;
    totalCosts: number;
    ebitda: number;
    tax: number;
    netIncome: number;
    margin: number;
}

export interface CashFlowProjection {
    year: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
    cumulativeCash: number;
}

export interface EngineResult {
    years: YearProjection[];
    cashFlow: CashFlowProjection[];
    y5: YearProjection;
    ltv: number;
    ltv_cac: number;
    paybackMonths: number;
    customerLifeMonths: number;
    nrr: number;
    tam: number;
    sam: number;
    som: number;
    minCash: number;
    breakEvenClients: number;
    breakEvenARR: number;
}

export const calculateKPIs = (KPI: KPIModel): EngineResult => {
    // === MARKET CALCULATIONS ===
    const tam = KPI.marketSegments.reduce((sum, seg) => sum + (seg.count * seg.price), 0);
    const sam = tam * 0.70; // 70% technologically receptive
    const som = KPI.marketSegments.reduce((sum, seg) => sum + (seg.count * seg.price * (seg.penRate / 100)), 0);

    // === GROWTH & CHURN MODEL ===
    const years: YearProjection[] = [];
    let activeClients = 0;

    for (let y = 1; y <= 5; y++) {
        // @ts-ignore - dynamic key access for growth years
        const newClients = KPI[`g_y${y}` as keyof KPIModel] as number || 0;
        const churnRate = y === 1 ? KPI.ch_y1 / 100 : y === 2 ? KPI.ch_y2 / 100 : KPI.ch_stable / 100;
        activeClients = activeClients * (1 - churnRate) + newClients;

        const arpuGrowth = 1 + (y - 1) * 0.03; // 3% annual ARPU growth
        const arpu = KPI.p_arpu * arpuGrowth;
        const arr = activeClients * arpu;

        // Cost structure
        const headcount = KPI.c_head + (y - 1) * KPI.c_hire;
        const monthlyGrossSal = headcount * KPI.c_sal;
        const loadedPayroll = monthlyGrossSal * 12 * (1 + KPI.tax_cnas / 100);

        // Derived costs based on percentages
        // Careful with calculation: HTML says: totalCosts = loadedPayroll / (KPI.c_pay_pct/100);
        const totalCosts = loadedPayroll / (KPI.c_pay_pct / 100);

        const personnel = totalCosts * (KPI.c_pay_pct / 100);
        const infrastructure = totalCosts * (KPI.c_infra_pct / 100);
        const marketing = totalCosts * (KPI.c_mkt_pct / 100);
        const operations = totalCosts * (KPI.c_ops_pct / 100);

        const ebitda = arr - totalCosts;
        const tax = ebitda > 0 ? ebitda * KPI.tax_ibs / 100 : 0;
        const netIncome = ebitda - tax;

        years.push({
            year: y,
            newClients,
            churnRate,
            activeClients,
            arpu,
            arr,
            headcount,
            personnel,
            infrastructure,
            marketing,
            operations,
            totalCosts,
            ebitda,
            tax,
            netIncome,
            margin: arr > 0 ? (netIncome / arr) * 100 : -100
        });
    }

    const y5 = years[4];

    // === UNIT ECONOMICS ===
    const ltv = KPI.p_arpu / (KPI.ch_stable / 100);
    const ltv_cac = ltv / (KPI.s_cac * 1000);
    const paybackMonths = (KPI.s_cac * 1000) / ((KPI.p_arpu / 12) * (KPI.f_margin / 100));
    const customerLifeMonths = 1 / (KPI.ch_stable / 100) * 12;
    const nrr = 100 - KPI.ch_stable + 5; // Assume 5% expansion

    // === CASH FLOW ===
    let cumulativeCash = KPI.inv_seed * 1000000;
    const cashFlow: CashFlowProjection[] = [];

    for (let y = 1; y <= 5; y++) {
        const yrData = years[y - 1];
        const collectionRate = y === 1 ? 0.6 : y === 2 ? 0.8 : 0.95; // Gradual improvement
        const cashIn = yrData.arr * collectionRate;
        const cashOut = yrData.totalCosts;
        const netCashFlow = cashIn - cashOut;
        cumulativeCash += netCashFlow;
        cashFlow.push({ year: y, cashIn, cashOut, netCashFlow, cumulativeCash });
    }

    const minCash = Math.min(...cashFlow.map(c => c.cumulativeCash));

    // === BREAK-EVEN ===
    const breakEvenARR = y5.totalCosts;
    const breakEvenClients = breakEvenARR / KPI.p_arpu;

    return {
        years,
        cashFlow,
        y5,
        ltv,
        ltv_cac,
        paybackMonths,
        customerLifeMonths,
        nrr,
        tam,
        sam,
        som,
        minCash,
        breakEvenClients,
        breakEvenARR
    };
};
