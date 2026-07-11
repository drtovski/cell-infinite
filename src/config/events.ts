import type { AnomalyKind } from '../game/types';

export interface AnomalyDef {
  kind: AnomalyKind;
  weight: number;
  label: string;
  hue: number;
}

/**
 * Weighted table for the reward an anomaly grants when clicked. The actual
 * magnitudes are resolved in the engine so they scale with the player's
 * current production.
 */
export const ANOMALY_TABLE: AnomalyDef[] = [
  { kind: 'multiplier', weight: 30, label: 'Flux Surge', hue: 280 },
  { kind: 'instantEnergy', weight: 34, label: 'Energy Cache', hue: 190 },
  { kind: 'freeLevels', weight: 18, label: 'Overgrowth', hue: 140 },
  { kind: 'supercharge', weight: 12, label: 'Supercharge', hue: 45 },
  { kind: 'coreShard', weight: 6, label: 'Core Shard', hue: 48 },
];

export interface AnomalyReward {
  kind: AnomalyKind;
  multiplier: number;
  duration: number;
  instantSeconds: number;
  freeLevels: number;
  coreShards: number;
  label: string;
  hue: number;
}

/** Static reward parameters per kind; scaled by production at claim time. */
export const ANOMALY_REWARD: Record<AnomalyKind, Omit<AnomalyReward, 'kind'>> = {
  multiplier: { multiplier: 3, duration: 30, instantSeconds: 0, freeLevels: 0, coreShards: 0, label: 'Flux Surge ×3', hue: 280 },
  instantEnergy: { multiplier: 1, duration: 0, instantSeconds: 120, freeLevels: 0, coreShards: 0, label: 'Energy Cache', hue: 190 },
  freeLevels: { multiplier: 1, duration: 0, instantSeconds: 0, freeLevels: 10, coreShards: 0, label: '+10 Levels', hue: 140 },
  supercharge: { multiplier: 8, duration: 12, instantSeconds: 0, freeLevels: 0, coreShards: 0, label: 'Supercharge ×8', hue: 45 },
  coreShard: { multiplier: 1, duration: 0, instantSeconds: 0, freeLevels: 0, coreShards: 2, label: '+2 Core Fragments', hue: 48 },
};
