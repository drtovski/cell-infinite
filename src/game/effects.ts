/**
 * A tiny synchronous pub/sub for *transient* feedback (floating numbers,
 * particle bursts, sound cues). These events are deliberately kept out of the
 * game state: they must never be persisted, and firing them must never cause a
 * React re-render of the simulation tree. The overlay and audio layers
 * subscribe here and manage their own local state / canvas.
 */

export type FxType =
  | 'click'
  | 'crit'
  | 'burst'
  | 'milestone'
  | 'buy'
  | 'anomaly'
  | 'anomalyClaim'
  | 'rebirth'
  | 'ability'
  | 'unlock';

export interface FxEvent {
  type: FxType;
  /** Optional grid slot the effect originates from (0..8). */
  slot?: number;
  /** Optional screen-space anchor (client coordinates). */
  x?: number;
  y?: number;
  /** Optional display text (e.g. a floating "+1.2K"). */
  text?: string;
  hue?: number;
  /** Free-form magnitude for the audio layer (0..1). */
  intensity?: number;
}

type Listener = (e: FxEvent) => void;

const listeners = new Set<Listener>();

export const fx = {
  emit(e: FxEvent): void {
    for (const l of listeners) l(e);
  },
  on(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export type EmitFn = (e: FxEvent) => void;
