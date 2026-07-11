import { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { BALANCE } from '../config/balance';

/**
 * The single game loop. Driven by requestAnimationFrame but decoupled from the
 * frame rate: every frame we pass the *real* elapsed seconds to `tick`, which
 * integrates production with a proper delta time (and clamps pathological
 * spikes). Long gaps (tab hidden) are handled with a generous catch-up rather
 * than silently lost; true offline time is handled at bootstrap.
 */
export function useGameLoop(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastWall = Date.now();
    let saveAcc = 0;
    let running = true;

    const store = useGame.getState;

    const step = (t: number) => {
      if (!running) return;
      const dt = (t - last) / 1000;
      last = t;

      if (dt > BALANCE.maxCatchUpSeconds * 1.5) {
        // A long stall (e.g. tab was inactive): grant full-rate catch-up.
        store().applyCatchUp((Date.now() - lastWall) / 1000);
      } else {
        store().tick(dt);
      }
      lastWall = Date.now();

      saveAcc += dt;
      if (saveAcc >= BALANCE.autosaveInterval) {
        saveAcc = 0;
        store().saveNow();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onVisibility = () => {
      if (document.hidden) store().saveNow();
      else last = performance.now();
    };
    const onUnload = () => store().saveNow();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      store().saveNow();
    };
  }, []);
}
