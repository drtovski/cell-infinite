import { useGame } from '../store/gameStore';
import { AnimatedNumber, FormattedNumber } from './AnimatedNumber';
import { Meter, Segmented, Tag } from '../ui/primitives';
import { getCellType } from '../config/cells';
import { rebirthModifiers } from '../game/rebirth';
import { effectiveGrowth, nextLevelCost, planPurchase } from '../game/economy';
import { MILESTONES, nextMilestone } from '../config/milestones';
import type { BuyMode, CellInstance } from '../game/types';
import { fmt } from '../game/format';
import { GRID_COLS, GRID_SIZE } from '../game/grid';
import type { CSSProperties } from 'react';

const BUY_MODES: { value: BuyMode; label: string }[] = [
  { value: 'x1', label: '×1' },
  { value: 'x10', label: '×10' },
  { value: 'x25', label: '×25' },
  { value: 'milestone', label: 'Next★' },
  { value: 'max', label: 'Max' },
];

function milestoneProgress(level: number): { pct: number; label: string } {
  const next = nextMilestone(level);
  if (!next) return { pct: 1, label: 'Fully evolved' };
  let prev = 0;
  for (const m of MILESTONES) {
    if (m.level <= level) prev = m.level;
  }
  const pct = (level - prev) / (next.level - prev);
  return { pct: Math.max(0, Math.min(1, pct)), label: `Lv ${next.level}: ${next.label}` };
}

function RelocateGrid({ cell }: { cell: CellInstance }) {
  const cells = useGame((s) => s.cells);
  const unlockedSlots = useGame((s) => s.unlockedSlots);
  const moveCell = useGame((s) => s.moveCell);
  const occupied = new Map(cells.map((c) => [c.slot, c]));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: 4 }}>
      {Array.from({ length: GRID_SIZE }, (_, slot) => {
        const here = occupied.get(slot);
        const isSelf = here?.id === cell.id;
        const locked = slot >= unlockedSlots;
        const disabled = locked || (!!here && !isSelf);
        const hue = here ? getCellType(here.typeId).visual.hueA : 200;
        return (
          <button
            key={slot}
            className="btn sm"
            disabled={disabled}
            title={locked ? 'Locked' : here ? (isSelf ? 'Current position' : 'Occupied') : 'Move here'}
            onClick={() => !disabled && !isSelf && moveCell(cell.id, slot)}
            style={{
              height: 30,
              padding: 0,
              opacity: disabled ? 0.35 : 1,
              borderColor: isSelf ? `hsl(${hue} 90% 60%)` : undefined,
              background: here ? `hsl(${hue} 80% 55% / 0.18)` : undefined,
            }}
          >
            {isSelf ? '◉' : here ? '•' : locked ? '🔒' : '＋'}
          </button>
        );
      })}
    </div>
  );
}

export function CellDetails() {
  const cell = useGame((s) => s.cells.find((c) => c.id === s.selectedCellId) ?? s.cells[0] ?? null);
  const energy = useGame((s) => s.energy);
  const buyMode = useGame((s) => s.buyMode);
  const setBuyMode = useGame((s) => s.setBuyMode);
  const buyLevels = useGame((s) => s.buyLevels);
  const rebirthUpgrades = useGame((s) => s.rebirthUpgrades);
  const totalFragments = useGame((s) => s.stats.totalFragmentsEarned);
  const cellD = useGame((s) => (cell ? s.derived.cells[cell.id] : undefined));

  if (!cell) {
    return (
      <aside className="surface details">
        <div className="empty-state">Select a cell to inspect it.</div>
      </aside>
    );
  }

  const type = getCellType(cell.typeId);
  const mod = rebirthModifiers(rebirthUpgrades, totalFragments);
  const growth = effectiveGrowth(type, mod.growthReduction);
  const nextCost = nextLevelCost(type, cell.level, growth);
  const plan = planPurchase(type, cell.level, energy, buyMode, growth);
  const ms = milestoneProgress(cell.level);
  const style = { ['--hue']: type.visual.hueA } as CSSProperties;

  return (
    <aside className="surface details" style={style}>
      <div className="head">
        <div className="glyph" />
        <div style={{ minWidth: 0 }}>
          <h2>{type.name}</h2>
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            <Tag hue={type.visual.hueA}>{type.rarity}</Tag>
            <Tag>{type.role}</Tag>
          </div>
        </div>
      </div>
      <p className="flavor">“{type.flavor}”</p>

      <div>
        <div className="kv">
          <span className="k">Level</span>
          <span className="v num">{cell.level}</span>
        </div>
        {type.role === 'generator' ? (
          <div className="kv">
            <span className="k">Production</span>
            <span className="v good-text">{cellD ? <FormattedNumber value={cellD.production} /> : '—'}/s</span>
          </div>
        ) : (
          <div className="kv">
            <span className="k">Effect</span>
            <span className="v small" style={{ textAlign: 'right' }}>{cellD?.effectSummary}</span>
          </div>
        )}
        {type.role === 'generator' && cellD && cellD.localMult > 1.0001 && (
          <div className="kv">
            <span className="k">Synergy</span>
            <span className="v primary-text">×{cellD.localMult.toFixed(2)}</span>
          </div>
        )}
        <div className="kv">
          <span className="k">Next level</span>
          <span className="v gold">{fmt(nextCost)}</span>
        </div>
      </div>

      <div>
        <div className="row spread" style={{ marginBottom: 6 }}>
          <span className="panel-title">Milestone</span>
          <span className="small muted">{ms.label}</span>
        </div>
        <Meter value={ms.pct} />
      </div>

      <div>
        <div className="row spread" style={{ marginBottom: 8 }}>
          <span className="panel-title">Upgrade</span>
          <Segmented options={BUY_MODES} value={buyMode} onChange={setBuyMode} />
        </div>
        <button
          className="btn primary block"
          disabled={!plan.affordable || plan.count <= 0}
          onClick={() => buyLevels(cell.id)}
        >
          <span>Buy {plan.count > 0 ? `+${plan.count}` : ''}</span>
          <span className="num">{plan.count > 0 ? fmt(plan.cost) : '—'}</span>
        </button>
        <div className="small muted" style={{ marginTop: 6, textAlign: 'center' }}>
          Click the cell in the reactor to harvest{' '}
          <AnimatedNumber selector={(s) => s.derived.clickPower} prefix="+" /> energy.
        </div>
      </div>

      <div>
        <span className="panel-title">Relocate</span>
        <div style={{ marginTop: 8 }}>
          <RelocateGrid cell={cell} />
        </div>
      </div>
    </aside>
  );
}
