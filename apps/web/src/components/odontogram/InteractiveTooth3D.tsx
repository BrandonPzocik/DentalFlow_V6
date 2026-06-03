import { Suspense, useMemo, useCallback } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  ToothSurface,
  ToothStatus,
  TOOTH_STATUS_COLORS,
  Odontogram,
} from '@dentaflow/shared';

const IVORY = '#f5efe6';
const IVORY_DARK = '#e8dcc8';
const TEAL = '#0d9488';

type FaceDef = {
  surface: ToothSurface;
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number, number];
};

/** Caras clicables sobre la corona (vista lateral por defecto) */
const FACES: FaceDef[] = [
  { surface: ToothSurface.VESTIBULAR, position: [0, 0.12, 0.42], rotation: [0, 0, 0], args: [0.88, 0.5, 0.08] },
  { surface: ToothSurface.PALATAL, position: [0, 0.12, -0.42], rotation: [0, 0, 0], args: [0.88, 0.5, 0.08] },
  { surface: ToothSurface.MESIAL, position: [-0.42, 0.12, 0], rotation: [0, Math.PI / 2, 0], args: [0.88, 0.5, 0.08] },
  { surface: ToothSurface.DISTAL, position: [0.42, 0.12, 0], rotation: [0, Math.PI / 2, 0], args: [0.88, 0.5, 0.08] },
  { surface: ToothSurface.OCCLUSAL, position: [0, 0.48, 0], rotation: [Math.PI / 2, 0, 0], args: [0.75, 0.75, 0.1] },
];

function enamelColor(hex: string | undefined): THREE.Color {
  if (!hex || hex.toLowerCase() === '#ffffff') return new THREE.Color(IVORY);
  return new THREE.Color(hex);
}

function CrownBody({ isMolar }: { isMolar: boolean }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    if (isMolar) {
      points.push(
        new THREE.Vector2(0.02, -0.05),
        new THREE.Vector2(0.38, 0.02),
        new THREE.Vector2(0.52, 0.18),
        new THREE.Vector2(0.5, 0.38),
        new THREE.Vector2(0.42, 0.52),
        new THREE.Vector2(0.28, 0.58),
        new THREE.Vector2(0.12, 0.55),
      );
    } else {
      points.push(
        new THREE.Vector2(0.02, -0.05),
        new THREE.Vector2(0.32, 0.05),
        new THREE.Vector2(0.4, 0.28),
        new THREE.Vector2(0.32, 0.52),
        new THREE.Vector2(0.18, 0.58),
        new THREE.Vector2(0.08, 0.52),
      );
    }
    return new THREE.LatheGeometry(points, 32);
  }, [isMolar]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: IVORY,
        roughness: 0.42,
        metalness: 0.04,
      }),
    [],
  );

  return (
    <mesh geometry={geometry} material={material} position={[0, 0.05, 0]} castShadow receiveShadow />
  );
}

function CrownFace({
  surface,
  position,
  rotation,
  args,
  fill,
  opacity,
  highlight,
  onPick,
  onHover,
}: FaceDef & {
  fill: THREE.Color;
  opacity: number;
  highlight: boolean;
  onPick: (s: ToothSurface) => void;
  onHover: (s: ToothSurface | null) => void;
}) {
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onPick(surface);
    },
    [onPick, surface],
  );

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(surface);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={fill}
        transparent
        opacity={opacity}
        roughness={0.35}
        metalness={0.05}
        emissive={highlight ? new THREE.Color(TEAL) : new THREE.Color(0x000000)}
        emissiveIntensity={highlight ? 0.28 : 0}
      />
    </mesh>
  );
}

function RootGroup({ isMolar }: { isMolar: boolean }) {
  const rootMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: IVORY_DARK,
        roughness: 0.62,
        metalness: 0,
      }),
    [],
  );

  if (isMolar) {
    return (
      <group position={[0, -0.22, 0]}>
        {[
          [-0.22, 0.06, 0.05],
          [0, 0, 0],
          [0.22, 0.06, 0.05],
        ].map((pos, i) => (
          <mesh
            key={i}
            position={pos as [number, number, number]}
            rotation={[0.12, 0, i === 0 ? 0.15 : i === 2 ? -0.15 : 0]}
            castShadow
            material={rootMat}
          >
            <cylinderGeometry args={[0.07, 0.11, 0.72, 14]} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[0, -0.28, 0]}>
      <mesh position={[0, -0.38, 0]} rotation={[0.04, 0, 0]} castShadow material={rootMat}>
        <cylinderGeometry args={[0.09, 0.13, 0.82, 18]} />
      </mesh>
    </group>
  );
}

function ToothScene({
  record,
  isMolar,
  hoveredSurface,
  selectedSurface,
  onSurfaceClick,
  onSurfaceHover,
}: {
  record?: Odontogram[number];
  isMolar: boolean;
  hoveredSurface: ToothSurface | null;
  selectedSurface: ToothSurface | null;
  onSurfaceClick: (s: ToothSurface) => void;
  onSurfaceHover: (s: ToothSurface | null) => void;
}) {
  const absent = record?.generalStatus === ToothStatus.ABSENT;

  if (absent) {
    return (
      <group>
        <mesh>
          <torusGeometry args={[0.35, 0.04, 8, 24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <boxGeometry args={[0.55, 0.06, 0.06]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.55, 0.06, 0.06]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.08, -0.55, 0]}>
      <CrownBody isMolar={isMolar} />
      {FACES.map((f) => {
        const sr = record?.surfaces[f.surface];
        const fill = enamelColor(sr ? TOOTH_STATUS_COLORS[sr.status] : undefined);
        const selected = selectedSurface === f.surface;
        const hovered = hoveredSurface === f.surface;
        const opacity = selected ? 0.98 : hovered ? 0.92 : sr ? 0.88 : 0.35;
        return (
          <CrownFace
            key={f.surface}
            surface={f.surface}
            position={f.position}
            rotation={f.rotation}
            args={f.args}
            fill={fill}
            opacity={opacity}
            highlight={selected || hovered}
            onPick={onSurfaceClick}
            onHover={onSurfaceHover}
          />
        );
      })}
      <RootGroup isMolar={isMolar} />
    </group>
  );
}

interface Props {
  toothNumber: number;
  record?: Odontogram[number];
  hoveredSurface: ToothSurface | null;
  selectedSurface: ToothSurface | null;
  onSurfaceClick: (s: ToothSurface) => void;
  onSurfaceHover: (s: ToothSurface | null) => void;
}

export function InteractiveTooth3D({
  toothNumber,
  record,
  hoveredSurface,
  selectedSurface,
  onSurfaceClick,
  onSurfaceHover,
}: Props) {
  const isMolar = [6, 7, 8].includes(toothNumber % 10);

  return (
    <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 via-white to-teal-50/30 border border-slate-200">
      <p className="absolute left-3 top-2 z-10 text-micro text-slate-400 pointer-events-none leading-tight">
        <span className="font-medium text-slate-500">Vista 3D</span>
        <br />
        Clic en una cara · arrastrá para rotar
      </p>
      <Canvas
        key={toothNumber}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [2.6, 0.35, 1.1], fov: 36, near: 0.1, far: 40 }}
        onPointerMissed={() => onSurfaceHover(null)}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 4, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -2]} intensity={0.4} color="#c5d4e8" />
        <pointLight position={[0, 2, 2]} intensity={0.25} />
        <Suspense fallback={null}>
          <ToothScene
            record={record}
            isMolar={isMolar}
            hoveredSurface={hoveredSurface}
            selectedSurface={selectedSurface}
            onSurfaceClick={onSurfaceClick}
            onSurfaceHover={onSurfaceHover}
          />
        </Suspense>
        <ContactShadows position={[0, -0.95, 0]} opacity={0.35} scale={10} blur={2.2} far={3.5} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2 + 0.15}
          minDistance={1.8}
          maxDistance={4.5}
          target={[0, 0.15, 0]}
        />
      </Canvas>
    </div>
  );
}
