import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../store/gameStore';
import { canRebirth } from '../../game/rebirth';

/**
 * A single, always-relevant coaching line. Rather than a scripted tutorial, we
 * derive the next useful action from the live game state — so the hint is never
 * stale and quietly disappears once the player no longer needs it.
 */
function useHint(): string | null {
  const cellCount = useGame((s) => s.cells.length);
  const clicks = useGame((s) => s.run.clicks);
  const energyLow = useGame((s) => s.energy.lt(10));
  const unlockedSlots = useGame((s) => s.unlockedSlots);
  const typeCount = useGame((s) => s.unlockedCellTypes.length);
  const rebirthCount = useGame((s) => s.rebirthCount);
  const ready = useGame((s) => canRebirth(s.run.totalEnergyThisRun));
  const abilityUses = useGame((s) => s.run.abilityUses);
  const abilityReady = useGame((s) => Object.values(s.abilities).some((a) => a.unlocked));

  if (clicks < 5 && energyLow) return 'Click the Ion Core to harvest energy ⚡';
  if (unlockedSlots > cellCount && typeCount > 1) return 'A slot opened up — tap ＋ in the reactor to build a new cell';
  if (ready && rebirthCount === 0) return 'You can Ascend now — open the Rebirth tab for permanent power ✦';
  if (abilityReady && abilityUses === 0) return 'An ability is ready — try it in the Abilities tab';
  return null;
}

export function HintToast() {
  const hint = useHint();
  return (
    <AnimatePresence mode="wait">
      {hint && (
        <motion.div
          key={hint}
          className="hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <span className="primary-text">➔</span>
          {hint}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
