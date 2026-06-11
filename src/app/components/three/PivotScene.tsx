import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural 3D model of a Western central-pivot irrigation system — no model
 * files, everything is built from primitives so the chunk stays small. The
 * machine slowly sweeps its field, wheels roll, water mists from the droppers,
 * and a fresh-watered trail follows the arm. Loaded lazily (see PivotTech).
 */

const SPAN_LEN = 7; // one truss span
const SPANS = 5;
const PIPE_H = 2.5; // water pipe height
const START_R = 2.2; // pivot point pad radius
const TOTAL_R = START_R + SPANS * SPAN_LEN;

const STEEL = new THREE.MeshStandardMaterial({ color: '#b8bfc4', metalness: 0.85, roughness: 0.35 });
const STEEL_DARK = new THREE.MeshStandardMaterial({ color: '#6f7a80', metalness: 0.8, roughness: 0.5 });
const TIRE = new THREE.MeshStandardMaterial({ color: '#15181a', roughness: 0.95 });

/** Cylinder rod between two points. */
const Rod = ({ a, b, r = 0.035, mat = STEEL }: { a: [number, number, number]; b: [number, number, number]; r?: number; mat?: THREE.Material }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const pos = va.clone().add(vb).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { pos: pos.toArray() as [number, number, number], quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={mat}>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
};

/** Drive tower: A-frame legs + two rolling wheels. */
const Tower = ({ x, wheelRef }: { x: number; wheelRef: (m: THREE.Mesh | null) => void }) => (
  <group position={[x, 0, 0]}>
    {/* A-frame legs (splayed along travel direction Z) */}
    <Rod a={[0, PIPE_H, 0]} b={[0.0, 0.55, 1.1]} r={0.05} />
    <Rod a={[0, PIPE_H, 0]} b={[0.0, 0.55, -1.1]} r={0.05} />
    <Rod a={[0, 0.55, 1.1]} b={[0, 0.55, -1.1]} r={0.045} mat={STEEL_DARK} />
    {/* Wheels — rotated so they roll tangentially */}
    {[1.1, -1.1].map((z) => (
      <group key={z} position={[0, 0.55, z]}>
        <mesh ref={wheelRef} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.55, 0.16, 10, 24]} />
          <primitive object={TIRE} attach="material" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={STEEL_DARK}>
          <cylinderGeometry args={[0.16, 0.16, 0.22, 12]} />
        </mesh>
      </group>
    ))}
  </group>
);

/** One truss span: pipe + V-lattice + droppers. */
const Span = ({ from }: { from: number }) => {
  const to = from + SPAN_LEN;
  const mid = (from + to) / 2;
  const segs = 6;
  const items = useMemo(() => {
    const rods: { a: [number, number, number]; b: [number, number, number] }[] = [];
    for (let k = 0; k < segs; k++) {
      const x0 = from + (k / segs) * SPAN_LEN;
      const x1 = from + ((k + 1) / segs) * SPAN_LEN;
      const xm = (x0 + x1) / 2;
      // V truss under the pipe
      rods.push({ a: [x0, PIPE_H, 0], b: [xm, PIPE_H - 0.85, 0] });
      rods.push({ a: [xm, PIPE_H - 0.85, 0], b: [x1, PIPE_H, 0] });
    }
    // lower tension chord
    const chord: { a: [number, number, number]; b: [number, number, number] }[] = [];
    for (let k = 0; k < segs - 1; k++) {
      const xa = from + ((k + 0.5) / segs) * SPAN_LEN;
      const xb = from + ((k + 1.5) / segs) * SPAN_LEN;
      chord.push({ a: [xa, PIPE_H - 0.85, 0], b: [xb, PIPE_H - 0.85, 0] });
    }
    return { rods, chord };
  }, [from]);

  return (
    <group>
      {/* main water pipe */}
      <mesh position={[mid, PIPE_H, 0]} rotation={[0, 0, Math.PI / 2]} material={STEEL}>
        <cylinderGeometry args={[0.09, 0.09, SPAN_LEN, 10]} />
      </mesh>
      {items.rods.map((r, i) => (
        <Rod key={`r${i}`} a={r.a} b={r.b} />
      ))}
      {items.chord.map((r, i) => (
        <Rod key={`c${i}`} a={r.a} b={r.b} r={0.022} mat={STEEL_DARK} />
      ))}
      {/* sprinkler droppers */}
      {[0.25, 0.5, 0.75].map((f) => {
        const x = from + f * SPAN_LEN;
        return (
          <group key={f}>
            <Rod a={[x, PIPE_H, 0]} b={[x, PIPE_H - 1.5, 0]} r={0.018} mat={STEEL_DARK} />
            <mesh position={[x, PIPE_H - 1.55, 0]} material={STEEL_DARK}>
              <sphereGeometry args={[0.06, 8, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Falling mist particles under the arm. */
const Spray = () => {
  const ref = useRef<THREE.Points>(null);
  const N = 420;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const speeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = START_R + Math.random() * (TOTAL_R - START_R); // x along arm
      positions[i * 3 + 1] = Math.random() * (PIPE_H - 1.4) + 0.3; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6; // z drift
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
      if (pos[i * 3 + 1] < 0.1) pos[i * 3 + 1] = PIPE_H - 1.4;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#bfe3ff"
        size={0.09}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/** Fresh-watered trail sweeping behind the arm. */
const Trail = () => {
  const wedges = 26;
  return (
    <group rotation={[0, 0, 0]}>
      {Array.from({ length: wedges }, (_, j) => (
        <mesh
          key={j}
          rotation={[-Math.PI / 2, 0, (j + 1) * 0.075]}
          position={[0, 0.02 + j * 0.0004, 0]}
        >
          <circleGeometry args={[TOTAL_R, 20, 0, 0.072]} />
          <meshBasicMaterial
            color="#87a922"
            transparent
            opacity={0.16 * (1 - j / wedges)}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const Machine = () => {
  const arm = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  wheels.current = [];
  const collectWheel = (m: THREE.Mesh | null) => {
    if (m) wheels.current.push(m);
  };

  useFrame((_, dt) => {
    if (arm.current) arm.current.rotation.y -= dt * 0.085; // majestic sweep
    for (const w of wheels.current) w.rotation.x -= dt * 0.7;
  });

  return (
    <group>
      {/* Center pivot pad + riser */}
      <mesh position={[0, 0.12, 0]} material={STEEL_DARK}>
        <cylinderGeometry args={[1.4, 1.6, 0.24, 24]} />
      </mesh>
      <Rod a={[-1.1, 0.2, -1.1]} b={[0, PIPE_H + 0.4, 0]} r={0.06} />
      <Rod a={[1.1, 0.2, -1.1]} b={[0, PIPE_H + 0.4, 0]} r={0.06} />
      <Rod a={[-1.1, 0.2, 1.1]} b={[0, PIPE_H + 0.4, 0]} r={0.06} />
      <Rod a={[1.1, 0.2, 1.1]} b={[0, PIPE_H + 0.4, 0]} r={0.06} />
      <mesh position={[0, PIPE_H / 2 + 0.1, 0]} material={STEEL}>
        <cylinderGeometry args={[0.12, 0.12, PIPE_H + 0.2, 10]} />
      </mesh>

      {/* Rotating arm: spans + towers + spray + trail */}
      <group ref={arm}>
        {Array.from({ length: SPANS }, (_, i) => {
          const from = START_R + i * SPAN_LEN;
          return (
            <group key={i}>
              <Span from={from} />
              <Tower x={from + SPAN_LEN} wheelRef={collectWheel} />
            </group>
          );
        })}
        {/* end gun */}
        <Rod
          a={[TOTAL_R, PIPE_H, 0]}
          b={[TOTAL_R + 1.6, PIPE_H + 0.35, 0]}
          r={0.05}
        />
        <Spray />
        <Trail />
      </group>
    </group>
  );
};

const Field = () => (
  <group>
    {/* desert floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <circleGeometry args={[90, 48]} />
      <meshStandardMaterial color="#152a1c" roughness={1} />
    </mesh>
    {/* irrigated circle */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <circleGeometry args={[TOTAL_R + 1.5, 64]} />
      <meshStandardMaterial color="#1c3a24" roughness={1} />
    </mesh>
    {/* crop rings */}
    {[0.3, 0.5, 0.7, 0.9].map((f) => (
      <mesh key={f} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[TOTAL_R * f - 0.06, TOTAL_R * f, 96]} />
        <meshBasicMaterial color="#2a4d30" transparent opacity={0.8} />
      </mesh>
    ))}
  </group>
);

const CameraRig = () => {
  useFrame(({ camera, pointer }) => {
    // gentle parallax toward the cursor
    const tx = 17 + pointer.x * 2.2;
    const ty = 7.5 - pointer.y * 1.4;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(0, 1.6, 0);
  });
  return null;
};

export default function PivotScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [17, 7.5, 17], fov: 38 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0a1c12');
        scene.fog = new THREE.Fog('#0a1c12', 26, 78);
      }}
    >
      <hemisphereLight args={['#dbe8d0', '#0c1f14', 0.7]} />
      <directionalLight position={[18, 14, 8]} intensity={1.6} color="#ffe8c4" />
      <directionalLight position={[-14, 6, -10]} intensity={0.5} color="#87a922" />
      <Machine />
      <Field />
      <CameraRig />
    </Canvas>
  );
}
