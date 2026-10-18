# SyncLab 3D — five-minute presentation

## Before presenting

1. Run `npm install` once, then `npm run dev`.
2. Open the printed URL in a WebGL-capable browser. Keep browser zoom at 100%.
3. Open **Presentation Mode** for manual pacing, or **Run Demo** for automatic playback at 1.5×. No network is required after dependencies are installed.
4. Use **Reset** before repeating a scenario. Use **Step** when explaining a transition.

## 0:00 — Introduce the project

“SyncLab makes OS synchronization observable. The 3D scene shows processes and resources, but correctness comes from a separate deterministic event engine.”

Point out the six state colors, inspector, event log, and speed controls.

## 0:30 — Race condition

Open Race Condition and Step through the first four reads. Each process reads zero. Continue through compute and write.

“Four increments should produce four. Every process writes one, so the final value is one. Three updates are lost because read-modify-write is not atomic.”

Open **Compare results**. Both results are actual engine runs: unlocked = 1, mutex-protected = 4. Select the protected execution if you want to replay it.

## 1:20 — Mutex solution

Move to Mutex. Start, then pause while P1 owns the chamber. The other processes appear in the queue.

“Only the owner executes protected work. Release allows the next FIFO waiter to enter. Our invariant rejects a state with two owners.”

Show Pseudocode and Step through a release. Mention that FIFO fairness here is a modeling choice, not a universal guarantee of every OS mutex.

## 2:10 — Producer–consumer

Move to Producer–Consumer. Show the conveyor and `empty`, `full`, and `mutex`. Make capacity one and production faster than consumption to make backpressure easier to observe.

“Producers cannot overfill the buffer, consumers cannot read an empty buffer, and the mutex serializes mutations. Reserved slots and items are reflected in the semaphore values before the actual update.”

Pause or Step to narrate a specific enqueue/dequeue. Configuration edits intentionally reset the example.

## 3:10 — Deadlock and recovery

Move to Deadlock Lab and run. Three workers acquire one resource each and request the next. Red request arrows complete a cycle with violet allocation arrows.

“All four Coffman conditions are present: mutual exclusion, hold and wait, no preemption, and circular wait. Each resource has one instance, so this cycle establishes deadlock.”

Select a process in the recovery box, click **Terminate & recover**, then Resume. Remaining workers finish.

“Recovery sacrifices a process. Prevention is different: resource ordering removes circular wait before it occurs.”

Toggle Resource ordering, run again, and show successful completion. Dining Philosophers provides the same idea with five forks.

## 4:15 — Architecture and correctness

Open **Theory & Algorithms**.

“UI commands enter the Zustand store. A pure transition consumes one scheduled event, changes process/resource state, checks invariants, and records history. Three.js renders the resulting snapshot; frame rate never decides who acquires a lock.”

Mention: TypeScript, deterministic replay, 22 automated tests, local-only execution, bounded pixel density, reduced motion, and WebGL fallback.

## Common viva answers

- **Mutex versus binary semaphore:** a mutex enforces ownership. A semaphore manages permits and may be signaled by a different process. This demo's binary workload pairs its operations; the theory explains general signaling.
- **Semaphore versus busy waiting:** blocking waiters can sleep instead of repeatedly polling a lock. This visualization revisits blocked requests as scheduled educational observations rather than consuming a real CPU spin loop.
- **Why can readers share?** Reads do not mutate the data; writers conflict with both readers and writers.
- **Does writer preference guarantee fairness?** No. A continuous stream of writers can starve readers, just as reader preference can starve writers.
- **Does every resource graph cycle prove deadlock?** Only under appropriate assumptions, such as the single-instance resources used here. Multiple-instance cases need further analysis.
- **Why not execute real threads in the browser?** A controlled event engine exposes otherwise nondeterministic interleavings and allows reproducible stepping. It models synchronization rules rather than emulating a kernel.
- **What changes when speed increases?** Wall-clock event frequency and interpolation speed; the deterministic event order and invariants remain unchanged.
