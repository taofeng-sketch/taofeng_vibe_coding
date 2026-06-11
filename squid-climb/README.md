# Squid Technologies: Performance Review Climb

A satirical big-tech corporate roguelike **deckbuilder** — think *Slay the Spire*, but the final boss is your year-end review.

You're a fresh graduate climbing the ladder at the fictional **Squid Technologies** ("Move Tentacles Fast™"). Battle bugs, legacy systems, and the dreaded multi-person *Product Review Meeting*, level up from IC3 toward VP, and try to survive the **Calibration Council**.

Fully offline. No build step, no dependencies, no server — just open it in a browser.

## Play

Just open **`index.html`** in a modern browser (double-click works — no server needed) and click **New Game**.

- **Pulse Score** = your health / will to stay. Hits zero → you quit, burn out, or get managed out.
- **Working Hours** = energy you spend each turn to play cards.
- **Focus** = a combo resource for payoff cards.
- Pick your path up the climb map, fight through combats and bosses, draft cards, and get promoted.

## Tech

- **Phaser 3** (vendored locally — no build step) + vanilla JavaScript, single flat folder.
- **Canvas2D renderer** (not WebGL) so the AI-generated pixel art loads correctly straight from `file://` (under `file://` every file is its own origin, and WebGL refuses cross-origin textures).
- Chiptune music + SFX are **synthesized at runtime** via the Web Audio API (zero audio files); every scene — intro, map, combat, boss, rest, event, reward, win — has its own track.
- Card hand shows a live hover-recognition ring so you can see exactly which card is under the cursor.

## Folder layout

```
index.html        # the game — loads phaser.min.js then the scripts, in order
assets/           # art PNGs + cards/ + vendor/phaser.min.js + manifest.json
data/             # cards, enemies, encounters, stages, events, intros, lore, manifest.js
src/
  main.js         # Phaser.Game bootstrap (Canvas renderer)
  audio/sound.js  # synthesized chiptune music + SFX
  engine/         # combat engine + save system
  ui/             # card view, FX, layout, widgets
  scenes/         # Boot, Preload, MainMenu, Intro, Map, RoomIntro, Combat,
                  #   Reward, Rest, Event, Compendium, GameOver, Win
```

Scripts carry a `?v=N` cache-busting token — bump it in `index.html` after edits so a plain double-click never serves a stale cached copy.

## Disclaimer

This is a work of **satire**. "Squid Technologies" and all characters, bosses, and events are fictional. Any resemblance to a specific company, product, or your last performance cycle is coincidental — and affectionate.

---

*Vibe-coded with AI coding agents. Mirrored publicly at `taofeng-sketch/taofeng_vibe_coding` → `squid-climb/`.*
