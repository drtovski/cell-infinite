import { BALANCE } from './balance';
import type { Milestone } from '../game/types';

/**
 * Milestones are the same schedule for every cell (data-driven from BALANCE),
 * which keeps the mental model simple for the player: "every big round number
 * makes this cell meaningfully stronger". Special levels also carry flavor
 * (a passive unlock at 25, visual evolutions, a rank-up at 100).
 */
export const MILESTONES: Milestone[] = BALANCE.milestoneLevels.map((level) => {
  let kind: Milestone['kind'] = 'prodMult';
  let label = `×${BALANCE.milestoneMult} production`;
  if (level === BALANCE.passiveLevel) {
    kind = 'passive';
    label = `×${BALANCE.milestoneMult} production · passive attunement`;
  } else if (level === BALANCE.rankUpLevel) {
    kind = 'rankUp';
    label = `×${BALANCE.milestoneMult} production · RANK UP`;
  } else if ((BALANCE.evolveLevels as readonly number[]).includes(level)) {
    kind = 'evolve';
    label = `×${BALANCE.milestoneMult} production · evolution`;
  }
  return { level, kind, mult: BALANCE.milestoneMult, label };
});

const MILESTONE_LEVELS = MILESTONES.map((m) => m.level);

/** Cumulative production multiplier from every milestone reached at `level`. */
export function milestoneMultiplier(level: number, milestonePower: number): number {
  let count = 0;
  for (const l of MILESTONE_LEVELS) {
    if (level >= l) count += 1;
    else break;
  }
  // `milestonePower` (from rebirth) boosts the per-milestone factor.
  const perMilestone = BALANCE.milestoneMult * milestonePower;
  return Math.pow(perMilestone, count);
}

export function milestonesReached(level: number): number {
  let count = 0;
  for (const l of MILESTONE_LEVELS) {
    if (level >= l) count += 1;
    else break;
  }
  return count;
}

export function nextMilestone(level: number): Milestone | null {
  for (const m of MILESTONES) {
    if (level < m.level) return m;
  }
  return null;
}

/** The highest evolution stage reached (0..evolveLevels.length) for visuals. */
export function evolutionStage(level: number): number {
  let stage = 0;
  for (const l of BALANCE.evolveLevels) {
    if (level >= l) stage += 1;
  }
  if (level >= BALANCE.rankUpLevel) stage += 1;
  return stage;
}
