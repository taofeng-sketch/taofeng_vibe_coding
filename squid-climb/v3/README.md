# Squid Technologies — Performance Review Climb · **v3 (Phaser)**

The Phaser 3 rebuild of the v2 vanilla-JS deckbuilder. This folder is the
**M0 + M1 low-regret foundation** only (per `../V3_REDESIGN_PLAN.md` §12): it
boots Phaser, renders a real Main Menu, has a working save/load system, ports
all v2 data, and stubs the rest of the scene flow. **No combat, multi-enemy,
art, or animations yet** — those are M2–M6.

The original **v2** game (`../game.js`, `../index.html`, `../styles.css`) is
**untouched and still playable**. Nothing here modifies it.

---

## How to run

**Double-click the project root `index.html`** — it now redirects straight to
this v3 game (the old v2 prototype is preserved at `../index_v2.html`). You can
also open `v3/index.html` directly. Zero-build, offline, single-folder. No
bundler, no `node_modules`, no dev server required.

> **file:// asset loading:** the asset manifest is delivered as a JS global
> (`data/manifest.js` → `window.SQUID_MANIFEST`), **not** via `load.json`/XHR.
> Chrome blocks XHR under `file://`, which previously left the manifest empty so
> every texture fell back to a gray-box placeholder. `load.image` uses the
> `<img>` tag and works under `file://`, so the real PNG art renders on a plain
> double-click. Keep `assets/manifest.json` in sync as a human-readable mirror.

- Desktop **landscape** first: 1280×720 design canvas, scaled with
  `Phaser.Scale.FIT` + `CENTER_BOTH` (letterboxes to fit any window).
- Audio is synthesized (Web Audio) — **zero audio files**. Click once to start
  music (browser autoplay policy); toggle mute via the 🔊 button or Settings.

### If you see "⚠ Phaser engine is missing"
The vendored engine blob isn't present. Download Phaser 3 (latest stable, ~1.2MB)
from `https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js` and drop it at
`v3/assets/vendor/phaser.min.js`, then reopen `index.html`. (Currently vendored:
**Phaser 3.90.0**.)

---

## Scene flow (what works now)

```
Boot → Preload → MainMenu
MainMenu:
  ├─ New Game   → fresh SaveSchemaV1 (autosave slot) → Map
  ├─ Continue   → loads latest autosave → its saved screen   (disabled if no save)
  ├─ Load Game  → slot picker (Autosave + 3 manual slots), shows level/act/deck/time
  ├─ Compendium → bestiary stub (view over ENEMIES + squid_codex unlock set)
  └─ Settings   → stub w/ working mute toggle + "Reset Save Data"

Map (stub) → routes nodes → Combat / Rest / Event (stubs) → Reward (stub) → back to Map
Combat (stub) → Reward (win path) or GameOver (lose path)
GameOver / Win (stubs) → clear autosave → MainMenu
```

Every non-menu scene is a **navigable titled placeholder** so the whole loop can
be walked end-to-end. Room-boundary **autosave** fires on entering Map and on
resolving Reward/Rest/Event (plan §7.2 — no mid-combat save in V1).

---

## Save schema (`SaveSchemaV1`, plan §7.2)

`localStorage` keys:

| Key | Purpose |
|---|---|
| `squid_save_0..2` | manual save slots |
| `squid_save_auto` | autosave (drives **Continue**) |
| `squid_meta` | per-slot menu summary `{level, act, deckSize, savedAt}` (so Load renders without parsing full saves) |
| `squid_codex` | Compendium unlock set `{enemiesSeen, enemiesDefeated, cardsSeen}` — persists **across runs** (§9.2) |
| `squid_settings` | `{muted, musicVol, sfxVol, reduceMotion, language}` |
| `squid_mute` | legacy v2 mute flag (honored for back-compat) |

A save (`SaveSchemaV1`) is:

```js
{
  version: 1,
  savedAt: <ms>,
  class: "swe",
  run: { stageIndex, floor, deck:[cardId...], pulse, maxPulse, powers:{focusSprint}, seed },
  screen: "map" | "event" | "rest" | "reward",   // resume target (never mid-combat)
  compendium: { enemiesSeen:[], enemiesDefeated:[], cardsSeen:[] },
  settings: { ... }
}
```

API in `src/engine/save.js`: `newGame()`, `save(slot, save)`, `autosave(save)`,
`load(slot)`, `listSlots()`, `continueGame()`, `hasContinue()`, `deleteSlot()`,
`getCodex()/saveCodex()`, `getSettings()/saveSettings()`, `resetAll()`, plus a
`migrate(save)` version hook.

> **Known limitation** (zero-build/local constraint, §7.2/§13.3): localStorage is
> per-browser-profile. Saves do **not** travel with the folder across machines /
> Google Drive sync.

---

## Folder layout

```
v3/
├─ index.html                 # loads phaser.min.js then game scripts, in order
├─ README.md                  # this file
├─ assets/
│  ├─ vendor/phaser.min.js    # vendored once (~1.2MB, Phaser 3.90.0)
│  └─ manifest.json           # asset manifest (§10.1); reuses ../assets/*.png
├─ data/                      # PLAIN JS DATA MODULES (ported from v2)
│  ├─ cards.js  enemies.js  encounters.js  stages.js  events.js  intros.js  lore.js
└─ src/
   ├─ audio/sound.js          # v2 Web Audio engine (verbatim port)
   ├─ engine/save.js          # SaveSchemaV1 + slots + autosave
   ├─ ui/layout.js            # LAYOUT indirection (landscape now, portrait stub §11.7)
   ├─ ui/widgets.js           # button + placeholder + gray-box texture helpers
   ├─ scenes/                 # Boot, Preload, MainMenu, Map, Combat, Reward, Rest,
   │                          #   Event, Compendium, GameOver, Win (one file each)
   └─ main.js                 # Phaser.Game({ scene:[...] }) bootstrap
```

No bundler: `index.html` includes scripts in dependency order
(audio → data → engine → ui → scenes → main). Everything attaches to a single
global `window.Squid` namespace; `window.__squid` is a debug handle.

Data reuse: the v2 art PNGs are reused in place via relative paths
(`../assets/*.png`) declared in `assets/manifest.json` — no files copied.

---

## Ported from v2 (data only — logic not re-run yet)

`CARDS` (20, + new `targeting`/`fx`/`art` fields), `REWARD_POOL`, `STARTER_DECK`,
`ENEMIES` (7, + new `aiRole`/`slot`/`anims`), `STAGES`, `LADDER`/`levelName`,
`LOSE_LINES`, `WIN_COPY`, `EVENTS`, the `Sound` engine (verbatim), and the v2
intro cutscene beats. **New V3 data files**: `encounters.js` (group defs +
`planGroup` placeholder, §3), `intros.js` (per-node intro cards, §8),
`lore.js` (bilingual Compendium lore, §9). The `effect(g)`/`plan(g,e)`/`run(g)`
function signatures are preserved for the future group-aware engine; the
foundation does **not** execute them.

Preload runs a **console sanity log** confirming all data modules loaded:
`[Squid] data modules loaded: {...} ALL_OK=true`.

---

## Done vs. stubbed

**Done (M0/M1):**
- Phaser vendored + boots at 1280×720 (FIT + CENTER_BOTH, pixelArt).
- Asset manifest + missing-asset gray-box fallback (§10.3).
- MainMenu: New / Continue / Load / Compendium / Settings (all functional).
- Save/Load: schema, slots, meta summaries, autosave hook, migrate hook.
- LAYOUT indirection object (landscape authored, portrait stubbed).
- All v2 data ported; synthesized audio ported; mute toggle works.
- Navigable scene skeleton end-to-end.

**Stubbed (later milestones):**
- M2 single-enemy combat + tween/particle juice.
- M3 multi-enemy coordinated encounters + targeting/intent stacking.
- M4 full climb map, per-node intros, level-up, Rest/Event/Reward bodies.
- M5 boss phases + signatures + adds.
- M6 full Compendium UI, settings polish, reduce-motion, **portrait layout pass**,
  real card/enemy art + sprite-sheet animations.
