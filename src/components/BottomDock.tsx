import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { canRebirth } from '../game/rebirth';
import { AbilitiesPanel } from './panels/AbilitiesPanel';
import { QuestsPanel } from './panels/QuestsPanel';
import { AutomationPanel } from './panels/AutomationPanel';
import { RebirthPanel } from './panels/RebirthPanel';
import { AchievementsPanel } from './panels/AchievementsPanel';

type TabId = 'abilities' | 'quests' | 'automation' | 'rebirth' | 'achievements';

const TABS: { id: TabId; label: string }[] = [
  { id: 'abilities', label: 'Abilities' },
  { id: 'quests', label: 'Quests' },
  { id: 'automation', label: 'Automation' },
  { id: 'rebirth', label: 'Rebirth' },
  { id: 'achievements', label: 'Achievements' },
];

export function BottomDock() {
  const [tab, setTab] = useState<TabId>('abilities');

  const questReady = useGame((s) =>
    Object.values(s.quests).some((q) => q.completed && !q.claimed),
  );
  const rebirthReady = useGame((s) => canRebirth(s.run.totalEnergyThisRun));

  const dot: Partial<Record<TabId, boolean>> = {
    quests: questReady,
    rebirth: rebirthReady,
  };

  return (
    <section className="surface dock">
      <div className="dock-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`dock-tab ${t.id === tab ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {dot[t.id] && <span className="dot" />}
          </button>
        ))}
      </div>
      <div className="dock-body">
        {tab === 'abilities' && <AbilitiesPanel />}
        {tab === 'quests' && <QuestsPanel />}
        {tab === 'automation' && <AutomationPanel />}
        {tab === 'rebirth' && <RebirthPanel />}
        {tab === 'achievements' && <AchievementsPanel />}
      </div>
    </section>
  );
}
