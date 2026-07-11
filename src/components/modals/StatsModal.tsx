import { useGame } from '../../store/gameStore';
import { Modal } from './Modal';
import { fmt, formatTime } from '../../game/format';

export function StatsModal({ onClose }: { onClose: () => void }) {
  const s = useGame();

  const rows: [string, string][] = [
    ['Current cycle', s.rebirthCount === 0 ? 'Prime' : `${s.rebirthCount + 1}`],
    ['Energy per second', `${fmt(s.derived.perSecond)}/s`],
    ['Global multiplier', `×${fmt(s.derived.globalMult)}`],
    ['Game speed', `×${s.derived.speedMult.toFixed(2)}`],
    ['Crit chance', `${Math.round(s.derived.critChance * 100)}%`],
    ['Crit multiplier', `×${s.derived.critMult.toFixed(2)}`],
    ['Longest synergy chain', `${s.derived.bestChain}`],
    ['This run', fmt(s.run.totalEnergyThisRun)],
    ['Lifetime energy', fmt(s.stats.lifetimeEnergy)],
    ['Best rate', `${fmt(s.stats.bestPerSecond)}/s`],
    ['Total clicks', s.stats.totalClicks.toLocaleString()],
    ['Total crits', s.stats.totalCrits.toLocaleString()],
    ['Anomalies claimed', s.stats.anomaliesClaimed.toLocaleString()],
    ['Rebirths', `${s.stats.totalRebirths}`],
    ['Fragments earned', `◆ ${fmt(s.stats.totalFragmentsEarned)}`],
    ['Fastest cycle', s.stats.fastestRebirthSeconds ? formatTime(s.stats.fastestRebirthSeconds) : '—'],
    ['Total play time', formatTime(s.stats.playTime)],
  ];

  return (
    <Modal title="Statistics" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map(([k, v]) => (
          <div className="kv" key={k}>
            <span className="k">{k}</span>
            <span className="v num">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
