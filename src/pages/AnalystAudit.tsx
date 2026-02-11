import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Laptop,
    Tablet,
    Server,
    X,
    Check,
    Gamepad2,
    Timer,
    DollarSign,
    Brain,
    Wrench,
    TrendingUp,
    Recycle,
    Scale,
    GraduationCap,
    Bot,
    Building,
    BookOpen,
    MessageCircle,
    HeartPulse,
    Crown,
    Shield,
    ArrowRight,
    CheckCircle,
} from "lucide-react";

// Standard UI components to ensure consistency
const Slide = ({ active, children, className = "" }: { active: boolean; children: React.ReactNode; className?: string }) => {
    if (!active) return null;
    return (
        <div className={`w-full h-full flex flex-col p-8 overflow-hidden animate-in fade-in duration-500 ${className}`}>
            {children}
        </div>
    );
};

const AnalystAudit = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const totalSlides = 17;

    const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") nextSlide();
            if (e.key === "ArrowLeft") prevSlide();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-green-500 selection:text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 w-full z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700 px-6 py-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center font-bold">T</div>
                    <span className="font-bold tracking-wider">
                        TACTA <span className="text-slate-400 text-sm font-normal">| AUDIT INTER</span>
                    </span>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${isEditMode ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        {isEditMode ? 'Editing On' : 'Edit Mode'}
                    </button>
                    <button onClick={prevSlide} disabled={currentSlide === 0} className="p-2 hover:bg-slate-700 rounded-full transition disabled:opacity-50">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 py-2 bg-slate-800 rounded text-sm font-mono min-w-[80px] text-center">
                        {currentSlide + 1} / {totalSlides}
                    </span>
                    <button onClick={nextSlide} disabled={currentSlide === totalSlides - 1} className="p-2 hover:bg-slate-700 rounded-full transition disabled:opacity-50">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </nav>

            <main className="pt-16 h-screen w-screen overflow-hidden relative font-inter" contentEditable={isEditMode} suppressContentEditableWarning={true}>

                {/* SLIDE 1: Cover */}
                <Slide active={currentSlide === 0} className="bg-white text-black relative !p-0">
                    <div className="h-full w-full flex flex-col justify-center pl-10 md:pl-20 relative z-10">
                        <div className="mb-4 text-green-700 font-bold tracking-widest text-sm uppercase">Rapport Confidentiel</div>
                        <h1 className="text-6xl md:text-8xl font-black leading-none mb-6 font-oswald uppercase">
                            De l'Ombre à<br />la Lumière
                        </h1>
                        <h2 className="text-3xl md:text-4xl font-light mb-8 text-slate-600 font-oswald uppercase">
                            Audit de la Réalité<br />de l'Analyste Vidéo
                        </h2>
                        <div className="w-24 h-2 bg-red-600 mb-8"></div>
                        <p className="text-xl max-w-2xl font-light leading-relaxed text-slate-800">
                            Une analyse forensique des <strong>142 points de friction</strong> qui brisent le métier, et la voie vers une pratique durable.
                        </p>
                        <div className="mt-12 flex items-center gap-4">
                            <div className="px-6 py-3 bg-black text-white font-bold rounded">Inter</div>
                            <div className="text-sm text-slate-500 uppercase tracking-widest">Rapport de Situation & Solution Tacta</div>
                        </div>
                    </div>
                    {/* Aesthetic Background Elements */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-100 hidden md:block" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
                    <div className="absolute bottom-10 right-10 md:right-32 opacity-90 animate-bounce transition-all duration-1000">
                        <Laptop size={200} className="text-slate-800" strokeWidth={1} />
                    </div>
                </Slide>

                {/* SLIDE 2: The Myth vs Reality (Iceberg) */}
                <Slide active={currentSlide === 1} className="bg-sky-50 text-slate-800">
                    <h2 className="text-4xl font-bold mb-8 text-black font-oswald uppercase">Le Mythe des 90 Minutes vs<br />La Réalité des 70 Heures</h2>

                    <div className="flex-1 relative w-full max-w-5xl mx-auto mt-8 border-b-4 border-sky-200 h-full flex flex-col items-center justify-center">
                        <div className="text-center z-10 mb-12">
                            <div className="text-6xl mb-2">🏔️</div>
                            <div className="bg-white p-6 shadow-lg rounded-lg border border-sky-100">
                                <p className="font-bold text-sky-900 text-xl">Le visible : Le match (90 min)</p>
                                <p className="text-sm text-sky-600 mt-1">L'image publique : "Travailler dans le foot"</p>
                            </div>
                        </div>

                        <div className="w-full h-1 bg-sky-300 my-4 relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-100 px-2 text-xs text-sky-600 font-bold uppercase">Surface</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full max-w-4xl">
                            <div className="bg-slate-800 p-6 rounded shadow-xl border-l-4 border-red-500 text-white">
                                <h4 className="font-bold text-lg mb-1">L'invisible :</h4>
                                <p>Semaines de 50 à 70h</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded shadow-xl border-l-4 border-red-500 text-white md:translate-y-8">
                                <p>Dimanche 2h du matin :<br />Finalisation des rapports</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded shadow-xl border-l-4 border-red-500 text-white md:col-span-2 md:w-2/3 md:mx-auto">
                                <p className="font-bold text-red-400 text-lg">87% des weekends travaillés</p>
                                <p className="text-sm text-slate-400 mt-1">Pas de vie personnelle, pas de vacances</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-600 text-white p-4 mt-8 font-bold text-center rounded">
                        Statistique clé : Charge de travail excessive et invisible.
                    </div>
                </Slide>

                {/* SLIDE 3: The Weight of Friction (Waffle Chart) */}
                <Slide active={currentSlide === 2} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-8 font-oswald uppercase">Le Poids de la Friction : <span className="text-red-600">142 Problèmes Identifiés</span></h2>

                    <div className="flex flex-col md:flex-row gap-12 items-center justify-center flex-1 h-full">
                        {/* Waffle Chart Visualization */}
                        {/* Waffle Chart Visualization (SVG) */}
                        <div className="w-full max-w-md aspect-square relative">
                            <svg viewBox="0 0 110 165" className="w-full h-full drop-shadow-lg">
                                <defs>
                                    <rect id="cell" width="9" height="9" rx="2" ry="2" />
                                    <filter id="inner-shadow">
                                        <feOffset dx="0" dy="1" />
                                        <feGaussianBlur stdDeviation="1" result="offset-blur" />
                                        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                                        <feFlood floodColor="black" floodOpacity="0.2" result="color" />
                                        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                                        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                                    </filter>
                                </defs>
                                {Array.from({ length: 150 }).map((_, i) => {
                                    const cols = 10;
                                    const x = (i % cols) * 11; // 9 width + 2 gap
                                    const y = Math.floor(i / cols) * 11;

                                    let fill = "#f1f5f9"; // slate-100 (empty)
                                    let className = "transition-all duration-300 hover:opacity-80";

                                    if (i < 20) fill = "#dc2626"; // red-600
                                    else if (i < 36) fill = "#f97316"; // orange-500
                                    else if (i < 51) fill = "#eab308"; // yellow-500
                                    else if (i < 142) fill = "#1e293b"; // slate-800
                                    else fill = "#e2e8f0"; // slate-200 (empty slots)

                                    return (
                                        <rect
                                            key={i}
                                            x={x}
                                            y={y}
                                            width="9"
                                            height="9"
                                            rx="1.5"
                                            fill={fill}
                                            className={className}
                                        />
                                    );
                                })}
                            </svg>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-red-600 rounded"></div>
                                <div>
                                    <div className="font-bold text-lg">Technique (20)</div>
                                    <div className="text-sm text-gray-500">Équipement coûteux, crashes.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-orange-500 rounded"></div>
                                <div>
                                    <div className="font-bold text-lg">Temporel (16)</div>
                                    <div className="text-sm text-gray-500">Charge insoutenable, deadlines.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-yellow-500 rounded"></div>
                                <div>
                                    <div className="font-bold text-lg">Cognitif (15)</div>
                                    <div className="text-sm text-gray-500">Surcharge, fatigue décisionnelle.</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-slate-800 rounded"></div>
                                <div>
                                    <div className="font-bold text-lg">Autres (91)</div>
                                    <div className="text-sm text-gray-500">Structurel/Financier, etc.</div>
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-black text-white font-bold text-xl rounded">
                                Total : 142 points de friction distincts
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-xl font-bold italic mt-8 text-slate-500">
                        Ce n'est pas de la malchance, c'est systémique.
                    </div>
                </Slide>

                {/* SLIDE 4: Technical Nightmare */}
                <Slide active={currentSlide === 3} className="bg-slate-50 text-black">
                    <h2 className="text-4xl font-bold mb-12 font-oswald uppercase">Le Cauchemar Technique et la <span className="text-red-600">'Taxe d'Outil'</span></h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center flex-1 h-full max-w-6xl mx-auto">
                        {/* Visual */}
                        <div className="relative h-96 w-full flex items-center justify-center select-none">
                            <Laptop className="absolute left-10 bottom-10 w-48 h-48 text-slate-400" strokeWidth={1} />
                            <div className="absolute left-16 bottom-52 bg-red-600 text-white font-bold px-3 py-1 rounded shadow-lg transform -rotate-12">1500€</div>

                            <Tablet className="absolute top-10 left-10 w-32 h-32 text-slate-400" strokeWidth={1} />
                            <div className="absolute top-6 left-0 bg-red-600 text-white font-bold px-3 py-1 rounded shadow-lg transform -rotate-12">800€</div>

                            <Server className="absolute right-10 bottom-20 w-40 h-40 text-slate-400" strokeWidth={1} />
                            <div className="absolute right-0 bottom-52 bg-red-600 text-white font-bold px-3 py-1 rounded shadow-lg">5000€/an</div>

                            <div className="absolute inset-x-0 bottom-0 text-center font-bold text-slate-400">Standard Analyst Setup</div>
                        </div>

                        {/* List */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-2xl font-bold border-b-2 border-black pb-4 mb-6 uppercase font-oswald">Grief List</h3>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <X className="text-red-600 w-6 h-6 shrink-0 mt-1" />
                                    <span><strong className="block text-lg">Coût exorbitant</strong>Matériel + Licences coûteuses.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <X className="text-red-600 w-6 h-6 shrink-0 mt-1" />
                                    <span><strong className="block text-lg">Instabilité</strong>'Sportscode crash' = perte de 2h de travail.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <X className="text-red-600 w-6 h-6 shrink-0 mt-1" />
                                    <span><strong className="block text-lg">Lourdeur</strong>Fichiers de 15 Go, exports de 20 minutes.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <X className="text-red-600 w-6 h-6 shrink-0 mt-1" />
                                    <span><strong className="block text-lg">Fragmentation</strong>Jongler entre Sportscode, Excel, et PowerPoint.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 5: Time Trap */}
                <Slide active={currentSlide === 4} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-12 font-oswald uppercase">L'Étau Temporel : Quand le Chronomètre ne s'Arrête Jamais</h2>

                    <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full">
                        {/* Timeline */}
                        <div className="grid grid-cols-7 gap-1 mb-2 px-1 text-xs md:text-sm font-bold text-center uppercase tracking-wider text-slate-500">
                            <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div className="text-red-600">Dimanche</div>
                        </div>
                        <div className="flex h-24 w-full gap-1 mb-12">
                            {[1, 2, 3, 4, 5].map(d => (
                                <div key={d} className="flex-1 bg-slate-800 text-white flex flex-col items-center justify-center text-xs md:text-sm rounded-sm">
                                    <span className="opacity-50">TRAVAIL</span>
                                </div>
                            ))}
                            <div className="flex-1 bg-black text-white flex flex-col items-center justify-center font-bold rounded-sm border-2 border-slate-800">
                                MATCH<br />DAY
                            </div>
                            <div className="flex-1 bg-red-600 text-white flex flex-col items-center justify-center font-bold text-center text-xs md:text-sm rounded-sm animate-pulse">
                                POST-MATCH<br />ANALYSIS<br /><span className="text-[10px] opacity-90">02:00 AM</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="border-l-4 border-red-600 pl-6 py-2">
                                <h4 className="font-bold text-red-600 text-xl font-oswald mb-1">10h</h4>
                                <p className="text-gray-700">de travail par match.</p>
                            </div>
                            <div className="border-l-4 border-red-600 pl-6 py-2">
                                <h4 className="font-bold text-red-600 text-xl font-oswald mb-1">60-70h</h4>
                                <p className="text-gray-700">Moyenne hebdomadaire. Aucune vie sociale.</p>
                            </div>
                            <div className="border-l-4 border-red-600 pl-6 py-2">
                                <h4 className="font-bold text-red-600 text-xl font-oswald mb-1">800 Clics</h4>
                                <p className="text-gray-700">pour taguer seulement 80 clips de jeu.</p>
                            </div>
                            <div className="border-l-4 border-red-600 pl-6 py-2">
                                <h4 className="font-bold text-red-600 text-xl font-oswald mb-1">x2 Efforts</h4>
                                <p className="text-gray-700">Codage temps réel suivi d'un recodage post-match.</p>
                            </div>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 6: Human Cost */}
                <Slide active={currentSlide === 5} className="bg-slate-900 text-white relative overflow-hidden">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                    <h2 className="text-4xl font-bold mb-16 text-center font-oswald uppercase relative z-10">Le Coût Humain : Corps et Esprit à l'Épreuve</h2>

                    <div className="flex flex-col md:flex-row justify-center items-center flex-1 gap-16 relative z-10 max-w-6xl mx-auto">

                        <div className="w-full md:w-1/3 space-y-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-2xl font-bold border-b border-white pb-3 font-oswald">Physique (Corps)</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">TMS : Syndrome du canal carpien, tendinites chroniques.</span></li>
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">Douleurs cervicales et lombaires (assis 10h/jour).</span></li>
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">Fatigue visuelle et maux de tête.</span></li>
                            </ul>
                        </div>

                        {/* Center Visual */}
                        <div className="relative">
                            <div className="w-80 h-96 border border-slate-700/50 rounded-3xl flex items-center justify-center bg-slate-800/80 backdrop-blur-sm relative overflow-hidden group shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 to-transparent pointer-events-none"></div>
                                <svg viewBox="0 0 200 400" className="h-72 w-auto drop-shadow-2xl">
                                    <defs>
                                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#94a3b8" />
                                            <stop offset="100%" stopColor="#cbd5e1" />
                                        </linearGradient>
                                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                        <radialGradient id="pulseGradient">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                        </radialGradient>
                                    </defs>

                                    {/* Tech/Grid Background lines for futuristic feel */}
                                    <path d="M0 50 H200 M0 150 H200 M0 250 H200 M0 350 H200" stroke="white" strokeWidth="0.5" opacity="0.1" />
                                    <path d="M50 0 V400 M150 0 V400" stroke="white" strokeWidth="0.5" opacity="0.1" />

                                    {/* Stylized Human Silhouette */}
                                    <path
                                        d="M100 30 C115 30 125 42 125 55 C125 68 115 80 100 80 C85 80 75 68 75 55 C75 42 85 30 100 30 Z 
                                           M100 85 C125 85 150 95 160 120 L170 170 C172 180 165 190 155 190 L145 190 L150 260 L155 380 C156 390 145 395 140 385 L115 300 L105 300 L85 300 L60 385 C55 395 44 390 45 380 L50 260 L55 190 L45 190 C35 190 28 180 30 170 L40 120 C50 95 75 85 100 85 Z"
                                        fill="url(#bodyGradient)"
                                        opacity="0.9"
                                        stroke="white"
                                        strokeWidth="1"
                                        strokeOpacity="0.5"
                                    />

                                    {/* Internal "Skeleton" or Tech Lines */}
                                    <path d="M100 80 L100 300" stroke="white" strokeWidth="2" opacity="0.2" strokeDasharray="5,5" />
                                    <line x1="100" y1="120" x2="160" y2="170" stroke="white" strokeWidth="1" opacity="0.2" />
                                    <line x1="100" y1="120" x2="40" y2="170" stroke="white" strokeWidth="1" opacity="0.2" />

                                    {/* Pain Points (Animated overlay) */}
                                    {/* Head */}
                                    <circle cx="100" cy="55" r="6" className="fill-red-500 animate-pulse" filter="url(#glow)">
                                        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                                    </circle>

                                    {/* Neck/Shoulders */}
                                    <circle cx="100" cy="90" r="8" className="fill-red-500 animate-pulse" filter="url(#glow)">
                                        <animate attributeName="r" values="6;9;6" dur="3s" repeatCount="indefinite" />
                                    </circle>

                                    {/* Wrists (Carpal Tunnel) */}
                                    <circle cx="35" cy="180" r="8" className="fill-red-500 animate-pulse" filter="url(#glow)" />
                                    <circle cx="165" cy="180" r="8" className="fill-red-500 animate-pulse" filter="url(#glow)" />

                                    {/* Lower Back */}
                                    <circle cx="100" cy="220" r="10" className="fill-red-500 animate-pulse" filter="url(#glow)">
                                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                </svg>
                                <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-full border border-slate-700"><HeartPulse className="text-red-500 animate-pulse" size={24} /></div>
                            </div>
                        </div>

                        <div className="w-full md:w-1/3 space-y-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-2xl font-bold border-b border-white pb-3 font-oswald">Psychologique</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">Charge mentale : Suivre 22 joueurs + ballon simultanément.</span></li>
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">Burnout : 60% des analystes touchés après 2-3 ans.</span></li>
                                <li className="flex gap-4"><X className="text-red-500 w-6 h-6 mt-1 shrink-0" /> <span className="text-slate-200">Isolement social et anxiété de performance.</span></li>
                            </ul>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 7: Professional Deadlock (Scale) */}
                <Slide active={currentSlide === 6} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-12 text-center font-oswald uppercase">L'Impasse Professionnelle : Beaucoup d'Efforts, Peu de Retour</h2>

                    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">

                        <div className="relative w-full max-w-2xl h-64 mb-16">
                            <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-xl overflow-visible">
                                {/* Base Stand */}
                                <rect x="195" y="100" width="10" height="150" rx="2" fill="#334155" />
                                <rect x="150" y="250" width="100" height="10" rx="2" fill="#1e293b" />

                                {/* Rotating Beam Assembly */}
                                <g transform="rotate(12, 200, 100)">
                                    {/* Main Beam */}
                                    <rect x="50" y="95" width="300" height="10" rx="2" fill="#1e293b" />

                                    {/* Pivot Point */}
                                    <circle cx="200" cy="100" r="8" fill="#475569" stroke="#1e293b" strokeWidth="2" />

                                    {/* Left Pan (Heavy) - Hanging down vertically regardless of beam angle */}
                                    <g transform="translate(60, 100)">
                                        {/* Counter-rotate to keep vertical */}
                                        <g transform="rotate(-12)">
                                            <line x1="0" y1="0" x2="0" y2="100" stroke="#94a3b8" strokeWidth="2" />
                                            <circle cx="0" cy="130" r="45" fill="#1e293b" className="drop-shadow-lg" />
                                            <text x="0" y="125" textAnchor="middle" fill="#cbd5e1" fontSize="10" letterSpacing="2" fontWeight="bold">EFFORT</text>
                                            <text x="0" y="145" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">60h/sem</text>
                                        </g>
                                    </g>

                                    {/* Right Pan (Light) - Hanging down vertically */}
                                    <g transform="translate(340, 100)">
                                        {/* Counter-rotate to keep vertical */}
                                        <g transform="rotate(-12)">
                                            <line x1="0" y1="0" x2="0" y2="80" stroke="#94a3b8" strokeWidth="2" />
                                            <circle cx="0" cy="105" r="35" fill="#ecfdf5" stroke="#16a34f" strokeWidth="3" className="drop-shadow-lg" />
                                            <text x="0" y="110" textAnchor="middle" fill="#166534" fontSize="10" fontWeight="bold" letterSpacing="1">RETOUR</text>
                                        </g>
                                    </g>
                                </g>
                            </svg>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-5xl">
                            <div className="border border-red-200 p-6 bg-red-50 rounded-lg">
                                <DollarSign className="text-red-600 mb-3" />
                                <h4 className="font-bold text-lg mb-2">Salaire Réel</h4>
                                <p className="text-sm text-slate-700">25-35K€ pour 60h/sem = 8-11€/heure réelle.</p>
                            </div>
                            <div className="border border-red-200 p-6 bg-red-50 rounded-lg">
                                <Scale className="text-red-600 mb-3" />
                                <h4 className="font-bold text-lg mb-2">Précarité</h4>
                                <p className="text-sm text-slate-700">CDD d'un an, licenciement facile. Pas de sécurité.</p>
                            </div>
                            <div className="border border-red-200 p-6 bg-red-50 rounded-lg">
                                <DollarSign className="text-red-600 mb-3" />
                                <h4 className="font-bold text-lg mb-2">Investissement</h4>
                                <p className="text-sm text-slate-700">Abonnements personnels, matériel propre (~1500€).</p>
                            </div>
                            <div className="border border-red-200 p-6 bg-red-50 rounded-lg">
                                <GraduationCap className="text-red-600 mb-3" />
                                <h4 className="font-bold text-lg mb-2">Plafond</h4>
                                <p className="text-sm text-slate-700">Considéré comme 'technicien', pas d'évolution coaching.</p>
                            </div>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 8: Top 10 Killers */}
                <Slide active={currentSlide === 7} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-8 font-oswald uppercase text-center">Les 'Top 10 Killers' : Les Menaces Critiques</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 max-w-5xl mx-auto items-center h-full pb-10">
                        <div className="space-y-4">
                            {[
                                { icon: Timer, title: "Charge de travail 60-70h", sub: "(Insoutenable)" },
                                { icon: DollarSign, title: "Salaire faible vs temps", sub: "(Précarité)" },
                                { icon: Brain, title: "Fatigue mentale épuisante", sub: "(Risque d'erreur)" },
                                { icon: Wrench, title: "Outils archaïques et lents", sub: "(Frustration)" },
                                { icon: Shield, title: "Manque de reconnaissance", sub: "(Invisibilité)" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100 shadow-sm">
                                    <div className="text-4xl font-black text-red-600 w-12 text-center font-oswald">{i + 1}</div>
                                    <item.icon className="text-slate-400 w-8 h-8" strokeWidth={1.5} />
                                    <div>
                                        <div className="font-bold text-lg">{item.title}</div>
                                        <div className="text-red-600 text-sm font-semibold">{item.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {[
                                { icon: Recycle, title: "Tâches répétitives abrutissantes", sub: "" },
                                { icon: Scale, title: "Précarité contractuelle", sub: "" },
                                { icon: GraduationCap, title: "Absence de formation académique", sub: "" },
                                { icon: Bot, title: "Menace d'automatisation IA", sub: "(Obsolescence)" },
                                { icon: Building, title: "Isolement professionnel", sub: "" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100 shadow-sm">
                                    <div className="text-4xl font-black text-red-600 w-12 text-center font-oswald">{i + 6}</div>
                                    <item.icon className="text-slate-400 w-8 h-8" strokeWidth={1.5} />
                                    <div>
                                        <div className="font-bold text-lg">{item.title}</div>
                                        {item.sub && <div className="text-red-600 text-sm font-semibold">{item.sub}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 9: What Tech Cannot Solve */}
                <Slide active={currentSlide === 8} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-4 font-oswald uppercase">Ce que la Technologie NE PEUT PAS Résoudre</h2>
                    <p className="text-2xl text-slate-500 mb-12 font-oswald uppercase">(La Liste Impossible)</p>

                    <div className="bg-slate-100 p-10 border-l-8 border-slate-400 shadow-inner max-w-4xl mx-auto rounded-r-lg">
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">94 problèmes (66%) sont structurels et hors de contrôle.</h3>
                        <ul className="space-y-6 text-xl">
                            <li className="flex items-center gap-4"><X className="text-slate-400" /> Salaires et Contrats : Décisions des clubs.</li>
                            <li className="flex items-center gap-4"><X className="text-slate-400" /> Ego des Coachs et Joueurs.</li>
                            <li className="flex items-center gap-4"><X className="text-slate-400" /> Marché de l'emploi : Saturation.</li>
                            <li className="flex items-center gap-4"><X className="text-slate-400" /> Cadre Juridique : RGPD et droits TV.</li>
                            <li className="flex items-center gap-4"><X className="text-slate-400" /> Reconnaissance Hiérarchique.</li>
                        </ul>
                    </div>

                    <div className="mt-auto text-3xl font-black text-center border-t-2 border-black pt-8 max-w-3xl mx-auto">
                        Aucun logiciel ne peut changer la culture du football.
                    </div>
                </Slide>

                {/* SLIDE 10: Addressable Chaos */}
                <Slide active={currentSlide === 9} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-16 font-oswald uppercase">Le Chaos Adressable : Les <span className="text-green-600">34%</span> qui Changent Tout</h2>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-16 flex-1 max-w-5xl mx-auto w-full">
                        <div className="relative w-72 h-72 rounded-full" style={{ background: 'conic-gradient(#16a34f 0% 34%, #e2e8f0 34% 100%)' }}>
                            <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                                <span className="text-5xl font-bold text-green-600 font-oswald">34%</span>
                                <span className="text-sm font-bold text-center mt-2 uppercase tracking-wide px-4">Problèmes Solubles</span>
                            </div>
                        </div>

                        <div className="space-y-6 w-full max-w-md">
                            <div className="border-l-4 border-green-600 pl-6 py-2 bg-green-50 rounded-r">
                                <h4 className="font-bold text-green-800 text-xl font-oswald">Technique</h4>
                                <p className="text-slate-700">Stabilité, coût, mobilité.</p>
                            </div>
                            <div className="border-l-4 border-green-600 pl-6 py-2 bg-green-50 rounded-r">
                                <h4 className="font-bold text-green-800 text-xl font-oswald">Temporel</h4>
                                <p className="text-slate-700">Automatisation, vitesse d'export.</p>
                            </div>
                            <div className="border-l-4 border-green-600 pl-6 py-2 bg-green-50 rounded-r">
                                <h4 className="font-bold text-green-800 text-xl font-oswald">Cognitif</h4>
                                <p className="text-slate-700">Ergonomie, réduction de charge mentale.</p>
                            </div>
                            <div className="pt-4 text-green-700 font-bold flex items-center gap-2">
                                <CheckCircle size={20} />
                                48 problèmes solubles par TACTA
                            </div>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 11: TACTA Intro */}
                <Slide active={currentSlide === 10} className="bg-white text-black items-center justify-center text-center">
                    <h2 className="text-6xl font-bold mb-12 font-oswald uppercase">TACTA</h2>
                    <h3 className="text-2xl font-light mb-16 uppercase tracking-widest text-slate-500">Une Campagne pour le Temps et la Dignité</h3>

                    <div className="flex items-center justify-center gap-12 mb-16 relative">
                        <div className="w-64 h-40 bg-slate-200 rounded-3xl shadow-2xl skew-y-3 transform hover:scale-105 transition duration-500 relative overflow-hidden flex items-center justify-center">
                            <Gamepad2 size={80} className="text-slate-700" />
                            <div className="absolute top-4 left-4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        <p className="text-2xl text-slate-700">Ce n'est pas juste un logiciel d'analyse.</p>
                        <p className="text-2xl font-bold text-black group">
                            C'est un <span className="underline decoration-green-500 underline-offset-4">antidote</span> aux tâches chronophages.
                        </p>
                    </div>

                    <div className="mt-16 text-4xl font-black font-oswald uppercase animate-bounce">
                        Moins de friction = <span className="text-green-600">Plus de vision.</span>
                    </div>
                </Slide>

                {/* SLIDE 12: Technical Response */}
                <Slide active={currentSlide === 11} className="bg-slate-50 text-black">
                    <h2 className="text-4xl font-bold mb-12 text-center font-oswald uppercase">La Réponse Technique</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full flex-1">
                        {/* Before */}
                        <div className="bg-white border-2 border-red-100 rounded-xl p-8 shadow-sm flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-400"></div>
                            <h3 className="text-2xl font-bold mb-8 text-center text-red-800 uppercase font-oswald">Avant</h3>
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 mb-8 text-slate-300">
                                <Tablet size={80} />
                                <Server size={60} />
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 font-medium text-red-900"><X className="text-red-500 w-5 h-5" /> Tablette à 800€ + Setup lourd</li>
                                <li className="flex items-center gap-3 font-medium text-red-900"><X className="text-red-500 w-5 h-5" /> Interface complexe (200 boutons)</li>
                                <li className="flex items-center gap-3 font-medium text-red-900"><X className="text-red-500 w-5 h-5" /> Crashes et instabilité</li>
                            </ul>
                        </div>

                        {/* After (Tacta) */}
                        <div className="bg-white border-2 border-green-100 rounded-xl p-8 shadow-lg flex flex-col relative overflow-hidden transform md:scale-105 transition">
                            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                            <h3 className="text-2xl font-bold mb-8 text-center text-green-700 uppercase font-oswald">TACTA</h3>
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 mb-8 text-green-600">
                                <Gamepad2 size={100} strokeWidth={1.5} />
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 font-bold text-green-900"><Check className="text-green-500 w-5 h-5" /> Manette à 60€ (Ergonomie)</li>
                                <li className="flex items-center gap-3 font-bold text-green-900"><Check className="text-green-500 w-5 h-5" /> Interface épurée (15 boutons)</li>
                                <li className="flex items-center gap-3 font-bold text-green-900"><Check className="text-green-500 w-5 h-5" /> SaaS Cloud / Zéro install</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-slate-500 font-mono text-sm uppercase tracking-widest">
                        Stockage Cloud inclus • Pas de 'Tooling Tax' • Automatisation
                    </div>
                </Slide>

                {/* SLIDE 13: Time Response */}
                <Slide active={currentSlide === 12} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-16 text-center font-oswald uppercase">La Réponse Temporelle : <span className="text-green-600 bg-green-50 px-2 rounded">-36%</span> de Temps</h2>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-20 flex-1 max-w-6xl mx-auto">
                        {/* Circle Chart */}
                        <div className="relative w-80 h-80 drop-shadow-2xl">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4ade80" />
                                        <stop offset="100%" stopColor="#16a34f" />
                                    </linearGradient>
                                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                                    </filter>
                                </defs>
                                {/* Track */}
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />
                                {/* Progress */}
                                <circle
                                    cx="50" cy="50" r="42"
                                    fill="none"
                                    stroke="url(#chartGradient)"
                                    strokeWidth="8"
                                    strokeDasharray="263.89"
                                    strokeDashoffset={263.89 * 0.64}
                                    strokeLinecap="round"
                                    filter="url(#shadow)"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-5xl font-bold text-green-600 font-oswald">-36%</span>
                                <span className="text-xs text-slate-400 mt-2 uppercase">Temps de travail</span>
                            </div>
                            <div className="absolute -top-4 -right-4 bg-slate-100 text-slate-600 px-3 py-1 text-xs font-bold rounded-full border border-slate-200">55h Avant</div>
                            <div className="absolute bottom-4 -left-4 bg-green-100 text-green-800 px-3 py-1 text-xs font-bold rounded-full border border-green-200">35h Après</div>
                        </div>

                        <div className="space-y-8 max-w-lg">
                            <div>
                                <h4 className="text-xl font-bold text-green-700 flex items-center gap-2 mb-2"><CheckCircle size={24} /> Un métier à 35h</h4>
                                <p className="text-slate-600 ml-8">Passage de semaines "Survivor" à des semaines humaines.</p>
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-green-700 flex items-center gap-2 mb-2"><CheckCircle size={24} /> Post-Match / 2</h4>
                                <p className="text-slate-600 ml-8">De 10h à 5h d'analyse. Rentrez dormir.</p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-3 uppercase text-sm tracking-wide">Comment ?</h4>
                                <ul className="space-y-2 text-slate-700 text-sm">
                                    <li className="flex gap-2"><span>1.</span> Automatisation des tâches répétitives.</li>
                                    <li className="flex gap-2"><span>2.</span> Codage Live = Définitif (Fin du double travail).</li>
                                    <li className="flex gap-2"><span>3.</span> Exports instantanés.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 14: Physical & Cognitive Response */}
                <Slide active={currentSlide === 13} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-12 text-center font-oswald uppercase">La Réponse Physique et Cognitive</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto flex-1 h-full items-center">
                        <div className="flex flex-col items-center text-center p-8 bg-slate-50 rounded-2xl">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                                <HeartPulse size={40} />
                            </div>
                            <h3 className="font-bold text-2xl mb-4 font-oswald uppercase">Santé (Physique)</h3>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                L'ergonomie de la manette permet de travailler le dos droit, les yeux sur le terrain, pas sur un écran tactile.
                            </p>
                            <div className="text-sm font-bold text-green-700 bg-green-100 px-4 py-2 rounded-full">
                                Adieu Canal Carpien
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center p-8 bg-slate-50 rounded-2xl">
                            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
                                <Brain size={40} />
                            </div>
                            <h3 className="font-bold text-2xl mb-4 font-oswald uppercase">Mental (Cognitif)</h3>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                L'automatisation gère le "bruit". Vous ne décidez plus "où cliquer", mais "quoi taguer". Charge mentale -50%.
                            </p>
                            <div className="text-sm font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-full">
                                Lucidité Préservée
                            </div>
                        </div>
                    </div>
                </Slide>

                {/* SLIDE 15: True Value */}
                <Slide active={currentSlide === 14} className="bg-white text-black items-center justify-center">
                    <h2 className="text-4xl font-bold mb-4 font-oswald uppercase text-slate-800">La Vraie Valeur</h2>
                    <div className="text-[12rem] leading-none font-black text-green-600 mb-8 drop-shadow-2xl font-oswald">20h</div>
                    <p className="text-2xl mb-16 text-slate-500 font-light">Libérées par semaine.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-5xl">
                        {[
                            { icon: BookOpen, text: "Se former et apprendre" },
                            { icon: MessageCircle, text: "Parler aux joueurs" },
                            { icon: HeartPulse, text: "Dormir et récupérer" },
                            { icon: Crown, text: "Stratégie > Mécanique" }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition duration-300">
                                <item.icon className="text-green-600 w-10 h-10" />
                                <p className="font-bold text-center text-slate-700">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </Slide>

                {/* SLIDE 16: Future Proofing */}
                <Slide active={currentSlide === 15} className="bg-white text-black">
                    <h2 className="text-4xl font-bold mb-16 text-center font-oswald uppercase">Sécuriser l'Avenir face à l'IA</h2>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 flex-1 max-w-6xl mx-auto">
                        {/* Old Way */}
                        <div className="flex flex-col items-center opacity-40 hover:opacity-100 transition duration-500 group">
                            <h3 className="text-xl font-bold mb-4 uppercase text-slate-500">L'Exécutant</h3>
                            <Bot size={80} className="text-red-500 mb-4" />
                            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold mb-4">Remplacé dans 3 ans</div>
                            <p className="text-center text-sm text-slate-500 max-w-[200px]">Celui qui clique manuellement pour taguer des passes.</p>
                        </div>

                        <ArrowRight size={40} className="text-slate-300 hidden md:block" />

                        {/* New Way */}
                        <div className="flex flex-col items-center transform scale-110">
                            <h3 className="text-2xl font-bold mb-4 uppercase text-green-700">Le Stratège</h3>
                            <div className="w-40 h-40 bg-green-50 border-4 border-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-100 mb-6">
                                <Shield size={60} className="text-green-600" />
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold mb-4">Futur Assuré</div>
                            <p className="text-center text-sm text-slate-700 max-w-[250px] font-bold">Celui qui interprète la donnée et conseille le coach.</p>
                        </div>
                    </div>

                    <div className="mt-16 bg-slate-100 p-6 rounded-lg max-w-2xl mx-auto text-center">
                        <p className="text-lg text-slate-700">
                            <span className="font-bold">Transition :</span> Ne soyez pas celui qui clique 800 fois. Soyez celui qui gagne le match.
                        </p>
                    </div>
                </Slide>

                {/* SLIDE 17: Final */}
                <Slide active={currentSlide === 16} className="bg-black text-white items-center justify-center text-center">
                    <div className="mb-8 w-20 h-20 bg-green-600 rounded flex items-center justify-center font-bold text-4xl mx-auto">T</div>
                    <h2 className="text-5xl md:text-7xl font-bold mb-8 font-oswald uppercase tracking-tight">TACTA</h2>
                    <h3 className="text-2xl md:text-4xl font-light mb-16 text-slate-400">Le Pont vers une Carrière Durable.</h3>

                    <button onClick={() => setCurrentSlide(0)} className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition duration-300 rounded">
                        Recommencer
                    </button>
                </Slide>

            </main>
        </div>
    );
};

export default AnalystAudit;
