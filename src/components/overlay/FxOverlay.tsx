import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fx, type FxType } from '../../game/effects';
import { useSettings } from '../../store/settingsStore';

interface Floaty {
  id: number;
  x: number;
  y: number;
  text: string;
  hue: number;
  crit: boolean;
  ring: boolean;
}

let counter = 0;

const RINGED: FxType[] = ['crit', 'anomalyClaim'];

export function FxOverlay() {
  const [floaties, setFloaties] = useState<Floaty[]>([]);
  const showNumbers = useSettings((s) => s.showFloatingNumbers);
  const particles = useSettings((s) => s.particles);
  const minimal = useSettings((s) => s.effects === 'minimal' || s.reducedMotion);

  useEffect(() => {
    return fx.on((e) => {
      if (!e.text || e.x === undefined || e.y === undefined) return;
      if (!showNumbers) return;
      const id = counter++;
      const f: Floaty = {
        id,
        x: e.x,
        y: e.y,
        text: e.text,
        hue: e.hue ?? 190,
        crit: e.type === 'crit',
        ring: particles && !minimal && RINGED.includes(e.type),
      };
      setFloaties((prev) => {
        const next = [...prev, f];
        return next.length > 40 ? next.slice(next.length - 40) : next;
      });
      const life = f.crit ? 1100 : 850;
      window.setTimeout(() => {
        setFloaties((prev) => prev.filter((p) => p.id !== id));
      }, life);
    });
  }, [showNumbers, particles, minimal]);

  return (
    <div className="fx-layer" aria-hidden>
      <AnimatePresence>
        {floaties.map((f) => (
          <div key={f.id}>
            {f.ring && (
              <motion.div
                initial={{ opacity: 0.7, scale: 0.2 }}
                animate={{ opacity: 0, scale: 2.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: f.x,
                  top: f.y,
                  width: 60,
                  height: 60,
                  marginLeft: -30,
                  marginTop: -30,
                  borderRadius: '50%',
                  border: `2px solid hsl(${f.hue} 95% 65%)`,
                }}
              />
            )}
            <motion.div
              className={`floaty ${f.crit ? 'crit' : ''}`}
              style={{ left: f.x, top: f.y, color: `hsl(${f.hue} 95% 72%)` }}
              initial={{ opacity: 0, y: 0, scale: minimal ? 1 : 0.6 }}
              animate={{ opacity: 1, y: minimal ? -20 : -64, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: minimal ? 0.4 : 0.85, ease: [0.2, 0, 0, 1] }}
            >
              {f.text}
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
