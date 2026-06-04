# Squid Technologies: Performance Review Climb

A satirical big-tech corporate roguelike **deckbuilder** — think *Slay the Spire*, but the final boss is your year-end review.

You're a fresh graduate climbing the ladder at the fictional **Squid Technologies** ("Move Tentacles Fast™"). Battle bugs, legacy systems, and the dreaded multi-person *Product Review Meeting*, level up from IC3 toward VP, and try to survive the **Calibration Council**.

Fully offline. No build step, no dependencies, no server — just open it in a browser.

## Play

Open **`index.html`** in a modern browser (Chrome recommended) and click **New Game**.

- **Pulse Score** = your health / will to stay. Hits zero → you quit, burn out, or get managed out.
- **Working Hours** = energy you spend each turn to play cards.
- **Focus** = a combo resource for payoff cards.
- Pick your path up the climb map, fight through combats and bosses, draft cards, and get promoted.

The old single-file prototype is preserved at **`index_v2.html`**.

## Tech

- **Phaser 3** (vendored locally — no build step) + vanilla JavaScript.
- Pixel art generated with AI; chiptune music + sound effects are **synthesized at runtime** via the Web Audio API (zero audio files).
- Single self-contained folder; runs straight from `file://`.

## Disclaimer

This is a work of **satire**. "Squid Technologies" and all characters, bosses, and events are fictional. Any resemblance to a specific company, product, or your last performance cycle is coincidental — and affectionate.

---

*Vibe-coded with AI coding agents.*
