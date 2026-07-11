import { fx, type FxType } from '../game/effects';
import { useSettings } from '../store/settingsStore';

/**
 * A tiny procedural sound engine. Rather than shipping audio assets, we
 * synthesize short blips with the Web Audio API. This keeps the bundle small
 * and lets every cue scale its volume through the settings mixer. A gentle
 * ambient drone plays under everything when music is enabled.
 */

interface Cue {
  freq: number;
  type: OscillatorType;
  dur: number;
  gain: number;
  sweep?: number; // target frequency for a glide
}

const CUES: Partial<Record<FxType, Cue>> = {
  click: { freq: 440, type: 'triangle', dur: 0.06, gain: 0.16 },
  crit: { freq: 720, type: 'square', dur: 0.16, gain: 0.22, sweep: 1200 },
  buy: { freq: 520, type: 'sine', dur: 0.1, gain: 0.2, sweep: 680 },
  milestone: { freq: 660, type: 'sine', dur: 0.4, gain: 0.28, sweep: 1320 },
  burst: { freq: 300, type: 'sawtooth', dur: 0.22, gain: 0.2, sweep: 90 },
  anomaly: { freq: 880, type: 'sine', dur: 0.5, gain: 0.18, sweep: 560 },
  anomalyClaim: { freq: 520, type: 'triangle', dur: 0.3, gain: 0.26, sweep: 1040 },
  ability: { freq: 240, type: 'sawtooth', dur: 0.3, gain: 0.24, sweep: 720 },
  unlock: { freq: 420, type: 'sine', dur: 0.45, gain: 0.24, sweep: 900 },
  rebirth: { freq: 120, type: 'sine', dur: 1.2, gain: 0.34, sweep: 900 },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: OscillatorNode[] = [];
  private started = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  unlock(): void {
    this.ensure();
    if (!this.started) {
      this.started = true;
      this.startAmbient();
    }
  }

  private mix() {
    const s = useSettings.getState();
    return {
      master: s.muted ? 0 : s.volumeMaster,
      sfx: s.volumeSfx,
      music: s.volumeMusic,
    };
  }

  play(type: FxType, intensity = 1): void {
    const cue = CUES[type];
    const ctx = this.ctx;
    if (!cue || !ctx || !this.master) return;
    const { master, sfx } = this.mix();
    const vol = master * sfx * cue.gain * (0.5 + 0.5 * intensity);
    if (vol <= 0.0001) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = cue.type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(cue.freq, now);
    if (cue.sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, cue.sweep), now + cue.dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + cue.dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + cue.dur + 0.02);
  }

  private startAmbient(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.master);
    // Two slightly detuned low sines create a slow, warm pad.
    for (const freq of [55, 82.5]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      o.connect(this.ambientGain);
      o.start();
      lfo.start();
      this.ambientNodes.push(o);
    }
    this.updateAmbient();
  }

  updateAmbient(): void {
    if (!this.ambientGain || !this.ctx) return;
    const { master, music } = this.mix();
    const target = master * music * 0.08;
    this.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }
}

export const sound = new SoundEngine();

/** Subscribe the audio engine to the fx bus. Returns an unsubscribe fn. */
export function bindAudio(): () => void {
  const off = fx.on((e) => sound.play(e.type, e.intensity ?? 1));
  const offSettings = useSettings.subscribe(() => sound.updateAmbient());
  return () => {
    off();
    offSettings();
  };
}
