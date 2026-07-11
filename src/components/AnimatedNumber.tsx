import { useEffect, useRef } from 'react';
import { Decimal } from '../game/decimal';
import { fmt } from '../game/format';
import { useGame, type GameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';

interface Props {
  selector: (s: GameStore) => Decimal;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Renders a big number that eases smoothly toward its true value without ever
 * driving a React re-render. It subscribes to the store directly, keeps the
 * target in a ref, and runs its own rAF tween that writes into a span via
 * `textContent`. The displayed value only *looks* animated — the real value in
 * the store is always exact. Tabular figures keep the layout from jittering.
 */
export function AnimatedNumber({ selector, prefix = '', suffix = '', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const target = useRef<Decimal>(selector(useGame.getState()));
  const shown = useRef<Decimal>(target.current);

  useEffect(() => {
    target.current = selector(useGame.getState());
    const unsub = useGame.subscribe((s) => {
      target.current = selector(s);
    });

    let raf = 0;
    const render = () => {
      const settings = useSettings.getState();
      const instant = settings.reducedMotion || settings.effects === 'minimal';
      const t = target.current;
      let s = shown.current;

      if (instant) {
        s = t;
      } else {
        const diff = t.sub(s);
        const absDiff = diff.abs();
        // Snap when within 0.05% of target (or target tiny) to end the tween.
        if (absDiff.lte(t.abs().mul(5e-4)) || absDiff.lt(0.5)) {
          s = t;
        } else {
          s = s.add(diff.mul(0.22));
        }
      }
      shown.current = s;
      if (ref.current) {
        ref.current.textContent = `${prefix}${fmt(s, settings.notation)}${suffix}`;
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [selector, prefix, suffix]);

  return (
    <span
      ref={ref}
      className={`num ${className ?? ''}`}
    >{`${prefix}${fmt(shown.current)}${suffix}`}</span>
  );
}

/** Static (non-tweened) formatted value that still respects the notation setting. */
export function FormattedNumber({ value, className }: { value: Decimal; className?: string }) {
  const notation = useSettings((s) => s.notation);
  return (
    <span className={`num ${className ?? ''}`}>{fmt(value, notation)}</span>
  );
}
