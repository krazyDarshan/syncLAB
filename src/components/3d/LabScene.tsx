import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, RoundedBox, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useLab } from '../../store/useLab';
import { colors } from '../../data/lessons';
import type { Process, Simulation } from '../../simulation/core/engine';
import { RotateCcw, Move3d, Eye } from 'lucide-react';
function Label({
  position,
  title,
  subtitle = '',
  color = '#4b685a',
  width = 2.2,
}: {
  position: [number, number, number];
  title: string;
  subtitle?: string;
  color?: string;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fffefaf2';
    ctx.beginPath();
    ctx.roundRect(3, 3, 506, 154, 18);
    ctx.fill();
    ctx.strokeStyle = '#bdcdbb';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = title.length < 6 ? '700 86px Segoe UI' : '600 48px Segoe UI';
    ctx.fillText(title, 256, subtitle ? 55 : 80, 470);
    if (subtitle) {
      ctx.fillStyle = '#687f6b';
      ctx.font = '40px Segoe UI';
      ctx.fillText(subtitle, 256, 112, 470);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [title, subtitle, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[width, (width * 160) / 512, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent />
    </sprite>
  );
}
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function position(p: Process, s: Simulation): [number, number, number] {
  const n = s.processes.length;
  if (s.algorithm === 'deadlock') {
    const a = (p.id / n) * Math.PI * 2;
    return [Math.sin(a) * 3.25, 0.65, Math.cos(a) * 3.25];
  }
  if (s.owners.includes(p.id)) {
    const i = s.owners.indexOf(p.id);
    return [(i - (s.owners.length - 1) / 2) * 1.15, 0.8, 0];
  }
  if (p.state === 'FINISHED') return [4.1, 0.6, (p.id - (n - 1) / 2) * 0.95];
  if (p.state === 'WAITING')
    return [-3.5, 0.6, (s.waiting.indexOf(p.id) - (s.waiting.length - 1) / 2) * 1.05];
  return [(p.id - (n - 1) / 2) * 1.25, 0.6, 3.3];
}
function Orb({ p, s }: { p: Process; s: Simulation }) {
  const ref = useRef<THREE.Group>(null);
  const target = position(p, s);
  const origin = useRef(target);
  const selected = useLab((x) => x.selected);
  const select = useLab((x) => x.select);
  const reduced =
    useLab((x) => x.reduced) || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = useLab((x) => x.speed);
  const running = useLab((x) => x.running);
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const v = new THREE.Vector3(...target);
    if (reduced || !running) ref.current.position.copy(v);
    else ref.current.position.lerp(v, 1 - Math.exp(-dt * 5 * speed));
  });
  return (
    <group ref={ref} position={origin.current}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          select(p.id);
        }}
        onPointerOver={() => {
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.36, 24, 16]} />
        <meshStandardMaterial
          color={colors[p.state]}
          metalness={0.45}
          roughness={0.23}
          emissive={colors[p.state]}
          emissiveIntensity={hover || selected === p.id ? 0.9 : 0.28}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.43, 0]}>
        <ringGeometry args={[0.43, 0.48, 40]} />
        <meshBasicMaterial color={colors[p.state]} transparent opacity={0.75} />
      </mesh>
      {selected === p.id && (
        <mesh>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshBasicMaterial color="white" wireframe transparent opacity={0.3} />
        </mesh>
      )}
      <Label
        position={[0, 0.8, 0]}
        width={1.6}
        title={`P${p.id + 1}`}
        color={colors[p.state]}
        subtitle={
          p.state === 'CRITICAL'
            ? 'IN SECTION'
            : p.state
          }
      />
    </group>
  );
}
function Arrow({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
  const mid = new THREE.Vector3(...to).addScaledVector(dir, -0.55);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <>
      <Line points={[from, to]} color={color} lineWidth={2} />
      <mesh position={mid} quaternion={q}>
        <coneGeometry args={[0.1, 0.28, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}
function Fork({
  home,
  owner,
  index,
  s,
}: {
  home: [number, number, number];
  owner: number | null;
  index: number;
  s: Simulation;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const speed = useLab((x) => x.speed);
  const running = useLab((x) => x.running);
  const reduced = useLab((x) => x.reduced);
  const destination =
    owner === null
      ? new THREE.Vector3(...home)
      : new THREE.Vector3(...position(s.processes[owner], s)).add(
          new THREE.Vector3((index % 2 ? 1 : -1) * 0.5, -0.15, 0),
        );
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (!running || reduced) ref.current.position.copy(destination);
    else ref.current.position.lerp(destination, 1 - Math.exp(-dt * 6 * speed));
  });
  return (
    <mesh ref={ref} position={home} rotation={[0, (index / 5) * Math.PI * 2, 0]}>
      <boxGeometry args={[0.13, 0.13, 0.7]} />
      <meshStandardMaterial
        color={owner === null ? '#4ce2ce' : s.deadlock ? '#ff617d' : '#b29aff'}
        emissive="#69529a"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
function World({ s }: { s: Simulation }) {
  const circular = s.algorithm === 'deadlock';
  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[4, 8, 5]} intensity={2} />
      <pointLight position={[-4, 3, -2]} color="#42cbff" intensity={12} />
      <pointLight position={[3, 3, 1]} color="#9c6cff" intensity={10} />
      <Grid
        position={[0, -0.16, 0]}
        args={[22, 22]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d3dfcf"
        sectionSize={5}
        sectionColor="#b1c5b0"
        fadeDistance={22}
        infiniteGrid
      />
      <mesh position={[0, -0.29, 0]}>
        <boxGeometry args={[10.6, 0.24, 9]} />
        <meshStandardMaterial color="#d5dfd2" metalness={0.4} roughness={0.6} />
      </mesh>
      {circular ? (
        <>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[2.25, 2.25, 0.35, 64]} />
            <meshStandardMaterial color="#cfdbcf" metalness={0.55} roughness={0.4} />
          </mesh>
          <Label
            position={[0, 0.6, 0]}
            width={2.7}
            title="RESOURCE GRAPH"
            subtitle={
              s.deadlock
                ? 'CIRCULAR WAIT'
                : s.config.safe
                  ? 'ORDERED ACQUISITION'
                  : 'SINGLE-INSTANCE RESOURCES'
            }
          />
          {s.forks.map((owner, i) => {
            const a = ((i + 0.5) / s.processes.length) * Math.PI * 2;
            const loc: [number, number, number] = [Math.sin(a) * 1.8, 0.5, Math.cos(a) * 1.8];
            return (
              <group key={i}>
                <mesh position={loc} rotation={[0, a, 0]}>
                    <boxGeometry args={[0.45, 0.45, 0.45]} />
                    <meshStandardMaterial
                      color={owner === null ? '#4ce2ce' : s.deadlock ? '#ff617d' : '#b29aff'}
                      emissive={owner === null ? '#0f776d' : '#69459c'}
                      emissiveIntensity={0.5}
                    />
                  </mesh>
                <Label position={[loc[0], 0.9, loc[2]]} width={0.7} title={`R${i + 1}`} />
                {s.algorithm === 'deadlock' && owner !== null && (
                  <Arrow from={loc} to={position(s.processes[owner], s)} color="#a28aff" />
                )}
              </group>
            );
          })}
          {s.algorithm === 'deadlock' &&
            s.processes
              .filter((p) => p.state === 'WAITING' || p.state === 'DEADLOCKED')
              .map((p) => {
                const next = (p.id + 1) % s.processes.length;
                const r = s.config.safe
                    ? p.phase === 0
                      ? Math.min(p.id, next)
                      : Math.max(p.id, next)
                    : p.phase === 0
                      ? p.id
                      : next,
                  a = ((r + 0.5) / s.processes.length) * Math.PI * 2;
                return (
                  <Arrow
                    key={p.id}
                    from={position(p, s)}
                    to={[Math.sin(a) * 1.8, 0.5, Math.cos(a) * 1.8]}
                    color="#ff617d"
                  />
                );
              })}
        </>
      ) : (
        <>
          <Line
            points={[
              [-4, 0.02, -2.6],
              [-4, 0.02, 2.5],
              [0, 0.02, 2.5],
              [0, 0.02, 0],
              [4, 0.02, 0],
              [4, 0.02, -2.6],
            ]}
            color="#367694"
            lineWidth={1.7}
            dashed
            dashSize={0.18}
            gapSize={0.13}
          />
          <RoundedBox args={[3.7, 2.3, 2.5]} radius={0.12} position={[0, 1, 0]}>
            <meshPhysicalMaterial
              color="#8c78ff"
              transparent
              opacity={0.09}
              roughness={0.25}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </RoundedBox>
          <Line
            points={[
              [-1.85, 0.01, -1.25],
              [1.85, 0.01, -1.25],
              [1.85, 0.01, 1.25],
              [-1.85, 0.01, 1.25],
              [-1.85, 0.01, -1.25],
            ]}
            color="#9d83ff"
            lineWidth={2}
          />
          {[-1.8, 1.8].flatMap((x) =>
            [-1.2, 1.2].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 1, z]}>
                <boxGeometry args={[0.025, 2, 0.025]} />
                <meshBasicMaterial color="#7f72dc" />
              </mesh>
            )),
          )}
          <Label
            position={[0, 2.6, 0]}
            width={3.2}
            color="#806396"
            title={
              s.algorithm === 'buffer'
                ? 'BUFFER ACCESS'
                : s.algorithm === 'readers'
                  ? 'SHARED DATA VAULT'
                  : 'CRITICAL SECTION'
            }
            subtitle={s.owners.length ? `${s.owners.length} ACTIVE PROCESSES` : 'AWAITING PROCESS'}
          />
          <Label position={[-3.6, 0.05, -2.3]} width={1.8} title="WAITING QUEUE" />
          <Label position={[4, 0.05, -2.3]} width={1.8} title="COMPLETED" />
          {s.algorithm === 'counting' &&
            Array.from({ length: s.config.capacity }, (_, i) => (
              <mesh key={i} position={[(i - (s.config.capacity - 1) / 2) * 0.7, 0.12, -2.2]}>
                <cylinderGeometry args={[0.25, 0.3, 0.25, 20]} />
                <meshStandardMaterial
                  color={i < s.owners.length ? '#a28aff' : '#35dfaa'}
                  emissive="#267b83"
                  emissiveIntensity={0.5}
                />
              </mesh>
            ))}
          {s.algorithm === 'race' && (
            <Label
              position={[0, 0.4, -2.1]}
              width={2.5}
              title={`COUNTER ${s.counter.toString().padStart(2, '0')}`}
              subtitle="SHARED MEMORY"
              color="#377a73"
            />
          )}
          {s.algorithm === 'buffer' && (
            <group position={[0, 0, -2.6]}>
              <mesh>
                <boxGeometry args={[5, 0.2, 0.85]} />
                <meshStandardMaterial color="#b9cbbc" />
              </mesh>
              {Array.from({ length: s.config.capacity }, (_, i) => (
                <group key={i} position={[(i - (s.config.capacity - 1) / 2) * 0.75, 0.3, 0]}>
                  <RoundedBox args={[0.57, 0.45, 0.58]} radius={0.05}>
                    <meshStandardMaterial
                      color={i < s.buffer.length ? '#39dbbd' : '#d8e1d5'}
                      emissive={i < s.buffer.length ? '#176e67' : '#000000'}
                      emissiveIntensity={0.6}
                      wireframe={i >= s.buffer.length}
                    />
                  </RoundedBox>
                  {s.buffer[i] && (
                    <Label position={[0, 0.48, 0]} width={0.5} title={String(s.buffer[i])} />
                  )}
                </group>
              ))}
            </group>
          )}
        </>
      )}
      {s.processes.map((p) => (
        <Orb key={p.id} p={p} s={s} />
      ))}
    </>
  );
}
function Performance({ report }: { report: (n: number) => void }) {
  const frames = useRef(0),
    elapsed = useRef(0);
  useFrame((_, dt) => {
    frames.current++;
    elapsed.current += dt;
    if (elapsed.current > 1) {
      report(Math.round(frames.current / elapsed.current));
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
function Camera({ view }: { view: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(
      ...((view % 3 === 0 ? [9, 9, 11] : view % 3 === 1 ? [0, 14, 0.1] : [0, 5, 13]) as [
        number,
        number,
        number,
      ]),
    );
    camera.lookAt(0, 0, 0);
  }, [camera, view]);
  return null;
}
export default function LabScene() {
  const s = useLab((x) => x.sim);
  const [view, setView] = useState(0);
  const [fps, setFps] = useState(0);
  const supported = useMemo(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }, []);
  const fallback = (
    <div className="fallback">
      <h3>Accessible process view</h3>
      <p>WebGL is unavailable. All simulation controls remain active.</p>
      <div className="fallback-processes">
        {s.processes.map((p) => (
          <button
            key={p.id}
            onClick={() => useLab.getState().select(p.id)}
            style={{ borderColor: colors[p.state] }}
          >
            P{p.id + 1}
            <small>{p.state}</small>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="scene">
      <div className="scene-top">
        <span>
          <i className="live-dot" /> LIVE SIMULATION <b> / {s.config.count} PROCESSES</b>
        </span>
        <span className="performance">{supported ? `${fps} FPS · WEBGL` : '2D FALLBACK'}</span>
      </div>
      <Boundary fallback={fallback}>
        {supported ? (
          <Suspense fallback={<div className="fallback">Initializing laboratory…</div>}>
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [9, 9, 11], fov: 43 }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
              onPointerMissed={() => useLab.getState().select(null)}
            >
              <color attach="background" args={['#eef2ec']} />
              <fog attach="fog" args={['#eef2ec', 18, 38]} />
              <Camera view={view} />
              <World s={s} />
              <OrbitControls
                key={view}
                makeDefault
                minDistance={7}
                maxDistance={23}
                maxPolarAngle={Math.PI / 2.1}
                target={[0, 0.4, 0]}
                enableDamping
              />
              <Performance report={setFps} />
            </Canvas>
          </Suspense>
        ) : (
          fallback
        )}
      </Boundary>
      <div className="scene-bottom">
        <span>
          <Move3d size={14} /> Drag to orbit · Scroll to zoom · Click to inspect
        </span>
        <div>
          <button title="Cycle camera preset" onClick={() => setView((v) => v + 1)}>
            <Eye size={16} />
          </button>
          <button title="Reset camera" onClick={() => setView((v) => v + 3 - (v % 3))}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
