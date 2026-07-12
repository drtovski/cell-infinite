import { Decimal, D, ZERO, clamp } from './decimal';
import { fmt } from './format';
import type {
  Anomaly,
  AnomalyKind,
  Buff,
  CellDerived,
  CellInstance,
  CellType,
  Derived,
  GameState,
  QuestDef,
  UnlockCondition,
} from './types';
import { CELL_TYPES, getCellType } from '../config/cells';
import { milestoneMultiplier } from '../config/milestones';
import { BALANCE } from '../config/balance';
import { ABILITY_MAP, ABILITIES } from '../config/abilities';
import { ANOMALY_REWARD, ANOMALY_TABLE } from '../config/events';
import { QUESTS } from '../config/quests';
import { neighborSlots, largestChain } from './grid';
import { computeFragments, type RebirthModifiers } from './rebirth';
import { effectiveGrowth, nextLevelCost } from './economy';
import type { EmitFn } from './effects';

export interface TickCtx {
  rng: () => number;
  emit: EmitFn;
  now: number;
  mod: RebirthModifiers;
}

function randRange(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function supportSummary(t: CellType, level: number): string {
  switch (t.role) {
    case 'amplifier':
      return `+${(t.ampPerLevel * level * 100).toFixed(0)}% to adjacent generators`;
    case 'pulse':
      return `burst every ${t.period}s · ${(t.payloadSecondsPerLevel * level).toFixed(1)}s payload`;
    case 'critical':
      return `+${(t.critChancePerLevel * level * 100).toFixed(1)}% crit · +${(t.critMultPerLevel * level).toFixed(2)}× crit`;
    case 'temporal':
      return `+${(t.speedPerLevel * level * 100).toFixed(1)}% speed · +${(t.adjBoostPerLevel * level * 100).toFixed(0)}% adjacent`;
    case 'converter':
      return `+${(t.globalPerLevel * level * 100).toFixed(0)}% global · boosts adjacent amps`;
    case 'quantum':
      return `+${(t.globalMultPerLevel * level * 100).toFixed(0)}% global (unstable)`;
    default:
      return '';
  }
}

export function isUnlocked(cond: UnlockCondition, state: GameState): boolean {
  switch (cond.kind) {
    case 'default':
      return true;
    case 'energy':
      return state.run.totalEnergyThisRun.gte(cond.amount);
    case 'lifetimeEnergy':
      return state.stats.lifetimeEnergy.gte(cond.amount);
    case 'rebirth':
      return state.rebirthCount >= cond.count;
    case 'upgrade':
      return (state.rebirthUpgrades[cond.id] ?? 0) > 0;
  }
}

// ---------------------------------------------------------------------------
// Derived stats
// ---------------------------------------------------------------------------

export function computeDerived(state: GameState, mod: RebirthModifiers): Derived {
  const cells = state.cells;
  const bySlot = new Map<number, CellInstance>();
  for (const c of cells) bySlot.set(c.slot, c);

  // --- global game speed -------------------------------------------------
  let speedMult = 1;
  for (const c of cells) {
    const t = getCellType(c.typeId);
    if (t.role === 'temporal') speedMult *= 1 + t.speedPerLevel * c.level;
  }
  const timeComp = state.abilities['time-compression'];
  if (timeComp && timeComp.activeRemaining > 0) speedMult *= ABILITY_MAP['time-compression'].magnitude;
  for (const b of state.buffs) if (b.kind === 'speed') speedMult *= b.value;

  // --- crit --------------------------------------------------------------
  let critChance = BALANCE.baseCritChance + mod.critChanceBonus;
  let critMult = BALANCE.baseCritMult + mod.critMultBonus;
  for (const c of cells) {
    const t = getCellType(c.typeId);
    if (t.role === 'critical') {
      critChance += t.critChancePerLevel * c.level;
      critMult += t.critMultPerLevel * c.level;
    }
  }
  const golden = state.abilities['golden-surge'];
  if (golden && golden.activeRemaining > 0) critChance = Math.max(critChance, 1);
  for (const b of state.buffs) if (b.kind === 'critChance') critChance += b.value;
  critChance = clamp(critChance, 0, 1);
  critMult = Math.max(1, critMult);
  const critEV = 1 + critChance * (critMult - 1);

  // --- amplifier effective bonus (converter boosts amplifiers) -----------
  const ampBonusBySlot = new Map<number, number>();
  for (const c of cells) {
    const t = getCellType(c.typeId);
    if (t.role !== 'amplifier') continue;
    let convBoost = 0;
    for (const ns of neighborSlots(c.slot)) {
      const nb = bySlot.get(ns);
      if (!nb) continue;
      const nt = getCellType(nb.typeId);
      if (nt.role === 'converter') convBoost += nt.synergyPerLevel * nb.level;
    }
    ampBonusBySlot.set(c.slot, t.ampPerLevel * c.level * (1 + convBoost));
  }

  // --- per-generator production ------------------------------------------
  const cellDerived: Record<string, CellDerived> = {};
  let base = ZERO;
  for (const c of cells) {
    const t = getCellType(c.typeId);
    if (t.role === 'generator') {
      let localMult = 1;
      for (const ns of neighborSlots(c.slot)) {
        const nb = bySlot.get(ns);
        if (!nb) continue;
        const nt = getCellType(nb.typeId);
        if (nt.role === 'amplifier') localMult += ampBonusBySlot.get(nb.slot) ?? 0;
        else if (nt.role === 'temporal') localMult += nt.adjBoostPerLevel * nb.level;
      }
      const mm = milestoneMultiplier(c.level, mod.milestonePower);
      const prod = D(t.baseProd).mul(c.level).mul(mm).mul(localMult);
      base = base.add(prod);
      cellDerived[c.id] = {
        cellId: c.id,
        production: prod,
        localMult,
        effectSummary: `${fmt(prod)}/s`,
      };
    } else {
      cellDerived[c.id] = {
        cellId: c.id,
        production: ZERO,
        localMult: 1,
        effectSummary: supportSummary(t, c.level),
      };
    }
  }

  // --- global multiplier -------------------------------------------------
  let globalMult = mod.globalMult.mul(state.permanentMult).mul(critEV);
  const oc = state.abilities['overclock'];
  if (oc && oc.activeRemaining > 0) globalMult = globalMult.mul(ABILITY_MAP['overclock'].magnitude);
  for (const c of cells) {
    const t = getCellType(c.typeId);
    if (t.role === 'converter') globalMult = globalMult.mul(1 + t.globalPerLevel * c.level);
    if (t.role === 'quantum') globalMult = globalMult.mul(1 + t.globalMultPerLevel * c.level);
  }
  for (const b of state.buffs) if (b.kind === 'globalMult') globalMult = globalMult.mul(b.value);

  // Chain synergy: a longer connected lattice multiplies everything.
  const occupied = new Set<number>(cells.map((c) => c.slot));
  const bestChain = largestChain(occupied);
  const chainMult = 1 + BALANCE.chainBonusPerCell * Math.max(0, bestChain - 1);
  globalMult = globalMult.mul(chainMult);

  const perSecond = base.mul(globalMult).mul(speedMult);
  const clickPower = Decimal.max(
    BALANCE.clickFlatFloor,
    perSecond.mul(BALANCE.clickFractionOfPerSecond),
  ).mul(mod.clickMult);

  const projectedFragments = computeFragments(state.run.totalEnergyThisRun);

  return {
    perSecond,
    basePerSecond: base,
    globalMult,
    clickPower,
    critChance,
    critMult,
    speedMult,
    cells: cellDerived,
    bestChain,
    projectedFragments,
  };
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

export function rollAnomalyKind(rng: () => number): AnomalyKind {
  const total = ANOMALY_TABLE.reduce((a, b) => a + b.weight, 0);
  let r = rng() * total;
  for (const def of ANOMALY_TABLE) {
    r -= def.weight;
    if (r <= 0) return def.kind;
  }
  return ANOMALY_TABLE[0].kind;
}

export function spawnAnomaly(rng: () => number, now: number): Anomaly {
  const kind = rollAnomalyKind(rng);
  return {
    id: `anomaly-${now}-${Math.floor(rng() * 1e6)}`,
    kind,
    x: 0.12 + rng() * 0.76,
    y: 0.12 + rng() * 0.76,
    ttl: BALANCE.anomalyTtl,
    bornAt: now,
  };
}

export interface AnomalyResolution {
  energyAdd: Decimal;
  buff: Buff | null;
  freeLevels: number;
  coreShards: number;
  label: string;
  hue: number;
}

export function resolveAnomaly(kind: AnomalyKind, derived: Derived, now: number): AnomalyResolution {
  const def = ANOMALY_REWARD[kind];
  let buff: Buff | null = null;
  if (kind === 'multiplier' || kind === 'supercharge') {
    buff = {
      id: `buff-${now}`,
      label: def.label,
      kind: 'globalMult',
      value: def.multiplier,
      remaining: def.duration,
      hue: def.hue,
    };
  }
  return {
    energyAdd: kind === 'instantEnergy' ? derived.perSecond.mul(def.instantSeconds) : ZERO,
    buff,
    freeLevels: def.freeLevels,
    coreShards: def.coreShards,
    label: def.label,
    hue: def.hue,
  };
}

/** Apply free levels to the highest-level generator (falls back to any cell). */
export function applyFreeLevels(cells: CellInstance[], amount: number): CellInstance[] {
  if (amount <= 0 || cells.length === 0) return cells;
  let targetIdx = -1;
  let bestLevel = -1;
  for (let i = 0; i < cells.length; i++) {
    const t = getCellType(cells[i].typeId);
    if (t.role === 'generator' && cells[i].level > bestLevel) {
      bestLevel = cells[i].level;
      targetIdx = i;
    }
  }
  if (targetIdx < 0) targetIdx = 0;
  const out = cells.slice();
  out[targetIdx] = { ...out[targetIdx], level: out[targetIdx].level + amount };
  return out;
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function questProgress(quest: QuestDef, state: GameState, derived: Derived): number {
  switch (quest.goalKind) {
    case 'cellLevel':
      return state.cells.reduce((m, c) => Math.max(m, c.level), 0);
    case 'energyThisRun':
      return Math.min(quest.goalValue, state.run.totalEnergyThisRun.toNumber());
    case 'lifetimeEnergy':
      return Math.min(quest.goalValue, state.stats.lifetimeEnergy.toNumber());
    case 'crits':
      return state.run.crits;
    case 'chainLength':
      return derived.bestChain;
    case 'rebirths':
      return state.rebirthCount;
    case 'cellCount':
      return state.cells.length;
    case 'abilityUses':
      return state.run.abilityUses;
    case 'clicks':
      return state.run.clicks;
  }
}

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

export function advance(state: GameState, dtRaw: number, ctx: TickCtx): GameState {
  const dt = Math.min(Math.max(0, dtRaw), BALANCE.maxCatchUpSeconds);
  if (dt <= 0) return state;

  const derived = computeDerived(state, ctx.mod);
  const speed = derived.speedMult;

  let energy = state.energy;
  let totalRun = state.run.totalEnergyThisRun;
  let lifetime = state.stats.lifetimeEnergy;
  let coreFragments = state.coreFragments;
  let totalFragmentsEarned = state.stats.totalFragmentsEarned;

  // --- continuous production --------------------------------------------
  const gain = derived.perSecond.mul(dt);
  energy = energy.add(gain);
  totalRun = totalRun.add(gain);
  lifetime = lifetime.add(gain);

  let cells = state.cells;

  // --- automation: auto-buy cheapest affordable levels ------------------
  if (ctx.mod.unlockAutoBuy && state.automation.autoBuy) {
    const working = cells.slice();
    let changed = false;
    let e = energy;
    let ops = 0;
    const maxOps = 40;
    while (ops < maxOps) {
      let bestIdx = -1;
      let bestCost: Decimal | null = null;
      for (let i = 0; i < working.length; i++) {
        const c = working[i];
        const t = getCellType(c.typeId);
        const g = effectiveGrowth(t, ctx.mod.growthReduction);
        const cost = nextLevelCost(t, c.level, g);
        if (e.gte(cost) && (bestCost === null || cost.lt(bestCost))) {
          bestCost = cost;
          bestIdx = i;
        }
      }
      if (bestIdx < 0 || bestCost === null) break;
      e = e.sub(bestCost);
      working[bestIdx] = { ...working[bestIdx], level: working[bestIdx].level + 1 };
      changed = true;
      ops += 1;
    }
    if (changed) {
      cells = working;
      energy = e;
    }
  }

  // --- pulse cells: charge and discharge --------------------------------
  const hasPulse = cells.some((c) => getCellType(c.typeId).role === 'pulse');
  if (hasPulse) {
    cells = cells.map((c) => {
      const t = getCellType(c.typeId);
      if (t.role !== 'pulse') return c;
      let charge = c.pulseCharge + (dt * speed) / t.period;
      let fires = 0;
      while (charge >= 1 && fires < 5) {
        charge -= 1;
        fires += 1;
      }
      if (fires > 0) {
        const payload = derived.perSecond.mul(t.payloadSecondsPerLevel * c.level * fires);
        energy = energy.add(payload);
        totalRun = totalRun.add(payload);
        lifetime = lifetime.add(payload);
        ctx.emit({ type: 'burst', slot: c.slot, hue: t.visual.hueA, text: `+${fmt(payload)}` });
      }
      return { ...c, pulseCharge: charge };
    });
  }

  // --- abilities: cooldown + active timers, and unlocks -----------------
  let abilities = state.abilities;
  let abilitiesDirty = false;
  const nextAbilities: GameState['abilities'] = {};
  for (const def of ABILITIES) {
    const a = state.abilities[def.id] ?? { cooldownRemaining: 0, activeRemaining: 0, unlocked: false };
    const unlocked = a.unlocked || isUnlocked(def.unlock, state);
    const activeRemaining = Math.max(0, a.activeRemaining - dt);
    const cooldownRemaining = Math.max(0, a.cooldownRemaining - dt);
    if (
      unlocked !== a.unlocked ||
      activeRemaining !== a.activeRemaining ||
      cooldownRemaining !== a.cooldownRemaining
    ) {
      abilitiesDirty = true;
    }
    if (unlocked && !a.unlocked) ctx.emit({ type: 'unlock', hue: def.hue });
    nextAbilities[def.id] = { unlocked, activeRemaining, cooldownRemaining };
  }
  if (abilitiesDirty) abilities = nextAbilities;

  // --- buffs -------------------------------------------------------------
  let buffs = state.buffs;
  if (buffs.length > 0) {
    buffs = buffs
      .map((b) => ({ ...b, remaining: b.remaining - dt }))
      .filter((b) => b.remaining > 0);
  }

  // --- anomaly lifecycle + spawn ----------------------------------------
  let anomaly = state.anomaly;
  let nextAnomalyIn = state.nextAnomalyIn;
  const anomalyUnlocked =
    lifetime.gte(BALANCE.anomalyUnlockEnergy) || totalRun.gte(BALANCE.anomalyUnlockEnergy);
  if (anomaly) {
    const ttl = anomaly.ttl - dt;
    anomaly = ttl <= 0 ? null : { ...anomaly, ttl };
  }
  if (!anomaly && anomalyUnlocked) {
    nextAnomalyIn -= dt;
    if (nextAnomalyIn <= 0) {
      anomaly = spawnAnomaly(ctx.rng, ctx.now);
      nextAnomalyIn = randRange(ctx.rng, BALANCE.anomalyMinInterval, BALANCE.anomalyMaxInterval);
      ctx.emit({ type: 'anomaly', x: anomaly.x, y: anomaly.y, hue: ANOMALY_REWARD[anomaly.kind].hue });
    }
  }

  // Auto-collect anomalies (requires the unlock + the toggle on).
  let anomaliesClaimed = state.stats.anomaliesClaimed;
  if (anomaly && ctx.mod.unlockAutoCollect && state.automation.autoCollect) {
    const res = resolveAnomaly(anomaly.kind, derived, ctx.now);
    energy = energy.add(res.energyAdd);
    totalRun = totalRun.add(res.energyAdd);
    lifetime = lifetime.add(res.energyAdd);
    if (res.buff) buffs = [...buffs, res.buff];
    if (res.freeLevels > 0) cells = applyFreeLevels(cells, res.freeLevels);
    if (res.coreShards > 0) {
      coreFragments = coreFragments.add(res.coreShards);
      totalFragmentsEarned = totalFragmentsEarned.add(res.coreShards);
    }
    ctx.emit({ type: 'anomalyClaim', hue: res.hue, text: res.label });
    anomaliesClaimed += 1;
    anomaly = null;
  }

  // --- slot unlocks ------------------------------------------------------
  let unlockedSlots = state.unlockedSlots;
  let naturalSlots = 1;
  for (let i = 1; i < BALANCE.slotUnlockEnergy.length; i++) {
    if (totalRun.gte(BALANCE.slotUnlockEnergy[i])) naturalSlots = i + 1;
  }
  const targetSlots = Math.min(BALANCE.maxSlots, Math.max(naturalSlots, unlockedSlots));
  if (targetSlots > unlockedSlots) {
    unlockedSlots = targetSlots;
    ctx.emit({ type: 'unlock' });
  }

  // --- cell type unlocks -------------------------------------------------
  let unlockedCellTypes = state.unlockedCellTypes;
  const newlyUnlocked: string[] = [];
  for (const t of CELL_TYPES) {
    if (unlockedCellTypes.includes(t.id)) continue;
    if (isUnlocked(t.unlock, state)) newlyUnlocked.push(t.id);
  }
  if (newlyUnlocked.length > 0) {
    unlockedCellTypes = [...unlockedCellTypes, ...newlyUnlocked];
    for (const id of newlyUnlocked) ctx.emit({ type: 'unlock', hue: getCellType(id).visual.hueA });
  }

  // --- stats -------------------------------------------------------------
  let bestPerSecond = state.stats.bestPerSecond;
  if (derived.perSecond.gt(bestPerSecond)) bestPerSecond = derived.perSecond;
  const maxCellLevel = cells.reduce((m, c) => Math.max(m, c.level), state.run.maxCellLevel);

  // --- quests + persistent achievement rewards --------------------------
  const derivedAfter =
    cells === state.cells ? derived : computeDerived({ ...state, cells }, ctx.mod);
  let quests = state.quests;
  let permanentMult = state.permanentMult;
  let questsDirty = false;
  const nextQuests: GameState['quests'] = {};
  for (const q of QUESTS) {
    const prev = state.quests[q.id] ?? { progress: 0, completed: false, claimed: false };
    if (q.id === 'idle-run') {
      // Resolved at Rebirth time, not here.
      nextQuests[q.id] = prev;
      continue;
    }
    const progress = questProgress(q, { ...state, cells, run: { ...state.run, crits: state.run.crits } }, derivedAfter);
    const completed = prev.completed || progress >= q.goalValue;
    let claimed = prev.claimed;
    if (q.scope === 'persistent' && completed && !claimed) {
      // Auto-grant persistent rewards.
      if (q.reward.kind === 'permanentGlobalMult') permanentMult = permanentMult.mul(q.reward.value);
      else if (q.reward.kind === 'coreFragments') {
        coreFragments = coreFragments.add(q.reward.value);
        totalFragmentsEarned = totalFragmentsEarned.add(q.reward.value);
      }
      claimed = true;
      ctx.emit({ type: 'unlock', text: q.name });
    }
    if (progress !== prev.progress || completed !== prev.completed || claimed !== prev.claimed) {
      questsDirty = true;
    }
    nextQuests[q.id] = { progress, completed, claimed };
  }
  if (questsDirty) quests = nextQuests;

  return {
    ...state,
    energy,
    coreFragments,
    permanentMult,
    cells,
    unlockedSlots,
    unlockedCellTypes,
    abilities,
    buffs,
    anomaly,
    nextAnomalyIn,
    quests,
    stats: {
      ...state.stats,
      lifetimeEnergy: lifetime,
      bestPerSecond,
      totalFragmentsEarned,
      anomaliesClaimed,
      playTime: state.stats.playTime + dt,
    },
    run: {
      ...state.run,
      totalEnergyThisRun: totalRun,
      maxCellLevel,
    },
    derived: derivedAfter,
  };
}
