import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../save/serialize';
import { migrateSave } from '../save/migrate';
import { freshGame } from '../store/createInitialState';
import { computeOffline } from '../game/offline';
import { rebirthModifiers } from '../game/rebirth';
import { D } from '../game/decimal';

describe('save round-trip', () => {
  it('preserves large Decimals losslessly', () => {
    const g = freshGame(1000);
    g.energy = D('1.2345e120');
    g.stats.lifetimeEnergy = D('9.9e250');
    const restored = deserializeState(serializeState(g));
    expect(restored.energy.toString()).toBe(D('1.2345e120').toString());
    expect(restored.stats.lifetimeEnergy.toString()).toBe(D('9.9e250').toString());
    expect(restored.cells[0].typeId).toBe('ion-core');
  });

  it('recomputes derived on load', () => {
    const g = freshGame();
    const restored = deserializeState(serializeState(g));
    expect(restored.derived).toBeDefined();
    expect(restored.derived.perSecond.gt(0)).toBe(true);
  });
});

describe('migrateSave', () => {
  it('repairs an empty/garbage payload into a valid template', () => {
    const data = migrateSave({});
    const state = deserializeState(data);
    expect(state.cells.length).toBe(1);
    expect(state.unlockedCellTypes).toContain('ion-core');
  });

  it('fills missing fields while keeping provided ones', () => {
    const g = freshGame();
    const partial = serializeState(g) as unknown as Record<string, unknown>;
    delete partial.automation;
    delete partial.abilities;
    partial.energy = '12345';
    const migrated = migrateSave(partial);
    const state = deserializeState(migrated);
    expect(state.energy.toNumber()).toBe(12345);
    expect(state.automation).toBeDefined();
    expect(state.abilities).toBeDefined();
  });
});

describe('computeOffline', () => {
  it('ignores trivially short absences', () => {
    const g = freshGame();
    const mod = rebirthModifiers(g.rebirthUpgrades, g.stats.totalFragmentsEarned);
    expect(computeOffline(g, mod, 5)).toBeNull();
  });

  it('caps long absences and applies efficiency', () => {
    const g = freshGame();
    const mod = rebirthModifiers(g.rebirthUpgrades, g.stats.totalFragmentsEarned);
    const report = computeOffline(g, mod, 999_999)!;
    expect(report).not.toBeNull();
    expect(report.cappedByLimit).toBe(true);
    // capped at 8h default * efficiency 0.4
    const expected = report.perSecond.mul(8 * 3600).mul(0.4);
    expect(report.energy.toString()).toBe(expected.toString());
  });
});
