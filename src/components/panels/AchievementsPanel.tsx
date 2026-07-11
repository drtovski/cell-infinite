import { useGame } from '../../store/gameStore';
import { QUESTS } from '../../config/quests';
import type { QuestReward } from '../../game/types';

function rewardText(r: QuestReward): string {
  switch (r.kind) {
    case 'permanentGlobalMult':
      return `×${r.value} permanent production`;
    case 'coreFragments':
      return `◆ ${r.value} Core Fragments`;
    case 'energyMult':
      return `×${r.value} energy · ${r.duration}s`;
    case 'flatEnergySeconds':
      return `${r.value}s of income`;
  }
}

export function AchievementsPanel() {
  const quests = useGame((s) => s.quests);
  const persistent = QUESTS.filter((q) => q.scope === 'persistent');

  return (
    <div className="card-grid">
      {persistent.map((q) => {
        const st = quests[q.id] ?? { progress: 0, completed: false, claimed: false };
        const done = st.completed || st.claimed;
        return (
          <div key={q.id} className={`card ${done ? 'done' : 'locked'}`}>
            <div className="card-top">
              <div className="card-icon">{q.icon}</div>
              <div>
                <h4>{q.name}</h4>
                <p>{q.description}</p>
              </div>
            </div>
            <div className="card-foot">
              <span className="small gold">{rewardText(q.reward)}</span>
              <span className={`tag ${done ? 'good-text' : ''}`}>{done ? 'Unlocked' : 'Locked'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
