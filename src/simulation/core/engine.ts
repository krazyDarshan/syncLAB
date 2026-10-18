import { detectCycle } from '../algorithms/deadlock';
export { detectCycle } from '../algorithms/deadlock';
import type { Algorithm, Status, Config, Simulation } from '../../types/simulation';
export type {
  Algorithm,
  Status,
  Config,
  Simulation,
  Process,
  Event,
  Scheduled,
} from '../../types/simulation';
export const defaults: Config = {
  count: 4,
  capacity: 3,
  synchronized: false,
  safe: false,
  writerPreference: true,
  producerRate: 1,
  consumerRate: 1,
};
export function initial(algorithm: Algorithm, config: Partial<Config> = {}): Simulation {
  const c = { ...defaults, ...config };
  c.count =
  algorithm === 'deadlock'
    ? 3
    : Math.max(2, Math.min(8, c.count));
  c.capacity = Math.max(1, Math.min(6, c.capacity));
  const processes = Array.from({ length: c.count }, (_, id) => ({
    id,
    state: 'READY' as Status,
    phase: 0,
    local: 0,
    role:
      algorithm === 'buffer'
        ? id % 2 === 0
          ? 'Producer'
          : 'Consumer'
        : algorithm === 'readers'
          ? id % 3 === 2
            ? 'Writer'
            : 'Reader'
          : 'Process',
    history: [],
  }));
  return {
    algorithm,
    config: c,
    processes,
    tick: 0,
    steps: 0,
    events: [],
    queue: processes.map((p) => ({ at: 0, process: p.id })),
    waiting: [],
    owners: [],
    counter: 0,
    buffer: [],
    produced: 0,
    consumed: 0,
    forks: Array(3).fill(null),
    deadlock: false,
    done: false,
    line: 0,
  };
}
export function advance(input: Simulation): Simulation {
  if (input.done || input.deadlock) return input;
  const s = structuredClone(input);
  const event = s.queue.shift();
  if (!event) {
    s.done = true;
    return s;
  }
  s.tick = Math.max(s.tick + 1, event.at);
  s.steps++;
  const p = s.processes[event.process];
  const log = (text: string, line: number) => {
    s.line = line;
    s.events.push({ tick: s.tick, process: p.id, text: `P${p.id + 1} · ${text}`, line });
    p.history.push(text);
    if (s.events.length > 200) s.events.shift();
  };
  const block = (why: string) => {
    p.state = 'WAITING';
    if (!s.waiting.includes(p.id)) s.waiting.push(p.id);
    log(why, 1);
  };
  const enter = () => {
    p.state = 'CRITICAL';
    s.owners.push(p.id);
    s.waiting = s.waiting.filter((id) => id !== p.id);
  };
  const leave = () => {
    s.owners = s.owners.filter((id) => id !== p.id);
    p.state = 'FINISHED';
  };
  const fair = () => s.waiting.length === 0 || s.waiting[0] === p.id;
  if (s.algorithm === 'race') {
    if (p.phase === 0) {
      if (s.config.synchronized && (s.owners.length > 0 || !fair()))
        block('blocked on the counter mutex');
      else {
        if (s.config.synchronized) enter();
        else p.state = 'RUNNING';
        p.local = s.counter;
        p.phase = 1;
        log(`READ counter = ${p.local}`, 2);
      }
    } else if (p.phase === 1) {
      p.local++;
      p.phase = 2;
      log(`COMPUTE local + 1 = ${p.local}`, 3);
    } else {
      s.counter = p.local;
      leave();
      p.phase = 3;
      log(`WRITE counter = ${s.counter}${s.config.synchronized ? ' · release mutex' : ''}`, 4);
    }
  } else if (['mutex', 'binary', 'counting'].includes(s.algorithm)) {
    const capacity = s.algorithm === 'counting' ? s.config.capacity : 1;
    if (p.phase === 0) {
      if (s.owners.length < capacity && fair()) {
        enter();
        p.phase = 1;
        log(
          s.algorithm === 'mutex'
            ? 'acquire(lock) · entered critical section'
            : 'wait(S) · permit acquired',
          2,
        );
      } else block('no permit available · joined FIFO queue');
    } else if (p.phase === 1) {
      p.phase = 2;
      log('executing protected work', 3);
    } else {
      leave();
      log(
        s.algorithm === 'mutex'
          ? 'release(lock) · next waiter may acquire'
          : 'signal(S) · permit returned',
        4,
      );
    }
  } else if (s.algorithm === 'buffer') {
    const producer = p.role === 'Producer';
    if (p.phase === 0) {
      if (s.owners.length) block('waiting for buffer mutex');
      else if (producer ? s.buffer.length >= s.config.capacity : s.buffer.length === 0)
        block(producer ? 'wait(empty) · buffer is full' : 'wait(full) · buffer is empty');
      else {
        enter();
        p.phase = 1;
        log(
          producer ? 'reserve empty slot · acquire mutex' : 'reserve full slot · acquire mutex',
          2,
        );
      }
    } else {
      if (producer) {
        s.buffer.push(++s.produced);
        log(`produce item ${s.produced} · signal(full) · release mutex`, 3);
      } else {
        s.consumed++;
        log(`consume item ${s.buffer.shift()} · signal(empty) · release mutex`, 4);
      }
      leave();
      p.phase = 0;
      p.local++;
      p.state =
        p.local >= 3 * s.processes.filter((q) => q.role !== p.role).length ? 'FINISHED' : 'READY';
    }
  } else if (s.algorithm === 'readers') {
    const writer = p.role === 'Writer',
      writerActive = s.owners.some((id) => s.processes[id].role === 'Writer');
    const writerWaiting = s.waiting.some((id) => s.processes[id].role === 'Writer');
    if (p.phase === 0) {
      if (
        writer
          ? s.owners.length === 0
          : !writerActive && (!s.config.writerPreference || !writerWaiting)
      ) {
        enter();
        p.phase = 1;
        log(writer ? 'exclusive write access granted' : 'shared read access granted', 2);
      } else
        block(writer ? 'writer waits for all readers to leave' : 'reader waits for writer policy');
    } else if (p.phase === 1) {
      p.phase = 2;
      log(writer ? 'updating shared data' : 'reading shared data concurrently', 3);
    } else {
      leave();
      s.waiting = s.waiting.filter((id) => id !== p.id);
      log('release data vault', 4);
    }
  } else {
    const n = s.processes.length;
    const left = p.id,
      right = (p.id + 1) % n;
    const first = s.config.safe ? Math.min(left, right) : left,
      second = s.config.safe ? Math.max(left, right) : right;
    if (p.phase < 2) {
      const fork = p.phase === 0 ? first : second;
      if (s.forks[fork] === null) {
        s.forks[fork] = p.id;
        p.phase++;
        p.state = p.phase === 2 ? 'CRITICAL' : 'RUNNING';
        if (p.phase === 2) s.owners.push(p.id);
        s.waiting = s.waiting.filter((id) => id !== p.id);
        log(
          `acquire resource R${fork + 1}${p.phase === 2 ? ' · all resources held' : ''}`,
          p.phase + 1,
        );
      } else block(`request R${fork + 1} · held by P${(s.forks[fork] ?? 0) + 1}`);
    } else {
      s.forks = s.forks.map((owner) => (owner === p.id ? null : owner));
      leave();
      log('finished work · released both resources', 4);
    }
    const requests = s.processes.map((q) =>
      q.state === 'WAITING'
        ? s.config.safe
          ? q.phase === 0
            ? Math.min(q.id, (q.id + 1) % n)
            : Math.max(q.id, (q.id + 1) % n)
          : q.phase === 0
            ? q.id
            : (q.id + 1) % n
        : -1,
    );
    if (detectCycle(s.forks, requests)) {
      s.deadlock = true;
      s.processes.forEach((q) => {
        if (q.state === 'WAITING') q.state = 'DEADLOCKED';
      });
      log('CIRCULAR WAIT detected · each resource has one instance', 5);
    }
  }
  if (p.state !== 'FINISHED') {
    let delay = 1;
    if (s.algorithm === 'buffer')
      delay = Math.round(
        4 / (p.role === 'Producer' ? s.config.producerRate : s.config.consumerRate),
      );
    s.queue.push({ at: s.tick + delay, process: p.id });
    s.queue.sort((a, b) => a.at - b.at);
  }
  s.done = s.processes.every((q) => q.state === 'FINISHED');
  assertInvariants(s);
  return s;
}
export function recover(input: Simulation, id: number): Simulation {
  const s = structuredClone(input);
  s.forks = s.forks.map((owner) => (owner === id ? null : owner));
  s.owners = s.owners.filter((owner) => owner !== id);
  s.waiting = s.waiting.filter((owner) => owner !== id);
  s.processes[id].state = 'FINISHED';
  s.queue = s.queue.filter((e) => e.process !== id);
  s.processes.forEach((p) => {
    if (p.state === 'DEADLOCKED') p.state = 'WAITING';
  });
  s.deadlock = false;
  s.events.push({
    tick: s.tick,
    process: id,
    text: `Recovery: terminate P${id + 1} and release its resources`,
    line: 4,
  });
  return s;
}
export function assertInvariants(s: Simulation) {
  if (['mutex', 'binary'].includes(s.algorithm) && s.owners.length > 1)
    throw Error('Mutual exclusion violated');
  if (s.algorithm === 'counting' && s.owners.length > s.config.capacity)
    throw Error('Capacity exceeded');
  if (s.buffer.length > s.config.capacity || s.buffer.length < 0)
    throw Error('Buffer bounds violated');
  if (
    s.algorithm === 'readers' &&
    s.owners.some((id) => s.processes[id].role === 'Writer') &&
    s.owners.length > 1
  )
    throw Error('Writer exclusivity violated');
  if (s.algorithm === 'race' && s.config.synchronized && s.owners.length > 1)
    throw Error('Counter mutex violated');
}
export function runToEnd(s: Simulation, limit = 1000) {
  while (!s.done && !s.deadlock && limit-- > 0) s = advance(s);
  return s;
}
