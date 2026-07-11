import { useGame } from '../../store/gameStore';
import { rebirthModifiers } from '../../game/rebirth';
import { Switch } from '../../ui/primitives';
import { fmt } from '../../game/format';

export function AutomationPanel() {
  const automation = useGame((s) => s.automation);
  const setAutomation = useGame((s) => s.setAutomation);
  const rebirthUpgrades = useGame((s) => s.rebirthUpgrades);
  const totalFragments = useGame((s) => s.stats.totalFragmentsEarned);
  const projected = useGame((s) => s.derived.projectedFragments);
  const mod = rebirthModifiers(rebirthUpgrades, totalFragments);

  const rows: { key: keyof typeof automation; label: string; desc: string; unlocked: boolean; upgrade: string }[] = [
    {
      key: 'autoCollect',
      label: 'Auto-Collect',
      desc: 'Automatically capture anomalies the moment they appear.',
      unlocked: mod.unlockAutoCollect,
      upgrade: 'Autonomous Harvest',
    },
    {
      key: 'autoBuy',
      label: 'Auto-Buy Levels',
      desc: 'Continuously reinvest energy into the cheapest available levels.',
      unlocked: mod.unlockAutoBuy,
      upgrade: 'Assembler Protocol',
    },
    {
      key: 'autoRebirth',
      label: 'Auto-Rebirth',
      desc: 'Ascend automatically once projected fragments reach your threshold.',
      unlocked: mod.unlockAutoRebirth,
      upgrade: 'Eternal Recurrence',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map((r) => (
        <div className="setting-row" key={r.key}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.label}</div>
            <div className="desc">
              {r.unlocked ? r.desc : `Locked — buy “${r.upgrade}” in the Rebirth tree.`}
            </div>
          </div>
          <Switch
            on={r.unlocked && (automation[r.key] as boolean)}
            onChange={(v) => r.unlocked && setAutomation({ [r.key]: v })}
          />
        </div>
      ))}

      {mod.unlockAutoRebirth && (
        <div style={{ paddingTop: 12 }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="panel-title">Auto-Rebirth threshold</span>
            <span className="small gold">◆ {automation.autoRebirthThreshold}</span>
          </div>
          <input
            className="slider"
            style={{ width: '100%' }}
            type="range"
            min={5}
            max={500}
            step={5}
            value={automation.autoRebirthThreshold}
            onChange={(e) => setAutomation({ autoRebirthThreshold: Number(e.target.value) })}
          />
          <div className="small muted" style={{ marginTop: 6 }}>
            Projected now: <span className="gold">◆ {fmt(projected)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
