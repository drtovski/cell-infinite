import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import App from '../App';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lacks a few browser APIs the app touches; provide harmless stubs.
beforeEach(() => {
  localStorage.clear();
  if (!('matchMedia' in window)) {
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0 as unknown as number);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

describe('App smoke test', () => {
  it('mounts, renders the reactor, and survives a cell click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    // Title and a cell should be present.
    expect(container.textContent).toContain('CELL');
    const cell = container.querySelector('.cell') as HTMLButtonElement | null;
    expect(cell).not.toBeNull();

    // Click the core cell — should not throw and should register a click.
    await act(async () => {
      cell!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    });

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
