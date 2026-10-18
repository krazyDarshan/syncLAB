import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initial,
  advance,
  runToEnd,
  assertInvariants,
  detectCycle,
  recover,
  type Algorithm,
} from './engine';
import { useLab } from '../../store/useLab';
function trace(algorithm: Algorithm, config: Parameters<typeof initial>[1] = {}) {
  let s = initial(algorithm, config);
  const states = [s];
  for (let i = 0; i < 1500 && !s.done && !s.deadlock; i++) {
    s = advance(s);
    assertInvariants(s);
    states.push(s);
  }
  return states;
}
describe('discrete-event synchronization invariants', () => {
  it('keeps exactly one mutex owner and hands off in FIFO order', () => {
    const states = trace('mutex', { count: 8 });
    expect(states.every((s) => s.owners.length <= 1)).toBe(true);
    expect(states.at(-1)!.done).toBe(true);
    expect(
      states
        .at(-1)!
        .events.filter((e) => e.text.includes('acquire(lock)'))
        .map((e) => e.process),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('keeps binary semaphore permits in [0,1]', () => {
    const states = trace('binary', { count: 8 });
    expect(states.every((s) => 1 - s.owners.length >= 0 && 1 - s.owners.length <= 1)).toBe(true);
    expect(states.at(-1)!.done).toBe(true);
  });
  it.each([1, 2, 3, 6])('never exceeds counting capacity %i', (capacity) => {
    const states = trace('counting', { count: 8, capacity });
    expect(states.every((s) => s.owners.length <= capacity)).toBe(true);
    expect(Math.max(...states.map((s) => s.owners.length))).toBe(Math.min(8, capacity));
    expect(states.at(-1)!.done).toBe(true);
  });
  it.each([1, 2, 6])(
    'preserves buffer bounds, semaphore reservations, and item accounting for capacity %i',
    (capacity) => {
      for (const count of [2, 3, 4, 7, 8])
        for (const producerRate of [0.5, 1, 2]) {
          const states = trace('buffer', { count, capacity, producerRate, consumerRate: 1 });
          for (const s of states) {
            expect(s.buffer.length).toBeGreaterThanOrEqual(0);
            expect(s.buffer.length).toBeLessThanOrEqual(capacity);
            expect(s.produced - s.consumed).toBe(s.buffer.length);
            expect(s.owners.length).toBeLessThanOrEqual(1);
            const ep = s.owners.filter((id) => s.processes[id].role === 'Producer').length;
            const fc = s.owners.filter((id) => s.processes[id].role === 'Consumer').length;
            expect(capacity - s.buffer.length - ep).toBeGreaterThanOrEqual(0);
            expect(s.buffer.length - fc).toBeGreaterThanOrEqual(0);
          }
          expect(states.at(-1)!.done).toBe(true);
          expect(states.at(-1)!.buffer).toEqual([]);
        }
    },
  );
  it.each([true, false])(
    'enforces reader/writer exclusivity with writer preference = %s',
    (writerPreference) => {
      const states = trace('readers', { count: 8, writerPreference });
      expect(
        states.every(
          (s) => !s.owners.some((id) => s.processes[id].role === 'Writer') || s.owners.length === 1,
        ),
      ).toBe(true);
      expect(states.some((s) => s.owners.length > 1)).toBe(true);
      expect(states.at(-1)!.done).toBe(true);
    },
  );
  it('reproduces a lost update, but a locked run preserves every increment', () => {
    for (let count = 2; count <= 8; count++) {
      const unsafe = runToEnd(initial('race', { count }));
      expect(unsafe.done).toBe(true);
      expect(unsafe.counter).toBe(1);
      const safe = runToEnd(initial('race', { count, synchronized: true }));
      expect(safe.counter).toBe(count);
      expect(safe.done).toBe(true);
    }
  });
  it('detects a guaranteed single-instance circular wait', () => {
    expect(detectCycle([0, 1, 2], [1, 2, 0])).toBe(true);
    expect(detectCycle([0, null, 2], [1, -1, 0])).toBe(false);
    const s = runToEnd(initial('deadlock'));
    expect(s.deadlock).toBe(true);
    expect(s.processes.every((p) => p.state === 'DEADLOCKED')).toBe(true);
    expect(advance(s)).toBe(s);
  });
  it.each(['deadlock'] as Algorithm[])(
    'avoids circular wait through resource ordering in %s',
    (algorithm) => {
      const s = runToEnd(initial(algorithm, { safe: true }));
      expect(s.deadlock).toBe(false);
      expect(s.done).toBe(true);
      expect(s.forks.every((f) => f === null)).toBe(true);
    },
  );
  it('deadlock recovery allows remaining work to complete', () => {
    for (const algorithm of ['deadlock'] as Algorithm[]) {
      const dead = runToEnd(initial(algorithm));
      expect(dead.deadlock).toBe(true);
      for (const p of dead.processes) {
        const s = runToEnd(recover(dead, p.id));
        expect(s.done).toBe(true);
        expect(s.deadlock).toBe(false);
        expect(s.forks.every((f) => f === null)).toBe(true);
      }
    }
  });
  it('is pure and replayable', () => {
    const a = initial('race');
    const original = structuredClone(a);
    advance(a);
    expect(a).toEqual(original);
    expect(trace('buffer')).toEqual(trace('buffer'));
  });
});
describe('shared controls', () => {
  beforeEach(() => {
    useLab.getState().setAlgorithm('mutex');
    useLab.getState().setSpeed(1);
  });
  it('pause freezes logical state; Step advances exactly one event and pauses', () => {
    const store = useLab.getState();
    store.pulse();
    expect(useLab.getState().sim.tick).toBe(0);
    store.toggle();
    store.pulse();
    expect(useLab.getState().sim.events).toHaveLength(1);
    store.toggle();
    store.pulse();
    expect(useLab.getState().sim.events).toHaveLength(1);
    store.step();
    expect(useLab.getState().sim.events).toHaveLength(2);
    expect(useLab.getState().running).toBe(false);
  });
  it('reset restores the initial state, clears history and stops playback', () => {
    const store = useLab.getState();
    store.toggle();
    store.pulse();
    store.reset();
    expect(useLab.getState().sim).toEqual(initial('mutex'));
    expect(useLab.getState().running).toBe(false);
  });
  it('speed changes timing without mutating logical state and clamps the supported range', () => {
    const before = useLab.getState().sim;
    useLab.getState().setSpeed(3);
    expect(useLab.getState().speed).toBe(3);
    expect(useLab.getState().sim).toBe(before);
    expect(850 / useLab.getState().speed).toBeLessThan(850);
    useLab.getState().setSpeed(0);
    expect(useLab.getState().speed).toBe(0.25);
    useLab.getState().setSpeed(10);
    expect(useLab.getState().speed).toBe(3);
  });
  it('timer playback scales with configured speed', () => {
    vi.useFakeTimers();
    const run = (speed: number) => {
      useLab.getState().reset();
      useLab.getState().setSpeed(speed);
      useLab.getState().toggle();
      const timer = setInterval(() => useLab.getState().pulse(), 850 / useLab.getState().speed);
      vi.advanceTimersByTime(3400);
      clearInterval(timer);
      return useLab.getState().sim.tick;
    };
    expect(run(2)).toBe(run(1) * 2);
    vi.useRealTimers();
  });
  it('changing configuration cancels playback and initializes a known state', () => {
    useLab.getState().toggle();
    useLab.getState().pulse();
    useLab.getState().configure({ count: 6 });
    expect(useLab.getState().running).toBe(false);
    expect(useLab.getState().sim.processes).toHaveLength(6);
    expect(useLab.getState().sim.tick).toBe(0);
  });
});
