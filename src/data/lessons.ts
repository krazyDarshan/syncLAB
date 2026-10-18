import type { Algorithm } from '../simulation/core/engine';
export interface Lesson {
  title: string;
  short: string;
  subtitle: string;
  tag: string;
  description: string;
  analogy: string;
  code: string[];
  advantage: string;
  limitation: string;
  viva: [string, string][];
}
export const lessons: Record<Algorithm, Lesson> = {
  race: {
    title: 'Race Condition',
    short: 'Race',
    subtitle: 'When timing changes the answer.',
    tag: '01 / THE PROBLEM',
    description:
      'A shared counter increment is a read, compute, and write sequence. Without atomicity, two processes can read the same value and overwrite each other’s updates.',
    analogy:
      'Two cashiers read the same stock count, sell an item, and both write the same new count.',
    code: [
      'if synchronized: acquire(lock)',
      'local = read(counter)',
      'local = local + 1',
      'write(counter, local); release_if_locked()',
    ],
    advantage:
      'The controlled interleaving makes lost updates reproducible. Compare it with the exact same workload protected by a mutex.',
    limitation:
      'This is a deliberately scheduled interleaving, not a model of every hardware memory ordering behavior.',
    viva: [
      [
        'Why is counter++ not atomic?',
        'It includes a read, arithmetic operation, and write; another process can interleave.',
      ],
      [
        'What fixes a lost update?',
        'Protect the entire read-modify-write operation with a lock or an atomic operation.',
      ],
    ],
  },
  mutex: {
    title: 'Mutex Lock',
    short: 'Mutex',
    subtitle: 'One room. One owner. No collisions.',
    tag: '02 / MUTUAL EXCLUSION',
    description:
      'A mutex serializes entry to a critical section. This simulator queues requests in FIFO order, and only the owning process releases the lock.',
    analogy:
      'A single key to a laboratory: the person who takes it returns it before the next person enters.',
    code: [
      'request(lock); block if unavailable',
      'acquire(lock)',
      'execute critical section',
      'release(lock)',
    ],
    advantage:
      'Guarantees mutual exclusion with a simple ownership rule. FIFO admission in this model prevents overtaking.',
    limitation:
      'Serialization reduces concurrency. Real mutexes do not universally promise FIFO fairness; locks can participate in deadlock.',
    viva: [
      ['Who may unlock a mutex?', 'The thread that owns it.'],
      [
        'What is a critical section?',
        'Code accessing shared state that must not execute concurrently with conflicting accesses.',
      ],
    ],
  },
  binary: {
    title: 'Binary Semaphore',
    short: 'Binary',
    subtitle: 'A signal that opens the gate.',
    tag: '03 / SIGNALING',
    description:
      'A binary semaphore has a value of zero or one. wait consumes an available permit; signal returns it. Unlike a mutex, a semaphore does not inherently enforce ownership.',
    analogy:
      'A traffic signal can be operated by a controller other than the driver who passed through it.',
    code: [
      'wait(S): block when S == 0',
      'S = 0; pass gate',
      'perform protected work',
      'signal(S): S = 1',
    ],
    advantage:
      'Supports coordination and signaling between different processes as well as one-at-a-time admission.',
    limitation:
      'This example pairs wait and signal in each worker. General signaling can be done by a different process; premature signals can break a mutual-exclusion protocol.',
    viva: [
      [
        'How is this different from a mutex?',
        'A semaphore has permits and no inherent owner. A mutex has an owner.',
      ],
      [
        'Is busy waiting required?',
        'No. A blocking implementation suspends waiters until a permit is available.',
      ],
    ],
  },
  counting: {
    title: 'Counting Semaphore',
    short: 'Counting',
    subtitle: 'Limited resources. Coordinated access.',
    tag: '04 / RESOURCE POOLS',
    description:
      'A counting semaphore starts with N permits. Each successful wait reserves one station, and signal returns it. No more than N processes can hold stations at once.',
    analogy:
      'A parking garage has a fixed number of spaces; arrivals wait when all spaces are occupied.',
    code: [
      'wait(S): queue when S == 0',
      'S = S - 1; acquire station',
      'use resource station',
      'S = S + 1; release station',
    ],
    advantage: 'Allows safe parallelism across a bounded resource pool.',
    limitation:
      'Permit accounting must be balanced. A missing signal can permanently reduce available capacity.',
    viva: [
      [
        'What does the initial value represent?',
        'The number of available instances of a resource.',
      ],
      ['Can several processes enter?', 'Yes, up to the configured permit capacity.'],
    ],
  },
  buffer: {
    title: 'Producer–Consumer',
    short: 'Buffer',
    subtitle: 'A balanced flow of work.',
    tag: '05 / BOUNDED BUFFER',
    description:
      'Producers add items to a bounded FIFO buffer and consumers remove them. empty counts free slots, full counts items, and mutex protects buffer updates.',
    analogy:
      'A bakery display has limited shelf space. Bakers wait when it is full; customers wait when it is empty.',
    code: [
      'wait(empty or full); block if unavailable',
      'reserve slot/item; wait(mutex)',
      'produce: enqueue; signal(full); signal(mutex)',
      'consume: dequeue; signal(empty); signal(mutex)',
    ],
    advantage:
      'Decouples production from consumption with backpressure. Each worker performs three operations per opposite-role worker, so total production and consumption are balanced.',
    limitation:
      'This engine atomically reserves a slot/item and mutex when both are available. Real code must preserve semaphore operation order and handle cancellation.',
    viva: [
      [
        'Why are three semaphores used?',
        'empty and full track capacity and items; mutex protects the shared queue.',
      ],
      [
        'What if mutex is acquired before waiting for empty?',
        'A producer can hold mutex while waiting for a consumer that needs mutex, causing deadlock.',
      ],
    ],
  },
  readers: {
    title: 'Readers–Writers',
    short: 'Readers',
    subtitle: 'Shared reads. Exclusive writes.',
    tag: '06 / ACCESS POLICIES',
    description:
      'Readers can share the data vault. A writer waits until all readers leave and then receives exclusive access. Toggle the policy to observe admission behavior.',
    analogy:
      'Many people can read a notice board, but an editor needs exclusive access to replace its contents.',
    code: [
      'request read or write access',
      'admit readers together OR one writer',
      'read shared data / modify exclusively',
      'release access; wake eligible waiters',
    ],
    advantage:
      'Improves concurrency for read-heavy workloads. Writer preference blocks new readers once a writer queues.',
    limitation:
      'Reader preference may starve writers with continuing arrivals; writer preference may starve readers. This finite workload completes and does not demonstrate unbounded starvation.',
    viva: [
      [
        'Can a reader overlap a writer?',
        'No. A writer must be exclusive from both other writers and readers.',
      ],
      [
        'Does writer preference imply fairness?',
        'No. Fairness needs an explicit admission policy that bounds waiting for both groups.',
      ],
    ],
  },
  deadlock: {
    title: 'Deadlock Lab',
    short: 'Deadlock',
    subtitle: 'Find the cycle. Break the wait.',
    tag: '08 / DIAGNOSE & RECOVER',
    description:
      'Three processes each hold a single-instance resource and request the next. Allocation edges point from resources to processes; request edges point from processes to resources.',
    analogy: 'Three trains occupy sections of a loop and each waits for the next occupied section.',
    code: [
      'request first resource',
      'allocate free resource',
      'request next resource; block if held',
      'complete and release / terminate to recover',
      'detect cycle → deadlock (single instances)',
    ],
    advantage:
      'Explicit wait-for graph detection and process termination demonstrate both diagnosis and recovery.',
    limitation:
      'A cycle is sufficient here because every resource has one instance. With multiple instances, a cycle alone does not prove deadlock. Termination may discard useful work.',
    viva: [
      [
        'What are the Coffman conditions?',
        'Mutual exclusion, hold and wait, no preemption, and circular wait.',
      ],
      [
        'How can recovery break deadlock?',
        'Terminate a process or safely preempt resources, then let waiting work continue.',
      ],
    ],
  },
};
export const algorithms = Object.keys(lessons) as Algorithm[];
export const colors: Record<string, string> = {
  READY: '#3974b8',
  RUNNING: '#258362',
  WAITING: '#a37524',
  CRITICAL: '#8b65ad',
  DEADLOCKED: '#bf6270',
  FINISHED: '#7b8580',
};
export const demoScenes: [Algorithm, string][] = [
  [
    'race',
    'Watch each process read the same value. Their writes overwrite one another: a lost update.',
  ],
  ['mutex', 'Now serialize access. Only the lock owner enters the chamber; everyone else queues.'],
  [
    'buffer',
    'Producers and consumers coordinate through a bounded FIFO buffer and three semaphores.',
  ],
  [
    'deadlock',
    'Follow the allocation and request arrows. A cycle locks all three processes; terminate one to recover.',
  ],
];
