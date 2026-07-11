import type { AbilityDef } from '../game/types';

/**
 * Active abilities give the player something to *do* during idle stretches.
 * They unlock progressively so the early game stays calm, then opens up into
 * a light "rotation" for players who want to lean in.
 */
export const ABILITIES: AbilityDef[] = [
  {
    id: 'overclock',
    name: 'Overclock',
    description: '×6 global production for a short burst.',
    effect: 'overclock',
    duration: 15,
    cooldown: 120,
    magnitude: 6,
    unlock: { kind: 'energy', amount: 20_000 },
    icon: '⏫',
    hue: 190,
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    description: 'Instantly fully charge and detonate every Pulsar.',
    effect: 'chainReaction',
    duration: 0,
    cooldown: 90,
    magnitude: 1,
    unlock: { kind: 'energy', amount: 200_000 },
    icon: '⟿',
    hue: 45,
  },
  {
    id: 'golden-surge',
    name: 'Golden Surge',
    description: 'Guaranteed critical production for a short window.',
    effect: 'goldenSurge',
    duration: 10,
    cooldown: 150,
    magnitude: 1,
    unlock: { kind: 'energy', amount: 1e7 },
    icon: '✵',
    hue: 48,
  },
  {
    id: 'time-compression',
    name: 'Time Compression',
    description: '×4 game speed for a short window.',
    effect: 'timeCompression',
    duration: 10,
    cooldown: 180,
    magnitude: 4,
    unlock: { kind: 'energy', amount: 5e8 },
    icon: '⧖',
    hue: 165,
  },
];

export const ABILITY_MAP: Record<string, AbilityDef> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a]),
);
