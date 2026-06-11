# Squid Technologies: Performance Review Climb — Game Design

A Slay-the-Spire-style roguelike deckbuilder. Theme: surviving the corporate ladder at a fictional big-tech company, **Squid Technologies** ("Move Tentacles Fast"). Broad big-tech satire (any FAANG/unicorn refugee should laugh), with subtle insider easter eggs.

Source of truth for mechanics is `src/engine/combat.js`; card/enemy/stage data live in `data/*.js` (`cards.js`, `enemies.js`, `encounters.js`, `stages.js`, `events.js`). This doc describes the shipped build and intent. (The mechanics below were designed for the v2 prototype and carried over verbatim into the current Phaser build.)

---

## What v2 added (over the first slice)
- **Pixel-art sprites** for the player, every enemy, and both bosses, plus cinematic backgrounds (`assets/`), wired into the UI with an emoji fallback if an image fails to load.
- **Pixel-art intro cutscene** (skippable): happy fresh grad -> joins Squid Technologies (IC3) -> starts climbing -> camera pulls back to reveal the long winding ladder to VP.
- **Web Audio music + SFX** (fully synthesized, no audio files): a distinct looping chiptune track **per scene** (intro / menu / map / combat / boss / rest / event / reward / win) with an arpeggio + drum-groove layer, plus SFX for draw/play/discard/hit/hurt/block/level-up/win/lose. Mute toggle (persists in `localStorage`).
- **Node-based climb map** with branching path choices, Rest and Event nodes.
- **IC-level progression**: every cleared node levels you up the ladder, IC3 -> ... -> VP.
- **8 Working Hours / turn** economy (re-costed cards, scaled enemies).
- **Combat animations**: card deal-in (staggered), enemy attack lunge, screen shake, floating damage/heal/block numbers, hurt flash, plus `image-rendering: pixelated` throughout.

---

## Core loop

```
Title -> Intro cutscene -> Class select -> CLIMB MAP (pick a node)
   -> Combat / Elite / Boss / Rest / Event -> (reward) -> level up -> back to MAP -> ... -> Boss -> Win/Lose
```

Beat the **Calibration Council** (final boss) to win and "make VP." Drop to 0 **Pulse Score** to lose.

---

## Resources (the satire layer)

| Game term | Classic equivalent | Flavor |
|---|---|---|
| **Pulse Score** | HP | Motivation / will to stay. 0 = you exit the company. Start 80. |
| **Working Hours** | Energy | Time per turn to play cards. **Resets to 8 each turn.** |
| **Focus** | Combo resource | Built by deep-work cards; spent by Ship It / Move the Metric. Persists within a fight. |
| **Block** | Block | Temporary shield, resets at start of your turn. |

**Loss screens** (randomized): *You quit* / *You burned out* / *You were managed out*.
**Win screen**: *You made VP.*

## Status effects

| Status | Target | Effect |
|---|---|---|
| `Weak` | player/enemy | Deals 25% less damage. Ticks down 1/turn. |
| `Burnout` | player | Lose N Pulse at the start of your turn. |
| `Confused` | player | Next card fizzles. Applied by the boss's "Needs more scope." |
| `Motivated` | player | Next attack +50% (granted by Caffeinate). |
| `Tech Debt` | deck | Unplayable junk; while held at end of turn, -2 Pulse each. |

---

## Software Engineer — starting deck (10 cards)

| Card | Cost | Type | Effect |
|---|---|---|---|
| Fix Bug x4 | 2 | Attack | Deal 8 |
| Refactor x3 | 1 | Skill | Gain 6 Block |
| Write Unit Test | 1 | Skill | Gain 5 Block, draw 1 |
| Coffee | 0 | Skill | +3 Working Hours, -2 Pulse |
| Push to Prod | 2 | Attack | Deal 14, shuffle a Tech Debt into draw pile |

## Reward pool (offered after each combat/elite)

Hotfix (1, deal 10 / +6 if lethal) · Pair Program (1, 9 Block + draw) · Ask in Workplace (1, draw 2) · Work Late (1, +4 hours, draw 1, -4 Pulse) · Deep Work (2, +2 Focus, draw 1) · Rubber Duck (0, +1 Focus) · Ship It (2, deal 7 +5/Focus, spend) · Run Experiment (2, **metric**, 50% deal 26 / else Weak 1) · Move the Metric (2, **metric**, deal 8 +5/Focus) · Mentorship (1, heal 12) · Touch Grass (1, clear Burnout + heal 7) · Deprecate It (3, deal 22, Exhaust) · Focus Sprint (2, **power**: +1 Focus/turn) · Caffeinate (1, +2 hours + Motivated 1).

`metric` cards satisfy the boss move "What's the Incrementality?" — see below.

---

## Climb map & IC ladder

8 stages, bottom to top. Branching stages let you pick your path; some are forced (boss/rest).

| Stage | Act | Node options |
|---|---|---|
| 0 | Act I — Onboarding | Bug Swarm (combat) |
| 1 | Act I — The System | Legacy Service (combat) **or** On-Call Shift (event) |
| 2 | Act I — Breather | Rest |
| 3 | Act I — Boss | Half-Year Check-In (elite) |
| 4 | Act II — XFN Chaos | Argue with a PM **or** Defend your Metric vs a DS |
| 5 | Act II — Politics | Reorg (event) **or** more Legacy Code |
| 6 | Act II — Breather | Rest |
| 7 | Performance Season | **Calibration Council (final boss)** |

**Leveling:** clearing any node bumps `run.floor`, mapped to `LADDER = [IC3, IC4, IC5, IC6, Senior (IC7), Staff, Senior Staff, Principal, VP]`. A "LEVEL UP" banner shows on the map. Beating the Council = VP = win.

**Rest node:** Sleep (heal 24 Pulse) / Work Late (add a Hotfix, lose 10 Pulse) / Network (remove a Tech Debt, or heal 6 if none).
**Events:** On-Call (fix it for a Hotfix at a Pulse cost, or mute it and gamble) and Reorg (embrace change to heal, or "update resume" for a random card).

---

## Enemies

| Enemy | Tier | HP | Behavior |
|---|---|---|---|
| Bug Swarm | normal | 55 | "Infect Code" (10); every 3rd turn "Spread to Prod" (6 + Tech Debt to discard). |
| Legacy Service | normal | 85 | Alternates "Add a Layer of Abstraction" (+14 Block) and "Cascading Failure" (20). |
| PM Who Says 'Let's Align' | normal | 70 | "Let's Align" (Weak 2), "Need More Context" (discard a card), "Circle Back" (13). |
| DS Who Disagrees | normal | 75 | "Not Stat Sig" (Weak 2), "Need More Experimentation" (9 + Weak 1), "Confidence Interval" (14). |
| Half-Year Check-In | elite | 115 | "Constructive Feedback" (14), "Needs Improvement" (Burnout 2), "Raised Expectations" (10). |
| Calibration Council | boss | 155 | "Needs More Scope" (Confused), "Not Aligned" (20), "What's the Incrementality?" (14, **doubled to 27 if you hold no metric card**), "Stack Ranking" (+16 Block). |

---

## Balance (validated)

Tuned for the 8-Working-Hours economy. Validated with a Node DOM-stubbed harness driving a *reasonable but suboptimal* bot (does not hoard metric cards for the boss, does not optimally combo Focus):

- **300 simulated runs: ~64% win, 0 crashes.**
- **~99% of losses occur at the final boss (floor 7).** Acts I-II are survivable; the Calibration Council is the climactic test.
- A human who keeps a metric card in hand for "What's the Incrementality?" and builds Focus for Ship It will win comfortably more (~75-85% est.).

Re-run anytime: the combat engine (`src/engine/combat.js`) is framework-agnostic and headless-testable — drive `start`, `playCard`, `endTurn`, `enemyTurn` directly, or drive the live Phaser scenes via the `debug*` hooks (`debugPlayFirstPlayable`, `debugSelectFirstReachable`, `debugBegin`, etc.).

---

## Audio (synthesized, offline)
A small Web Audio engine (`Sound` in `src/audio/sound.js`) sequences chiptune from MIDI-number patterns (square/triangle/saw oscillators with envelopes) plus an arpeggio voice and a kick/snare/hat drum groove, and renders SFX as short tones + noise bursts. Initialized on the first user gesture to satisfy browser autoplay rules. Mute persists in `localStorage`. No audio files ship.

## Pixel art (offline)
PNG art in `assets/` (player, enemy_*, boss_*, scene_hq, scene_climb, intro_*, plus `cards/` — one icon per card). Rendered via the **Canvas2D** renderer so cross-origin `file://` images display on a plain double-click (WebGL refuses them). Each sprite/card has a glyph fallback if its image is missing, so the game never breaks.

---

## Known limitations (intentional, slice scope)
- One class (SWE). DS / PM / Designer not yet implemented.
- Map is hand-authored (not procedurally generated).
- Save/load **is** implemented (`src/engine/save.js`: autosave + 3 manual slots, persisted in `localStorage`; note saves are per-browser-profile and don't travel with the folder).
- See [CODEX_HANDOFF.md](CODEX_HANDOFF.md) for the expansion roadmap (more classes, procedural map, Vite/React/TS for a Steam build).
