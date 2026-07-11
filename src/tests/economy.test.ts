import { describe, it, expect } from 'vitest';
import { D } from '../game/decimal';
import {
  nextLevelCost,
  bulkCost,
  maxAffordable,
  planPurchase,
  effectiveGrowth,
} from '../game/economy';
import { getCellType } from '../config/cells';

const ion = getCellType('ion-core'); // baseCost 10, growth 1.1

describe('cost formulas', () => {
  it('closed-form bulk cost equals the naive sum', () => {
    const growth = ion.costGrowth;
    for (const start of [1, 5, 30]) {
      for (const count of [1, 7, 50]) {
        let naive = D(0);
        for (let k = 0; k < count; k++) {
          naive = naive.add(nextLevelCost(ion, start + k, growth));
        }
        const closed = bulkCost(ion, start, count, growth);
        // within 1e-6 relative error
        const rel = closed.sub(naive).abs().div(naive).toNumber();
        expect(rel).toBeLessThan(1e-6);
      }
    }
  });

  it('maxAffordable is the largest count that fits the budget', () => {
    const growth = ion.costGrowth;
    for (const n of [1, 10, 100, 1000]) {
      const budget = bulkCost(ion, 1, n, growth);
      const count = maxAffordable(ion, 1, budget, growth);
      // Enough to afford n, but not n+1.
      expect(bulkCost(ion, 1, count, growth).lte(budget)).toBe(true);
      expect(bulkCost(ion, 1, count + 1, growth).gt(budget)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(n);
    }
  });

  it('returns 0 affordable when broke', () => {
    expect(maxAffordable(ion, 1, D(0), ion.costGrowth)).toBe(0);
  });

  it('planPurchase respects buy modes', () => {
    const plan10 = planPurchase(ion, 1, D(1e9), 'x10', ion.costGrowth);
    expect(plan10.count).toBe(10);
    expect(plan10.affordable).toBe(true);

    const milestone = planPurchase(ion, 1, D(1e9), 'milestone', ion.costGrowth);
    expect(milestone.count).toBe(9); // level 1 -> milestone at 10

    const maxPlan = planPurchase(ion, 1, D(100), 'max', ion.costGrowth);
    expect(maxPlan.count).toBeGreaterThan(0);
  });
});

describe('effectiveGrowth', () => {
  it('reduces growth toward 1 as reduction rises', () => {
    expect(effectiveGrowth(ion, 0)).toBeCloseTo(1.1, 6);
    expect(effectiveGrowth(ion, 0.5)).toBeCloseTo(1.05, 6);
    expect(effectiveGrowth(ion, 1)).toBeCloseTo(1.01, 6); // clamped at 0.9 -> 1 + 0.1*0.1
  });
});
