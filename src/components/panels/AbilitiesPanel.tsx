import type { CSSProperties } from 'react';
import { useGame } from '../../store/gameStore';
import { ABILITIES } from '../../config/abilities';
import { formatCountdown } from '../../game/format';
import { fmt } from '../../game/format';
import { D } from '../../game/decimal';

export function AbilitiesPanel() {
  const abilities = useGame((s) => s.abilities);
  const activate = useGame((s) => s.activateAbility);

  const anyUnlocked = ABILITIES.some((a) => abilities[a.id]?.unlocked);

  if (!anyUnlocked) {
    return (
      <div className="empty-state">
        Abilities unlock as your reactor grows. Your first — <strong>Overclock</strong> — arrives at{' '}
        {fmt(D(20_000))} total energy.
      </div>
    );
  }

  return (
    <div className="card-grid">
      {ABILITIES.map((def) => {
        const st = abilities[def.id];
        const unlocked = st?.unlocked;
        const active = (st?.activeRemaining ?? 0) > 0;
        const cooling = (st?.cooldownRemaining ?? 0) > 0;
        const style = { ['--hue']: def.hue } as CSSProperties;

        if (!unlocked) {
          return (
            <div key={def.id} className="card locked" style={style}>
              <div className="card-top">
                <div className="card-icon">{def.icon}</div>
                <div>
                  <h4>{def.name}</h4>
                  <p>Locked</p>
                </div>
              </div>
              <p>
                Unlocks at{' '}
                {def.unlock.kind === 'energy' ? `${fmt(D(def.unlock.amount))} energy` : 'progression'}.
              </p>
            </div>
          );
        }

        return (
          <div key={def.id} className={`card interactive ${active ? '' : ''}`} style={style}>
            <div className="card-top">
              <div className="card-icon">{def.icon}</div>
              <div>
                <h4>{def.name}</h4>
                <p className="small muted">
                  {def.duration > 0 ? `${def.duration}s · ` : ''}CD {def.cooldown}s
                </p>
              </div>
            </div>
            <p>{def.description}</p>
            <div className="card-foot">
              <button
                className={`btn sm block ability-btn ${active ? 'active' : ''}`}
                style={style}
                disabled={cooling || active}
                onClick={() => activate(def.id)}
              >
                {active ? `Active ${formatCountdown(st!.activeRemaining)}` : 'Activate'}
                {cooling && !active && <span className="cd">{formatCountdown(st!.cooldownRemaining)}</span>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
