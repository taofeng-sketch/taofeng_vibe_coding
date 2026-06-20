# taofeng_vibe_coding

> A public workshop where I build small, playable products with AI coding agents — games, native apps, interactive tools, and experiments that are meant to be run, clicked, broken, and improved.

For most of my career as a product manager, my job was to describe what should get built and work with teams who could build it. This repo is the opposite exercise: I sit down with AI agents and make the whole thing myself — product idea, design, code, art direction, bugs, testing, and the honest notes after the demo.

I call it "vibe coding" because the starting point is often a feeling: a joke, a toy, a family idea, a workflow itch, or a product question. The standard is simple: **ship something playable, learn from it, and keep improving the projects worth keeping.**

> 一个用 AI 一起做小产品的公开工作台。不是只写想法，而是把东西做出来、跑起来、玩一遍，再决定要不要继续。

---

## Project Directory

| Project | Type | Status | Open / Docs |
|---------|------|--------|-------------|
| **HabitApp iOS** | Native iOS longevity habit coach | Prototype app, simulator-verified | [Folder](./habitapp-ios) |
| **WorldCupSimulation · Pulse26** | 2026 World Cup interactive fan site | Published web app, automated QA/data refresh | [Play](https://taofeng-sketch.github.io/taofeng_vibe_coding/WorldCupSimulation/) · [Folder](./WorldCupSimulation) |
| **Squid Technologies: Performance Review Climb** | Satirical browser deckbuilder game | Published playable game | [Play](https://taofeng-sketch.github.io/taofeng_vibe_coding/squid-climb/) · [Folder](./squid-climb) |
| **Dinosaur Adventure / 恐龙大冒险** | Kid-inspired browser platformer | Published playable prototype | [Play](https://taofeng-sketch.github.io/taofeng_vibe_coding/dinosaur-adventure/) · [Folder](./dinosaur-adventure) |
| **Photo Munchies** | Kids selfie/photo minigame | Published web prototype with live face/mouth tracking; native iOS lives in the private incubator workspace | [Play](https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/) · [Live Fruit](https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/live.html) · [Folder](./photo-munchies) |

---

## Projects

### HabitApp iOS: Longevity Habit OS

A bilingual native SwiftUI app for habits, recovery, protein tracking, and identity-based coaching.

It started as a personal habit tracker and grew into a more opinionated **longevity habit OS for men 35+**: daily habit check-ins, breakfast photo analysis, HealthKit integration, protein targets, recovery rituals, Peter Attia-style training pillars, habit packs, AI coach memory, WidgetKit source files, StoreKit 2 scaffolding, and English / Chinese language modes.

<a href="./habitapp-ios">
  <img src="./habitapp-ios/assets/screenshots/today.png" alt="HabitApp iOS Today screen preview" width="260">
</a>

**Implemented**

- SwiftUI app shell with SwiftData models.
- Habit creation, editing, local notifications, and daily check-ins.
- Bilingual system / English / Chinese mode.
- HealthKit read/write paths for nutrition and training context.
- Breakfast photo analysis through the user's own Anthropic API key.
- AI morning brief, weekly review, and coach memory scaffolding.
- StoreKit 2 Pro entitlement shell and paywall.
- WidgetKit source files for home/lock screen widgets.

**Tech**

- SwiftUI, SwiftData, HealthKit, StoreKit 2, WidgetKit source, UserNotifications, Keychain Services, Anthropic Messages API.

**Run**

```bash
cd habitapp-ios
open HabitApp.xcodeproj
```

See [habitapp-ios/README.md](./habitapp-ios/README.md) for build, signing, API key, widgets, and validation notes.

---

### WorldCupSimulation · Pulse26

**▶ [Open the interactive World Cup experience](https://taofeng-sketch.github.io/taofeng_vibe_coding/WorldCupSimulation/)**

[![Pulse26 WorldCupSimulation preview](./WorldCupSimulation/assets/preview.jpg)](https://taofeng-sketch.github.io/taofeng_vibe_coding/WorldCupSimulation/)

A bilingual, mobile-first 2026 World Cup fan experience. Users can browse the 104-match calendar, explore 48 team profiles, review finished-match goals, compare explainable win probabilities, make free points-based predictions, join fan camps, and play a five-round penalty challenge.

**Implemented**

- Chinese / English language switch.
- Full 104-match schedule and 48 team profiles.
- Local kick-off time conversion and viewing-region support.
- Explainable probability model with visible factors.
- Free points-only predictions; no money, withdrawals, or prizes.
- Fan camps, support wall, local progress, and penalty minigame.
- Automated test suite and GitHub Actions data refresh.
- Four-hour scoreboard snapshot workflow during the tournament window.

**Tech**

- Vanilla HTML/CSS/JS, Node test scripts, GitHub Actions, GitHub Pages.

**Run**

```bash
cd WorldCupSimulation
npm install
npm run dev
npm test
```

See [WorldCupSimulation/README.md](./WorldCupSimulation/README.md), [QA.md](./WorldCupSimulation/QA.md), [EVALUATION.md](./WorldCupSimulation/EVALUATION.md), and [RESEARCH.md](./WorldCupSimulation/RESEARCH.md).

---

### Squid Technologies: Performance Review Climb

**▶ [Play it in your browser](https://taofeng-sketch.github.io/taofeng_vibe_coding/squid-climb/)**

A satirical big-tech roguelike **deckbuilder** — think *Slay the Spire*, but the final boss is your year-end review.

You are a fresh graduate climbing the ladder at the fictional **Squid Technologies** ("Move Tentacles Fast™"). Spend Working Hours to play cards, keep Pulse above zero, climb from IC3 toward VP, and try to survive the Calibration Council without getting managed out.

**Implemented**

- Browser-playable deckbuilder combat loop.
- Cards, enemies, stages, events, bosses, and lore data.
- Pixel-art characters and scene assets.
- Chiptune music and SFX synthesized live in the browser.
- Attack/hurt animations, card hover states, and target feedback.
- Offline-friendly static folder with no build step.

**Tech**

- Phaser 3, vanilla JavaScript, static assets, GitHub Pages.

**Run**

```bash
cd squid-climb
python3 -m http.server 4173
```

Then open `http://localhost:4173`. See [squid-climb/README.md](./squid-climb/README.md) and [GAME_DESIGN.md](./squid-climb/GAME_DESIGN.md).

*It is affectionate satire. The company is fictional; any resemblance to your last performance cycle is coincidental.*

---

### Dinosaur Adventure / 恐龙大冒险

**▶ [Play it in your browser](https://taofeng-sketch.github.io/taofeng_vibe_coding/dinosaur-adventure/)**

A cartoon browser platformer based on a child's hand-drawn level map. The goal is to preserve the feeling of a kid's imagined world: keys, fake arrows, bounce rings, spikes, moving hazards, and a little dinosaur trying to reach the finish.

**Implemented**

- Click/touch movement and keyboard controls.
- Auto-jump movement tuned for small children.
- Keys, bounce rings, spikes, spinning hazards, fake arrows, and finish gate.
- Local rule-based "AI dinosaur coach" that gives hints from current state.
- Fully local browser prototype with no external services and no data collection.

**Tech**

- Native HTML/CSS/Canvas JavaScript, zero dependencies, zero build step.

**Run**

```bash
cd dinosaur-adventure
python3 -m http.server 4173
```

Then open `http://localhost:4173`. See [dinosaur-adventure/README.md](./dinosaur-adventure/README.md).

---

### Photo Munchies

**▶ [Open the photo minigame prototype](https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/)**

**▶ [Open Live Fruit Munch](https://taofeng-sketch.github.io/taofeng_vibe_coding/photo-munchies/live.html)**

A kid-friendly photo/selfie game inspired by the Pictonico pattern: a child's photo becomes the toy. The web version has two paths: an older photo-upload minigame flow and a newer **Live Fruit Munch** camera prototype where fruit flies toward a giant cartoon mouth.

The strongest current direction is Live Fruit Munch: a short round, score pressure, combo, mouth-energy management, messy fruit splats, head-chasing fruit, bomb hazards, optional two-player face-off, and a replayable silly camera moment. The web live version uses MediaPipe face landmarks to track one or two mouths in the camera feed and score when a player opens their mouth near incoming fruit. The native iOS version, kept in the private incubator workspace, uses Apple Vision and ReplayKit recording.

**Implemented in this public web folder**

- Mobile-first photo picker / camera file input.
- Manual crop and three small Canvas minigames.
- Gentle and Challenge modes.
- Live Fruit Munch web page with camera feed, MediaPipe face/mouth tracking, score, combo, best score, longer fruit waves, 80/20 face-target vs roaming fruit, countdown hover rings, bomb hazards, Kimi fruit-smash art, sticky full-screen splats, flying seeds, mouth stamina, optional two-player mode, fallback hold-mouth button, and local replay recording.
- Local-only processing; no backend and no photo upload.

**Tech**

- Native HTML/CSS/Canvas JavaScript, MediaPipe Face Landmarker, `getUserMedia`, best-effort `MediaRecorder`, GitHub Pages.

**Run**

```bash
cd photo-munchies
python3 -m http.server 4174
```

Then open:

- `http://localhost:4174/`
- `http://localhost:4174/live.html`

---

## Repository Map

```text
taofeng_vibe_coding/
├── README.md
├── WorldCupSimulation/       # Pulse26 interactive World Cup web app
├── dinosaur-adventure/       # Kid-inspired browser platformer
├── habitapp-ios/             # Native SwiftUI longevity habit app
├── photo-munchies/           # Kids photo/selfie web game prototype
└── squid-climb/              # Satirical deckbuilder browser game
```

---

## How I Work Here

- **Ship the first playable version.** A playable prototype teaches more than a perfect spec.
- **Be honest about the boundary.** README files should say what works, what is faked, and what still needs real user testing.
- **Prefer portable prototypes.** Web projects should run from a folder; native projects should include clear Xcode steps.
- **Test like a user.** Click it, play it, break it, and fix the obvious rough edges before calling it done.
- **Use AI as a collaborator, not a magic wand.** The agent helps generate, debug, and iterate; product judgment still matters.

---

## Local Development

Most web projects are static and can be served with Python:

```bash
python3 -m http.server 4173
```

Native iOS projects should be opened from their `.xcodeproj` files and run on a simulator or signed physical iPhone.

---

## Monetization

Ad monetization notes live in [MONETIZATION.md](./MONETIZATION.md). Short version: use AdSense for earning money from web games, not Google Ads/AdWords; add a custom domain and privacy page before applying; keep ads outside active gameplay.

---

## Notes

These are prototypes and learning artifacts, not polished commercial products. Some are intentionally playful, some are serious product explorations, and some are family-inspired experiments. The common thread is simple: make the idea real enough that someone can actually try it.
