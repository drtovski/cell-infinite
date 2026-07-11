# CELL: INFINITE — Design & Architecture Explainer

*Written to be read start-to-finish. If you already know idle games, skim the
Background; the interesting parts are Intuition and Code.*

---

## Background

### For the newcomer: what is an "idle / incremental" game?

An idle game is a loop of **numbers that make bigger numbers**. You produce a
resource, spend it to increase production, and repeat. The craft is entirely in
the *pacing*: the cost of the next upgrade rises exponentially, your income
rises too, and the tension between those two curves is the game. When income is
winning you feel powerful and buy quickly; when cost is winning you hit a
"wall," and the design must hand you a new lever — a milestone, a new mechanic,
or a **prestige** reset that trades your progress for a permanent multiplier.

> **Prestige / Rebirth.** The genre's signature move: voluntarily reset most of
> your progress in exchange for a meta-currency that makes every future run
> faster. A good prestige feels like leveling *up*, not starting *over*.

### Narrower background: what this codebase had to solve

Idle games have three recurring engineering hazards, and this project is
organized around defusing them:

1. **Numbers overflow.** Production quickly passes `1.8 × 10³⁰⁸`, where a
   JavaScript `double` becomes `Infinity`. We need arbitrary-magnitude numbers.
2. **The loop fights the frame rate.** If you add "income per frame," a 144 Hz
   monitor earns twice as fast as a 72 Hz one. Simulation must be integrated
   against real elapsed time (delta time), not frames.
3. **Re-renders melt the CPU.** Values change dozens of times per second. Naive
   React will re-render the whole tree on every tick.

---

## Intuition

### The economy in one picture

Every cell level costs `baseCost × growthᴸ` and every level adds a flat chunk of
production. Cost is **exponential**; raw production is **linear**. Left alone,
cost always wins — that's the wall. Milestones are the counter-punch: at levels
10, 25, 50, … production is multiplied by ×2 (and more, boosted by Rebirth).

Concretely, the starting **Ion Core** (`baseCost = 10`, `growth = 1.1`,
`0.5/s per level`):

| Level | Cost of next | Production |
| ---: | ---: | ---: |
| 1 | 10 | 0.5/s |
| 10 | ~24 | 5/s → **×2 = 10/s** (milestone) |
| 25 | ~108 | ~12.5/s → **×4** (milestones stack) |

So the first minutes are brisk (cheap levels, frequent milestones), then the
wall arrives right as the second cell type unlocks. The player always has a
fresh lever.

### Synergy makes placement a puzzle

Cells live on a 3×3 grid. An **Amplifier** boosts the generators *orthogonally
adjacent* to it; a **Converter** supercharges adjacent Amplifiers; a **Temporal**
cell speeds up its neighbours. So "where do I put this?" becomes a small,
pleasant optimization problem — the toy version of a factory game.

### Rebirth as a smooth curve

How many Core Fragments should a run give? We want it to scale with *orders of
magnitude*, not raw value, so it stays legible forever:

```
fragments = floor( 2.2 × (log10(runEnergy) − log10(1e4))^1.5 )
```

A run that made `1e6` energy → 6 fragments; `1e9` → 24; `1e12` → 49. Each fragment
permanently multiplies production, and lifetime fragments add a gentle
`1 + 0.02·√(earned)` passive bonus, so **spending** fragments never feels like
losing your prestige power.

---

## Code

### Layering

The repository is split so that the simulation and the balance never entangle:

- `src/config/*` — pure **data**. Balance numbers, the cell catalogue, upgrades.
- `src/game/*` — pure **logic**. No React, no globals; every function is
  testable in isolation.
- `src/store/*` — **state** (Zustand) and the actions that mutate it.
- `src/components/*` — **UI** only.

#### 1. One Decimal facade

```ts
// src/game/decimal.ts
import Decimal from 'break_infinity.js';
export { Decimal };
export function D(value: DecimalSource = 0): Decimal { return new Decimal(value); }
```

Every module imports `Decimal`/`D` from here. Swapping the math library later is
a one-file change.

#### 2. Closed-form bulk buying

Buying "×25" or "Max" must not loop 25 (or a million) times. The cost of `n`
levels from level `L` is a geometric series with a closed form:

```ts
// base·gᴸ·(gⁿ − 1)/(g − 1)
export function bulkCost(type, currentLevel, count, growth): Decimal { … }
```

`maxAffordable` inverts it with a logarithm, then nudges by ±1 to erase
floating-point error at exact boundaries — pinned by a unit test that checks
`bulkCost(count) ≤ budget < bulkCost(count+1)`.

#### 3. `computeDerived` — the reactor solved each tick

`src/game/engine.ts` turns the raw state into everything the game needs: global
speed, crit chance/multiplier, per-generator production *including neighbour
synergy*, the global multiplier (Rebirth × achievements × crit EV × converters ×
quantum × buffs × abilities), click power, the longest chain, and projected
fragments.

> **Design note — crits without jitter.** Passive production applies the
> *expected value* of a crit (`1 + chance·(mult−1)`) so the per-second readout is
> perfectly smooth, while **clicks** roll a real crit for a punchy, gold,
> particle-y payoff. Smooth where it must be; exciting where it can be.

#### 4. `advance(state, dt, ctx)` — the pure tick

```ts
export function advance(state, dtRaw, ctx): GameState {
  const dt = clamp(dtRaw, 0, BALANCE.maxCatchUpSeconds); // no spikes
  const derived = computeDerived(state, ctx.mod);
  // accrue energy, auto-buy, charge/fire pulses, tick abilities & buffs,
  // spawn/expire anomalies, unlock slots & cells, evaluate quests …
  return { ...state, /* new sub-objects only where something changed */ };
}
```

It is a **pure function**: it takes state and returns state, emitting transient
visual/audio events through an injected `emit` callback (no globals), which is
why the headless progression test can run thousands of simulated seconds with a
no-op emitter.

#### 5. The loop is frame-rate independent

```ts
// src/hooks/useGameLoop.ts
const dt = (t - last) / 1000;
if (dt > maxCatchUp * 1.5) store().applyCatchUp(realGap); // tab was hidden
else store().tick(dt);
```

`requestAnimationFrame` gives us real elapsed seconds; long stalls fall back to a
generous catch-up, and true offline time is reconstructed from `lastSaved` at
boot.

#### 6. Re-renders stay cheap

Two tricks keep 20 Hz updates from thrashing React:

- **Big numbers bypass React entirely.** `<AnimatedNumber>` subscribes to the
  store, keeps its target in a ref, and eases the displayed value in its own rAF
  loop, writing `textContent` directly. The parent never re-renders because of
  the number.
- **Continuous animation is CSS/GPU.** Cell cores breathe and rings spin via CSS
  keyframes; particles and floating numbers live in a decoupled overlay fed by
  the `fx` event bus, never by game state.

#### 7. Saves that survive

```ts
serializeState → JSON (Decimals as strings, `derived` omitted) → localStorage
loadGame → parse → migrateSave (merges onto a fresh template) → deserialize
```

`migrateSave` deep-merges the loaded blob over a freshly generated template, so
a missing or newly-added field just takes its default and a partially corrupt
save is *repaired* rather than rejected. A backup slot holds the previous save
for recovery.

---

## Verification

- **34 unit tests** (`npm test`) cover:
  - the formatter (suffixes, scientific fallback, negatives, durations),
  - the economy (closed-form vs. naïve sum, `maxAffordable` boundaries, buy
    modes, growth reduction),
  - Rebirth (fragment curve monotonicity, modifier math, the passive bonus),
  - saves (lossless `1e250` round-trips, migration repair, offline caps),
  - the engine (production, **frame-rate independence**, dt clamping, synergy,
    pulse bursts),
  - a **headless progression sim** (reaches first Rebirth in ~10 min of idle
    auto-play; the next cycle is stronger),
  - and an **App smoke test** that mounts the whole UI in jsdom and clicks a
    cell without throwing.
- **Typecheck**: `npm run build` runs `tsc --noEmit` under `strict` (plus
  `noUnusedLocals`/`noUnusedParameters`) and then a production Vite build.

### Manual QA checklist

1. `npm run dev`, open the app. Click the Ion Core — energy and a floating
   number appear; occasionally a gold crit.
2. Buy levels via the right panel; switch buy modes (×1 → Max). Watch the cell
   flash and the milestone meter fill.
3. Reach ~350 energy → a slot unlocks → build a **Resonator** next to the core;
   confirm the generator's production jumps (synergy line appears).
4. Reach 1e6 energy → open **Rebirth** → Ascend; the overlay plays, fragments
   are granted, the run resets, and Core Fragment upgrades become buyable.
5. Reload the page mid-run → the **Welcome back** offline modal appears.
6. Settings → Export, then Hard reset, then Import the code → progress restored.

---

## Alternatives

**State management — Zustand vs. Redux Toolkit**

| | Zustand (chosen) | Redux Toolkit |
| --- | --- | --- |
| Pros | Tiny; selector-based re-renders; trivial to mutate at 20 Hz | Devtools, time-travel, strong conventions |
| Cons | Fewer guardrails on a large team | More boilerplate; overkill for a single-player loop |

**Big numbers — `break_infinity.js` vs. `decimal.js`**

| | break_infinity (chosen) | decimal.js |
| --- | --- | --- |
| Pros | Purpose-built for idle games; very fast; ample range (`~1e10¹⁵`) | Arbitrary precision; general-purpose |
| Cons | Only ~17 significant digits | Much slower for hot per-tick math |

**Styling — custom MD3 system vs. MUI**

| | Custom tokens + CSS (chosen) | Material UI |
| --- | --- | --- |
| Pros | Full control over glow/motion/game feel; tiny CSS | Batteries-included components |
| Cons | We build our own primitives | Heavier; fights you on bespoke game visuals |

---

## Suggested people to talk to

This is a greenfield repository — the entire vertical slice landed in the
initial commit, so there is no prior authorship history to mine. For future
changes, the natural owners map to the layers:

- **Balance / pacing** → whoever edits `src/config/balance.ts` and the
  progression sim; that pair defines the whole feel of a run.
- **Simulation correctness** → the author of `src/game/engine.ts` and its tests;
  most subtle bugs (double-counting, dt handling) live there.
- **Save safety** → the author of `src/save/*`; migrations are where player data
  is won or lost.

---

## Quiz

<details>
<summary>1. Why does passive production use the <em>expected value</em> of a crit, but clicks roll a real crit?</summary>

**Answer: to keep the per-second display smooth while keeping clicks exciting.**
If passive income rolled real crits every tick, the "/s" readout would flicker
wildly. Using EV (`1 + chance·(mult−1)`) makes it deterministic and smooth. A
click is a discrete player action, so a real roll there produces a satisfying,
occasional gold payoff without destabilizing any readout.
</details>

<details>
<summary>2. What makes the game loop independent of frame rate?</summary>

**Answer: `advance` integrates against real delta time, not frames.** The rAF
loop measures elapsed seconds and passes `dt` to `tick`; energy gained is
`perSecond × dt`. A test asserts one 1-second step equals ten 0.1-second steps.
`dt` is also clamped (`maxCatchUpSeconds`) so a background stall can't produce a
spike, and long gaps use a separate catch-up path.
</details>

<details>
<summary>3. How does the UI show numbers changing 20×/second without re-rendering React 20×/second?</summary>

**Answer: `<AnimatedNumber>` subscribes to the store directly and tweens in its
own rAF, writing `textContent`.** It never calls `setState`, so React doesn't
reconcile. Continuous cell visuals are CSS keyframes, and floating numbers come
from the decoupled `fx` event bus — none of which touch the game state.
</details>

<details>
<summary>4. Why is <code>fragmentBase</code> (1e4) lower than <code>rebirthUnlockEnergy</code> (1e6)?</summary>

**Answer: so the very first Rebirth already awards fragments.** Fragments scale
with `log10(runEnergy) − log10(fragmentBase)`. If the base equalled the unlock
threshold, the first eligible Rebirth would compute `(0)^1.5 = 0` fragments — a
dead prestige. With the base at 1e4, unlocking at 1e6 yields ~6 fragments. (A
unit test now guards this.)
</details>

<details>
<summary>5. What happens on load if the primary save is corrupt or missing a field?</summary>

**Answer: it is repaired, not rejected.** `migrateSave` deep-merges the loaded
data onto a freshly generated template, so any missing/renamed field takes its
default. If JSON parsing fails outright, `loadGame` falls back to the backup
slot, and only if that also fails does it start a fresh game.
</details>
