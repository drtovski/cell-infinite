import type { GameState } from '../game/types';
import { serializeState, deserializeState } from './serialize';
import { migrateSave } from './migrate';

const STORAGE_KEY = 'cell-infinite:save';
const BACKUP_KEY = 'cell-infinite:save:backup';

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Persist the state. Keeps the previous save as a backup for recovery. */
export function saveGame(state: GameState, now: number = Date.now()): boolean {
  if (!hasStorage()) return false;
  try {
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
    const json = JSON.stringify(serializeState(state, now));
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (err) {
    console.error('[save] failed to persist', err);
    return false;
  }
}

function tryParse(json: string | null): GameState | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json);
    return deserializeState(migrateSave(raw));
  } catch (err) {
    console.error('[save] parse failed', err);
    return null;
  }
}

/**
 * Load the game. Falls back to the backup slot if the primary save is corrupt,
 * and returns null if nothing usable exists (caller then starts a fresh game).
 */
export function loadGame(): GameState | null {
  if (!hasStorage()) return null;
  const primary = tryParse(localStorage.getItem(STORAGE_KEY));
  if (primary) return primary;
  const backup = tryParse(localStorage.getItem(BACKUP_KEY));
  if (backup) {
    console.warn('[save] primary save corrupt — recovered from backup');
    return backup;
  }
  return null;
}

export function hasSave(): boolean {
  if (!hasStorage()) return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function clearSave(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
}

/** Export as a Base64 string the player can copy or download. */
export function exportSave(state: GameState): string {
  const json = JSON.stringify(serializeState(state));
  // Encode UTF-8 safely before Base64.
  return btoa(unescape(encodeURIComponent(json)));
}

/** Import from a Base64 string. Returns null if the payload is unusable. */
export function importSave(encoded: string): GameState | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded.trim())));
    const raw = JSON.parse(json);
    return deserializeState(migrateSave(raw));
  } catch (err) {
    console.error('[save] import failed', err);
    return null;
  }
}
