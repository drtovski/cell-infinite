import { useState, type CSSProperties } from 'react';
import { useGame } from '../../store/gameStore';
import { REBIRTH_UPGRADES } from '../../config/rebirthUpgrades';
import { canRebirth, rebirthUpgradeCost } from '../../game/rebirth';
import { BALANCE } from '../../config/balance';
import { fmt } from '../../game/format';
import { AnimatedNumber } from '../AnimatedNumber';
import { D } from '../../game/decimal';

export function RebirthPanel() {
  const projected = useGame((s) => s.derived.projectedFragments);
  const coreFragments = useGame((s) => s.coreFragments);
  const rebirthUpgrades = useGame((s) => s.rebirthUpgrades);
  const rebirthCount = useGame((s) => s.rebirthCount);
  const ready = useGame((s) => canRebirth(s.run.totalEnergyThisRun));
  const buy = useGame((s) => s.buyRebirthUpgrade);
  const doRebirth = useGame((s) => s.doRebirth);
  const [confirm, setConfirm] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        className="card"
        style={{
          borderColor: 'rgba(185,139,255,0.35)',
          background: 'linear-gradient(135deg, rgba(138,123,255,0.14), rgba(185,139,255,0.06))',
        }}
      >
        <div className="row spread wrap" style={{ gap: 12 }}>
          <div>
            <div className="panel-title">Ascend to Cycle {rebirthCount + 2}</div>
            <div style={{ fontSize: 13, color: 'var(--on-surface-dim)', marginTop: 4, maxWidth: 460 }}>
              Collapse this cycle to forge{' '}
              <span className="gold num" style={{ fontSize: 16, fontWeight: 800 }}>◆ {fmt(projected)}</span>{' '}
              Core Fragments. You keep every fragment, upgrade and achievement; energy and cell levels reset,
              but the next cycle races back far faster.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {ready ? (
              <button
                className="btn gold"
                onClick={() => {
                  if (confirm) {
                    doRebirth();
                    setConfirm(false);
                  } else {
                    setConfirm(true);
                    window.setTimeout(() => setConfirm(false), 3500);
                  }
                }}
              >
                {confirm ? 'Confirm ascend ✦' : 'Ascend'}
              </button>
            ) : (
              <div className="small muted" style={{ maxWidth: 180 }}>
                Reach {fmt(D(BALANCE.rebirthUnlockEnergy))} energy this run to unlock Rebirth.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row spread">
        <span className="panel-title">Core Fragment upgrades</span>
        <span className="gold">
          Balance: ◆ <AnimatedNumber selector={(s) => s.coreFragments} />
        </span>
      </div>

      <div className="card-grid">
        {REBIRTH_UPGRADES.map((u) => {
          const level = rebirthUpgrades[u.id] ?? 0;
          const maxed = level >= u.maxLevel;
          const cost = rebirthUpgradeCost(u.id, level);
          const requiresMet = !u.requires || (rebirthUpgrades[u.requires] ?? 0) >= 1;
          const affordable = coreFragments.gte(cost) && requiresMet && !maxed;
          const style = { ['--hue']: 265 } as CSSProperties;
          return (
            <div key={u.id} className={`card ${maxed ? 'done' : ''} ${!requiresMet ? 'locked' : ''}`} style={style}>
              <div className="card-top">
                <div className="card-icon">{u.icon}</div>
                <div>
                  <h4>{u.name}</h4>
                  <p className="small muted">
                    {u.maxLevel > 1 ? `Level ${level} / ${u.maxLevel}` : level > 0 ? 'Owned' : 'Not owned'}
                  </p>
                </div>
              </div>
              <p>{u.description}</p>
              <div className="card-foot">
                {!requiresMet ? (
                  <span className="small muted">Requires prerequisite</span>
                ) : maxed ? (
                  <span className="tag good-text">Maxed</span>
                ) : (
                  <button className="btn sm" disabled={!affordable} onClick={() => buy(u.id)}>
                    ◆ {fmt(cost)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
