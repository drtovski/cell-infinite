import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fx } from '../../game/effects';
import { useSettings } from '../../store/settingsStore';

/**
 * The Rebirth spectacle: the reactor collapses into a point, the core flares,
 * and an energy wave washes back out as the next cycle begins. Kept short so it
 * never gets in the way, and reduced to a soft flash when motion is limited.
 */
export function RebirthOverlay() {
  const [active, setActive] = useState(false);
  const minimal = useSettings((s) => s.effects === 'minimal' || s.reducedMotion);

  useEffect(() => {
    return fx.on((e) => {
      if (e.type !== 'rebirth') return;
      setActive(true);
      window.setTimeout(() => setActive(false), minimal ? 550 : 1700);
    });
  }, [minimal]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="rebirth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!minimal && (
            <>
              <motion.div
                className="rebirth-core"
                initial={{ scale: 6, opacity: 0 }}
                animate={{ scale: [6, 0.4, 3], opacity: [0, 1, 1] }}
                transition={{ duration: 1.4, times: [0, 0.45, 1], ease: 'easeInOut' }}
              />
              <motion.div
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid rgba(200,170,255,0.8)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 0, 26], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.6, times: [0, 0.5, 1], ease: 'easeOut' }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
