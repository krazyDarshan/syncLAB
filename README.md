# SyncLab 3D

A local, interactive operating-systems synchronization laboratory built with React, TypeScript, Vite, Tailwind CSS, Three.js / React Three Fiber, Drei, Motion, Zustand, and Lucide.

## Run

Install Git and Node.js 24 (npm is included). Clone the repository and enter the project folder:

```powershell
git clone https://github.com/krazyDarshan/syncLAB.git
cd syncLAB
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173). There is no backend, account, API key, or remote asset dependency. After installation, the app runs offline while the local server is running.

```powershell
npm test          # Engine invariants and control tests
npm run build     # TypeScript check and production build to dist/
npm run preview   # Serve the production build locally
```

Commit `package-lock.json` with the source; use `npm ci` for reproducible installs.

## What is implemented

- **Race condition:** independently scheduled read/compute/write operations; deterministic lost updates; mutex protection; results computed by executing both variants of the actual engine.
- **Mutex:** owner, FIFO wait queue, acquisition, protected work, release, and handoff.
- **Binary semaphore:** zero/one permit accounting, blocking and signaling; notes distinguish permit holders from ownership enforcement. This workload pairs wait/signal within each worker; arbitrary cross-process signaling is explained rather than exposed as an unsafe manual action.
- **Counting semaphore:** configurable 1–6 permits and 2–8 processes, resource stations, and capacity enforcement.
- **Producer–consumer:** bounded FIFO conveyor, configurable capacity and relative worker rates, empty/full/mutex values including reservations, and balanced finite workloads even for odd process counts.
- **Readers–writers:** simultaneous readers, exclusive writers, and reader-preference/writer-preference admission policies.
- **Dining philosophers:** five philosophers, animated fork acquisition, guaranteed naive circular wait, and resource-ordering prevention.
- **Deadlock lab:** single-instance allocation/request graph with directed edges, cycle detection, and selected-process termination/recovery.
- **Presentation:** four guided scenes, Previous/Next navigation, and an automatic Run Demo sequence.
- **Learning:** theory notes, analogies, pseudocode highlighting, viva questions, limitations, live narration, inspection history, and an architecture overview.

Every experiment supports Start/Pause/Resume, one-event Step, Reset, and 0.25×–3× speed. Configuration changes reset the scenario explicitly. Click a process sphere or its inspector row to inspect it. Drag to orbit, scroll to zoom, and use camera buttons to switch presets or reset the view. On narrow screens, panels stack vertically.

## Architecture

```text
React UI ──commands──> Zustand store ──advance──> pure simulation engine
                           │                           │
                           │                 invariant checks + event history
                           └──── immutable snapshot ───┘
                                      │
                              React Three Fiber
                          meshes / sprites / animation
```

- `src/simulation/core/engine.ts`: typed processes, scheduled-event queue, logical clock, pure transitions, graph cycle detection, recovery, invariants, and deterministic run-to-end helper.
- `src/simulation/core/engine.test.ts`: parameterized invariant, replay, recovery, and playback-control tests.
- `src/store/useLab.ts`: shared state, commands, playback status, saved speed/reduced-motion settings.
- `src/components/3d/LabScene.tsx`: procedural meshes, texture-generated labels, camera interaction, FPS measurement, animated processes/forks, and 2D fallback.
- `src/components/SimulationPanels.tsx`: shared playback, configuration, metrics, timeline, inspector, and theory dialog.
- `src/data/lessons.ts`: teaching material and guided scene definitions.
- `src/App.tsx`: dashboard, navigation, simulation workspace, presentation sequence, comparisons, and architecture page.
- `src/styles/index.css`: responsive dark laboratory design and Tailwind entry point.

### Scheduling and correctness

The queue stores `(due tick, process ID)` events. Each transition consumes exactly one event. Equal due times preserve insertion order; workers reschedule after their operation. This is a deterministic educational scheduler, not a real CPU or kernel scheduler. No random values are used, so no seed is necessary: the same algorithm and configuration replay identically.

A logical tick is a scheduling unit, not a millisecond. Playback consumes one event every `850 / speed` milliseconds. Changing speed does not mutate logical state or alter the chosen interleaving. Buffer rate controls change worker rescheduling delays. Pause stops queue consumption; Step advances one event and stays paused. Reset reconstructs the initial state and clears history.

The bounded-buffer model atomically reserves the required empty/full permit and mutex when both are available. A producer's reservation is deducted from `empty` before insertion; a consumer's reservation is deducted from `full` before removal. Thus `empty + full` may temporarily be less than capacity while an item/slot is reserved. Item accounting remains `produced - consumed = occupancy`. Workload quotas balance total production with total consumption, including configurations with unequal worker populations.

Mutex/counting/binary admission is FIFO in this model. Real OS APIs can have other fairness contracts. Readers–writers preference policies illustrate admission; finite workloads cannot prove starvation freedom for infinite arrivals. Deadlock detection follows wait-for edges only for single-instance resources. **A cycle in a multiple-instance allocation graph does not by itself prove deadlock.** Recovery here terminates a process, releases resources, and resumes remaining work; rollback and operating-system resource cleanup are outside this model.

Event history retains the latest 200 structured events; each process retains its full history for the finite scenario. Step count and clock continue beyond this log window.

### Performance and accessibility

Procedural geometry; no downloaded models/fonts/textures, postprocessing, or dynamic shadows. Pixel density is capped at 1.5. Sprites dispose regenerated textures; playback intervals and demo timers are cleaned up. Speed controls also scale process and fork interpolation. Reduced motion and OS reduced-motion preference disable process interpolation; Step positions immediately reflect the logical state. WebGL failure falls back to accessible process buttons while the engine remains usable. An actual low-spec laptop should still be checked before the presentation; observed preview FPS is not a hardware-independent guarantee.

## Validation

`npm install`, `npm test` (22 tests), and `npm run build` were executed successfully during implementation. The tests cover mutex and binary limits, counting capacities, buffer bounds/accounting across odd/even counts and rates, reader/writer exclusivity under both policies, reproducible lost updates, deterministic replay, circular-wait detection, ordered prevention, recovery, and pause/step/reset/speed commands. `npm audit` reported zero vulnerabilities after the test dependency update.

Vite may report a large bundle warning because Three.js and the 3D stack are included. It is a build-size advisory; the app uses no heavyweight asset downloads.

See [PRESENTATION.md](PRESENTATION.md) for a short faculty demonstration and viva notes.

