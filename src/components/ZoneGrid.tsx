import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Environment,
    ContactShadows,
    Html,
    Sparkles,
    Text,
    useCursor
} from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- Configuration & Types ---
interface ZoneGridProps {
    currentZone: number;
    onZoneClick?: (zoneId: number) => void;
}

const THEME = {
    grass: '#1a472a',
    grassDark: '#143821',
    lines: '#ffffff',
    activeZone: '#00ff88',    // Neon Green
    hoverZone: '#00ccff',     // Cyan
    inactiveZone: '#ffffff',
    neonBlue: '#3b82f6',
    neonRed: '#ef4444'
};

// --- Sub-Components ---

// 1. The Holographic Zone Marker
const HolographicZone = ({
    position,
    zoneId,
    label,
    isActive,
    onClick
}: {
    position: [number, number, number];
    zoneId: number;
    label: string;
    isActive: boolean;
    onClick: (id: number) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    // Animation loop for pulsing effect
    useFrame((state) => {
        if (!meshRef.current) return;

        // Bobbing motion
        const t = state.clock.getElapsedTime();
        meshRef.current.position.y = position[1] + (isActive ? 0.2 : 0.05) + Math.sin(t * 2 + zoneId) * 0.05;

        // Rotation for active state
        if (isActive) {
            meshRef.current.rotation.y += 0.01;
        } else {
            meshRef.current.rotation.y = 0;
        }
    });

    const targetColor = isActive ? THEME.activeZone : hovered ? THEME.hoverZone : THEME.inactiveZone;

    return (
        <group position={position}>
            {/* The Base Glow Pad */}
            <mesh
                ref={meshRef}
                onClick={(e) => { e.stopPropagation(); onClick(zoneId); }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
                <meshStandardMaterial
                    color={targetColor}
                    transparent
                    opacity={isActive ? 0.8 : hovered ? 0.4 : 0.1}
                    emissive={targetColor}
                    emissiveIntensity={isActive ? 2 : hovered ? 1 : 0}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Vertical Beam (Only when active) */}
            {isActive && (
                <mesh position={[0, 1, 0]}>
                    <cylinderGeometry args={[0.5, 0.5, 2, 32, 1, true]} />
                    <meshStandardMaterial
                        color={THEME.activeZone}
                        transparent
                        opacity={0.15}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Floating 3D Text Label */}
            <Html position={[0, isActive ? 2.5 : 1, 0]} center sprite distanceFactor={10}>
                <div className={`
                    pointer-events-none select-none font-mono font-bold transition-all duration-300
                    ${isActive ? 'scale-125 text-green-400 text-glow' : 'scale-100 text-white/50'}
                `}
                    style={{ textShadow: isActive ? '0 0 10px rgba(0,255,136,0.8)' : 'none' }}>
                    {label}
                </div>
            </Html>
        </group>
    );
};

// 2. Realistic Grass Pitch
const PitchSurface = () => {
    // Procedural lines for the "mowed lawn" look
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext('2d');
        if (context) {
            context.fillStyle = THEME.grass;
            context.fillRect(0, 0, 1024, 1024);

            // Draw stripes
            context.fillStyle = THEME.grassDark;
            for (let i = 0; i < 20; i++) {
                if (i % 2 === 0) {
                    context.fillRect(0, i * (1024 / 20), 1024, 1024 / 20);
                }
            }
        }
        return new THREE.CanvasTexture(canvas);
    }, []);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return (
        <group>
            {/* Main Grass */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[7, 10]} />
                <meshStandardMaterial
                    map={texture}
                    roughness={0.8}
                    color="#ffffff"
                />
            </mesh>

            {/* White Lines (Using slight elevation to prevent z-fighting) */}
            <group position={[0, 0.01, 0]}>
                {/* Outer Border */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0, 5, 4, 1]} />
                    {/* Simplified for demo, usually we'd draw lines specifically */}
                </mesh>

                {/* Actual Lines Construction */}
                <Line position={[0, 0, 0]} args={[5.2, 8.2]} thickness={0.05} /> {/* Touchlines */}
                <Line position={[0, 0, 0]} args={[5.2, 0.05]} thickness={0.05} /> {/* Center Line */}

                {/* Center Circle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[0.8, 0.85, 64]} />
                    <meshBasicMaterial color="white" transparent opacity={0.8} />
                </mesh>

                {/* Boxes */}
                <BoxLine position={[0, -3.6]} width={2.5} height={1} />
                <BoxLine position={[0, 3.6]} width={2.5} height={1} />
            </group>
        </group>
    );
};

// Helper for drawing pitch lines
const Line = ({ position, args, thickness }: any) => (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={args} />
        <meshBasicMaterial color="none" />
        {/* Just a placeholder logic, simpler to do borders with separate meshes */}
        <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(args[0], args[1])]} />
            <lineBasicMaterial color="white" linewidth={2} opacity={0.6} transparent />
        </lineSegments>
    </mesh>
);

const BoxLine = ({ position, width, height }: { position: [number, number], width: number, height: number }) => (
    <mesh position={[position[0], 0.02, position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="white" wireframe />
    </mesh>
);

// 3. The Goal (Schematic Style)
const GoalPost = ({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
    <group position={position} rotation={[0, rotation, 0]}>
        {/* Posts */}
        <mesh position={[-1, 0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1]} />
            <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[1, 0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1]} />
            <meshStandardMaterial color="white" />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 2]} />
            <meshStandardMaterial color="white" />
        </mesh>
        {/* Net (Holographic) */}
        <mesh position={[0, 0.5, -0.5]}>
            <boxGeometry args={[2, 1, 1]} />
            <meshBasicMaterial color="white" wireframe opacity={0.1} transparent />
        </mesh>
    </group>
);


// --- Main Scene Component ---
const TacticalScene = ({ currentZone, onZoneClick }: ZoneGridProps) => {
    // Generate zone data
    const zones = useMemo(() => {
        const z = [];
        let id = 1;
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 3; col++) {
                z.push({
                    id: id++,
                    pos: [(col - 1) * 1.5, 0, (row - 2.5) * 1.3] as [number, number, number],
                    label: `Z${id}` // Simplified label
                });
            }
        }
        return z;
    }, []);

    return (
        <>
            {/* Cinematic Controls */}
            <OrbitControls
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2.5} // Prevent going under the pitch
                maxDistance={12}
                minDistance={4}
                enablePan={false}
                autoRotate={false} // Enable for idle screen effect
            />

            <PerspectiveCamera makeDefault position={[0, 6, 8]} fov={45} />

            {/* --- LIGHTING (Stadium Night Match) --- */}
            <ambientLight intensity={0.2} color="#ccddff" />

            {/* Floodlights */}
            <spotLight
                position={[10, 15, 10]}
                angle={0.3}
                penumbra={1}
                intensity={2}
                color="#ffffff"
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <spotLight
                position={[-10, 15, -10]}
                angle={0.3}
                penumbra={1}
                intensity={1}
                color="#aaccff"
            />

            {/* --- ENVIRONMENT --- */}
            <Environment preset="city" />
            <fog attach="fog" args={['#050505', 5, 25]} /> {/* Distance fog for depth */}

            {/* Floating Dust Particles (Atmosphere) */}
            <Sparkles count={50} scale={10} size={4} speed={0.4} opacity={0.5} color="#ffffff" />

            {/* --- OBJECTS --- */}
            <group position={[0, -0.5, 0]}>
                <PitchSurface />

                {/* Goals */}
                <GoalPost position={[0, 0, -4]} />
                <GoalPost position={[0, 0, 4]} rotation={Math.PI} />

                {/* Tactical Zones */}
                {zones.map((zone) => (
                    <HolographicZone
                        key={zone.id}
                        position={zone.pos}
                        zoneId={zone.id}
                        label={zone.label}
                        isActive={currentZone === zone.id}
                        onClick={onZoneClick || (() => { })}
                    />
                ))}
            </group>

            {/* Soft contact shadows to ground objects */}
            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />

            {/* --- POST PROCESSING (The "TV" Look) --- */}
            <EffectComposer enableNormalPass>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
        </>
    );
};


// --- Exported Component ---
export const ZoneGrid: React.FC<ZoneGridProps> = ({ currentZone, onZoneClick }) => {
    return (
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-950">
            {/* HUD Header */}
            {/* <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col">
                    <span className="text-[10px] text-green-500 font-mono animate-pulse tracking-widest">LIVE FEED</span>
                    <h2 className="text-white font-black text-2xl tracking-tighter italic">TACTICAL CAM</h2>
                </div>
                <div className="bg-black/50 backdrop-blur border border-white/10 px-3 py-1 rounded text-right">
                    <div className="text-[10px] text-gray-400">CURRENT ZONE</div>
                    <div className="text-xl font-mono text-green-400 font-bold">{currentZone || '--'}</div>
                </div>
            </div> */}

            {/* Main Canvas */}
            <div className="h-[500px] w-full cursor-move">
                <Canvas shadows dpr={[1, 2]}>
                    <TacticalScene currentZone={currentZone} onZoneClick={onZoneClick} />
                </Canvas>
            </div>

            {/* HUD Footer */}
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 pointer-events-none">
                <div className="flex gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                        <span className="text-[10px] text-gray-300 font-mono">SELECTED</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                        <span className="text-[10px] text-gray-300 font-mono">NEUTRAL</span>
                    </div>
                </div>
            </div>

            {/* Scanlines Effect Overlay (CSS) */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                backgroundSize: '100% 2px, 3px 100%'
            }}></div>
        </div>
    );
};