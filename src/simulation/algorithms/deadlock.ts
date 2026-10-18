// Single-instance wait-for graph cycle detection. Do not apply this alone to multiple-instance resource graphs.
export function detectCycle(forks: (number | null)[], requests: number[]): boolean {
  const edges = requests.map((r) => (r < 0 ? null : forks[r]));
  return edges.some((_, start) => {
    const seen = new Set<number>();
    let n: number | null = start;
    while (n !== null && n !== undefined) {
      if (seen.has(n)) return true;
      seen.add(n);
      n = edges[n];
    }
    return false;
  });
}
