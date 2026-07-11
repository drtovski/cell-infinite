export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

/** Orthogonal neighbours of a slot in the 3×3 lattice. */
export function neighborSlots(slot: number): number[] {
  const r = Math.floor(slot / GRID_COLS);
  const c = slot % GRID_COLS;
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * GRID_COLS + c);
  if (r < GRID_ROWS - 1) out.push((r + 1) * GRID_COLS + c);
  if (c > 0) out.push(r * GRID_COLS + (c - 1));
  if (c < GRID_COLS - 1) out.push(r * GRID_COLS + (c + 1));
  return out;
}

/** Size of the largest connected component among the occupied slots. */
export function largestChain(occupiedSlots: Set<number>): number {
  const seen = new Set<number>();
  let best = 0;
  for (const start of occupiedSlots) {
    if (seen.has(start)) continue;
    let size = 0;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const s = stack.pop()!;
      size += 1;
      for (const n of neighborSlots(s)) {
        if (occupiedSlots.has(n) && !seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    best = Math.max(best, size);
  }
  return best;
}
