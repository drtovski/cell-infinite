import { useGame } from '../../store/gameStore';
import { Modal } from './Modal';
import { fmt, formatTime } from '../../game/format';

export function OfflineModal() {
  const report = useGame((s) => s.pendingOffline);
  const claim = useGame((s) => s.claimOffline);
  if (!report) return null;

  return (
    <Modal title="Welcome back" subtitle="While you were away, the system kept running." onClose={claim}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="kv">
          <span className="k">Time away</span>
          <span className="v">{formatTime(report.seconds)}</span>
        </div>
        <div className="kv">
          <span className="k">Counted (capped at {report.capHours}h)</span>
          <span className="v">{formatTime(report.cappedSeconds)}</span>
        </div>
        <div className="kv">
          <span className="k">Reactor rate</span>
          <span className="v">{fmt(report.perSecond)}/s</span>
        </div>
        <div className="kv">
          <span className="k">Offline efficiency</span>
          <span className="v">{Math.round(report.efficiency * 100)}%</span>
        </div>
        <div className="kv" style={{ borderBottom: 'none' }}>
          <span className="k">Energy generated</span>
          <span className="v gold" style={{ fontSize: 20 }}>
            {fmt(report.energy)}
          </span>
        </div>
      </div>
      {report.cappedByLimit && (
        <div className="small muted" style={{ marginTop: 8 }}>
          Offline income is capped — upgrade <em>Deep Reserves</em> and <em>Dormant Reactor</em> in the Rebirth
          tree to keep more of it.
        </div>
      )}
      <button className="btn primary block" style={{ marginTop: 18 }} onClick={claim}>
        Collect {fmt(report.energy)} ⚡
      </button>
    </Modal>
  );
}
