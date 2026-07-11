/**
 * Central balance sheet.
 *
 * Everything a designer might want to retune lives here as plain data, so the
 * economy can be rebalanced without touching a single line of game logic. The
 * engine reads these numbers; it never hard-codes them.
 */

export const BALANCE = {
  saveVersion: 4,

  // --- Grid --------------------------------------------------------------
  maxSlots: 9,
  /** Slot i unlocks when total energy earned this run reaches this threshold. */
  slotUnlockEnergy: [0, 350, 9_000, 250_000, 8e6, 3e8, 1e10, 5e11, 2e13],

  // --- Click -------------------------------------------------------------
  /** Base click power = fraction of current energy/second, plus a flat floor. */
  clickFractionOfPerSecond: 1.2, // a click is worth ~1.2s of production...
  clickFlatFloor: 1, // ...but never less than this.

  // --- Milestones --------------------------------------------------------
  milestoneLevels: [10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 750, 1000],
  milestoneMult: 2, // each milestone multiplies that cell's production by this
  evolveLevels: [50, 150, 300], // purely visual rank-up thresholds
  passiveLevel: 25,
  rankUpLevel: 100,

  // --- Crit --------------------------------------------------------------
  baseCritChance: 0.0,
  baseCritMult: 2.5,

  // --- Rebirth -----------------------------------------------------------
  /** Minimum energy earned in a run before Rebirth is allowed. */
  rebirthUnlockEnergy: 1e6,
  /** Core Fragments = fragmentMult * (log10(totalRunEnergy) - log10(base))^fragmentPow. */
  fragmentBase: 1e4,
  fragmentMult: 2.2,
  fragmentPow: 1.5,
  /** Each Core Fragment permanently multiplies global production by this factor. */
  fragmentGlobalBonus: 0.02, // +2% per fragment (diminishing via sqrt in engine)

  // --- Offline -----------------------------------------------------------
  offlineBaseEfficiency: 0.4, // 40% of online rate while away
  offlineBaseCapHours: 8,
  offlineMinSeconds: 30, // ignore trivially short absences

  // --- Anomaly events ----------------------------------------------------
  anomalyMinInterval: 55, // seconds
  anomalyMaxInterval: 120,
  anomalyTtl: 12, // seconds on screen
  anomalyUnlockEnergy: 2_000,

  // --- Loop --------------------------------------------------------------
  logicHz: 20, // fixed logic steps per second
  maxCatchUpSeconds: 1.0, // clamp huge dt (tab was backgrounded) to avoid spikes
  autosaveInterval: 15, // seconds

  // --- Cell type unlock thresholds (total energy earned this run) --------
  unlockEnergy: {
    amplifier: 350,
    pulse: 60_000,
    critical: 5e6,
    temporal: 4e8,
    converter: 1e11,
  },
} as const;

export type Balance = typeof BALANCE;
