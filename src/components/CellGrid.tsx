import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../store/gameStore';
import { getCellType } from '../config/cells';
import { GRID_COLS, GRID_SIZE, neighborSlots } from '../game/grid';
import { CellNode } from './CellNode';
import { AnomalyLayer } from './overlay/AnomalyLayer';

interface Conn {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strong: boolean;
  hue: number;
}

function slotCenter(slot: number): { x: number; y: number } {
  const r = Math.floor(slot / GRID_COLS);
  const c = slot % GRID_COLS;
  return { x: ((c + 0.5) / GRID_COLS) * 100, y: ((r + 0.5) / GRID_COLS) * 100 };
}

const SUPPORT = new Set(['amplifier', 'temporal', 'converter', 'critical', 'pulse', 'quantum']);

/** The central reactor: the 3×3 cell lattice with synergy connections behind it. */
export function CellGrid({ onRequestPlace }: { onRequestPlace: (slot: number) => void }) {
  const cells = useGame(useShallow((s) => s.cells));
  const unlockedSlots = useGame((s) => s.unlockedSlots);

  const connections = useMemo<Conn[]>(() => {
    const bySlot = new Map(cells.map((c) => [c.slot, c]));
    const seen = new Set<string>();
    const out: Conn[] = [];
    for (const c of cells) {
      for (const ns of neighborSlots(c.slot)) {
        const nb = bySlot.get(ns);
        if (!nb) continue;
        const key = c.slot < ns ? `${c.slot}-${ns}` : `${ns}-${c.slot}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = getCellType(c.typeId).role;
        const b = getCellType(nb.typeId).role;
        const strong = (a === 'generator' && SUPPORT.has(b)) || (b === 'generator' && SUPPORT.has(a));
        const p1 = slotCenter(c.slot);
        const p2 = slotCenter(ns);
        out.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          strong,
          hue: getCellType(strong ? (a === 'generator' ? nb.typeId : c.typeId) : c.typeId).visual.hueA,
        });
      }
    }
    return out;
  }, [cells]);

  return (
    <div className="grid-wrap">
      <div className="cell-grid">
        <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {connections.map((c, i) => (
            <line
              key={i}
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              stroke={`hsl(${c.hue} 90% 62%)`}
              strokeWidth={c.strong ? 0.9 : 0.4}
              strokeOpacity={c.strong ? 0.55 : 0.18}
              strokeLinecap="round"
              style={c.strong ? { filter: `drop-shadow(0 0 2px hsl(${c.hue} 90% 60%))` } : undefined}
            />
          ))}
        </svg>

        {Array.from({ length: GRID_SIZE }, (_, slot) => (
          <CellNode key={slot} slot={slot} onRequestPlace={onRequestPlace} />
        ))}

        <AnomalyLayer />
      </div>
      {unlockedSlots < GRID_SIZE && (
        <div className="small muted" style={{ marginTop: 10 }}>
          Grow your output to unlock more of the {GRID_SIZE}-slot lattice.
        </div>
      )}
    </div>
  );
}
