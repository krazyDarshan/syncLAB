import { useSimulationClock } from './hooks/useSimulationClock';
import {
  Controls,
  RightPanel,
  Configuration,
  Timeline,
  Theory,
} from './components/SimulationPanels';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cpu,
  FlaskConical,
  GitBranch,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Play,
  Presentation,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import LabScene from './components/3d/LabScene';
import { useLab } from './store/useLab';
import { algorithms, lessons, colors, demoScenes } from './data/lessons';
import { initial, runToEnd, type Algorithm } from './simulation/core/engine';
const icons = {
  race: Zap,
  mutex: LockKeyhole,
  binary: GitBranch,
  counting: Layers,
  buffer: Box,
  readers: Users,
  philosophers: CircleHelp,
  deadlock: Activity,
};
export default function App() {
  const { sim, running, setAlgorithm, visited, reduced, setReduced } = useLab();
  const [page, setPage] = useState<'dashboard' | 'lab' | 'theory'>('dashboard');
  const [info, setInfo] = useState(false);
  const [settings, setSettings] = useState(false);
  const [presentation, setPresentation] = useState<number | null>(null);
  const [compare, setCompare] = useState(false);
  const [autoDemo, setAutoDemo] = useState(false);
  useSimulationClock();
  useEffect(() => {
    if (!autoDemo || presentation === null || (!sim.done && !sim.deadlock)) return;
    const timer = setTimeout(() => {
      if (presentation < demoScenes.length - 1) openScene(presentation + 1, true);
      else setAutoDemo(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [sim.done, sim.deadlock, autoDemo, presentation]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfo(false);
        setSettings(false);
        setCompare(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const open = (a: Algorithm) => {
    setAlgorithm(a);
    setPage('lab');
    setPresentation(null);
    setAutoDemo(false);
  };
  const openScene = (i: number, auto = false) => {
    setAlgorithm(demoScenes[i][0]);
    setPage('lab');
    setPresentation(i);
    setAutoDemo(auto);
    if (auto) {
      useLab.getState().setSpeed(1.5);
      useLab.getState().toggle();
    }
  };
  const Icon = icons[sim.algorithm];
  const l = lessons[sim.algorithm];
  const status = sim.deadlock
    ? 'Deadlocked'
    : sim.done
      ? 'Completed'
      : running
        ? 'Running'
        : sim.tick
          ? 'Paused'
          : 'Ready';
  return (
    <div className={`app ${reduced ? 'reduced-motion' : ''}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('dashboard');
            useLab.setState({ running: false });
          }}
        >
          <div className="brand-mark">
            <Layers size={24} />
          </div>
          <span>
            SyncLab <b>3D</b>
            <small>OPERATING SYSTEMS LAB</small>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <button
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setPage('dashboard');
            useLab.setState({ running: false });
            setAutoDemo(false);
          }}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <span className="nav-label">SYNCHRONIZATION MODULES</span>
        <nav>
          {algorithms.map((a, i) => {
            const I = icons[a];
            return (
              <button
                key={a}
                className={`nav-item ${page === 'lab' && sim.algorithm === a ? 'active' : ''}`}
                onClick={() => open(a)}
              >
                <I size={17} />
                <span>{lessons[a].title}</span>
                <small>{String(i + 1).padStart(2, '0')}</small>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === 'theory' ? 'active' : ''}`}
            onClick={() => {
              setPage('theory');
              useLab.setState({ running: false });
              setAutoDemo(false);
            }}
          >
            <BookOpen size={17} /> Theory & Algorithms
          </button>
          <button className="presentation-button" onClick={() => openScene(0)}>
            <Presentation size={17} /> Presentation Mode <ArrowRight size={14} />
          </button>
          <div className="system-health">
            <i className="live-dot" />
            <span>
              All systems operational<small>LOCAL ENGINE · NO CLOUD</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>
              {page === 'dashboard' ? 'Overview' : page === 'theory' ? 'Knowledge base' : l.title}
            </strong>
          </div>
          <div className="top-actions">
            <span className={`status status-${status.toLowerCase()}`}>
              <i />
              {status}
            </span>
            <button title="Settings" onClick={() => setSettings(!settings)}>
              <Settings2 size={17} />
            </button>
            <button title="Reset current scenario" onClick={() => useLab.getState().reset()}>
              <RotateCcw size={17} />
            </button>
            <button className="demo-button" onClick={() => openScene(0, true)}>
              <Play size={13} /> Run Demo
            </button>
          </div>
        </header>
        <main>
          {page === 'dashboard' ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <i className="live-dot" /> YOUR INTERACTIVE OS LABORATORY
                  </span>
                  <h1>
                    Concurrency.
                    <br />
                    <span>Finally, visible.</span>
                  </h1>
                  <p>
                    Step inside the operating system. Explore how processes cooperate, compete, and
                    synchronize — one interaction at a time.
                  </p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => open('race')}>
                      Start exploring <ArrowRight size={17} />
                    </button>
                    <button onClick={() => openScene(0, true)}>
                      <Play size={15} /> Watch the demo
                    </button>
                  </div>
                  <div className="hero-facts">
                    <span>
                      <Box size={14} /> Real-time 3D
                    </span>
                    <span>
                      <ShieldCheck size={14} /> Verified invariants
                    </span>
                    <span>
                      <GitBranch size={14} /> Event-driven engine
                    </span>
                  </div>
                </div>
                <div className="hero-scene">
                  <LabScene />
                  <div className="hero-scene-caption">
                    <span className="live-dot" /> A SYSTEM YOU CAN STEP INSIDE
                  </div>
                </div>
              </section>
              <section className="overview-stats">
                <div>
                  <span className="stat-icon">
                    <FlaskConical />
                  </span>
                  <strong>
                    08<small>Interactive experiments</small>
                  </strong>
                </div>
                <div>
                  <span className="stat-icon violet">
                    <Cpu />
                  </span>
                  <strong>
                    06<small>Visible process states</small>
                  </strong>
                </div>
                <div>
                  <span className="stat-icon green">
                    <BookOpen />
                  </span>
                  <strong>
                    {visited.length}
                    <small>of 8 modules explored</small>
                  </strong>
                </div>
                <div className="progress-stat">
                  <span>
                    Your learning journey <b>{Math.round((visited.length / 8) * 100)}%</b>
                  </span>
                  <div>
                    <i style={{ width: `${(visited.length / 8) * 100}%` }} />
                  </div>
                </div>
              </section>
              <div className="section-title">
                <div>
                  <span className="eyebrow">LEARN BY DOING</span>
                  <h2>Choose your experiment</h2>
                </div>
                <span>From the first collision to the final resolution.</span>
              </div>
              <div className="module-grid">
                {algorithms.map((a, i) => {
                  const I = icons[a];
                  return (
                    <button className={`module-card module-${a}`} key={a} onClick={() => open(a)}>
                      <div className="card-top">
                        <span className="module-icon">
                          <I size={22} />
                        </span>
                        <span>
                          {String(i + 1).padStart(2, '0')}{' '}
                          {visited.includes(a) && <Check size={13} />}
                        </span>
                      </div>
                      <h3>{lessons[a].title}</h3>
                      <p>{lessons[a].subtitle}</p>
                      <div className="card-footer">
                        <span>
                          {['race', 'mutex', 'binary'].includes(a)
                            ? 'FOUNDATIONS'
                            : ['deadlock', 'philosophers'].includes(a)
                              ? 'RESOURCE SAFETY'
                              : 'COORDINATION'}
                        </span>
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="dashboard-footer">
                <span>
                  <Cpu size={16} /> Built to understand the invisible.
                </span>
                <span>React · Three.js · Discrete-event simulation</span>
              </div>
            </>
          ) : page === 'theory' ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE KNOWLEDGE BASE</span>
                  <h1>Theory & algorithms</h1>
                  <p>The concepts behind every state transition.</p>
                </div>
                <BookOpen size={36} />
              </div>
              <div className="architecture panel">
                <h2>Inside SyncLab 3D</h2>
                <div>
                  <span>React controls</span>
                  <ArrowRight />
                  <span>Zustand store</span>
                  <ArrowRight />
                  <span>Pure event engine</span>
                  <ArrowRight />
                  <span>Three.js scene</span>
                </div>
                <p>
                  The clock pops one scheduled event at a time. The engine validates invariants and
                  records process history; the scene renders that state. Pausing stops event
                  consumption, and Step executes exactly one event. All scenarios use deterministic
                  scheduling without randomness.
                </p>
              </div>
              <div className="module-grid">
                {algorithms.map((a) => (
                  <button
                    className="module-card"
                    key={a}
                    onClick={() => {
                      setAlgorithm(a);
                      setInfo(true);
                    }}
                  >
                    <BookOpen size={20} />
                    <h3>{lessons[a].title}</h3>
                    <p>{lessons[a].subtitle}</p>
                    <div className="card-footer">
                      Read field notes <ArrowRight size={16} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="architecture panel">
                <h2>The four Coffman conditions</h2>
                <p>Mutual exclusion · Hold and wait · No preemption · Circular wait</p>
                <p>
                  All four are necessary for deadlock. Resource ordering prevents circular wait.
                  Recovery can terminate a process and release its resources after a deadlock is
                  detected.
                </p>
              </div>
            </>
          ) : (
            <>
              {presentation !== null && (
                <div className="presentation-strip">
                  <div>
                    <span>
                      <Presentation size={16} /> GUIDED PRESENTATION · {presentation + 1} /{' '}
                      {demoScenes.length}
                    </span>
                    <p>{demoScenes[presentation][1]}</p>
                  </div>
                  <div>
                    <button
                      aria-label="Previous demo scene"
                      disabled={presentation === 0}
                      onClick={() => openScene(presentation - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      onClick={() =>
                        presentation < 3 ? openScene(presentation + 1) : setPresentation(null)
                      }
                    >
                      {presentation < 3 ? 'Next scene' : 'Finish'}
                      <ChevronRight size={16} />
                    </button>
                    <button
                      title="Exit presentation"
                      onClick={() => {
                        setPresentation(null);
                        setAutoDemo(false);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
              <div className="page-heading">
                <div>
                  <span className="eyebrow">{l.tag}</span>
                  <h1>
                    <Icon size={29} />
                    {l.title}
                  </h1>
                  <p>{l.subtitle}</p>
                </div>
                <div className="heading-actions">
                  {sim.algorithm === 'race' && (
                    <button onClick={() => setCompare(true)}>
                      <GitBranch size={15} /> Compare results
                    </button>
                  )}
                  <button onClick={() => setInfo(true)}>
                    <BookOpen size={15} /> Algorithm info
                  </button>
                </div>
              </div>
              <Configuration />
              <div className="lab-layout">
                <div className="lab-main">
                  <div className="canvas-panel panel">
                    <LabScene />
                    <div className="legend">
                      {Object.entries(colors).map(([state, color]) => (
                        <span key={state}>
                          <i style={{ background: color }} />
                          {state === 'CRITICAL'
                            ? 'Critical section'
                            : state.charAt(0) + state.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </div>
                    <Controls />
                    <div className="completion">
                      <div
                        style={{
                          width: `${(sim.processes.filter((p) => p.state === 'FINISHED').length / sim.processes.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Timeline />
                </div>
                <RightPanel />
              </div>
              <div className="lab-note">
                <ShieldCheck size={14} />
                <span>
                  {sim.algorithm === 'race' && !sim.config.synchronized
                    ? 'UNPROTECTED ACCESS · Lost updates are intentionally possible in this experiment.'
                    : sim.algorithm === 'buffer'
                      ? 'INVARIANT · Buffer occupancy stays within capacity. Reserved slots/items are deducted from empty/full.'
                      : sim.algorithm === 'readers'
                        ? 'INVARIANT · Writers never overlap with readers or other writers.'
                        : ['deadlock', 'philosophers'].includes(sim.algorithm)
                          ? 'RESOURCE MODEL · Each resource has exactly one instance. Allocation and request cycles are tracked.'
                          : 'INVARIANT · Active processes never exceed available resource capacity.'}
                </span>
              </div>
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            SyncLab 3D <i> / </i> Make synchronization make sense.
          </span>
          <span>
            <span className="live-dot" /> Deterministic simulation engine
          </span>
        </footer>
      </div>
      <AnimatePresence>
        {info && <Theory algorithm={sim.algorithm} close={() => setInfo(false)} />}
      </AnimatePresence>
      {settings && (
        <div className="settings-popover panel">
          <div className="panel-heading">
            Lab settings
            <button title="Close settings" onClick={() => setSettings(false)}>
              <X size={15} />
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />{' '}
            Reduce motion
          </label>
          <p>
            Settings are saved in this browser. Rendering is capped at 1.5× pixel density; shadows
            are disabled for laptop performance.
          </p>
          <span>Theme: Daylight studio</span>
        </div>
      )}
      {compare && (
        <div className="modal-backdrop" onClick={() => setCompare(false)}>
          <section
            className="comparison theory-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Race condition comparison"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              title="Close comparison"
              onClick={() => setCompare(false)}
            >
              <X />
            </button>
            <span className="eyebrow">SAME WORKLOAD. TWO OUTCOMES.</span>
            <h2>The cost of a race.</h2>
            <p>
              Each of {sim.config.count} processes increments once. Both results below are computed
              by running the actual engine to completion.
            </p>
            <div className="compare-grid">
              {[false, true].map((sync) => {
                const result = runToEnd(initial('race', { ...sim.config, synchronized: sync }));
                return (
                  <div key={String(sync)}>
                    <span>{sync ? 'WITH MUTEX' : 'WITHOUT LOCKING'}</span>
                    <strong style={{ color: sync ? '#258362' : '#a37524' }}>
                      {result.counter}
                      <small> / {sim.config.count}</small>
                    </strong>
                    <p>
                      {sync
                        ? 'Every increment is preserved.'
                        : `${sim.config.count - result.counter} updates are lost.`}
                    </p>
                    <button
                      onClick={() => {
                        useLab.getState().configure({ synchronized: sync });
                        setCompare(false);
                      }}
                    >
                      Explore this execution <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

