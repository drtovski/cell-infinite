import { useGame } from '../../store/gameStore';
import { QUESTS } from '../../config/quests';
import type { QuestReward } from '../../game/types';
import { Meter } from '../../ui/primitives';
import { fmt } from '../../game/format';
import { D } from '../../game/decimal';

function rewardText(r: QuestReward): string {
  switch (r.kind) {
    case 'energyMult':
      return `×${r.value} energy · ${r.duration}s`;
    case 'coreFragments':
      return `◆ ${r.value} Core Fragments`;
    case 'flatEnergySeconds':
      return `${r.value}s of instant income`;
    case 'permanentGlobalMult':
      return `×${r.value} permanent production`;
  }
}

export function QuestsPanel() {
  const quests = useGame((s) => s.quests);
  const claim = useGame((s) => s.claimQuest);
  const runQuests = QUESTS.filter((q) => q.scope === 'run');

  return (
    <div className="card-grid">
      {runQuests.map((q) => {
        const st = quests[q.id] ?? { progress: 0, completed: false, claimed: false };
        const pct = q.goalValue === 0 ? (st.completed ? 1 : 0) : Math.min(1, st.progress / q.goalValue);
        const progressLabel =
          q.goalValue >= 1000 ? `${fmt(D(st.progress))} / ${fmt(D(q.goalValue))}` : `${st.progress} / ${q.goalValue}`;
        return (
          <div key={q.id} className={`card ${st.claimed ? 'done' : ''}`}>
            <div className="card-top">
              <div className="card-icon">{q.icon}</div>
              <div>
                <h4>{q.name}</h4>
                <p>{q.description}</p>
              </div>
            </div>
            <Meter value={pct} gold={st.completed} />
            <div className="card-foot">
              <span className="small muted">{q.goalKind === 'clicks' ? 'Resolves at Rebirth' : progressLabel}</span>
              {st.claimed ? (
                <span className="tag good-text">Claimed</span>
              ) : st.completed ? (
                <button className="btn sm gold" onClick={() => claim(q.id)}>
                  Claim
                </button>
              ) : (
                <span className="small gold">{rewardText(q.reward)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
