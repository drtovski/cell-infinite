import type { CSSProperties } from 'react';
import { useGame } from '../../store/gameStore';
import { Modal } from './Modal';
import { CELL_TYPES, getCellType } from '../../config/cells';
import { placementCost } from '../../game/economy';
import { fmt } from '../../game/format';
import { Tag } from '../../ui/primitives';

function effectAtOne(typeId: string): string {
  const t = getCellType(typeId);
  switch (t.role) {
    case 'generator':
      return `Produces ${t.baseProd}/s per level`;
    case 'amplifier':
      return `+${(t.ampPerLevel * 100).toFixed(0)}%/lvl to adjacent generators`;
    case 'pulse':
      return `Bursts every ${t.period}s`;
    case 'critical':
      return `+${(t.critChancePerLevel * 100).toFixed(1)}%/lvl crit chance`;
    case 'temporal':
      return `+${(t.speedPerLevel * 100).toFixed(1)}%/lvl game speed`;
    case 'converter':
      return `Boosts adjacent amplifiers`;
    case 'quantum':
      return `+${(t.globalMultPerLevel * 100).toFixed(0)}%/lvl global (unstable)`;
  }
}

export function PlaceCellModal({ slot, onClose }: { slot: number; onClose: () => void }) {
  const unlockedTypes = useGame((s) => s.unlockedCellTypes);
  const energy = useGame((s) => s.energy);
  const placeCell = useGame((s) => s.placeCell);
  const moveCell = useGame((s) => s.moveCell);
  const selected = useGame((s) => s.cells.find((c) => c.id === s.selectedCellId) ?? null);

  const available = CELL_TYPES.filter((t) => unlockedTypes.includes(t.id));

  return (
    <Modal title="Build a cell" subtitle={`Slot ${slot + 1}`} onClose={onClose} wide>
      {selected && (
        <button
          className="btn ghost block"
          style={{ marginBottom: 14 }}
          onClick={() => {
            moveCell(selected.id, slot);
            onClose();
          }}
        >
          ⤺ Move “{getCellType(selected.typeId).name}” here instead
        </button>
      )}

      <div className="card-grid">
        {available.map((t) => {
          const cost = placementCost(t);
          const affordable = energy.gte(cost);
          const style = { ['--hue']: t.visual.hueA } as CSSProperties;
          return (
            <div key={t.id} className="card" style={style}>
              <div className="card-top">
                <div className="card-icon">◈</div>
                <div>
                  <h4>{t.name}</h4>
                  <div className="row" style={{ gap: 6, marginTop: 2 }}>
                    <Tag hue={t.visual.hueA}>{t.rarity}</Tag>
                    <Tag>{t.role}</Tag>
                  </div>
                </div>
              </div>
              <p>{effectAtOne(t.id)}</p>
              <div className="card-foot">
                <span className="small gold">◇ {fmt(cost)}</span>
                <button
                  className="btn sm primary"
                  disabled={!affordable}
                  onClick={() => {
                    placeCell(t.id, slot);
                    onClose();
                  }}
                >
                  Build
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
