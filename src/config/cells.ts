import type { CellType } from '../game/types';
import { BALANCE } from './balance';

/**
 * The cell catalogue. Each entry is pure data; the engine interprets `role`
 * and the role-specific fields to compute production and synergies. New cells
 * can be added here without touching the simulation.
 */
export const CELL_TYPES: CellType[] = [
  {
    id: 'ion-core',
    name: 'Ion Core',
    role: 'generator',
    rarity: 'common',
    description: 'The foundational generator. Steady, reliable energy output.',
    flavor: 'Every empire of light begins with a single stubborn spark.',
    baseCost: 10,
    costGrowth: 1.1,
    baseProd: 0.5,
    unlock: { kind: 'default' },
    visual: { hueA: 190, hueB: 210, ring: 'core' },
  },
  {
    id: 'resonator',
    name: 'Resonator',
    role: 'amplifier',
    rarity: 'uncommon',
    description: 'Amplifies the output of every orthogonally-adjacent generator.',
    flavor: 'It does not create energy. It convinces energy to try harder.',
    baseCost: 200,
    costGrowth: 1.13,
    ampPerLevel: 0.04,
    unlock: { kind: 'energy', amount: BALANCE.unlockEnergy.amplifier },
    visual: { hueA: 265, hueB: 285, ring: 'orbit' },
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    role: 'pulse',
    rarity: 'rare',
    description: 'Charges over time, then discharges a burst of stored production.',
    flavor: 'Patience, then thunder.',
    baseCost: 40_000,
    costGrowth: 1.15,
    period: 10,
    payloadSecondsPerLevel: 0.32,
    unlock: { kind: 'energy', amount: BALANCE.unlockEnergy.pulse },
    visual: { hueA: 45, hueB: 30, ring: 'pulse' },
  },
  {
    id: 'flux-node',
    name: 'Flux Node',
    role: 'generator',
    rarity: 'rare',
    description: 'A dense second-generation generator with far higher base output.',
    flavor: 'Where the Ion Core whispers, the Flux Node sings.',
    baseCost: 180_000,
    costGrowth: 1.12,
    baseProd: 240,
    unlock: { kind: 'energy', amount: 250_000 },
    visual: { hueA: 210, hueB: 235, ring: 'core' },
  },
  {
    id: 'crit-matrix',
    name: 'Crit Matrix',
    role: 'critical',
    rarity: 'epic',
    description: 'Grants global critical chance and critical multiplier.',
    flavor: 'Fortune, engineered.',
    baseCost: 3e6,
    costGrowth: 1.16,
    critChancePerLevel: 0.008,
    critMultPerLevel: 0.05,
    unlock: { kind: 'energy', amount: BALANCE.unlockEnergy.critical },
    visual: { hueA: 15, hueB: 40, ring: 'spark' },
  },
  {
    id: 'chronofield',
    name: 'Chronofield',
    role: 'temporal',
    rarity: 'epic',
    description: 'Accelerates global game speed and boosts adjacent cells.',
    flavor: 'It steals seconds from the future and spends them now.',
    baseCost: 2.5e8,
    costGrowth: 1.17,
    speedPerLevel: 0.015,
    adjBoostPerLevel: 0.03,
    unlock: { kind: 'energy', amount: BALANCE.unlockEnergy.temporal },
    visual: { hueA: 165, hueB: 185, ring: 'clock' },
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    role: 'converter',
    rarity: 'legendary',
    description: 'Supercharges adjacent amplifiers and adds a flat global bonus.',
    flavor: 'A conductor for the whole orchestra of cells.',
    baseCost: 8e10,
    costGrowth: 1.18,
    synergyPerLevel: 0.05,
    globalPerLevel: 0.02,
    unlock: { kind: 'energy', amount: BALANCE.unlockEnergy.converter },
    visual: { hueA: 140, hueB: 160, ring: 'prism' },
  },
  {
    id: 'quantum-rift',
    name: 'Quantum Rift',
    role: 'quantum',
    rarity: 'unstable',
    description: 'Unstable late-game cell. Huge, fluctuating global multiplier.',
    flavor: 'It should not work. It works anyway. Do not ask it questions.',
    baseCost: 1e6, // priced in a post-rebirth economy
    costGrowth: 1.2,
    globalMultPerLevel: 0.15,
    volatility: 0.3,
    unlock: { kind: 'upgrade', id: 'unlock-quantum' },
    visual: { hueA: 305, hueB: 275, ring: 'quantum' },
  },
];

export const CELL_TYPE_MAP: Record<string, CellType> = Object.fromEntries(
  CELL_TYPES.map((c) => [c.id, c]),
);

export function getCellType(id: string): CellType {
  const t = CELL_TYPE_MAP[id];
  if (!t) throw new Error(`Unknown cell type: ${id}`);
  return t;
}
