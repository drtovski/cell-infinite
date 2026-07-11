import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notation } from '../game/format';

export type EffectsLevel = 'full' | 'reduced' | 'minimal';
export type Theme = 'dark' | 'light';

export interface SettingsState {
  theme: Theme;
  effects: EffectsLevel;
  particles: boolean;
  reducedMotion: boolean;
  notation: Notation;
  showFloatingNumbers: boolean;
  volumeMaster: number;
  volumeMusic: number;
  volumeSfx: number;
  muted: boolean;

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  toggle: (key: 'particles' | 'reducedMotion' | 'muted' | 'showFloatingNumbers') => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      effects: 'full',
      particles: true,
      reducedMotion: false,
      notation: 'standard',
      showFloatingNumbers: true,
      volumeMaster: 0.7,
      volumeMusic: 0.4,
      volumeSfx: 0.8,
      muted: false,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      toggle: (key) => set((s) => ({ [key]: !s[key] } as Partial<SettingsState>)),
    }),
    { name: 'cell-infinite:settings' },
  ),
);

/** Respect the OS-level reduced-motion preference on first run. */
export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
