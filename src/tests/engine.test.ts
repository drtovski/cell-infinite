import { describe, it, expect } from 'vitest';
import { advance, computeDerived, type TickCtx } from '../game/engine';
import { freshGame } from '../store/createInitialState';
import { rebirthModifiers } from '../game/rebirth';
import { D } from '../game/decimal';
import type { CellInstance, GameState } from '../game/types';

function ctx(): TickCtx {
  return { rng: () => 0.5, emit: () => {}, now: 0, mod: rebirthModifiers({}, D(0)) };
}

describe('advance', () => {
  it('produces energy from the base generator', () => {
    const g = freshGame();
    const after = advance(g, 1, ctx());
    // ion-core level 1 => 0.5/s
    expect(after.energy.toNumber()).toBeCloseTo(0.5, 6);
    expect(after.stats.lifetimeEnergy.toNumber()).toBeCloseTo(0.5, 6);
  });

  it('is frame-rate independent (one big step ~= many small steps)', () => {
    const g = freshGame();
    const big = advance(g, 1, ctx());

    let small: GameState = g;
    for (let i = 0; i < 10; i++) small = advance(small, 0.1, ctx());

    const diff = big.energy.sub(small.energy).abs().toNumber();
    expect(diff).toBeLessThan(1e-6);
  });

  it('clamps absurd delta times to avoid spikes', () => {
    const g = freshGame();
    const after = advance(g, 10_000, ctx());
    // dt is clamped to maxCatchUpSeconds (1s) => ~0.5 energy, not 5000.
    expect(after.energy.toNumber()).toBeLessThan(1);
  });
});

describe('synergy', () => {
  it('an adjacent amplifier increases generator output', () => {
    const g = freshGame();
    const baseline = computeDerived(g, rebirthModifiers({}, D(0))).perSecond.toNumber();

    // Place a level-10 Resonator next to the centre Ion Core (slot 4 -> neighbour 1).
    const amp: CellInstance = { id: 'amp1', typeId: 'resonator', level: 10, slot: 1, pulseCharge: 0 };
    const withAmp: GameState = { ...g, cells: [...g.cells, amp] };
    const boosted = computeDerived(withAmp, rebirthModifiers({}, D(0))).perSecond.toNumber();

    expect(boosted).toBeGreaterThan(baseline);
  });

  it('largest chain reflects connected cells', () => {
    const g = freshGame();
    const cells: CellInstance[] = [
      { id: 'a', typeId: 'ion-core', level: 1, slot: 4, pulseCharge: 0 },
      { id: 'b', typeId: 'resonator', level: 1, slot: 1, pulseCharge: 0 },
      { id: 'c', typeId: 'resonator', level: 1, slot: 7, pulseCharge: 0 },
    ];
    const d = computeDerived({ ...g, cells }, rebirthModifiers({}, D(0)));
    expect(d.bestChain).toBe(3);
  });

  it('a longer connected chain adds a global multiplier', () => {
    const g = freshGame();
    // Pulsars have no passive effect on production or the global mult, so a
    // 3-chain isolates the chain bonus: globalMult == 1 + 0.06*(3-1) = 1.12.
    const cells: CellInstance[] = [
      { id: 'g', typeId: 'ion-core', level: 1, slot: 4, pulseCharge: 0 },
      { id: 'p1', typeId: 'pulsar', level: 1, slot: 3, pulseCharge: 0 },
      { id: 'p2', typeId: 'pulsar', level: 1, slot: 5, pulseCharge: 0 },
    ];
    const d = computeDerived({ ...g, cells }, rebirthModifiers({}, D(0)));
    expect(d.bestChain).toBe(3);
    expect(d.globalMult.toNumber()).toBeCloseTo(1.12, 6);
  });
});

describe('pulse cells', () => {
  it('accumulate charge and eventually burst', () => {
    const g = freshGame();
    const cells: CellInstance[] = [
      { id: 'gen', typeId: 'ion-core', level: 50, slot: 4, pulseCharge: 0 },
      { id: 'p', typeId: 'pulsar', level: 5, slot: 1, pulseCharge: 0.95 },
    ];
    let s: GameState = { ...g, cells };
    s = { ...s, derived: computeDerived(s, rebirthModifiers({}, D(0))) };
    const before = s.energy;
    // Advancing a full second should push the pulse over 1.0 and fire a burst.
    const after = advance(s, 1, ctx());
    expect(after.energy.gt(before)).toBe(true);
    const pulse = after.cells.find((c) => c.id === 'p')!;
    expect(pulse.pulseCharge).toBeLessThan(0.95);
  });
});
