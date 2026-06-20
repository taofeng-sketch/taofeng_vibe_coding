# Munch Monster 疯狂大嘴怪

An iPhone-friendly photo minigame prototype for kids.

Source of truth: this incubator folder. The GitHub publish clone under `~/.cache/photo-munchies-publish` is only a temporary deployment workspace, not the place to edit source code.

Published web prototype:

- GitHub folder: <https://github.com/taofeng-sketch/taofeng_vibe_coding/tree/main/photo-munchies>
- Play URL: <https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/> (redirects straight to the live camera game)
- Web live prototype: <https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/live.html>
- Tutorial: <https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/tutorial.html>

## How To Play

1. For the fastest phone test, open the Web live prototype in Safari.
2. Tap **Play Game** and allow camera access.
3. Open your mouth when fruit reaches your tracked mouth.
4. Close your mouth to recharge energy; do not hold it open forever.
5. Chase the roaming fruit by moving your head, avoid messy splats, and save a replay if the browser supports recording.

The Web live version now uses MediaPipe Face Landmarker for browser mouth tracking. It also has Kimi fruit-smash art in [`art/`](./art/), an image-model-generated bomb explosion sprite, bomb hazards that only explode when eaten, 3-2-1 bomb countdowns that disappear safely if ignored, 10 hearts, energy reset, arcade-style pop text, and an 80s-style Game Over overlay that fades out before the final share card appears. The final result still uses a cleaned messy-play screenshot with a highlighted score badge, so Game Over, Double Time, hearts, and timer HUD do not pollute the share card. It also includes face-attached saturated fruit splats, fixed arcing fruit paths that do not chase head jitter, fixed bomb drop spots that do not follow the face, centered target zones away from screen edges, early fruit/bomb spacing, progressive bomb pacing with no bombs queued in the first 10 seconds, 1-2 guaranteed midgame bombs between 10 and 20 seconds, a dedicated final-rush burst that spawns 18 fast fruit/bomb objects during Double Score time, mobile one-screen layout checks for iPhone SE/390px/430px viewports, a front-layer mouth, eye-landmark-attached cartoon eyes that stay visible with lashes and morph from flirty half-lidded eyes into oversized cute peek-out eyes as fruit splats cover the face, countdown hover rings, a fallback hold-mouth button if tracking fails, local replay recording, a bilingual tutorial page, and louder procedural WebAudio music/SFX for fruit chomps, fruit splats, countdown ticks, bomb blasts, safe bombs, final rush, win, and Game Over. The native iPhone app remains the better path for Apple Vision + ReplayKit experimentation.

## Local Run

Double-click `index.html`, or start a local server:

```bash
python3 -m http.server 4174
```

Open <http://localhost:4174>.

Open the web live version locally:

```bash
python3 -m http.server 4174
```

Then visit <http://localhost:4174/live.html>.

For a no-camera verification pass, open <http://localhost:4174/live.html?debugFace=1>. Add `&debugBomb=1` to seed an eaten-bomb explosion, `&debugBombMiss=1` to verify an ignored bomb disappears safely, and `&debugFatal=1` to force the Game Over path. These modes simulate a moving face and write `data-debug-state` on the game canvas so face-attached splats can be checked against the moving face anchor.

## iPhone Test

For the easiest iPhone test, run:

```bash
./scripts/serve_iphone.sh
```

It prints the iPhone URL and creates a local QR launch page. On the iPhone, join the same Wi-Fi as the Mac and open the printed URL. Then use Safari's Share button -> **Add to Home Screen** if you want it to feel more app-like.

## Technical Notes

- Plain HTML, CSS, and JavaScript.
- No install, no build, no backend.
- Photos are processed locally in the browser using Canvas.
- Sound is generated locally with WebAudio, so anyone opening the website on their own phone gets the same built-in SFX/music without separate asset downloads. Chrome replay export has been verified with `ffprobe` to include video plus an audio stream; Safari/iPhone replay audio still needs a real-device save test because Safari WebDriver automation is disabled on this Mac.
- Designed for iPhone Safari touch input, with mouse support for desktop testing.
- Default mode is **Gentle**, with longer timers for the first kid playtest.

## Native iOS App

There is also an iPhone app wrapper in [`ios/`](./ios/). It runs the current Munch Monster game inside a SwiftUI `WKWebView`: Simulator uses the bundled local debug game, and real iPhone uses the published HTTPS game for reliable camera permission handling.

```bash
./ios/run_simulator.sh
```

Open in Xcode for real-device testing:

```bash
open ios/PhotoMunchies/PhotoMunchies.xcodeproj
```

See [`ios/README.md`](./ios/README.md) for simulator and real-device instructions. After changing the web game, `./ios/run_simulator.sh` automatically syncs the latest web files into the app bundle via [`scripts/sync_ios_webgame.sh`](./scripts/sync_ios_webgame.sh).

The older native SwiftUI prototype remains in the project for reference, but the app entry now launches the current Web game wrapper.

## Verification

Run the automated browser smoke test:

```bash
./scripts/smoke_test.sh
```

Publish the web version to GitHub Pages:

```bash
./scripts/publish_to_github.sh
```

See [`design_plan.md`](./design_plan.md) for the product plan, [`dependency_plan.md`](./dependency_plan.md) for the end-to-end dependency plan, [`MONETIZATION.md`](./MONETIZATION.md) for AdSense notes, and [`playtest_checklist.md`](./playtest_checklist.md) for the first kid/iPhone test.
