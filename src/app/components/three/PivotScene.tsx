import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Western CP-600 — procedural digital twin, dimensioned from the official
 * parts manual (WPM-EN-March 2019):
 *   · tower legs 157" → pipe centreline at 3.9 m
 *   · span pipe 6-5/8" OD with outlets every 117" (≈ 3 m drop spacing)
 *   · 14.9/13-24 tires (Ø ≈ 1.25 m) on 12×24 rims
 *   · pivot-point pyramid per "Pivot Parts Identification II" (p. 35)
 *   · UMC 740 wheel gearboxes + center gearmotor + drive shafts (p. 42–47)
 *   · cable-stayed 4" overhang + Nelson end gun + booster pump (p. 64–70)
 *
 * Every major assembly is clickable (see pivotParts.ts) — the selection is
 * lifted to PivotTech which renders the spec card + catalog CTA.
 * No model files: everything is primitives, so the chunk stays small.
 */

// ---------------------------------------------------------------- dimensions
const PIPE_H = 3.9; // pipe centreline height (157" legs)
const PIPE_R = 0.084; // 6-5/8" OD
const SPAN = 24; // two 39 ft pipes per span
const SPANS = 2;
const SPAN_START = 0.5;
const T1 = SPAN_START + SPAN; // first drive tower
const T2 = SPAN_START + SPAN * 2; // end tower
const OH_TIP = T2 + 6; // 4" overhang tip
const FIELD_R = OH_TIP + 1.5;

// ---------------------------------------------------------------- materials
const STEEL = new THREE.MeshStandardMaterial({ color: '#b9c1c6', metalness: 0.85, roughness: 0.35 });
const STEEL_DARK = new THREE.MeshStandardMaterial({ color: '#707a80', metalness: 0.8, roughness: 0.5 });
const TIRE = new THREE.MeshStandardMaterial({ color: '#15181a', roughness: 0.95 });
const GEAR_DARK = new THREE.MeshStandardMaterial({ color: '#222a2e', metalness: 0.6, roughness: 0.55 });
const CREAM = new THREE.MeshStandardMaterial({ color: '#e7e2d4', metalness: 0.1, roughness: 0.55 });
const PANEL = new THREE.MeshStandardMaterial({ color: '#c9ced0', metalness: 0.3, roughness: 0.5 });
const PANEL_FACE = new THREE.MeshStandardMaterial({ color: '#2c3438', metalness: 0.2, roughness: 0.6 });
const BRASS = new THREE.MeshStandardMaterial({ color: '#b08d57', metalness: 0.9, roughness: 0.35 });
const PUMP = new THREE.MeshStandardMaterial({ color: '#31506e', metalness: 0.5, roughness: 0.5 });
const CONCRETE = new THREE.MeshStandardMaterial({ color: '#6a6f66', roughness: 1 });
const PLATES = ['#2563c9', '#d8262b', '#e3a008', '#7c3aed'].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }),
);
// Western's signature red — used on the pivot nameplate + end-tower marker.
const RED = new THREE.MeshStandardMaterial({ color: '#c0212a', metalness: 0.3, roughness: 0.5 });

// ------------------------------------------------------------- marker icons
let _markerMat: THREE.SpriteMaterial | null = null;
let _activeMat: THREE.SpriteMaterial | null = null;

function markerTexture(fill: string, ring: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(32, 32, 25, 0, Math.PI * 2);
  g.lineWidth = 5;
  g.strokeStyle = ring;
  g.stroke();
  g.beginPath();
  g.arc(32, 32, 11, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  return new THREE.CanvasTexture(c);
}
const markerMat = () =>
  (_markerMat ??= new THREE.SpriteMaterial({
    map: markerTexture('#87a922', 'rgba(255,255,255,0.85)'),
    transparent: true,
    depthTest: false,
  }));
const activeMat = () =>
  (_activeMat ??= new THREE.SpriteMaterial({
    map: markerTexture('#ffffff', 'rgba(135,169,34,1)'),
    transparent: true,
    depthTest: false,
  }));

// ----------------------------------------------------------- selection ctx
type PartCtxT = {
  selected: string | null;
  hovered: string | null;
  hover: (id: string | null) => void;
  select: (id: string) => void;
};
const PartCtx = createContext<PartCtxT>(null!);

const Marker = ({ id, position }: { id: string; position: [number, number, number] }) => {
  const ctx = useContext(PartCtx);
  const ref = useRef<THREE.Sprite>(null);
  const active = ctx.selected === id;
  const hovered = ctx.hovered === id;
  useFrame(({ clock }) => {
    const s = ref.current;
    if (!s) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.6 + position[0]) * 0.1;
    const base = active ? 0.62 : hovered ? 0.56 : 0.42;
    s.scale.setScalar(base * pulse);
  });
  return (
    <sprite ref={ref} position={position} material={active ? activeMat() : markerMat()} renderOrder={999} />
  );
};

/** Clickable assembly: meshes + optional invisible hit spheres + marker. */
const Part = ({
  id,
  marker,
  hit,
  children,
}: {
  id: string;
  marker?: [number, number, number];
  hit?: { pos: [number, number, number]; r: number }[];
  children: ReactNode;
}) => {
  const ctx = useContext(PartCtx);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 8) return; // it was an orbit drag, not a click
        ctx.select(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        ctx.hover(id);
      }}
      onPointerOut={() => ctx.hover(null)}
    >
      {children}
      {hit?.map((h, i) => (
        <mesh key={i} position={h.pos}>
          <sphereGeometry args={[h.r, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {marker && <Marker id={id} position={marker} />}
    </group>
  );
};

// ------------------------------------------------------------------ helpers
const Rod = ({
  a,
  b,
  r = 0.03,
  mat = STEEL,
}: {
  a: [number, number, number];
  b: [number, number, number];
  r?: number;
  mat?: THREE.Material;
}) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const pos = va.clone().add(vb).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: pos.toArray() as [number, number, number], quat, len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]);
  return (
    <mesh position={pos} quaternion={quat} material={mat}>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
};

/** Flange ring around the pipe at x. */
const Flange = ({ x }: { x: number }) => (
  <mesh position={[x, PIPE_H, 0]} rotation={[0, Math.PI / 2, 0]} material={STEEL_DARK}>
    <torusGeometry args={[PIPE_R + 0.025, 0.02, 8, 18]} />
  </mesh>
);

// ------------------------------------------------------------- pivot point
const PivotPoint = () => {
  const TOP = 3.5;
  const legs: [number, number][] = [
    [1.35, 1.35],
    [-1.35, 1.35],
    [1.35, -1.35],
    [-1.35, -1.35],
  ];
  const lvl = (y: number) => 0.16 + 1.19 * ((TOP - y) / 3.45);
  const levels = [0.8, 1.6, 2.4, 3.0];
  return (
    <Part id="pivot-point" marker={[0, 2.1, 1.5]}>
      {/* concrete pad + anchor feet */}
      <mesh position={[0, 0.1, 0]} material={CONCRETE}>
        <cylinderGeometry args={[1.85, 2.0, 0.2, 24]} />
      </mesh>
      {legs.map(([lx, lz], i) => (
        <group key={i}>
          <Rod a={[lx, 0.18, lz]} b={[Math.sign(lx) * 0.16, TOP, Math.sign(lz) * 0.16]} r={0.05} />
          <mesh position={[lx, 0.24, lz]} material={STEEL_DARK}>
            <cylinderGeometry args={[0.09, 0.11, 0.12, 8]} />
          </mesh>
        </group>
      ))}
      {/* horizontal angle braces #1–#7 (4 shrinking square rings) */}
      {levels.map((y) => {
        const d = lvl(y);
        return (
          <group key={y}>
            <Rod a={[-d, y, d]} b={[d, y, d]} r={0.028} mat={STEEL_DARK} />
            <Rod a={[-d, y, -d]} b={[d, y, -d]} r={0.028} mat={STEEL_DARK} />
            <Rod a={[d, y, -d]} b={[d, y, d]} r={0.028} mat={STEEL_DARK} />
            <Rod a={[-d, y, -d]} b={[-d, y, d]} r={0.028} mat={STEEL_DARK} />
          </group>
        );
      })}
      {/* torsional diagonals */}
      <Rod a={[-lvl(0.8), 0.8, lvl(0.8)]} b={[lvl(1.6), 1.6, lvl(1.6)]} r={0.02} mat={STEEL_DARK} />
      <Rod a={[lvl(0.8), 0.8, -lvl(0.8)]} b={[-lvl(1.6), 1.6, -lvl(1.6)]} r={0.02} mat={STEEL_DARK} />
      {/* access ladder (galvanized) — leaflet: "ladder" at the pivot point */}
      <Rod a={[0.16, 0.45, 0.52]} b={[0.16, 3.25, 0.52]} r={0.017} mat={STEEL_DARK} />
      <Rod a={[-0.16, 0.45, 0.52]} b={[-0.16, 3.25, 0.52]} r={0.017} mat={STEEL_DARK} />
      {[0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.15].map((yy) => (
        <Rod key={yy} a={[-0.16, yy, 0.52]} b={[0.16, yy, 0.52]} r={0.011} mat={STEEL_DARK} />
      ))}
      {/* Western red nameplate sign (faces outward) */}
      <group position={[0, 3.02, -0.5]}>
        <mesh material={RED}>
          <boxGeometry args={[0.66, 0.3, 0.05]} />
        </mesh>
        <mesh position={[0, 0, -0.035]} material={PANEL}>
          <boxGeometry args={[0.5, 0.08, 0.02]} />
        </mesh>
      </group>
    </Part>
  );
};

const RiserAndElbows = () => (
  <Part
    id="riser-elbows"
    marker={[0, 3.05, 0.55]}
    hit={[
      { pos: [0, 1.4, 0], r: 0.32 },
      { pos: [0, 2.5, 0], r: 0.32 },
      { pos: [0, 3.4, 0], r: 0.32 },
    ]}
  >
    {/* supply line + inlet elbow (8-5/8) */}
    <Rod a={[-2.1, 0.5, 0]} b={[-0.05, 0.5, 0]} r={0.11} mat={STEEL_DARK} />
    <mesh position={[-2.1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} material={STEEL_DARK}>
      <torusGeometry args={[0.135, 0.02, 8, 18]} />
    </mesh>
    <mesh position={[0, 0.5, 0]} material={STEEL}>
      <sphereGeometry args={[0.135, 12, 12]} />
    </mesh>
    {/* stand riser pipe */}
    <mesh position={[0, 2.16, 0]} material={STEEL}>
      <cylinderGeometry args={[0.11, 0.11, 3.32, 12]} />
    </mesh>
    {/* upper elbow → span */}
    <mesh position={[0, 3.82, 0]} material={STEEL}>
      <sphereGeometry args={[0.13, 12, 12]} />
    </mesh>
    <Rod a={[0, 3.84, 0]} b={[SPAN_START + 0.1, PIPE_H, 0]} r={0.1} />
  </Part>
);

const CollectorRing = () => (
  <Part id="collector-ring" marker={[0, 4.75, 0]} hit={[{ pos: [0, 4.42, 0], r: 0.4 }]}>
    <mesh position={[0, 4.07, 0]} material={STEEL_DARK}>
      <cylinderGeometry args={[0.024, 0.024, 0.36, 8]} />
    </mesh>
    <mesh position={[0, 4.36, 0]} material={PANEL}>
      <cylinderGeometry args={[0.1, 0.11, 0.24, 14]} />
    </mesh>
    <mesh position={[0, 4.48, 0]} material={PANEL}>
      <sphereGeometry args={[0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    {/* J-tube conduit running back down the riser */}
    <Rod a={[0.13, 4.3, 0.05]} b={[0.13, 1.6, 0.05]} r={0.013} mat={STEEL_DARK} />
  </Part>
);

const ControlPanel = () => (
  <Part id="control-panel" marker={[0, 1.55, -1.35]} hit={[{ pos: [0, 1.5, -1.02], r: 0.5 }]}>
    <group position={[0, 1.5, -1.02]}>
      <mesh material={PANEL}>
        <boxGeometry args={[0.55, 0.78, 0.15]} />
      </mesh>
      <mesh position={[0, 0.06, -0.08]} material={PANEL_FACE}>
        <boxGeometry args={[0.42, 0.5, 0.02]} />
      </mesh>
      {[-0.12, 0, 0.12].map((dx) => (
        <mesh key={dx} position={[dx, -0.22, -0.085]} rotation={[Math.PI / 2, 0, 0]} material={GEAR_DARK}>
          <cylinderGeometry args={[0.026, 0.026, 0.035, 10]} />
        </mesh>
      ))}
      {/* mounting struts to the pyramid */}
      <Rod a={[-0.2, 0.39, 0.07]} b={[-0.2, 0.62, 0.5]} r={0.018} mat={STEEL_DARK} />
      <Rod a={[0.2, 0.39, 0.07]} b={[0.2, 0.62, 0.5]} r={0.018} mat={STEEL_DARK} />
    </group>
  </Part>
);

// ------------------------------------------------------------------- spans
const SpanPipe = ({ from, withMarker }: { from: number; withMarker?: boolean }) => {
  const mid = from + SPAN / 2;
  return (
    <Part id="span-pipe" marker={withMarker ? [mid, 4.35, 0] : undefined}>
      <mesh position={[mid, PIPE_H, 0]} rotation={[0, 0, Math.PI / 2]} material={STEEL}>
        <cylinderGeometry args={[PIPE_R, PIPE_R, SPAN, 12]} />
      </mesh>
      <Flange x={from + 0.15} />
      <Flange x={from + SPAN / 2} />
      <Flange x={from + SPAN - 0.15} />
    </Part>
  );
};

const SpanTruss = ({ from, withMarker }: { from: number; withMarker?: boolean }) => {
  const nodes = [
    { f: 0.25, depth: 1.15 },
    { f: 0.5, depth: 1.4 },
    { f: 0.75, depth: 1.15 },
  ];
  const ends: [number, number] = [from + 0.3, from + SPAN - 0.3];
  return (
    <Part id="truss" marker={withMarker ? [from + SPAN / 2, 2.15, 1.0] : undefined}>
      {([1, -1] as const).map((s) => {
        const pts: [number, number, number][] = [
          [ends[0], PIPE_H - 0.08, s * 0.12],
          ...nodes.map(
            (n) => [from + n.f * SPAN, PIPE_H - n.depth, s * 0.5] as [number, number, number],
          ),
          [ends[1], PIPE_H - 0.08, s * 0.12],
        ];
        return (
          <group key={s}>
            {pts.slice(0, -1).map((p, i) => (
              <Rod key={i} a={p} b={pts[i + 1]} r={0.022} />
            ))}
            {/* truss-leg angles from pipe down to each node */}
            {nodes.map((n) => (
              <Rod
                key={n.f}
                a={[from + n.f * SPAN, PIPE_H - 0.05, 0]}
                b={[from + n.f * SPAN, PIPE_H - n.depth, s * 0.5]}
                r={0.026}
                mat={STEEL_DARK}
              />
            ))}
          </group>
        );
      })}
      {/* cross ties between the two rod planes */}
      {nodes.map((n) => (
        <Rod
          key={n.f}
          a={[from + n.f * SPAN, PIPE_H - n.depth, 0.5]}
          b={[from + n.f * SPAN, PIPE_H - n.depth, -0.5]}
          r={0.02}
          mat={STEEL_DARK}
        />
      ))}
    </Part>
  );
};

const SpanDrops = ({ from, withMarker }: { from: number; withMarker?: boolean }) => {
  const drops = [3, 6, 9, 12, 15, 18, 21].map((d) => from + d);
  const mk = drops[1];
  return (
    <Part
      id="sprinkler"
      marker={withMarker ? [mk, 2.35, 0.45] : undefined}
      hit={withMarker ? [{ pos: [mk, 2.55, 0], r: 0.4 }] : undefined}
    >
      {drops.map((x, i) => (
        <group key={x}>
          <Rod a={[x, PIPE_H - 0.05, 0]} b={[x, 2.72, 0]} r={0.014} mat={STEEL_DARK} />
          {/* pressure regulator */}
          <mesh position={[x, 2.66, 0]} material={PANEL}>
            <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
          </mesh>
          {/* sprinkler body + colored plate */}
          <mesh position={[x, 2.54, 0]} material={GEAR_DARK}>
            <cylinderGeometry args={[0.045, 0.03, 0.1, 8]} />
          </mesh>
          <mesh position={[x, 2.47, 0]} material={PLATES[i % PLATES.length]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 10]} />
          </mesh>
        </group>
      ))}
    </Part>
  );
};

// ------------------------------------------------------------ drive towers
const DriveTower = ({ tx, markers }: { tx: number; markers: boolean }) => {
  const legX = 1.55;
  const beamY = 0.66;
  const xAt = (y: number) => legX * ((PIPE_H - y) / (PIPE_H - 0.74));
  const wheel = (side: 1 | -1) => {
    const bx = tx + side * legX;
    return (
      <group key={side}>
        {/* tire + rim + hub */}
        <Part
          id="wheel"
          marker={markers && side === 1 && tx === T2 ? [bx, 1.62, 0] : undefined}
          hit={[{ pos: [bx, 0.62, 0], r: 0.66 }]}
        >
          <mesh position={[bx, 0.62, 0]} rotation={[0, Math.PI / 2, 0]} material={TIRE}>
            <torusGeometry args={[0.43, 0.2, 12, 26]} />
          </mesh>
          <mesh position={[bx, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={STEEL}>
            <cylinderGeometry args={[0.3, 0.3, 0.18, 16]} />
          </mesh>
          <mesh position={[bx, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={STEEL_DARK}>
            <cylinderGeometry args={[0.09, 0.09, 0.27, 10]} />
          </mesh>
        </Part>
        {/* UMC wheel gearbox */}
        <Part
          id="gearbox"
          marker={markers && side === 1 && tx === T1 ? [bx - 0.32, 1.22, 0] : undefined}
          hit={[{ pos: [bx - side * 0.3, 0.66, 0], r: 0.32 }]}
        >
          <mesh position={[bx - side * 0.3, 0.66, 0]} material={GEAR_DARK}>
            <boxGeometry args={[0.32, 0.3, 0.26]} />
          </mesh>
          <mesh position={[bx - side * 0.08, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={GEAR_DARK}>
            <cylinderGeometry args={[0.05, 0.05, 0.18, 8]} />
          </mesh>
        </Part>
        {/* drive shaft + flex couplers */}
        <Part
          id="driveshaft"
          marker={markers && side === -1 && tx === T1 ? [bx + 0.65, 1.18, 0] : undefined}
          hit={[{ pos: [tx + side * 0.95, 0.78, 0], r: 0.28 }]}
        >
          <Rod a={[tx + side * 0.34, 0.82, 0]} b={[bx - side * 0.48, 0.74, 0]} r={0.02} mat={STEEL_DARK} />
          <mesh position={[tx + side * 0.38, 0.82, 0]} material={GEAR_DARK}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
          </mesh>
          <mesh position={[bx - side * 0.5, 0.74, 0]} material={GEAR_DARK}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
          </mesh>
        </Part>
      </group>
    );
  };

  return (
    <group>
      {/* structure: legs + base beam + ties + diagonals */}
      <Part id="tower" marker={markers && tx === T1 ? [tx, 2.7, 0.55] : undefined}>
        <mesh position={[tx, beamY, 0]} material={STEEL}>
          <boxGeometry args={[3.3, 0.16, 0.16]} />
        </mesh>
        {/* top yoke — red on the end tower (Western safety marker) */}
        <mesh position={[tx, PIPE_H - 0.14, 0]} material={tx === T2 ? RED : STEEL_DARK}>
          <boxGeometry args={[0.32, 0.14, 0.3]} />
        </mesh>
        {/* ball & socket flex joint carrying the span (leaflet: stress-free flex) */}
        <mesh position={[tx, PIPE_H, 0]} material={GEAR_DARK}>
          <sphereGeometry args={[0.12, 14, 14]} />
        </mesh>
        {/* reinforced A-frame legs */}
        <Rod a={[tx - 0.1, PIPE_H - 0.1, 0]} b={[tx - legX, 0.74, 0]} r={0.045} />
        <Rod a={[tx + 0.1, PIPE_H - 0.1, 0]} b={[tx + legX, 0.74, 0]} r={0.045} />
        {/* leaflet: reinforced legs with 4 cross-ties and one diagonal brace */}
        {[1.15, 1.85, 2.55, 3.2].map((y) => (
          <Rod key={y} a={[tx - xAt(y), y, 0]} b={[tx + xAt(y), y, 0]} r={0.024} mat={STEEL_DARK} />
        ))}
        <Rod a={[tx - xAt(1.15), 1.15, 0]} b={[tx + xAt(3.2), 3.2, 0]} r={0.021} mat={STEEL_DARK} />
        {/* fore-aft braces — "maximize roll resistance" */}
        <Rod a={[tx - legX, 0.74, 0]} b={[tx, 1.95, 0.4]} r={0.017} mat={STEEL_DARK} />
        <Rod a={[tx + legX, 0.74, 0]} b={[tx, 1.95, -0.4]} r={0.017} mat={STEEL_DARK} />
      </Part>

      {/* center drive gearmotor under its fiberglass cover */}
      <Part
        id="gearmotor"
        marker={markers && tx === T1 ? [tx, 1.5, 0] : undefined}
        hit={[{ pos: [tx, 0.92, 0], r: 0.42 }]}
      >
        <mesh position={[tx, 0.88, 0]} rotation={[0, 0, Math.PI / 2]} material={CREAM}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 12]} />
        </mesh>
        <mesh position={[tx, 0.98, 0]} material={CREAM}>
          <boxGeometry args={[0.56, 0.18, 0.34]} />
        </mesh>
      </Part>

      {/* tower junction box on the leg */}
      <Part
        id="tower-box"
        marker={markers && tx === T1 ? [tx - xAt(2.4) - 0.1, 2.85, 0.3] : undefined}
        hit={[{ pos: [tx - xAt(2.4), 2.4, 0.13], r: 0.3 }]}
      >
        <mesh position={[tx - xAt(2.4), 2.4, 0.13]} material={PANEL}>
          <boxGeometry args={[0.2, 0.3, 0.13]} />
        </mesh>
      </Part>

      {wheel(1)}
      {wheel(-1)}
    </group>
  );
};

// --------------------------------------------------- overhang + end gun
const Overhang = () => (
  <Part id="endgun" marker={[OH_TIP + 0.1, 5.15, 0]} hit={[{ pos: [OH_TIP + 0.3, 4.6, 0], r: 0.9 }]}>
    {/* 4" overhang pipe, rising slightly */}
    <Rod a={[T2 + 0.1, PIPE_H, 0]} b={[OH_TIP, 4.12, 0]} r={0.051} />
    {/* rabbit-ear mast + stay cables */}
    <Rod a={[T2, PIPE_H + 0.05, 0]} b={[T2, 5.05, 0]} r={0.028} mat={STEEL_DARK} />
    <Rod a={[T2, 5.05, 0]} b={[OH_TIP - 0.1, 4.2, 0]} r={0.008} mat={STEEL_DARK} />
    <Rod a={[T2, 5.05, 0]} b={[T2 - 3.6, PIPE_H + 0.02, 0]} r={0.008} mat={STEEL_DARK} />
    {/* booster pump on the overhang start */}
    <mesh position={[T2 + 1.1, 4.22, 0]} rotation={[0, 0, Math.PI / 2]} material={PUMP}>
      <cylinderGeometry args={[0.09, 0.09, 0.36, 10]} />
    </mesh>
    {/* end gun: riser + body + nozzle */}
    <Rod a={[OH_TIP, 4.12, 0]} b={[OH_TIP, 4.45, 0]} r={0.04} mat={BRASS} />
    <Rod a={[OH_TIP, 4.45, 0]} b={[OH_TIP + 0.62, 4.85, 0]} r={0.055} mat={BRASS} />
    <mesh position={[OH_TIP + 0.66, 4.88, 0]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.84, 0.55, 0).normalize())} material={BRASS}>
      <coneGeometry args={[0.07, 0.16, 10]} />
    </mesh>
    {/* two drops on the overhang */}
    {[T2 + 2, T2 + 4].map((x) => (
      <group key={x}>
        <Rod a={[x, 4.0, 0]} b={[x, 2.85, 0]} r={0.012} mat={STEEL_DARK} />
        <mesh position={[x, 2.8, 0]} material={GEAR_DARK}>
          <cylinderGeometry args={[0.04, 0.028, 0.09, 8]} />
        </mesh>
      </group>
    ))}
  </Part>
);

// ------------------------------------------------------------------- water
const Spray = () => {
  const ref = useRef<THREE.Points>(null);
  const N = 380;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const speeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = 1.5 + Math.random() * (T2 - 1.5);
      positions[i * 3 + 1] = 0.2 + Math.random() * 2.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      speeds[i] = 0.5 + Math.random() * 1.1;
    }
    return { positions, speeds };
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] -= speeds[i] * dt;
      if (pos[i * 3 + 1] < 0.12) pos[i * 3 + 1] = 2.45;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#bfe3ff" size={0.09} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/** Long-throw jet arcing out of the end gun. */
const EndGunJet = () => {
  const ref = useRef<THREE.Points>(null);
  const N = 80;
  const T = 1.25;
  const origin: [number, number, number] = [OH_TIP + 0.68, 4.9, 0];
  const { positions, phases, jitter } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const phases = new Float32Array(N);
    const jitter = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      phases[i] = Math.random() * T;
      jitter[i] = (Math.random() - 0.5) * 1.6;
    }
    return { positions, phases, jitter };
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < N; i++) {
      phases[i] = (phases[i] + dt) % T;
      const t = phases[i];
      pos[i * 3] = origin[0] + 10.5 * t;
      pos[i * 3 + 1] = origin[1] + 3.1 * t - 4.9 * t * t;
      pos[i * 3 + 2] = origin[2] + jitter[i] * t;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#cfeaff" size={0.14} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// ------------------------------------------------------------------- field
const Field = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <circleGeometry args={[170, 48]} />
      <meshStandardMaterial color="#13241a" roughness={1} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <circleGeometry args={[FIELD_R, 72]} />
      <meshStandardMaterial color="#1c3a24" roughness={1} />
    </mesh>
    {[0.25, 0.5, 0.75, 0.93].map((f) => (
      <mesh key={f} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[FIELD_R * f - 0.07, FIELD_R * f, 96]} />
        <meshBasicMaterial color="#2a4d30" transparent opacity={0.8} />
      </mesh>
    ))}
    {/* freshly-watered wedge trailing the (parked) arm */}
    {Array.from({ length: 14 }, (_, j) => (
      <mesh key={j} rotation={[-Math.PI / 2, 0, (j + 1) * 0.07]} position={[0, 0.018 + j * 0.0004, 0]}>
        <circleGeometry args={[FIELD_R - 1, 24, 0, 0.066]} />
        <meshBasicMaterial color="#87a922" transparent opacity={0.15 * (1 - j / 14)} depthWrite={false} />
      </mesh>
    ))}
  </group>
);

// ---------------------------------------------------------------- controls
const Controls = () => {
  const { camera, gl } = useThree();
  const ctrl = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  useEffect(() => {
    ctrl.target.set(T1, 2.3, 0);
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.07;
    ctrl.enablePan = false;
    ctrl.enableZoom = false; // wheel keeps scrolling the page until first click
    ctrl.minDistance = 5;
    ctrl.maxDistance = 75;
    ctrl.maxPolarAngle = Math.PI * 0.495;
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = -0.45;
    const el = gl.domElement;
    const engage = () => {
      ctrl.autoRotate = false;
      ctrl.enableZoom = true;
    };
    const release = () => {
      ctrl.enableZoom = false; // give the wheel back to page scrolling
    };
    el.addEventListener('pointerdown', engage);
    el.addEventListener('pointerleave', release);
    return () => {
      el.removeEventListener('pointerdown', engage);
      el.removeEventListener('pointerleave', release);
      ctrl.dispose();
    };
  }, [ctrl, gl]);
  useFrame(() => ctrl.update());
  return null;
};

const CursorSync = () => {
  const { gl } = useThree();
  const { hovered } = useContext(PartCtx);
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }, [hovered, gl]);
  return null;
};

// -------------------------------------------------------------------- root
export default function PivotScene({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const downRef = useRef<[number, number] | null>(null);
  const ctx = useMemo<PartCtxT>(
    () => ({ selected: selectedId, hovered, hover: setHovered, select: onSelect }),
    [selectedId, hovered, onSelect],
  );

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [42, 11, 30], fov: 35 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0a1c12');
        scene.fog = new THREE.Fog('#0a1c12', 60, 190);
        gl.domElement.addEventListener('pointerdown', (e) => {
          downRef.current = [e.clientX, e.clientY];
        });
      }}
      onPointerMissed={(e) => {
        const d = downRef.current;
        // only deselect on a true click, not at the end of an orbit drag
        if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) < 8) onSelect(null);
      }}
    >
      <PartCtx.Provider value={ctx}>
        <hemisphereLight args={['#dbe8d0', '#0c1f14', 0.7]} />
        <directionalLight position={[60, 42, 22]} intensity={1.6} color="#ffe8c4" />
        <directionalLight position={[-40, 18, -30]} intensity={0.5} color="#87a922" />

        {/* the machine */}
        <PivotPoint />
        <RiserAndElbows />
        <CollectorRing />
        <ControlPanel />
        {Array.from({ length: SPANS }, (_, i) => {
          const from = SPAN_START + i * SPAN;
          const first = i === 0;
          return (
            <group key={i}>
              <SpanPipe from={from} withMarker={first} />
              <SpanTruss from={from} withMarker={first} />
              <SpanDrops from={from} withMarker={first} />
              <DriveTower tx={from + SPAN} markers />
            </group>
          );
        })}
        <Overhang />

        <Spray />
        <EndGunJet />
        <Field />
        <Controls />
        <CursorSync />
      </PartCtx.Provider>
    </Canvas>
  );
}
