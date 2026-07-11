import { ZERO, ONE } from '../game/decimal';
import type { GameState, AbilityState, QuestState } from '../game/types';
import { ABILITIES } from '../config/abilities';
import { QUESTS } from '../config/quests';
import { computeDerived } from '../game/engine';
import { rebirthModifiers, computeFragments } from '../game/rebirth';
import { START_SLOT } from '../game/grid';

const CENTER_SLOT = START_SLOT; // first slot to unlock (centre of the 3×3 grid)

function baseAbilities(): Record<string, AbilityState> {
  const out: Record<string, AbilityState> = {};
  for (const a of ABILITIES) out[a.id] = { cooldownRemaining: 0, activeRemaining: 0, unlocked: false };
  return out;
}

function baseQuests(prev?: GameState): Record<string, QuestState> {
  const out: Record<string, QuestState> = {};
  for (const q of QUESTS) {
    if (q.scope === 'persistent' && prev) {
      // Persistent achievements survive a Rebirth.
      out[q.id] = prev.quests[q.id] ?? { progress: 0, completed: false, claimed: false };
    } else {
      out[q.id] = { progress: 0, completed: false, claimed: false };
    }
  }
  return out;
}

/** Build the transient derived cache so the state is valid before the first tick. */
function withDerived(state: GameState): GameState {
  const mod = rebirthModifiers(state.rebirthUpgrades, state.stats.totalFragmentsEarned);
  return { ...state, derived: computeDerived(state, mod) };
}

/** A brand-new save. */
export function freshGame(now: number = Date.now()): GameState {
  const state: GameState = {
    energy: ZERO,
    coreFragments: ZERO,
    permanentMult: ONE,
    cells: [{ id: 'ion-core-1', typeId: 'ion-core', level: 1, slot: CENTER_SLOT, pulseCharge: 0 }],
    unlockedSlots: 1,
    unlockedCellTypes: ['ion-core'],
    rebirthUpgrades: {},
    rebirthCount: 0,
    abilities: baseAbilities(),
    quests: baseQuests(),
    achievements: {},
    automation: {
      autoCollect: false,
      autoBuy: false,
      autoBuyToMilestone: false,
      autoRebirth: false,
      autoRebirthThreshold: 50,
    },
    anomaly: null,
    nextAnomalyIn: 25,
    buffs: [],
    stats: {
      lifetimeEnergy: ZERO,
      totalClicks: 0,
      totalCrits: 0,
      totalRebirths: 0,
      totalFragmentsEarned: ZERO,
      bestPerSecond: ZERO,
      anomaliesClaimed: 0,
      playTime: 0,
      fastestRebirthSeconds: null,
    },
    run: {
      totalEnergyThisRun: ZERO,
      startedAt: now,
      clicks: 0,
      crits: 0,
      abilityUses: 0,
      maxCellLevel: 1,
    },
    selectedCellId: 'ion-core-1',
    buyMode: 'x1',
    createdAt: now,
    lastSaved: now,
    derived: undefined as unknown as GameState['derived'],
  };
  return withDerived(state);
}

/**
 * Produce the next-cycle state after a Rebirth. Meta-progress (fragments,
 * upgrades, achievements, stats) is preserved; the run itself is reset, but
 * upgrades can carry some energy forward and pre-unlock slots/cells.
 */
export function resetForRebirth(prev: GameState, now: number = Date.now()): GameState {
  const gained = computeFragments(prev.run.totalEnergyThisRun);
  const totalFragmentsEarned = prev.stats.totalFragmentsEarned.add(gained);
  const mod = rebirthModifiers(prev.rebirthUpgrades, totalFragmentsEarned);

  const keptEnergy = prev.energy.mul(mod.keepEnergyFrac);
  const startEnergy = keptEnergy.add(mod.startEnergy);

  const unlockedCellTypes = ['ion-core'];
  if (mod.unlockQuantum) unlockedCellTypes.push('quantum-rift');

  const runSeconds = (now - prev.run.startedAt) / 1000;
  const fastest =
    prev.stats.fastestRebirthSeconds === null
      ? runSeconds
      : Math.min(prev.stats.fastestRebirthSeconds, runSeconds);

  // The "no-click" run achievement resolves here.
  const quests = baseQuests(prev);
  if (prev.run.clicks === 0) {
    const idle = quests['idle-run'];
    if (idle && !idle.claimed) quests['idle-run'] = { progress: 1, completed: true, claimed: false };
  }

  const state: GameState = {
    ...prev,
    energy: startEnergy,
    coreFragments: prev.coreFragments.add(gained),
    cells: [{ id: `ion-core-${now}`, typeId: 'ion-core', level: 1, slot: CENTER_SLOT, pulseCharge: 0 }],
    unlockedSlots: Math.min(9, 1 + mod.extraSlots),
    unlockedCellTypes,
    rebirthCount: prev.rebirthCount + 1,
    abilities: baseAbilities(),
    quests,
    anomaly: null,
    nextAnomalyIn: 25,
    buffs: [],
    stats: {
      ...prev.stats,
      totalRebirths: prev.stats.totalRebirths + 1,
      totalFragmentsEarned,
      fastestRebirthSeconds: fastest,
    },
    run: {
      totalEnergyThisRun: ZERO,
      startedAt: now,
      clicks: 0,
      crits: 0,
      abilityUses: 0,
      maxCellLevel: 1,
    },
    selectedCellId: `ion-core-${now}`,
    lastSaved: now,
    derived: undefined as unknown as GameState['derived'],
  };
  return withDerived(state);
}
