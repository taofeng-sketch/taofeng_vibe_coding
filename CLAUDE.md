# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A personal workshop of three independent, self-contained interactive experiences built with vanilla HTML/CSS/JS. The guiding philosophy is "ship, not study" — iterate with AI until ideas are real and playable, keep what works. **Zero build steps, zero external servers, no bundlers, no frameworks (except Phaser in squid-climb which is vendored).**

Projects:
- **WorldCupSimulation** — Bilingual (Chinese/English) 2026 World Cup fan app. Lives at `WorldCupSimulation/`.
- **squid-climb** — Satirical big-tech roguelike deckbuilder (Phaser 3). Lives at `squid-climb/`.
- **dinosaur-adventure** — Kids' platformer prototype with AI coach. Lives at `dinosaur-adventure/`.

All three deploy to GitHub Pages as static files.

---

## WorldCupSimulation

### Commands

```bash
cd WorldCupSimulation
npm run dev          # Dev server at http://localhost:4173 (optional — works without)
npm test             # Node.js test harness (2,256 team pairings, schedule integrity)
npm run check        # Syntax validation on all .js files
npm run update-data  # Manual ESPN data refresh (also runs via CI 6x/day)
```

### Architecture

**No build step.** All modules use native ES6 `import`/`export` loaded by the browser or Node directly.

Key modules and their roles:
- **app.js** (~35 KB) — Main UI logic, language toggle, event handling, filter state
- **data.js** — 48 teams × 12 groups, team strength/form/rank indices, demo match days
- **schedule.js** — Full 104-match calendar (72 group-stage + 32 knockout)
- **model.js** — Win-probability calculator: strength 72%, form 18%, rank 10%
- **profiles.js** — Bilingual player profiles (one key player per team)
- **viewing.js** — Timezone conversion, broadcaster lookup, IANA region detection
- **live-snapshot.js** — Auto-updated match results (written by CI, ~70 KB)

**Data pipeline**: GitHub Actions fetches ESPN's public scoreboard JSON 6× daily → validates exactly 104 matches → canonicalizes team names to match `schedule.js` → writes `live-snapshot.js` → commits only if validation passes. If validation fails, the last valid snapshot is kept unchanged.

**State**: All user state (predictions, cheering wall, team support) is stored in `localStorage`. No server.

### CI

- **worldcup-simulation-qa.yml** — Triggers on any push/PR touching `WorldCupSimulation/**`. Runs `npm test && npm run check`.
- **worldcup-daily-refresh.yml** — Cron 6× daily. Fetches ESPN data, validates, and auto-commits `live-snapshot.js` if changed. Active June 11–July 20, 2026.

### Conventions

- Probabilities are entertainment, never imply guaranteed outcomes or FIFA affiliation. UI language reflects this ("本地 AI 原型").
- Broadcaster links only shown for verified regions; unsupported regions are explicitly disabled (no guessing).
- `QA.md` lists 58-item regression checklist and release gates. Run it before any release.

---

## squid-climb

### Commands

```bash
# No build step — open index.html directly or serve locally
python3 -m http.server 8642   # http://localhost:8642

# Tests (headless Node.js)
cd squid-climb
node tests/hand_layout_test.js    # 1,100+ Monte Carlo hand-spacing checks
node tests/combat_sim_test.js     # 200 random combat simulations

# Browser stress test (requires server running)
node tests/browser_stress_test.js 25

# Publish
bash scripts/publish_to_github.sh
```

### Architecture

**Phaser 3** (vendored at `assets/vendor/phaser.min.js`, ~1.2 MB). Canvas2D renderer — intentional, because WebGL breaks under `file://` with cross-origin images. All scripts loaded via `<script>` tags with `?v=N` cache-bust tokens; bump all version tokens together when assets or code change.

**Scene flow**: Boot → Preload → MainMenu → Intro → Map → RoomIntro → Combat → Reward/Rest/Event → (loop back to Map) → Win or GameOver

**Combat engine** (`src/engine/combat.js`) is **headless and framework-agnostic** — no Phaser, no DOM, no `setTimeout`. It's a pure JS state machine that emits a semantic `fx` event queue for the `Combat.js` scene to animate. This is what makes `combat_sim_test.js` possible.

Combat state shape:
```js
{
  player: { pulse, hours, block, focus, status, powers, hand, deck, discard },
  enemies: [ { hp, block, status, intent, plan } ],
  target: 0,       // selected enemy index
  turn: "player",  // "player" | "enemy"
  fx: []           // semantic animation events
}
```

Resources: `pulse` (HP, lose at 0), `hours` (8/turn energy), `focus` (combo resource, persists in fight), `block` (resets on player turn start).

**Enemy turn resolution order**: intents resolve in slot order, so a debuff in slot 0 affects the attack in slot 2 of the same turn — coordinate encounter design around this.

**Audio** (`src/audio/sound.js`): Web Audio API synthesis only — zero audio files shipped. Per-scene chiptune tracks + SFX generated at runtime.

**Layout** (`src/ui/layout.js`): `LAYOUT` singleton holds all screen positions. Never hardcode coordinates in scene files.

**Asset images**: PNG pixel art in `assets/`. Cards fall back to emoji glyphs if an image fails to load — the game must never break on a missing asset.

### Conventions

- The company is "Squid Technologies" ("Move Tentacles Fast™"). No real company names, logos, employee names, or confidential product names. See `LEGAL_NOTES.md`.
- `GAME_DESIGN.md` is the authoritative reference for card stats, enemy mechanics, and balance targets (~64% win rate, validated via 300 headless simulations).
- `manifest.js` (not `manifest.json`) is the runtime asset list — it's a `<script>` global so it works under `file://` without XHR.

---

## dinosaur-adventure

### Commands

```bash
# No server needed — double-click index.html
python3 -m http.server 4173   # Optional local server
```

### Architecture

Single-file Canvas 2D platformer (`game.js`, 901 lines). 1280×720 design viewport, 7600×720 world. No modules, no build.

Physics constants: gravity 1900 px/s², run speed 330, jump speed 760. All 18 static + 3 moving platforms, hazards, and collectibles are defined inline in `game.js`.

**Coach AI**: local only, observes player position and failure count, emits contextual Chinese-language hints. No network calls, no data collection.

---

## Cross-Project Conventions

- **`file://` safety**: squid-climb and dinosaur-adventure must work by double-clicking `index.html` — no `fetch()`, no XHR, no ES modules (squid-climb uses `<script>` globals for data files).
- **localStorage only**: no backend, no auth, no telemetry. State that can't fit in localStorage isn't supported yet.
- **Bilingual where applicable**: WorldCupSimulation and dinosaur-adventure are Chinese-primary with English support. Keep both languages in sync when editing UI strings.
- **Portable, zero-dependency**: The only external dependency that ships is Phaser 3 (vendored). Everything else is browser built-ins.
