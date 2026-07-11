import { useEffect, useState } from 'react';
import { useGame } from './store/gameStore';
import { useSettings } from './store/settingsStore';
import { useGameLoop } from './hooks/useGameLoop';
import { bindAudio, sound } from './audio/sound';
import { TopBar } from './components/TopBar';
import { CellGrid } from './components/CellGrid';
import { CellDetails } from './components/CellDetails';
import { BottomDock } from './components/BottomDock';
import { FxOverlay } from './components/overlay/FxOverlay';
import { RebirthOverlay } from './components/overlay/RebirthOverlay';
import { HintToast } from './components/overlay/HintToast';
import { OfflineModal } from './components/modals/OfflineModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { StatsModal } from './components/modals/StatsModal';
import { PlaceCellModal } from './components/modals/PlaceCellModal';
import { formatCountdown } from './game/format';

function ReactorStatus() {
  const buffs = useGame((s) => s.buffs);
  const speed = useGame((s) => s.derived.speedMult);
  const chain = useGame((s) => s.derived.bestChain);
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {chain > 1 && <span className="tag primary-text">⧉ Chain {chain}</span>}
      {speed > 1.001 && <span className="tag" style={{ color: 'var(--good)' }}>⧗ ×{speed.toFixed(2)} speed</span>}
      {buffs.map((b) => (
        <span key={b.id} className="tag" style={{ color: `hsl(${b.hue} 90% 72%)` }}>
          {b.label} · {formatCountdown(b.remaining)}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const bootstrap = useGame((s) => s.bootstrap);
  const initialized = useGame((s) => s.initialized);

  const theme = useSettings((s) => s.theme);
  const effects = useSettings((s) => s.effects);
  const reduced = useSettings((s) => s.reducedMotion);

  const [placeSlot, setPlaceSlot] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Bootstrap must run before the loop meaningfully advances real state.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useGameLoop();

  useEffect(() => {
    const off = bindAudio();
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      off();
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!initialized) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div className="brand">
          <h1>CELL : INFINITE</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`app fx-${effects} ${reduced ? 'reduce-motion' : ''}`}>
      <TopBar onSettings={() => setShowSettings(true)} onStats={() => setShowStats(true)} />

      <div className="app-main">
        <div className="surface reactor">
          <div className="reactor-head">
            <span className="panel-title">Reactor Lattice</span>
            <ReactorStatus />
          </div>
          <CellGrid onRequestPlace={setPlaceSlot} />
        </div>
        <CellDetails />
      </div>

      <BottomDock />

      <FxOverlay />
      <RebirthOverlay />
      <HintToast />

      <OfflineModal />
      {placeSlot !== null && <PlaceCellModal slot={placeSlot} onClose={() => setPlaceSlot(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  );
}
