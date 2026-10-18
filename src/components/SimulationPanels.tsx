import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BookOpen,
  Check,
  LockKeyhole,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { useLab } from '../store/useLab';
import { lessons, colors } from '../data/lessons';
import type { Algorithm } from '../simulation/core/engine';
function Metrics() {
  const s = useLab((x) => x.sim);
  const capacity = s.algorithm === 'counting' ? s.config.capacity : 1;
  const reservedProducer = s.owners.some((id) => s.processes[id].role === 'Producer') ? 1 : 0;
  const reservedConsumer = s.owners.some((id) => s.processes[id].role === 'Consumer') ? 1 : 0;
  const rows =
    s.algorithm === 'race'
      ? [
          ['Actual counter', s.counter],
          ['Expected', s.processes.filter((p) => p.state === 'FINISHED').length],
          ['Workload total', s.config.count],
          ['Lost updates', s.processes.filter((p) => p.state === 'FINISHED').length - s.counter],
        ]
      : s.algorithm === 'buffer'
        ? [
            ['Buffer occupancy', `${s.buffer.length} / ${s.config.capacity}`],
            ['empty', s.config.capacity - s.buffer.length - reservedProducer],
            ['full', s.buffer.length - reservedConsumer],
            ['mutex', 1 - s.owners.length],
          ]
        : s.algorithm === 'readers'
          ? [
              ['Active readers', s.owners.filter((id) => s.processes[id].role === 'Reader').length],
              [
                'Active writer',
                s.owners
                  .filter((id) => s.processes[id].role === 'Writer')
                  .map((id) => `P${id + 1}`)
                  .join('') || 'None',
              ],
              [
                'Waiting readers',
                s.waiting.filter((id) => s.processes[id].role === 'Reader').length,
              ],
              [
                'Waiting writers',
                s.waiting.filter((id) => s.processes[id].role === 'Writer').length,
              ],
            ]
          : s.algorithm === 'deadlock'
            ? [
                ['Resources held', s.forks.filter((f) => f !== null).length],
                ['Available', s.forks.filter((f) => f === null).length],
                ['Cycle detected', s.deadlock ? 'Yes' : 'No'],
                ['Strategy', s.config.safe ? 'Ordered' : 'Naive'],
              ]
            : [
                ['Available permits', capacity - s.owners.length],
                ['Capacity', capacity],
                ['Active', s.owners.length],
                ['Waiting', s.waiting.length],
              ];
  return (
    <div className="metrics">
      {rows.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
export function Controls() {
  const { sim, running, speed, toggle, step, reset, setSpeed } = useLab();
  return (
    <div className="controls">
      <div className="transport">
        <button className="primary" onClick={toggle} disabled={sim.done || sim.deadlock}>
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Pause' : sim.tick ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={step}
          disabled={sim.done || sim.deadlock}
          title="Advance one discrete event"
        >
          <SkipForward size={17} />
          <span>Step</span>
        </button>
        <button onClick={reset} title="Reset simulation">
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="speed">
        <span>
          Speed <b>{speed.toFixed(2).replace(/0$/, '')}×</b>
        </span>
        <input
          aria-label="Simulation speed"
          type="range"
          min=".25"
          max="3"
          step=".25"
          value={speed}
          onChange={(e) => setSpeed(+e.target.value)}
        />
      </div>
      <div className="step-count">
        <span>STEP {sim.steps} / TICK</span>
        <b>
          {sim.tick.toString().padStart(3, '0')} <small>ticks</small>
        </b>
      </div>
    </div>
  );
}
export function RightPanel() {
  const { sim: s, selected, select, recover } = useLab();
  const [tab, setTab] = useState('processes');
  const lesson = lessons[s.algorithm];
  const process = selected === null ? null : s.processes[selected];
  return (
    <aside className="right-panel panel">
      <div className="panel-heading">
        <span>
          <Activity size={16} /> Live inspector
        </span>
        <span className="micro">REAL-TIME</span>
      </div>
      <Metrics />
      <div className="tabs">
        <button className={tab === 'processes' ? 'active' : ''} onClick={() => setTab('processes')}>
          Processes
        </button>
        <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>
          Pseudocode
        </button>
      </div>
      {tab === 'processes' ? (
        <div className="process-list">
          {s.processes.map((p) => (
            <button
              key={p.id}
              className={`process-row ${selected === p.id ? 'selected' : ''}`}
              onClick={() => select(p.id)}
            >
              <span
                className="process-avatar"
                style={{ color: colors[p.state], background: `${colors[p.state]}15` }}
              >
                P{p.id + 1}
              </span>
              <span>
                <b>{p.role === 'Process' ? `Process ${p.id + 1}` : p.role}</b>
                <small>
                  {s.algorithm === 'race'
                    ? `local value: ${p.local}`
                    : `${p.history.length} transitions`}
                </small>
              </span>
              <span className="state" style={{ color: colors[p.state] }}>
                {p.state === 'CRITICAL' ? 'IN SECTION' : p.state}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="code">
          {lesson.code.map((line, i) => (
            <div key={i} className={s.line === i + 1 ? 'current' : ''}>
              <span>{i + 1}</span>
              <code>{line}</code>
            </div>
          ))}
        </div>
      )}
      {process && (
        <div className="selection">
          <div>
            <strong>P{process.id + 1} inspection</strong>
            <button title="Close inspection" onClick={() => select(null)}>
              <X size={13} />
            </button>
          </div>
          <p>{process.history.at(-1) || 'Ready for its first scheduled operation.'}</p>
          <small>History: {process.history.slice(-4).join(' → ') || 'No transitions yet'}</small>
        </div>
      )}
      <div className="queue">
        <span>
          WAITING QUEUE <b>{s.waiting.length}</b>
        </span>
        <div>
          {s.waiting.length ? (
            s.waiting.map((id) => <i key={id}>P{id + 1}</i>)
          ) : (
            <small>No blocked processes</small>
          )}
        </div>
      </div>
      <div className="owner">
        <LockKeyhole size={15} />
        <span>
          {s.algorithm === 'binary'
            ? 'Permit holders (not enforced owners)'
            : 'Critical-section access'}
          <b>
            {s.owners.length
              ? s.owners.map((id) => `P${id + 1}`).join(', ')
              : s.deadlock
                ? 'Circular wait'
                : 'No active process'}
          </b>
        </span>
      </div>
      {s.deadlock && (
        <div className="deadlock-alert">
          <strong>Circular wait detected</strong>
          <p>All resources have one instance. Terminate a process to release its resources.</p>
          <select
            aria-label="Process to terminate"
            value={selected ?? 0}
            onChange={(e) => select(+e.target.value)}
          >
            {s.processes
              .filter((p) => p.state !== 'FINISHED')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  P{p.id + 1}
                </option>
              ))}
          </select>
          <button
            onClick={() =>
              recover(
                selected !== null && s.processes[selected].state !== 'FINISHED'
                  ? selected
                  : s.processes.find((p) => p.state !== 'FINISHED')!.id,
              )
            }
          >
            Terminate & recover
          </button>
        </div>
      )}
      <div className="insight">
        <Sparkles size={17} />
        <div>
          <b>
            {s.done
              ? 'Scenario complete'
              : s.deadlock
                ? 'Why the system stopped'
                : 'What’s happening?'}
          </b>
          <p>
            {s.events.at(-1)?.text ||
              'Press Start to run the scenario, or Step to inspect one operation at a time.'}
          </p>
        </div>
      </div>
    </aside>
  );
}
export function Configuration() {
  const { sim: s, configure } = useLab();
  return (
    <div className="configuration">
      <div className="count-control">
        <span>Processes</span>
        <button
          aria-label="Remove process"
          disabled={s.config.count <= 2 || s.algorithm === 'deadlock'}
          onClick={() => configure({ count: s.config.count - 1 })}
        >
          <Minus size={13} />
        </button>
        <b>{s.config.count}</b>
        <button
          aria-label="Add process"
          disabled={s.config.count >= 8 || s.algorithm === 'deadlock'}
          onClick={() => configure({ count: s.config.count + 1 })}
        >
          <Plus size={13} />
        </button>
      </div>
      {s.algorithm === 'race' && (
        <label className="switch-label">
          <input
            type="checkbox"
            checked={s.config.synchronized}
            onChange={(e) => configure({ synchronized: e.target.checked })}
          />{' '}
          Protect with mutex
        </label>
      )}
      {['counting', 'buffer'].includes(s.algorithm) && (
        <label>
          Capacity{' '}
          <select
            value={s.config.capacity}
            onChange={(e) => configure({ capacity: +e.target.value })}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      {s.algorithm === 'buffer' && (
        <>
          <label>
            Produce{' '}
            <select
              value={s.config.producerRate}
              onChange={(e) => configure({ producerRate: +e.target.value })}
            >
              {[0.5, 1, 2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </label>
          <label>
            Consume{' '}
            <select
              value={s.config.consumerRate}
              onChange={(e) => configure({ consumerRate: +e.target.value })}
            >
              {[0.5, 1, 2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {s.algorithm === 'readers' && (
        <select
          aria-label="Readers writers policy"
          value={s.config.writerPreference ? 'writer' : 'reader'}
          onChange={(e) => configure({ writerPreference: e.target.value === 'writer' })}
        >
          <option value="writer">Writer preference</option>
          <option value="reader">Reader preference</option>
        </select>
      )}
      {s.algorithm === 'deadlock' && (
        <label className="switch-label">
          <input
            type="checkbox"
            checked={s.config.safe}
            onChange={(e) => configure({ safe: e.target.checked })}
          />{' '}
          Resource ordering
        </label>
      )}
      <small>Changes reset the scenario</small>
    </div>
  );
}
export function Timeline() {
  const s = useLab((x) => x.sim);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="timeline panel">
      <div className="panel-heading">
        <span>
          <Terminal size={15} /> Execution timeline <b className="badge">{s.events.length}</b>
        </span>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Expand log'} <Maximize2 size={12} />
        </button>
      </div>
      <div className="timeline-track">
        {s.events.slice(-35).map((e, i) => (
          <div
            title={e.text}
            key={`${e.tick}-${i}`}
            style={{
              background:
                e.process === null
                  ? '#76849a'
                  : ['#57c6e8', '#a28aff', '#41d8af', '#ffc470'][e.process % 4],
            }}
          />
        ))}
        {!s.events.length && (
          <span>Every state transition leaves a trace. Start your simulation to see it here.</span>
        )}
      </div>
      <div className={`event-log ${expanded ? 'expanded' : ''}`}>
        {s.events.length ? (
          [...s.events]
            .reverse()
            .slice(0, expanded ? 200 : 3)
            .map((e, i) => (
              <div key={i}>
                <time>T+{String(e.tick).padStart(3, '0')}</time>
                <span>{e.text}</span>
                <Check size={12} />
              </div>
            ))
        ) : (
          <div>
            <time>T+000</time>
            <span>Engine initialized · deterministic round-robin event scheduling</span>
            <Check size={12} />
          </div>
        )}
      </div>
    </div>
  );
}
export function Theory({ algorithm, close }: { algorithm: Algorithm; close: () => void }) {
  const l = lessons[algorithm];
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <motion.section
        className="theory-modal"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theory-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-modal" aria-label="Close theory" onClick={close}>
          <X />
        </button>
        <span className="eyebrow">FIELD NOTES / {l.tag}</span>
        <h2 id="theory-title">{l.title}</h2>
        <p className="lead">{l.description}</p>
        <h3>A familiar analogy</h3>
        <p>{l.analogy}</p>
        <h3>Algorithm</h3>
        <div className="code">
          {l.code.map((line, i) => (
            <div key={i}>
              <span>{i + 1}</span>
              <code>{line}</code>
            </div>
          ))}
        </div>
        <div className="theory-columns">
          <div>
            <h3>Why it works</h3>
            <p>{l.advantage}</p>
          </div>
          <div>
            <h3>Limitations</h3>
            <p>{l.limitation}</p>
          </div>
        </div>
        <h3>Viva practice</h3>
        {l.viva.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
        <h3>Reading the state machine</h3>
        <p>
          READY means scheduled to request access. RUNNING means executing unprotected work or
          holding a partial resource set. WAITING means an acquisition was blocked. CRITICAL means
          admitted to protected work. DEADLOCKED marks a detected circular wait. FINISHED means this
          finite workload has completed (or was terminated during recovery).
        </p>
      </motion.section>
    </motion.div>
  );
}
