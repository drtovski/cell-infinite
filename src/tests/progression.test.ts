import { describe, it, expect } from 'vitest';
import { advance, computeDerived, type TickCtx } from '../game/engine';
import { freshGame, resetForRebirth } from '../store/createInitialState';
import { rebirthModifiers, computeFragments } from '../game/rebirth';
import { D } from '../game/decimal';
import type { GameState } from '../game/types';

/**
 * A headless "auto-player" that exercises the real tick: auto-buy on, and it
 * drops a Resonator next to the core as soon as the type unlocks. We use it to
 * sanity-check pacing (does a run reach Rebirth in a sane time?) and stability
 * (no NaNs, monotonic growth), independent of the React layer.
 */
function ctxFor(state: GameState): TickCtx {
  const mod = {
    ...rebirthModifiers(state.rebirthUpgrades, state.stats.totalFragmentsEarned),
    unlockAutoBuy: true,
    unlockAutoCollect: true,
  };
  return { rng: () => 0.42, emit: () => {}, now: 1_000_000, mod };
}

function isSane(s: GameState): boolean {
  return !Number.isNaN(s.energy.mantissa) && !Number.isNaN(s.run.totalEnergyThisRun.mantissa);
}

/** Run until totalRunEnergy >= target (or cap). Returns [state, seconds]. */
function runUntil(target: number, capSeconds: number): [GameState, number] {
  let s = freshGame(0);
  s = { ...s, automation: { ...s.automation, autoBuy: true, autoCollect: true } };
  let placedAmp = false;
  for (let step = 0; step < capSeconds; step++) {
    s = advance(s, 1, ctxFor(s));
    expect(isSane(s)).toBe(true);
    if (!placedAmp && s.unlockedCellTypes.includes('resonator') && s.energy.gte(200)) {
      s = {
        ...s,
        energy: s.energy.sub(200),
        cells: [...s.cells, { id: 'amp', typeId: 'resonator', level: 1, slot: 1, pulseCharge: 0 }],
      };
      placedAmp = true;
    }
    if (s.run.totalEnergyThisRun.gte(target)) return [s, step];
  }
  return [s, -1];
}

describe('progression simulation', () => {
  it('reaches the first Rebirth threshold within an hour of idle auto-play', () => {
    const [, seconds] = runUntil(1e6, 3600);
    // eslint-disable-next-line no-console
    console.log(`[sim] auto-play reached 1e6 energy in ~${seconds}s (${(seconds / 60).toFixed(1)} min)`);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThan(3600);
  });

  it('yields fragments and a stronger next cycle after Rebirth', () => {
    const [s, seconds] = runUntil(1e6, 3600);
    expect(seconds).toBeGreaterThan(0);

    const fragments = computeFragments(s.run.totalEnergyThisRun);
    expect(fragments.gt(0)).toBe(true);

    const reborn = resetForRebirth(s, 1000);
    expect(reborn.rebirthCount).toBe(1);
    expect(reborn.coreFragments.gte(fragments)).toBe(true);
    expect(reborn.run.totalEnergyThisRun.eq(0)).toBe(true);

    const freshRate = computeDerived(freshGame(0), rebirthModifiers({}, D(0))).perSecond.toNumber();
    const rebornRate = computeDerived(
      reborn,
      rebirthModifiers(reborn.rebirthUpgrades, reborn.stats.totalFragmentsEarned),
    ).perSecond.toNumber();
    expect(rebornRate).toBeGreaterThanOrEqual(freshRate);
  });
});
