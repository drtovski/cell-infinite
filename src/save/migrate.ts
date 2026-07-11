import type { SaveData } from './serialize';
import { serializeState } from './serialize';
import { freshGame } from '../store/createInitialState';
import { BALANCE } from '../config/balance';

/**
 * Bring any older or partial save up to the current schema.
 *
 * We build a fresh template save and deep-merge the loaded data over it. This
 * has two benefits: (1) fields added in later versions get sensible defaults,
 * and (2) a partially-corrupted save is repaired rather than rejected — any
 * missing key simply falls back to the fresh value. Version-specific
 * transforms can be slotted into the `switch` as the format evolves.
 */
export function migrateSave(raw: unknown): SaveData {
  const template = serializeState(freshGame());
  if (typeof raw !== 'object' || raw === null) {
    return template;
  }

  const data = raw as Partial<SaveData> & { version?: number };
  let version = typeof data.version === 'number' ? data.version : 0;

  // ----- version-specific migrations (run in ascending order) -----------
  // (No shipped legacy versions yet; hooks are here for the future.)
  while (version < BALANCE.saveVersion) {
    switch (version) {
      default:
        // Unknown/older: rely on the structural merge below.
        break;
    }
    version += 1;
  }

  const merged: SaveData = {
    ...template,
    ...data,
    version: BALANCE.saveVersion,
    stats: { ...template.stats, ...(data.stats ?? {}) },
    run: { ...template.run, ...(data.run ?? {}) },
    automation: { ...template.automation, ...(data.automation ?? {}) },
    abilities: { ...template.abilities, ...(data.abilities ?? {}) },
    quests: { ...template.quests, ...(data.quests ?? {}) },
    rebirthUpgrades: { ...template.rebirthUpgrades, ...(data.rebirthUpgrades ?? {}) },
    achievements: { ...template.achievements, ...(data.achievements ?? {}) },
    cells: Array.isArray(data.cells) && data.cells.length > 0 ? data.cells : template.cells,
    unlockedCellTypes:
      Array.isArray(data.unlockedCellTypes) && data.unlockedCellTypes.length > 0
        ? data.unlockedCellTypes
        : template.unlockedCellTypes,
    buffs: Array.isArray(data.buffs) ? data.buffs : template.buffs,
  };
  return merged;
}
