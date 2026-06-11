# Squid Climber — Tests

## Quick run (no browser)

```bash
cd 00_inbox/incubator/2026_06_03_squid_climber_game
node tests/hand_layout_test.js   # 1100+ layout checks, Monte Carlo
node tests/combat_sim_test.js    # 200 random fights incl. multi-enemy
```

## Browser stress (optional)

```bash
python3 -m http.server 8642
node tests/browser_stress_test.js 25
```

Validates live Phaser hand positions after opening deal + multiple card plays.

## What's covered

| Test | Checks |
|------|--------|
| `hand_layout_test.js` | Even fan spacing, no visual holes, tile bounds, play-from-middle sequences |
| `combat_sim_test.js` | Engine stability for solo + duo + 3-enemy coordinated encounters |
| `browser_stress_test.js` | `debugValidateHand()` on real scene after draws/plays |
