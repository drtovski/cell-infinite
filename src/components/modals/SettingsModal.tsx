import { useState } from 'react';
import { Modal } from './Modal';
import { Switch, Segmented } from '../../ui/primitives';
import { useSettings, type EffectsLevel, type Theme } from '../../store/settingsStore';
import type { Notation } from '../../game/format';
import { useGame } from '../../store/gameStore';
import { exportSave } from '../../save/storage';

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{label}</div>
        {desc && <div className="desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const saveNow = useGame((g) => g.saveNow);
  const hardReset = useGame((g) => g.hardReset);
  const importFromString = useGame((g) => g.importFromString);

  const [ioText, setIoText] = useState('');
  const [ioMsg, setIoMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const vol = (v: number) => Math.round(v * 100);

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <span className="panel-title">Appearance</span>
      <Row label="Theme">
        <Segmented<Theme>
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          value={s.theme}
          onChange={(v) => s.set('theme', v)}
        />
      </Row>
      <Row label="Effects" desc="Overall visual intensity">
        <Segmented<EffectsLevel>
          options={[
            { value: 'full', label: 'Full' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'minimal', label: 'Minimal' },
          ]}
          value={s.effects}
          onChange={(v) => s.set('effects', v)}
        />
      </Row>
      <Row label="Particles">
        <Switch on={s.particles} onChange={(v) => s.set('particles', v)} />
      </Row>
      <Row label="Reduced motion" desc="Disable non-essential animation">
        <Switch on={s.reducedMotion} onChange={(v) => s.set('reducedMotion', v)} />
      </Row>
      <Row label="Floating numbers">
        <Switch on={s.showFloatingNumbers} onChange={(v) => s.set('showFloatingNumbers', v)} />
      </Row>
      <Row label="Number notation">
        <Segmented<Notation>
          options={[
            { value: 'standard', label: 'Suffix' },
            { value: 'scientific', label: 'Sci' },
          ]}
          value={s.notation}
          onChange={(v) => s.set('notation', v)}
        />
      </Row>

      <div style={{ height: 14 }} />
      <span className="panel-title">Audio</span>
      <Row label="Mute all">
        <Switch on={s.muted} onChange={(v) => s.set('muted', v)} />
      </Row>
      <Row label={`Master · ${vol(s.volumeMaster)}%`}>
        <input className="slider" type="range" min={0} max={100} value={vol(s.volumeMaster)} onChange={(e) => s.set('volumeMaster', Number(e.target.value) / 100)} />
      </Row>
      <Row label={`Music · ${vol(s.volumeMusic)}%`}>
        <input className="slider" type="range" min={0} max={100} value={vol(s.volumeMusic)} onChange={(e) => s.set('volumeMusic', Number(e.target.value) / 100)} />
      </Row>
      <Row label={`SFX · ${vol(s.volumeSfx)}%`}>
        <input className="slider" type="range" min={0} max={100} value={vol(s.volumeSfx)} onChange={(e) => s.set('volumeSfx', Number(e.target.value) / 100)} />
      </Row>

      <div style={{ height: 14 }} />
      <span className="panel-title">Save data</span>
      <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn sm" onClick={() => { saveNow(); setIoMsg('Saved.'); }}>
          Save now
        </button>
        <button
          className="btn sm"
          onClick={() => {
            const code = exportSave(useGame.getState());
            setIoText(code);
            navigator.clipboard?.writeText(code).catch(() => undefined);
            setIoMsg('Exported to the box below (copied to clipboard).');
          }}
        >
          Export
        </button>
        <button
          className="btn sm"
          disabled={!ioText.trim()}
          onClick={() => {
            const ok = importFromString(ioText);
            setIoMsg(ok ? 'Save imported.' : 'Import failed — check the code.');
          }}
        >
          Import
        </button>
        <button
          className={`btn sm ${confirmReset ? 'gold' : 'ghost'}`}
          onClick={() => {
            if (confirmReset) {
              hardReset();
              setConfirmReset(false);
              setIoMsg('Progress reset.');
              onClose();
            } else {
              setConfirmReset(true);
              window.setTimeout(() => setConfirmReset(false), 3500);
            }
          }}
        >
          {confirmReset ? 'Confirm full reset?' : 'Hard reset'}
        </button>
      </div>
      <textarea
        value={ioText}
        onChange={(e) => setIoText(e.target.value)}
        placeholder="Paste a save code here to import, or Export to generate one."
        spellCheck={false}
        style={{
          width: '100%',
          marginTop: 10,
          minHeight: 72,
          resize: 'vertical',
          background: 'var(--bg-1)',
          color: 'var(--on-surface-dim)',
          border: '1px solid var(--border-soft)',
          borderRadius: 12,
          padding: 10,
          fontFamily: 'var(--font-num)',
          fontSize: 11,
        }}
      />
      {ioMsg && <div className="small muted" style={{ marginTop: 8 }}>{ioMsg}</div>}
    </Modal>
  );
}
