# CELL: INFINITE ⚡

> A minimalist **desktop idle / incremental** game about building an automated
> energy-cell reactor. Start with a single stubborn spark; end with an
> astronomically productive lattice of synergizing cells.

CELL: INFINITE is a genuinely playable vertical slice built to feel like the
start of a real indie idle game — not a mockup. Every upgrade lands, every new
stage invites "one more level," and the whole thing is wrapped in a
Material-Design-3-flavored, dark-first interface with smooth Framer Motion game
feel.

---

## Highlights

- **Seven cell types**, introduced gradually: Generator, Amplifier, Pulse,
  Critical, Temporal, Converter, and the late-game unstable Quantum Rift.
- **A real reactor grid** — a 3×3 lattice where orthogonal adjacency creates
  synergy chains. Placement matters.
- **Milestones** every few levels (×2 production, evolutions, rank-ups) that
  break through exponential cost walls with satisfying surges.
- **Rebirth** meta-progression: collapse a cycle into **Core Fragments** and
  spend them on a permanent upgrade tree (global multipliers, crit, offline
  power, automation unlocks, extra slots, the Quantum cell, and more).
- **Active abilities** (Overclock, Chain Reaction, Golden Surge, Time
  Compression), **anomaly events**, **quests & achievements**, and
  **automation** that is earned, not given.
- **Offline progress** with a warm welcome-back summary, capped and efficiency-
  scaled so it never trivializes the game.
- **Big-number ready** via `break_infinity.js` with a central formatter
  (`1.25K`, `3.48M`, … `1Vg`, then scientific), tabular figures so numbers
  never jitter, and smooth value tweening decoupled from React re-renders.
- **Robust saves**: versioned, auto-saved, exportable/importable, with a backup
  slot and corruption recovery.
- **Procedural audio** (no asset files) and full effects/accessibility settings
  (full / reduced / minimal effects, particle toggle, reduced motion, notation,
  volume mixer, light/dark themes).

---

## Tech stack (and why)

| Choice | Reason |
| --- | --- |
| **React + TypeScript + Vite** | Fast, strict, ergonomic UI with instant HMR. |
| **Zustand** | Tiny, unopinionated store; fine-grained selectors keep re-renders cheap at 20 Hz. |
| **Framer Motion** | Spring/easing animations for UI transitions and the Rebirth spectacle. |
| **break_infinity.js** | Battle-tested big-number library for idle games — far faster than `decimal.js` and handles values well past `1e308`. |
| **Custom MD3 design system** | A hand-built token/CSS system gives more control over *game feel* (glow, tonal surfaces, motion) than dropping in MUI, while staying true to Material Design 3. |
| **Tauri v2** | Ships the web app as a small, native desktop binary with a system webview — no bundled Chromium. |

The architecture strictly separates **configuration** (balance data), **game
logic** (pure, tested functions), **state** (Zustand), and **UI** (React). The
simulation never hard-codes a balance number, and the economy is fully unit-
tested.

---

## Project structure

```
src/
  config/        Data-driven balance & content (balance, cells, milestones,
                 rebirth upgrades, abilities, quests, events)
  game/          Pure logic: decimal facade, formatter, economy formulas,
                 grid adjacency, the engine (derived stats + tick), rebirth,
                 offline, an fx event bus
  store/         Zustand game store + settings store + initial-state factory
  save/          Versioned serialize / migrate / storage (export, import, backup)
  hooks/         The single rAF game loop
  audio/         Procedural Web Audio engine
  ui/            Design-system primitives
  components/    TopBar, CellGrid/CellNode, CellDetails, BottomDock, panels/,
                 modals/, overlay/ (floating numbers, rebirth, hints)
  tests/         Vitest suites (economy, format, rebirth, save, engine,
                 progression sim, app smoke test)
src-tauri/       Tauri v2 desktop shell (Rust)
scripts/         Icon generator
docs/            Design & code explainer
```

---

## Run it

Requires **Node 18+**.

```bash
npm install
npm run dev        # play in the browser at http://localhost:1420
npm test           # run the 34-test suite
npm run build      # typecheck + production web build (dist/)
```

### Build the desktop app (Tauri)

You need the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)
for your OS (Rust toolchain, and on Linux `webkit2gtk` + `libgtk`). Then
generate the icons once and run Tauri:

```bash
python3 scripts/generate_icon.py          # writes src-tauri/icon-source.png (needs Pillow)
npm run tauri icon src-tauri/icon-source.png
npm run tauri dev                          # develop the desktop app
npm run tauri build                        # produce a native installer/binary
```

> Icons are git-ignored build artifacts, regenerated from the committed
> `scripts/generate_icon.py`.

---

## Balancing & extending

Everything a designer would tune lives in `src/config/`. To add a cell type,
append an entry to `src/config/cells.ts`; the engine interprets its `role`
automatically. To retune pacing, edit `src/config/balance.ts` — cost growth,
milestone multipliers, fragment formula, offline caps, anomaly cadence, and
unlock thresholds are all there. No logic changes required.

A headless auto-player in `src/tests/progression.test.ts` verifies that a run
reaches the first Rebirth in a reasonable time (~10 minutes of pure idle
auto-play, faster with active play) and that the next cycle is stronger.

See [`docs/EXPLAINER.md`](docs/EXPLAINER.md) for a deep dive into the design and
architecture.

---

## License

MIT — see [LICENSE](LICENSE).
