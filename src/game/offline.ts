import { Decimal } from './decimal';
import type { GameState } from './types';
import { computeDerived } from './engine';
import { BALANCE } from '../config/balance';
import type { RebirthModifiers } from './rebirth';

export interface OfflineReport {
  seconds: number;
  cappedSeconds: number;
  cappedByLimit: boolean;
  efficiency: number;
  capHours: number;
  perSecond: Decimal;
  energy: Decimal;
}

/**
 * Compute (but do not apply) the reward for an absence of `elapsedSeconds`.
 * Offline income is intentionally a fraction of online production and hard-capped,
 * so it feels like a warm welcome-back rather than a way to skip the game.
 */
export function computeOffline(
  state: GameState,
  mod: RebirthModifiers,
  elapsedSeconds: number,
): OfflineReport | null {
  if (elapsedSeconds < BALANCE.offlineMinSeconds) return null;

  const efficiency = Math.min(1, BALANCE.offlineBaseEfficiency + mod.offlineEfficiency);
  const capHours = BALANCE.offlineBaseCapHours + mod.offlineCapHours;
  const capSeconds = capHours * 3600;
  const cappedSeconds = Math.min(elapsedSeconds, capSeconds);

  const derived = computeDerived(state, mod);
  const energy = derived.perSecond.mul(cappedSeconds).mul(efficiency);

  if (energy.lte(0)) return null;

  return {
    seconds: elapsedSeconds,
    cappedSeconds,
    cappedByLimit: elapsedSeconds > capSeconds,
    efficiency,
    capHours,
    perSecond: derived.perSecond,
    energy,
  };
}
