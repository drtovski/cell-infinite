import { Decimal, D, ZERO } from './decimal';
import type { CellType } from './types';
import { nextMilestone } from '../config/milestones';

/**
 * Pure economy formulas. No state, no side effects — just math that the engine
 * and UI both rely on, and that the unit tests pin down. Everything uses
 * Decimal so exponent towers never overflow a double.
 *
 * Cost model: acquiring level `n` costs `baseCost * growth^(n-1)`.
 *   - Placing a cell (reaching level 1) therefore costs `baseCost`.
 *   - The "next level" for a cell at level L costs `baseCost * growth^L`.
 */

export function effectiveGrowth(type: CellType, growthReduction: number): number {
  const clampReduction = Math.max(0, Math.min(0.9, growthReduction));
  return 1 + (type.costGrowth - 1) * (1 - clampReduction);
}

/** Cost to go from `currentLevel` to `currentLevel + 1`. */
export function nextLevelCost(type: CellType, currentLevel: number, growth: number): Decimal {
  return D(type.baseCost).mul(D(growth).pow(currentLevel));
}

/** Cost to place a fresh level-1 cell of this type. */
export function placementCost(type: CellType): Decimal {
  return D(type.baseCost);
}

/**
 * Total cost to buy `count` levels starting from `currentLevel`.
 * Uses the closed-form geometric series so buying 1e6 levels is O(1).
 */
export function bulkCost(
  type: CellType,
  currentLevel: number,
  count: number,
  growth: number,
): Decimal {
  if (count <= 0) return ZERO;
  const g = D(growth);
  const base = D(type.baseCost).mul(g.pow(currentLevel));
  if (growth === 1) return base.mul(count);
  // base * (g^count - 1) / (g - 1)
  return base.mul(g.pow(count).sub(1)).div(g.sub(1));
}

/**
 * Largest number of levels affordable with `energy`, starting at `currentLevel`.
 * Derived by inverting the geometric series with logarithms.
 */
export function maxAffordable(
  type: CellType,
  currentLevel: number,
  energy: Decimal,
  growth: number,
): number {
  const first = nextLevelCost(type, currentLevel, growth);
  if (energy.lt(first)) return 0;
  if (growth === 1) {
    return Math.floor(energy.div(first).toNumber());
  }
  // energy >= base*g^L*(g^n - 1)/(g-1)
  // => g^n <= 1 + energy*(g-1)/(base*g^L)
  const denom = D(type.baseCost).mul(D(growth).pow(currentLevel));
  const ratio = energy.mul(growth - 1).div(denom).add(1);
  let n = Math.max(0, Math.floor(ratio.log10() / Math.log10(growth)));
  // The logarithm can be off by one due to floating-point error near exact
  // boundaries. Correct it against the exact closed-form cost.
  while (n > 0 && bulkCost(type, currentLevel, n, growth).gt(energy)) n -= 1;
  while (bulkCost(type, currentLevel, n + 1, growth).lte(energy)) n += 1;
  return n;
}

/** How many levels until the next milestone (at least 1). */
export function levelsToNextMilestone(currentLevel: number): number {
  const m = nextMilestone(currentLevel);
  if (!m) return 1;
  return Math.max(1, m.level - currentLevel);
}

export interface PurchasePlan {
  count: number;
  cost: Decimal;
  affordable: boolean;
}

/** Resolve a buy-mode into a concrete count + cost, capped by affordability where relevant. */
export function planPurchase(
  type: CellType,
  currentLevel: number,
  energy: Decimal,
  mode: 'x1' | 'x10' | 'x25' | 'max' | 'milestone',
  growth: number,
): PurchasePlan {
  let desired: number;
  switch (mode) {
    case 'x1':
      desired = 1;
      break;
    case 'x10':
      desired = 10;
      break;
    case 'x25':
      desired = 25;
      break;
    case 'milestone':
      desired = levelsToNextMilestone(currentLevel);
      break;
    case 'max':
      desired = maxAffordable(type, currentLevel, energy, growth);
      break;
  }
  if (mode === 'max') {
    const count = desired;
    const cost = bulkCost(type, currentLevel, count, growth);
    return { count, cost, affordable: count > 0 };
  }
  const cost = bulkCost(type, currentLevel, desired, growth);
  return { count: desired, cost, affordable: energy.gte(cost) };
}
