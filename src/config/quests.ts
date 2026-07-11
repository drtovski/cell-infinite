import type { QuestDef } from '../game/types';

/**
 * Quests come in two flavors:
 *  - `run` quests reset every Rebirth and drive the moment-to-moment goals.
 *  - `persistent` quests are lifetime achievements that grant permanent power.
 */
export const QUESTS: QuestDef[] = [
  // ---- Run quests -------------------------------------------------------
  {
    id: 'level-25',
    name: 'First Ascent',
    description: 'Raise any cell to level 25.',
    scope: 'run',
    goalKind: 'cellLevel',
    goalValue: 25,
    reward: { kind: 'flatEnergySeconds', value: 30 },
    icon: '▲',
  },
  {
    id: 'energy-100k',
    name: 'Kilowatt Dreams',
    description: 'Produce 100K energy in a single run.',
    scope: 'run',
    goalKind: 'energyThisRun',
    goalValue: 100_000,
    reward: { kind: 'energyMult', value: 2, duration: 30 },
    icon: '⚡',
  },
  {
    id: 'chain-3',
    name: 'Circuitry',
    description: 'Form a synergy chain of 3 compatible cells.',
    scope: 'run',
    goalKind: 'chainLength',
    goalValue: 3,
    reward: { kind: 'energyMult', value: 3, duration: 45 },
    icon: '⧉',
  },
  {
    id: 'crits-10',
    name: 'Lucky Streak',
    description: 'Trigger 10 critical payouts in a run.',
    scope: 'run',
    goalKind: 'crits',
    goalValue: 10,
    reward: { kind: 'flatEnergySeconds', value: 60 },
    icon: '✦',
  },
  {
    id: 'abilities-3',
    name: 'Hands On',
    description: 'Use active abilities 3 times in a run.',
    scope: 'run',
    goalKind: 'abilityUses',
    goalValue: 3,
    reward: { kind: 'energyMult', value: 2.5, duration: 30 },
    icon: '✳',
  },

  // ---- Persistent achievements -----------------------------------------
  {
    id: 'first-rebirth',
    name: 'Transcend',
    description: 'Perform your first Rebirth.',
    scope: 'persistent',
    goalKind: 'rebirths',
    goalValue: 1,
    reward: { kind: 'permanentGlobalMult', value: 1.5 },
    icon: '✷',
  },
  {
    id: 'five-cells',
    name: 'Architect',
    description: 'Operate 5 cells simultaneously.',
    scope: 'persistent',
    goalKind: 'cellCount',
    goalValue: 5,
    reward: { kind: 'permanentGlobalMult', value: 1.25 },
    icon: '▦',
  },
  {
    id: 'lifetime-1e12',
    name: 'Terawatt Titan',
    description: 'Earn 1T energy across all runs.',
    scope: 'persistent',
    goalKind: 'lifetimeEnergy',
    goalValue: 1e12,
    reward: { kind: 'permanentGlobalMult', value: 2 },
    icon: '★',
  },
  {
    id: 'idle-run',
    name: 'Set And Forget',
    description: 'Complete a Rebirth-eligible run without a single click.',
    scope: 'run',
    goalKind: 'clicks',
    goalValue: 0,
    reward: { kind: 'coreFragments', value: 3 },
    icon: '☾',
  },
];

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);
