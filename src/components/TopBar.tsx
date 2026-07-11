import { useGame } from '../store/gameStore';
import { AnimatedNumber } from './AnimatedNumber';

export function TopBar({
  onSettings,
  onStats,
}: {
  onSettings: () => void;
  onStats: () => void;
}) {
  const cycle = useGame((s) => s.rebirthCount);

  return (
    <header className="topbar surface">
      <div className="brand">
        <h1>CELL&nbsp;: INFINITE</h1>
        <span className="cycle">{cycle === 0 ? 'Prime Cycle' : `Cycle ${cycle + 1}`}</span>
      </div>

      <div className="stat-cluster">
        <div className="stat">
          <span className="label">Energy</span>
          <AnimatedNumber className="value big primary" selector={(s) => s.energy} />
        </div>
        <div className="stat">
          <span className="label">Per second</span>
          <AnimatedNumber className="value" selector={(s) => s.derived.perSecond} suffix="/s" />
        </div>
        <div className="stat">
          <span className="label">Core Fragments</span>
          <AnimatedNumber className="value gold" selector={(s) => s.coreFragments} prefix="◆ " />
        </div>
        <div className="stat">
          <span className="label">Global mult</span>
          <AnimatedNumber className="value" selector={(s) => s.derived.globalMult} prefix="×" />
        </div>
      </div>

      <div className="topbar-spacer" />

      <div className="row">
        <button className="btn icon ghost" title="Statistics" aria-label="Statistics" onClick={onStats}>
          ▤
        </button>
        <button className="btn icon ghost" title="Settings" aria-label="Settings" onClick={onSettings}>
          ⚙
        </button>
      </div>
    </header>
  );
}
