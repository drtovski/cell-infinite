import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { getCellType } from '../config/cells';
import { evolutionStage } from '../config/milestones';
import { BALANCE } from '../config/balance';
import { fx } from '../game/effects';
import { sound } from '../audio/sound';
import { fmt } from '../game/format';
import { D } from '../game/decimal';
import { isSlotUnlocked, slotOrderIndex } from '../game/grid';

function hueStyle(a: number, b: number): CSSProperties {
  return { ['--hue']: a, ['--hue2']: b } as CSSProperties;
}

export function CellNode({ slot, onRequestPlace }: { slot: number; onRequestPlace: (slot: number) => void }) {
  const cell = useGame((s) => s.cells.find((c) => c.slot === slot) ?? null);
  const unlockedSlots = useGame((s) => s.unlockedSlots);
  const selected = useGame((s) => (cell ? s.selectedCellId === cell.id : false));
  const selectCell = useGame((s) => s.selectCell);
  const clickCell = useGame((s) => s.clickCell);

  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!cell) return;
    return fx.on((e) => {
      if (e.slot === slot && (e.type === 'buy' || e.type === 'milestone' || e.type === 'burst')) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 420);
      }
    });
  }, [slot, cell]);

  // Locked slot ---------------------------------------------------------
  if (!isSlotUnlocked(slot, unlockedSlots)) {
    const need = BALANCE.slotUnlockEnergy[slotOrderIndex(slot)] ?? 0;
    return (
      <div className="cell locked" aria-label="Locked slot">
        <span className="cell-label muted">🔒</span>
        <span className="cell-level">{need > 0 ? `${fmt(D(need))} total` : ''}</span>
      </div>
    );
  }

  // Empty slot ----------------------------------------------------------
  if (!cell) {
    return (
      <button className="cell empty" onClick={() => onRequestPlace(slot)} aria-label="Empty slot — build a cell">
        <span style={{ fontSize: 26, lineHeight: 1 }}>＋</span>
        <span className="cell-level">Build</span>
      </button>
    );
  }

  const type = getCellType(cell.typeId);
  const stage = evolutionStage(cell.level);
  const isPulse = type.role === 'pulse';

  const handleClick = (e: PointerEvent) => {
    sound.unlock();
    selectCell(cell.id);
    clickCell(cell.id, e.clientX, e.clientY);
  };

  return (
    <motion.button
      className={`cell rarity-${type.rarity} ${selected ? 'selected' : ''} ${flash ? 'flash' : ''}`}
      style={hueStyle(type.visual.hueA, type.visual.hueB)}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      onPointerDown={handleClick}
      aria-label={`${type.name}, level ${cell.level}`}
    >
      <span className="badge">{type.rarity}</span>
      <div className={`cell-core stage-${stage}`} />
      <span className="cell-label">{type.name}</span>
      <span className="cell-level num">Lv {cell.level}</span>
      {isPulse && (
        <div className="cell-pulse-meter">
          <i style={{ width: `${Math.min(100, cell.pulseCharge * 100)}%` }} />
        </div>
      )}
    </motion.button>
  );
}
