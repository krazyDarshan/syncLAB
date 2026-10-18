export type Algorithm =
  'race' | 'mutex' | 'binary' | 'counting' | 'buffer' | 'readers' | 'deadlock';
export type Status = 'READY' | 'RUNNING' | 'WAITING' | 'CRITICAL' | 'DEADLOCKED' | 'FINISHED';
export interface Process {
  id: number;
  state: Status;
  phase: number;
  local: number;
  role: string;
  history: string[];
}
export interface Config {
  count: number;
  capacity: number;
  synchronized: boolean;
  safe: boolean;
  writerPreference: boolean;
  producerRate: number;
  consumerRate: number;
}
export interface Event {
  tick: number;
  process: number | null;
  text: string;
  line: number;
}
export interface Scheduled {
  at: number;
  process: number;
}
export interface Simulation {
  algorithm: Algorithm;
  config: Config;
  processes: Process[];
  tick: number;
  steps: number;
  events: Event[];
  queue: Scheduled[];
  waiting: number[];
  owners: number[];
  counter: number;
  buffer: number[];
  produced: number;
  consumed: number;
  forks: (number | null)[];
  deadlock: boolean;
  done: boolean;
  line: number;
}
