import { create } from 'zustand';
import type { BuyMode, GameState } from '../game/types';
import { fmt } from '../game/format';
import { advance, computeDerived, resolveAnomaly, applyFreeLevels } from '../game/engine';
import { rebirthModifiers, computeFragments, canRebirth, rebirthUpgradeCost } from '../game/rebirth';
import {
  effectiveGrowth,
  planPurchase,
  placementCost,
} from '../game/economy';
import { getCellType } from '../config/cells';
import { ABILITY_MAP } from '../config/abilities';
import { QUEST_MAP } from '../config/quests';
import { REBIRTH_UPGRADE_MAP } from '../config/rebirthUpgrades';
import { milestonesReached } from '../config/milestones';
import { fx } from '../game/effects';
import { freshGame, resetForRebirth } from './createInitialState';
import { loadGame, saveGame, clearSave, importSave } from '../save/storage';
import { computeOffline, type OfflineReport } from '../game/offline';

interface Actions {
  tick: (dt: number, now?: number) => void;
  applyCatchUp: (seconds: number) => void;
  bootstrap: () => void;
  clickCell: (cellId: string, x?: number, y?: number) => void;
  buyLevels: (cellId: string, mode?: BuyMode) => void;
  placeCell: (typeId: string, slot: number) => void;
  moveCell: (cellId: string, slot: number) => void;
  selectCell: (cellId: string | null) => void;
  setBuyMode: (mode: BuyMode) => void;
  activateAbility: (id: string) => void;
  claimAnomaly: (x?: number, y?: number) => void;
  claimQuest: (id: string) => void;
  buyRebirthUpgrade: (id: string) => void;
  doRebirth: () => void;
  setAutomation: (patch: Partial<GameState['automation']>) => void;
  saveNow: () => void;
  claimOffline: () => void;
  dismissOffline: () => void;
  hardReset: () => void;
  importFromString: (encoded: string) => boolean;
  replaceState: (state: GameState) => void;
}

export type GameStore = GameState & {
  pendingOffline: OfflineReport | null;
  initialized: boolean;
} & Actions;

function modOf(s: GameState) {
  return rebirthModifiers(s.rebirthUpgrades, s.stats.totalFragmentsEarned);
}

/** Recompute the derived cache after a structural change so the UI reacts instantly. */
function reDerive<T extends GameState>(s: T): T {
  return { ...s, derived: computeDerived(s, modOf(s)) };
}

export const useGame = create<GameStore>((set, get) => ({
  ...freshGame(),
  pendingOffline: null,
  initialized: false,

  // -----------------------------------------------------------------------
  bootstrap: () => {
    const loaded = loadGame();
    if (loaded) {
      const now = Date.now();
      const elapsed = (now - loaded.lastSaved) / 1000;
      const report = computeOffline(loaded, modOf(loaded), elapsed);
      set({ ...loaded, pendingOffline: report, initialized: true });
    } else {
      set({ ...freshGame(), initialized: true });
    }
  },

  tick: (dt, now = Date.now()) => {
    set((s) => {
      const mod = modOf(s);
      const next = advance(s, dt, { rng: Math.random, emit: fx.emit, now, mod });
      // Auto-rebirth check (kept out of the pure tick).
      if (
        mod.unlockAutoRebirth &&
        next.automation.autoRebirth &&
        canRebirth(next.run.totalEnergyThisRun) &&
        computeFragments(next.run.totalEnergyThisRun).gte(next.automation.autoRebirthThreshold)
      ) {
        fx.emit({ type: 'rebirth' });
        return reDerive(resetForRebirth(next, now));
      }
      return next;
    });
  },

  applyCatchUp: (seconds) => {
    set((s) => {
      const capped = Math.min(seconds, 3600); // in-session catch-up caps at 1h, full rate
      if (capped <= 0) return s;
      const amount = s.derived.perSecond.mul(capped);
      if (amount.lte(0)) return s;
      return {
        ...s,
        energy: s.energy.add(amount),
        run: { ...s.run, totalEnergyThisRun: s.run.totalEnergyThisRun.add(amount) },
        stats: { ...s.stats, lifetimeEnergy: s.stats.lifetimeEnergy.add(amount), playTime: s.stats.playTime + capped },
      };
    });
  },

  // -----------------------------------------------------------------------
  clickCell: (_cellId, x, y) => {
    set((s) => {
      const power = s.derived.clickPower;
      const crit = Math.random() < s.derived.critChance;
      const amount = crit ? power.mul(s.derived.critMult) : power;
      fx.emit({
        type: crit ? 'crit' : 'click',
        x,
        y,
        text: `+${fmt(amount)}`,
        hue: crit ? 48 : 190,
        intensity: crit ? 1 : 0.4,
      });
      return {
        ...s,
        energy: s.energy.add(amount),
        run: {
          ...s.run,
          totalEnergyThisRun: s.run.totalEnergyThisRun.add(amount),
          clicks: s.run.clicks + 1,
          crits: crit ? s.run.crits + 1 : s.run.crits,
        },
        stats: {
          ...s.stats,
          lifetimeEnergy: s.stats.lifetimeEnergy.add(amount),
          totalClicks: s.stats.totalClicks + 1,
          totalCrits: crit ? s.stats.totalCrits + 1 : s.stats.totalCrits,
        },
      };
    });
  },

  buyLevels: (cellId, mode) => {
    set((s) => {
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return s;
      const cell = s.cells[idx];
      const type = getCellType(cell.typeId);
      const m = mode ?? s.buyMode;
      const mod = modOf(s);
      const g = effectiveGrowth(type, mod.growthReduction);
      const plan = planPurchase(type, cell.level, s.energy, m, g);
      if (!plan.affordable || plan.count <= 0) return s;

      const before = milestonesReached(cell.level);
      const after = milestonesReached(cell.level + plan.count);
      const cells = s.cells.slice();
      cells[idx] = { ...cell, level: cell.level + plan.count };

      fx.emit({ type: 'buy', slot: cell.slot, hue: type.visual.hueA });
      if (after > before) fx.emit({ type: 'milestone', slot: cell.slot, hue: type.visual.hueB });

      return reDerive({ ...s, cells, energy: s.energy.sub(plan.cost) });
    });
  },

  placeCell: (typeId, slot) => {
    set((s) => {
      const type = getCellType(typeId);
      if (!s.unlockedCellTypes.includes(typeId)) return s;
      if (slot < 0 || slot >= s.unlockedSlots) return s;
      if (s.cells.some((c) => c.slot === slot)) return s;
      const cost = placementCost(type);
      if (s.energy.lt(cost)) return s;

      const id = `${typeId}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
      const cells = [...s.cells, { id, typeId, level: 1, slot, pulseCharge: 0 }];
      fx.emit({ type: 'buy', slot, hue: type.visual.hueA, intensity: 0.8 });
      return reDerive({ ...s, cells, energy: s.energy.sub(cost), selectedCellId: id });
    });
  },

  moveCell: (cellId, slot) => {
    set((s) => {
      if (slot < 0 || slot >= s.unlockedSlots) return s;
      if (s.cells.some((c) => c.slot === slot)) return s;
      const idx = s.cells.findIndex((c) => c.id === cellId);
      if (idx < 0) return s;
      const cells = s.cells.slice();
      cells[idx] = { ...cells[idx], slot };
      fx.emit({ type: 'buy', slot, hue: getCellType(cells[idx].typeId).visual.hueA, intensity: 0.5 });
      return reDerive({ ...s, cells });
    });
  },

  selectCell: (cellId) => set({ selectedCellId: cellId }),
  setBuyMode: (mode) => set({ buyMode: mode }),

  activateAbility: (id) => {
    set((s) => {
      const a = s.abilities[id];
      const def = ABILITY_MAP[id];
      if (!a || !a.unlocked || a.cooldownRemaining > 0) return s;

      let energy = s.energy;
      let totalRun = s.run.totalEnergyThisRun;
      let lifetime = s.stats.lifetimeEnergy;
      let cells = s.cells;

      if (def.effect === 'chainReaction') {
        const pulses = s.cells.filter((c) => getCellType(c.typeId).role === 'pulse');
        if (pulses.length === 0) return s; // nothing to detonate — don't waste it
        cells = s.cells.map((c) => {
          const t = getCellType(c.typeId);
          if (t.role !== 'pulse') return c;
          const payload = s.derived.perSecond.mul(t.payloadSecondsPerLevel * c.level * 3);
          energy = energy.add(payload);
          totalRun = totalRun.add(payload);
          lifetime = lifetime.add(payload);
          fx.emit({ type: 'burst', slot: c.slot, hue: t.visual.hueA });
          return { ...c, pulseCharge: 0 };
        });
      }

      const abilities = {
        ...s.abilities,
        [id]: {
          unlocked: true,
          activeRemaining: def.duration,
          cooldownRemaining: def.cooldown,
        },
      };
      fx.emit({ type: 'ability', hue: def.hue, intensity: 1 });

      return reDerive({
        ...s,
        cells,
        abilities,
        energy,
        run: { ...s.run, totalEnergyThisRun: totalRun, abilityUses: s.run.abilityUses + 1 },
        stats: { ...s.stats, lifetimeEnergy: lifetime },
      });
    });
  },

  claimAnomaly: (x, y) => {
    set((s) => {
      if (!s.anomaly) return s;
      const now = Date.now();
      const res = resolveAnomaly(s.anomaly.kind, s.derived, now);
      let cells = s.cells;
      if (res.freeLevels > 0) cells = applyFreeLevels(cells, res.freeLevels);
      fx.emit({ type: 'anomalyClaim', x, y, hue: res.hue, text: res.label, intensity: 1 });
      return reDerive({
        ...s,
        cells,
        anomaly: null,
        energy: s.energy.add(res.energyAdd),
        coreFragments: s.coreFragments.add(res.coreShards),
        buffs: res.buff ? [...s.buffs, res.buff] : s.buffs,
        run: { ...s.run, totalEnergyThisRun: s.run.totalEnergyThisRun.add(res.energyAdd) },
        stats: {
          ...s.stats,
          lifetimeEnergy: s.stats.lifetimeEnergy.add(res.energyAdd),
          anomaliesClaimed: s.stats.anomaliesClaimed + 1,
          totalFragmentsEarned: s.stats.totalFragmentsEarned.add(res.coreShards),
        },
      });
    });
  },

  claimQuest: (id) => {
    set((s) => {
      const q = QUEST_MAP[id];
      const qs = s.quests[id];
      if (!q || !qs || !qs.completed || qs.claimed) return s;
      let next = { ...s };
      const r = q.reward;
      if (r.kind === 'energyMult') {
        next.buffs = [
          ...s.buffs,
          { id: `quest-${id}-${Date.now()}`, label: q.name, kind: 'globalMult', value: r.value, remaining: r.duration, hue: 280 },
        ];
      } else if (r.kind === 'flatEnergySeconds') {
        const amount = s.derived.perSecond.mul(r.value);
        next.energy = s.energy.add(amount);
        next.run = { ...s.run, totalEnergyThisRun: s.run.totalEnergyThisRun.add(amount) };
        next.stats = { ...s.stats, lifetimeEnergy: s.stats.lifetimeEnergy.add(amount) };
      } else if (r.kind === 'coreFragments') {
        next.coreFragments = s.coreFragments.add(r.value);
        next.stats = { ...s.stats, totalFragmentsEarned: s.stats.totalFragmentsEarned.add(r.value) };
      } else if (r.kind === 'permanentGlobalMult') {
        next.permanentMult = s.permanentMult.mul(r.value);
      }
      next.quests = { ...s.quests, [id]: { ...qs, claimed: true } };
      fx.emit({ type: 'ability', hue: 140, intensity: 0.8 });
      return reDerive(next);
    });
  },

  buyRebirthUpgrade: (id) => {
    set((s) => {
      const def = REBIRTH_UPGRADE_MAP[id];
      if (!def) return s;
      const lvl = s.rebirthUpgrades[id] ?? 0;
      if (lvl >= def.maxLevel) return s;
      if (def.requires && (s.rebirthUpgrades[def.requires] ?? 0) < 1) return s;
      const cost = rebirthUpgradeCost(id, lvl);
      if (s.coreFragments.lt(cost)) return s;
      const rebirthUpgrades = { ...s.rebirthUpgrades, [id]: lvl + 1 };
      fx.emit({ type: 'ability', hue: 260, intensity: 0.7 });
      return reDerive({ ...s, coreFragments: s.coreFragments.sub(cost), rebirthUpgrades });
    });
  },

  doRebirth: () => {
    set((s) => {
      if (!canRebirth(s.run.totalEnergyThisRun)) return s;
      fx.emit({ type: 'rebirth', intensity: 1 });
      return reDerive(resetForRebirth(s));
    });
    get().saveNow();
  },

  setAutomation: (patch) => set((s) => ({ automation: { ...s.automation, ...patch } })),

  saveNow: () => {
    saveGame(get());
  },

  claimOffline: () => {
    set((s) => {
      const report = s.pendingOffline;
      if (!report) return { pendingOffline: null };
      fx.emit({ type: 'ability', hue: 190, intensity: 1 });
      return reDerive({
        ...s,
        energy: s.energy.add(report.energy),
        run: { ...s.run, totalEnergyThisRun: s.run.totalEnergyThisRun.add(report.energy) },
        stats: { ...s.stats, lifetimeEnergy: s.stats.lifetimeEnergy.add(report.energy) },
        pendingOffline: null,
      });
    });
  },

  dismissOffline: () => set({ pendingOffline: null }),

  hardReset: () => {
    clearSave();
    set({ ...freshGame(), pendingOffline: null, initialized: true });
  },

  importFromString: (encoded) => {
    const state = importSave(encoded);
    if (!state) return false;
    set({ ...state, pendingOffline: null, initialized: true });
    saveGame(get());
    return true;
  },

  replaceState: (state) => set({ ...state }),
}));
