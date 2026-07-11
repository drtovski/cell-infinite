import type { Decimal } from './decimal';

// ---------------------------------------------------------------------------
// Cell configuration (data-driven)
// ---------------------------------------------------------------------------

export type CellRole =
  | 'generator'
  | 'amplifier'
  | 'pulse'
  | 'critical'
  | 'temporal'
  | 'converter'
  | 'quantum';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unstable';

/** How a cell type or grid slot becomes available. */
export type UnlockCondition =
  | { kind: 'default' }
  | { kind: 'energy'; amount: number } // total energy earned this run
  | { kind: 'lifetimeEnergy'; amount: number }
  | { kind: 'rebirth'; count: number }
  | { kind: 'upgrade'; id: string };

export interface CellVisual {
  /** Primary and secondary hues (HSL degrees) for the cell's energy gradient. */
  hueA: number;
  hueB: number;
  /** Ring style index selects the SVG ornamentation. */
  ring: 'orbit' | 'pulse' | 'spark' | 'clock' | 'prism' | 'quantum' | 'core';
}

interface CellTypeBase {
  id: string;
  name: string;
  role: CellRole;
  rarity: Rarity;
  description: string;
  flavor: string;
  /** Cost of the first level (placing the cell). Native number, widened to Decimal at runtime. */
  baseCost: number;
  /** Geometric cost growth per level. */
  costGrowth: number;
  unlock: UnlockCondition;
  visual: CellVisual;
}

export interface GeneratorType extends CellTypeBase {
  role: 'generator';
  /** Energy per second contributed per level, before multipliers. */
  baseProd: number;
}

export interface AmplifierType extends CellTypeBase {
  role: 'amplifier';
  /** Additive production bonus to each orthogonally-adjacent generator, per level. */
  ampPerLevel: number;
}

export interface PulseType extends CellTypeBase {
  role: 'pulse';
  /** Seconds between bursts (reduced by game speed). */
  period: number;
  /** Burst payload = payloadSecondsPerLevel * level * global production per second. */
  payloadSecondsPerLevel: number;
}

export interface CriticalType extends CellTypeBase {
  role: 'critical';
  critChancePerLevel: number; // additive fraction
  critMultPerLevel: number; // additive to crit multiplier
}

export interface TemporalType extends CellTypeBase {
  role: 'temporal';
  /** Global game-speed bonus per level. */
  speedPerLevel: number;
  /** Extra effective-level bonus to adjacent cells per level. */
  adjBoostPerLevel: number;
}

export interface ConverterType extends CellTypeBase {
  role: 'converter';
  /** Multiplies the effect of adjacent amplifiers, per level. */
  synergyPerLevel: number;
  /** Direct global production bonus per level. */
  globalPerLevel: number;
}

export interface QuantumType extends CellTypeBase {
  role: 'quantum';
  /** Global multiplier bonus per level (large). */
  globalMultPerLevel: number;
  /** Visual/EV volatility amplitude (0..1). Net expected value stays positive. */
  volatility: number;
}

export type CellType =
  | GeneratorType
  | AmplifierType
  | PulseType
  | CriticalType
  | TemporalType
  | ConverterType
  | QuantumType;

// ---------------------------------------------------------------------------
// Runtime cell instance (persisted)
// ---------------------------------------------------------------------------

export interface CellInstance {
  id: string;
  typeId: string;
  level: number;
  slot: number;
  /** 0..1 charge for pulse cells. */
  pulseCharge: number;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneKind = 'prodMult' | 'passive' | 'evolve' | 'synergy' | 'rankUp';

export interface Milestone {
  level: number;
  kind: MilestoneKind;
  /** Production multiplier granted at this milestone (1 if purely cosmetic/flavor). */
  mult: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Rebirth upgrades
// ---------------------------------------------------------------------------

export type RebirthEffectKind =
  | 'globalMult'
  | 'clickMult'
  | 'startEnergy'
  | 'offlineEfficiency'
  | 'offlineCap'
  | 'milestonePower'
  | 'critChance'
  | 'critMult'
  | 'unlockAutoCollect'
  | 'unlockAutoBuy'
  | 'unlockAutoRebirth'
  | 'keepEnergy'
  | 'unlockQuantum'
  | 'extraSlots'
  | 'cheaperLevels';

export interface RebirthUpgrade {
  id: string;
  name: string;
  description: string;
  effect: RebirthEffectKind;
  /** Effect magnitude per level (interpretation depends on effect). */
  perLevel: number;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  /** Optional prerequisite upgrade id. */
  requires?: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export type AbilityEffectKind = 'overclock' | 'chainReaction' | 'goldenSurge' | 'timeCompression';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  effect: AbilityEffectKind;
  duration: number; // seconds
  cooldown: number; // seconds
  magnitude: number; // multiplier or chance depending on effect
  unlock: UnlockCondition;
  icon: string;
  hue: number;
}

export interface AbilityState {
  cooldownRemaining: number;
  activeRemaining: number;
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Quests & achievements
// ---------------------------------------------------------------------------

export type QuestScope = 'run' | 'persistent';

export type QuestGoalKind =
  | 'cellLevel'
  | 'energyThisRun'
  | 'lifetimeEnergy'
  | 'crits'
  | 'chainLength'
  | 'rebirths'
  | 'clicks'
  | 'cellCount'
  | 'abilityUses';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  scope: QuestScope;
  goalKind: QuestGoalKind;
  goalValue: number;
  reward: QuestReward;
  icon: string;
}

export type QuestReward =
  | { kind: 'energyMult'; value: number; duration: number }
  | { kind: 'coreFragments'; value: number }
  | { kind: 'flatEnergySeconds'; value: number }
  | { kind: 'permanentGlobalMult'; value: number };

export interface QuestState {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

// ---------------------------------------------------------------------------
// Events (anomalies) & temporary buffs
// ---------------------------------------------------------------------------

export type AnomalyKind =
  | 'multiplier'
  | 'instantEnergy'
  | 'freeLevels'
  | 'coreShard'
  | 'supercharge';

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  /** Normalised position on the grid overlay (0..1). */
  x: number;
  y: number;
  ttl: number; // seconds left before it vanishes
  bornAt: number; // epoch ms
}

export interface Buff {
  id: string;
  label: string;
  kind: 'globalMult' | 'critChance' | 'speed';
  value: number;
  remaining: number;
  hue: number;
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

export interface AutomationState {
  autoCollect: boolean;
  autoBuy: boolean;
  autoBuyToMilestone: boolean;
  autoRebirth: boolean;
  autoRebirthThreshold: number; // rebirth once projected CF >= this
}

// ---------------------------------------------------------------------------
// Derived (recomputed, not persisted)
// ---------------------------------------------------------------------------

export interface CellDerived {
  cellId: string;
  production: Decimal; // energy/sec for generators (0 for support cells)
  localMult: number; // synergy multiplier applied from neighbours
  effectSummary: string;
}

export interface Derived {
  perSecond: Decimal;
  basePerSecond: Decimal;
  globalMult: Decimal;
  clickPower: Decimal;
  critChance: number;
  critMult: number;
  speedMult: number;
  cells: Record<string, CellDerived>;
  bestChain: number;
  projectedFragments: Decimal;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface Stats {
  lifetimeEnergy: Decimal;
  totalClicks: number;
  totalCrits: number;
  totalRebirths: number;
  totalFragmentsEarned: Decimal;
  bestPerSecond: Decimal;
  anomaliesClaimed: number;
  playTime: number; // seconds
  fastestRebirthSeconds: number | null;
}

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export type BuyMode = 'x1' | 'x10' | 'x25' | 'max' | 'milestone';

export interface RunState {
  totalEnergyThisRun: Decimal;
  startedAt: number; // epoch ms
  clicks: number;
  crits: number;
  abilityUses: number;
  maxCellLevel: number;
}

export interface GameState {
  energy: Decimal;
  coreFragments: Decimal;
  /** Permanent multiplier accumulated from persistent achievement rewards. */
  permanentMult: Decimal;

  cells: CellInstance[];
  unlockedSlots: number;
  unlockedCellTypes: string[];

  rebirthUpgrades: Record<string, number>;
  rebirthCount: number;

  abilities: Record<string, AbilityState>;
  quests: Record<string, QuestState>;
  achievements: Record<string, boolean>;

  automation: AutomationState;

  anomaly: Anomaly | null;
  nextAnomalyIn: number;
  buffs: Buff[];

  stats: Stats;
  run: RunState;

  selectedCellId: string | null;
  buyMode: BuyMode;

  createdAt: number;
  lastSaved: number;

  /** Recomputed each tick; never persisted. */
  derived: Derived;
}
