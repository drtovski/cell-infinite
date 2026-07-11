import { D } from '../game/decimal';
import type { GameState } from '../game/types';
import { BALANCE } from '../config/balance';
import { computeDerived } from '../game/engine';
import { rebirthModifiers } from '../game/rebirth';

/**
 * The on-disk save shape. Decimals are stored as strings so that values beyond
 * 1e308 round-trip losslessly through JSON. `derived` is never persisted — it
 * is recomputed on load, which keeps saves small and forward-compatible.
 */
export interface SaveData {
  version: number;
  energy: string;
  coreFragments: string;
  permanentMult: string;
  cells: GameState['cells'];
  unlockedSlots: number;
  unlockedCellTypes: string[];
  rebirthUpgrades: Record<string, number>;
  rebirthCount: number;
  abilities: GameState['abilities'];
  quests: GameState['quests'];
  achievements: Record<string, boolean>;
  automation: GameState['automation'];
  buffs: GameState['buffs'];
  nextAnomalyIn: number;
  stats: {
    lifetimeEnergy: string;
    totalClicks: number;
    totalCrits: number;
    totalRebirths: number;
    totalFragmentsEarned: string;
    bestPerSecond: string;
    anomaliesClaimed: number;
    playTime: number;
    fastestRebirthSeconds: number | null;
  };
  run: {
    totalEnergyThisRun: string;
    startedAt: number;
    clicks: number;
    crits: number;
    abilityUses: number;
    maxCellLevel: number;
  };
  selectedCellId: string | null;
  buyMode: GameState['buyMode'];
  createdAt: number;
  lastSaved: number;
}

export function serializeState(state: GameState, now: number = Date.now()): SaveData {
  return {
    version: BALANCE.saveVersion,
    energy: state.energy.toString(),
    coreFragments: state.coreFragments.toString(),
    permanentMult: state.permanentMult.toString(),
    cells: state.cells,
    unlockedSlots: state.unlockedSlots,
    unlockedCellTypes: state.unlockedCellTypes,
    rebirthUpgrades: state.rebirthUpgrades,
    rebirthCount: state.rebirthCount,
    abilities: state.abilities,
    quests: state.quests,
    achievements: state.achievements,
    automation: state.automation,
    buffs: state.buffs,
    nextAnomalyIn: state.nextAnomalyIn,
    stats: {
      lifetimeEnergy: state.stats.lifetimeEnergy.toString(),
      totalClicks: state.stats.totalClicks,
      totalCrits: state.stats.totalCrits,
      totalRebirths: state.stats.totalRebirths,
      totalFragmentsEarned: state.stats.totalFragmentsEarned.toString(),
      bestPerSecond: state.stats.bestPerSecond.toString(),
      anomaliesClaimed: state.stats.anomaliesClaimed,
      playTime: state.stats.playTime,
      fastestRebirthSeconds: state.stats.fastestRebirthSeconds,
    },
    run: {
      totalEnergyThisRun: state.run.totalEnergyThisRun.toString(),
      startedAt: state.run.startedAt,
      clicks: state.run.clicks,
      crits: state.run.crits,
      abilityUses: state.run.abilityUses,
      maxCellLevel: state.run.maxCellLevel,
    },
    selectedCellId: state.selectedCellId,
    buyMode: state.buyMode,
    createdAt: state.createdAt,
    lastSaved: now,
  };
}

export function deserializeState(data: SaveData): GameState {
  const partial: GameState = {
    energy: D(data.energy),
    coreFragments: D(data.coreFragments),
    permanentMult: D(data.permanentMult),
    cells: data.cells,
    unlockedSlots: data.unlockedSlots,
    unlockedCellTypes: data.unlockedCellTypes,
    rebirthUpgrades: data.rebirthUpgrades,
    rebirthCount: data.rebirthCount,
    abilities: data.abilities,
    quests: data.quests,
    achievements: data.achievements,
    automation: data.automation,
    anomaly: null,
    nextAnomalyIn: data.nextAnomalyIn,
    buffs: data.buffs,
    stats: {
      lifetimeEnergy: D(data.stats.lifetimeEnergy),
      totalClicks: data.stats.totalClicks,
      totalCrits: data.stats.totalCrits,
      totalRebirths: data.stats.totalRebirths,
      totalFragmentsEarned: D(data.stats.totalFragmentsEarned),
      bestPerSecond: D(data.stats.bestPerSecond),
      anomaliesClaimed: data.stats.anomaliesClaimed,
      playTime: data.stats.playTime,
      fastestRebirthSeconds: data.stats.fastestRebirthSeconds,
    },
    run: {
      totalEnergyThisRun: D(data.run.totalEnergyThisRun),
      startedAt: data.run.startedAt,
      clicks: data.run.clicks,
      crits: data.run.crits,
      abilityUses: data.run.abilityUses,
      maxCellLevel: data.run.maxCellLevel,
    },
    selectedCellId: data.selectedCellId,
    buyMode: data.buyMode,
    createdAt: data.createdAt,
    lastSaved: data.lastSaved,
    derived: undefined as unknown as GameState['derived'],
  };
  const mod = rebirthModifiers(partial.rebirthUpgrades, partial.stats.totalFragmentsEarned);
  partial.derived = computeDerived(partial, mod);
  return partial;
}
