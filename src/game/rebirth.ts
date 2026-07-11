import { Decimal, D, ZERO } from './decimal';
import { BALANCE } from '../config/balance';
import { REBIRTH_UPGRADE_MAP } from '../config/rebirthUpgrades';

/**
 * Core Fragments earned for a run, based on how many orders of magnitude of
 * energy the run produced. Using log10 keeps the reward smooth and legible:
 * every extra ~order of magnitude is worth a predictable slice of fragments.
 */
export function computeFragments(totalRunEnergy: Decimal): Decimal {
  if (totalRunEnergy.lt(BALANCE.rebirthUnlockEnergy)) return ZERO;
  const logE = totalRunEnergy.log10();
  const logBase = Math.log10(BALANCE.fragmentBase);
  const orders = Math.max(0, logE - logBase);
  const raw = BALANCE.fragmentMult * Math.pow(orders, BALANCE.fragmentPow);
  return D(Math.floor(raw));
}

export function canRebirth(totalRunEnergy: Decimal): boolean {
  return totalRunEnergy.gte(BALANCE.rebirthUnlockEnergy);
}

export interface RebirthModifiers {
  globalMult: Decimal;
  clickMult: Decimal;
  startEnergy: Decimal;
  milestonePower: number;
  critChanceBonus: number;
  critMultBonus: number;
  offlineEfficiency: number;
  offlineCapHours: number;
  growthReduction: number;
  keepEnergyFrac: number;
  extraSlots: number;
  unlockAutoCollect: boolean;
  unlockAutoBuy: boolean;
  unlockAutoRebirth: boolean;
  unlockQuantum: boolean;
}

function lvl(upgrades: Record<string, number>, id: string): number {
  return upgrades[id] ?? 0;
}

/** Translate purchased upgrade levels into concrete numeric modifiers. */
export function rebirthModifiers(
  upgrades: Record<string, number>,
  totalFragmentsEarned: Decimal,
): RebirthModifiers {
  const globalLvl = lvl(upgrades, 'global-mult');
  const globalFromUpgrades = D(1 + REBIRTH_UPGRADE_MAP['global-mult'].perLevel).pow(globalLvl);

  // Lifetime fragments provide a gentle passive multiplier (sqrt-damped).
  const passiveFragmentMult = D(1).add(
    D(BALANCE.fragmentGlobalBonus).mul(totalFragmentsEarned.max(0).sqrt()),
  );

  return {
    globalMult: globalFromUpgrades.mul(passiveFragmentMult),
    clickMult: D(2).pow(lvl(upgrades, 'click-mult')),
    startEnergy: D(10).pow(lvl(upgrades, 'start-energy')).sub(1).max(0),
    milestonePower: 1 + REBIRTH_UPGRADE_MAP['milestone-power'].perLevel * lvl(upgrades, 'milestone-power'),
    critChanceBonus: REBIRTH_UPGRADE_MAP['crit-chance'].perLevel * lvl(upgrades, 'crit-chance'),
    critMultBonus: REBIRTH_UPGRADE_MAP['crit-mult'].perLevel * lvl(upgrades, 'crit-mult'),
    offlineEfficiency: REBIRTH_UPGRADE_MAP['offline-eff'].perLevel * lvl(upgrades, 'offline-eff'),
    offlineCapHours: REBIRTH_UPGRADE_MAP['offline-cap'].perLevel * lvl(upgrades, 'offline-cap'),
    growthReduction: REBIRTH_UPGRADE_MAP['cheaper-levels'].perLevel * lvl(upgrades, 'cheaper-levels'),
    keepEnergyFrac: Math.min(0.9, REBIRTH_UPGRADE_MAP['keep-energy'].perLevel * lvl(upgrades, 'keep-energy')),
    extraSlots: lvl(upgrades, 'extra-slots'),
    unlockAutoCollect: lvl(upgrades, 'auto-collect') > 0,
    unlockAutoBuy: lvl(upgrades, 'auto-buy') > 0,
    unlockAutoRebirth: lvl(upgrades, 'auto-rebirth') > 0,
    unlockQuantum: lvl(upgrades, 'unlock-quantum') > 0,
  };
}

/** Cost of the next level of a rebirth upgrade. */
export function rebirthUpgradeCost(id: string, currentLevel: number): Decimal {
  const def = REBIRTH_UPGRADE_MAP[id];
  return D(def.baseCost).mul(D(def.costGrowth).pow(currentLevel));
}
