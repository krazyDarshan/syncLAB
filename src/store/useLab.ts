import { create } from 'zustand';
import {
  initial,
  advance,
  recover,
  defaults,
  type Algorithm,
  type Config,
  type Simulation,
} from '../simulation/core/engine';
interface Store {
  sim: Simulation;
  running: boolean;
  speed: number;
  selected: number | null;
  visited: Algorithm[];
  reduced: boolean;
  setAlgorithm: (a: Algorithm) => void;
  configure: (c: Partial<Config>) => void;
  step: () => void;
  pulse: () => void;
  toggle: () => void;
  reset: () => void;
  setSpeed: (n: number) => void;
  select: (id: number | null) => void;
  recover: (id: number) => void;
  setReduced: (b: boolean) => void;
}
const read = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing */
  }
};
export const useLab = create<Store>((set, get) => ({
  sim: initial('race'),
  running: false,
  speed: Number(read('synclab-speed', '1')) || 1,
  selected: null,
  visited: [],
  reduced: read('synclab-motion', 'false') === 'true',
  setAlgorithm: (a) =>
    set((s) => ({
      sim: initial(a, { ...defaults }),
      running: false,
      selected: null,
      visited: [...new Set([...s.visited, a])],
    })),
  configure: (c) =>
    set((s) => ({
      sim: initial(s.sim.algorithm, { ...s.sim.config, ...c }),
      running: false,
      selected: null,
    })),
  step: () => set((s) => ({ sim: advance(s.sim), running: false })),
  pulse: () => {
    if (get().running)
      set((s) => {
        const sim = advance(s.sim);
        return { sim, running: !sim.done && !sim.deadlock };
      });
  },
  toggle: () => set((s) => ({ running: !s.running && !s.sim.done && !s.sim.deadlock })),
  reset: () =>
    set((s) => ({ sim: initial(s.sim.algorithm, s.sim.config), running: false, selected: null })),
  setSpeed: (n) => {
    const speed = Math.max(0.25, Math.min(3, n));
    save('synclab-speed', String(speed));
    set({ speed });
  },
  select: (selected) => set({ selected }),
  recover: (id) => set((s) => ({ sim: recover(s.sim, id), running: false })),
  setReduced: (reduced) => {
    save('synclab-motion', String(reduced));
    set({ reduced });
  },
}));
