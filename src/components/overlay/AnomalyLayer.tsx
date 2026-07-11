import type { CSSProperties, MouseEvent } from 'react';
import { useGame } from '../../store/gameStore';
import { ANOMALY_REWARD } from '../../config/events';
import type { AnomalyKind } from '../../game/types';

const ICON: Record<AnomalyKind, string> = {
  multiplier: '✷',
  instantEnergy: '⚡',
  freeLevels: '⇪',
  supercharge: '★',
  coreShard: '◆',
};

/** Renders the transient anomaly orb inside the reactor grid. */
export function AnomalyLayer() {
  const anomaly = useGame((s) => s.anomaly);
  const claim = useGame((s) => s.claimAnomaly);
  if (!anomaly) return null;

  const hue = ANOMALY_REWARD[anomaly.kind].hue;
  const style = {
    left: `${anomaly.x * 100}%`,
    top: `${anomaly.y * 100}%`,
    ['--hue']: hue,
  } as CSSProperties;

  const onClick = (e: MouseEvent) => claim(e.clientX, e.clientY);

  return (
    <button className="anomaly" style={style} onClick={onClick} aria-label={`Anomaly: ${ANOMALY_REWARD[anomaly.kind].label}`}>
      <span className="ico">{ICON[anomaly.kind]}</span>
    </button>
  );
}
