import { describe, it, expect } from 'vitest';
import { D } from '../game/decimal';
import { computeFragments, canRebirth, rebirthModifiers } from '../game/rebirth';

describe('computeFragments', () => {
  it('is zero below the unlock threshold', () => {
    expect(computeFragments(D(1e5)).toNumber()).toBe(0);
  });

  it('rewards fragments at the first rebirth threshold', () => {
    expect(computeFragments(D(1e6)).toNumber()).toBeGreaterThan(0);
  });

  it('grows with orders of magnitude', () => {
    const a = computeFragments(D(1e9)).toNumber();
    const b = computeFragments(D(1e12)).toNumber();
    const c = computeFragments(D(1e18)).toNumber();
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(Number.isInteger(a)).toBe(true);
  });

  it('canRebirth gates on the unlock energy', () => {
    expect(canRebirth(D(999_999))).toBe(false);
    expect(canRebirth(D(1e6))).toBe(true);
  });
});

describe('rebirthModifiers', () => {
  it('defaults are neutral', () => {
    const m = rebirthModifiers({}, D(0));
    expect(m.globalMult.toNumber()).toBeCloseTo(1, 6);
    expect(m.clickMult.toNumber()).toBe(1);
    expect(m.milestonePower).toBe(1);
    expect(m.unlockAutoBuy).toBe(false);
  });

  it('applies purchased upgrade levels', () => {
    const m = rebirthModifiers({ 'global-mult': 4, 'click-mult': 3, 'auto-collect': 1 }, D(0));
    expect(m.globalMult.toNumber()).toBeCloseTo(Math.pow(1.25, 4), 4);
    expect(m.clickMult.toNumber()).toBe(8); // 2^3
    expect(m.unlockAutoCollect).toBe(true);
  });

  it('lifetime fragments give a passive multiplier', () => {
    const m = rebirthModifiers({}, D(100));
    // 1 + 0.02 * sqrt(100) = 1.2
    expect(m.globalMult.toNumber()).toBeCloseTo(1.2, 4);
  });
});
