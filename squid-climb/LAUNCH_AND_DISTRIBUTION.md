# Launch & Distribution Strategy — *Squid Technologies: Performance Review Climb*

> **TL;DR.** The game's most valuable asset isn't the game — it's the *story of building it*. "Meta PM ships a Slay-the-Spire roguelike about surviving Big Tech performance reviews, built in ~2–3 weeks with AI agents." That narrative compounds into reach, credibility, and optionality. Ship a free web demo first, instrument it hard, and let real signal — not vibes — decide whether you invest in a Steam build. Most likely outcome is **modest** (a good weekend, a few thousand plays, a strong portfolio piece). The upside is asymmetric: tail-risk virality + a durable personal-brand asset. Treat any revenue as a bonus.
>
> 最有价值的资产不是游戏本身，而是"做这件事"的故事。先发免费网页版，埋好数据点，用真实信号（而非感觉）决定要不要做 Steam 版。大概率结果是"还不错"，但上行是非对称的。

---

## 0. Operating principles (read first)

- **The post is the product.** Optimize the launch artifact (the build-with-AI narrative) at least as hard as the game.
- **Be honest about base rates.** Most indie web games get a few hundred plays. Most "Show HN" posts don't hit the front page. Most Reddit posts get <50 upvotes. Plan for the median, keep the tail open.
- **Don't overclaim.** No "this went viral" language in your own copy. Let the audience decide. Earnest > hype for this crowd.
- **Legal guardrails are non-negotiable** (see §4 and §8): no real company names, logos, employee names, internal jargon that only insiders would know to be real, or anything confidential. Satirize the *genre and archetype*, not a specific employer.

---

## 1. Positioning & one-liner

Pick one primary, keep 2–3 alternates for different channels.

**Primary (recommended):**
> *Slay the Spire, but the dragon is your performance review.* A roguelike deckbuilder about surviving Big Tech corporate life.

**Alternates by channel/tone:**
- **Dev-forum dry:** "A deckbuilder where you climb from IC3 to VP by surviving calibration. Energy is 'Working Hours', HP is 'Pulse Score', and the final boss is the Calibration Council."
- **LinkedIn / professional:** "I turned the performance-review cycle into a roguelike. Promotion is the win condition. Burnout is a loss state."
- **TikTok / hook:** "I made a video game where you fight your manager and the boss is the calibration meeting."
- **Self-aware / satirical:** "Move Tentacles Fast. A game about a fictional tech company, written by someone who has definitely never been to a calibration meeting."
- **One-word vibe:** *Corporate roguelike.* (Useful as a tagline/category descriptor.)

**Naming note:** "Squid Technologies" + "Move Tentacles Fast" is doing real work — it signals satire instantly and protects you legally. Lead with it.

---

## 2. Target audiences × where they congregate

| Audience | Who they are | Where they are | What pulls them in |
|---|---|---|---|
| **Big-tech survivors** | Current/former FAANG-adjacent ICs & managers who've survived calibration | Blind, r/ExperiencedDevs, LinkedIn, X | *Recognition.* "This is too real." The shared-trauma hook. |
| **CS career crowd** | Students, early-career, aspirants | r/cscareerquestions, TikTok, X | Curiosity + dark comedy about the world they're entering |
| **Deckbuilder / roguelike fans** | StS, Balatro, Monster Train players | r/roguelikes, r/slaythespire, itch.io, Steam, Discord | *Is the game actually good?* They care about mechanics, not theme |
| **Indie gamedev** | Hobbyist + pro devs | r/gamedev, HN, itch.io | The build story, zero-build/vanilla-JS craft, AI-agent workflow |
| **AI-builder / "vibe coding" crowd** | PMs, founders, AI-curious builders | HN, X, LinkedIn, Product Hunt | "Built in N days with AI agents" — the meta-narrative |
| **Tech-culture commentators** | Newsletter writers, tech Twitter, journalists | X, LinkedIn, Substack | A sharp, shareable satire artifact |

**Key insight:** The first two rows are your **viral fuel** (emotional resonance). The middle two are your **quality jury** (will tell you if the game holds up). The last two are your **amplifiers** (carry the build story). Different copy for each — don't post the same thing everywhere.

---

## 3. Phased launch sequence

Concrete, ordered. Don't skip Phase 0.

### Phase 0 — Pre-launch (before anyone sees it)
1. **Finish the "first 10 minutes."** Intro cutscene → first combat → first map node must be tight. Most drop-off happens here.
2. **Instrument it.** Add lightweight, privacy-safe analytics (see §6). At minimum: game start, first-combat-complete, run-complete, win, share-click. Use a simple endpoint or a privacy-friendly tool (Plausible/GoatCounter/Umami) — no PII.
3. **Legal pass.** Grep the whole project for any real company/product/person names, real internal codenames, or logos. Remove all. Keep satire archetypal. (See §4/§8.)
4. **Make it shareable.** Add a "share your result" card — e.g. "I got Promoted to Senior on turn 14" / "I was Managed Out by the Calibration Council." Auto-generates copy + link. *This is the single highest-leverage growth feature.*
5. **Pick the host.** Free web demo on itch.io (best for "play instantly", has built-in discovery) AND/OR a plain static host (GitHub Pages / Netlify / Cloudflare Pages) for a clean URL you control. itch.io first.
6. **Draft all launch copy** (§7) and a simple landing/README so first-clickers immediately get it.

### Phase 1 — Soft launch & signal gathering (Week 1)
7. **Quiet drop to friendly nodes first:** one or two Discords (StS/roguelike or AI-builder), a couple of trusted colleagues, maybe a small subreddit. Goal: catch broken first-impressions before the big posts.
8. **Fix the top 3 complaints** from soft launch. Usually: onboarding clarity, difficulty curve, mobile layout.
9. **Then post to ONE primary channel** (recommend r/ExperiencedDevs *or* Show HN — not both same day). Watch response.

### Phase 2 — Coordinated public launch (Week 1–2)
10. **Sequence the channels over 3–5 days**, not all at once (lets you learn + reuse momentum):
    - Day 1: Reddit (r/ExperiencedDevs or r/cscareerquestions) — emotional-resonance crowd, your warmest market.
    - Day 2: Show HN — build story + quality jury.
    - Day 3: LinkedIn — the "built with AI" professional angle.
    - Day 3–4: X/Twitter thread — amplifies whatever already worked; quote-link the Reddit/HN traction.
    - Day 4–5: TikTok/Reels short clips — broadest top-of-funnel, lowest hit-rate.
    - Optional later: Product Hunt (only if web demo is polished and you want the AI-builder crowd).
11. **Reply to everything** in the first 6 hours of each post. Engagement velocity drives ranking on every one of these platforms.

### Phase 3 — Decide on Steam/itch paid (Week 2–4+)
12. **Apply the decision rule in §6.** Only build a Steam wishlist page if web signal clears the bar. Steam costs $100 + meaningful production polish (achievements, controller support, store assets, more content). Don't pay the tax on a hunch.
13. If yes: stand up a **Steam "Coming Soon" page** to start collecting wishlists *before* building the full paid version. Wishlists are the real currency.

### Phase 4 — The meta-narrative post (when you have a number to cite)
14. Once you have a concrete traction number (e.g. "30k plays in a week" or even "it hit #2 on HN"), write the **"I built this in N days with AI agents"** post for HN/LinkedIn/X. This is the post with the **highest distribution ceiling** — but it needs a proof point to land. Don't fire it on day 0 with nothing to show.

---

## 4. Distribution-channel table

Respecting legal guardrails: satire of the *genre/archetype*, fictional "Squid Technologies", no real names/logos/people, no confidential info.

| Channel | What to post | Why it fits | Risk notes |
|---|---|---|---|
| **r/ExperiencedDevs** | Earnest "I made a thing about our shared trauma" post + link. Lead with recognition, not promo. | Your warmest emotional market; high-quality discussion; survivors *want* to share this | Anti-self-promo culture — frame as a gift/joke to the community, not a launch. Read rules; some require flair/approval. Don't make it about you. |
| **r/cscareerquestions** | Lighter, broader version; "dark-comedy take on the promo cycle" | Huge, younger audience; curiosity-driven | More promo-sensitive; may get removed if it reads as marketing. Post sparingly. |
| **r/gamedev** | The *build* angle: zero-build vanilla JS, AI-agent workflow, what worked | Devs respect craft + process | They'll critique the game critically. Bring substance, not just theme. |
| **r/roguelikes / r/slaythespire** | "StS-like with a corporate twist — would love feedback on the deck mechanics" | Quality jury; will tell you if it's actually fun | They care about mechanics, *not* the joke. Don't oversell the satire; lead with gameplay. |
| **Hacker News (Show HN)** | Show HN: the game + a one-line build note. Calm, factual title. | Build story + AI angle + tech-culture overlap | No hype words, no emoji in title. Front page is a coin flip — post 8–10am ET weekday. Be ready to discuss tech. |
| **Blind** | A wry "made this about calibration season" post | *The* shared-trauma epicenter; insiders will get every joke | Highest insider-recognition = highest legal/optics sensitivity. Stay archetypal. Consider posting anonymously here regardless. |
| **LinkedIn** | "Built a roguelike about performance reviews in N days with AI" — professional, witty | Best for the personal-brand / AI-builder narrative; your real network | Your real name is attached by default. Keep it clearly satirical + industry-general. This is the highest-stakes channel for §8. |
| **X/Twitter** | 5–8 tweet thread: the hook, 2–3 GIFs, the build note, the link | Amplifies traction from elsewhere; tech + gamedev + AI all live here | Thread dies without a strong tweet 1 + visual. Quote your own HN/Reddit traction to compound. |
| **itch.io** | Free web build, "play in browser", good cover art + GIFs | Built-in discovery for browser games; the right home for a free demo | Discovery is modest unless featured. Treat as the canonical "play now" link, not a growth engine. |
| **Steam** | (Later) "Coming Soon" page → wishlists → paid build | Where money + serious players are | $100 fee + real production bar. Only after signal clears §6. |
| **Product Hunt** | (Optional) "A roguelike about Big Tech performance reviews" | AI-builder + maker crowd | Saturated; needs polished web demo + hunter network. Skippable. |
| **TikTok / Reels** | 15–20s clips: a funny enemy move, a loss screen, the "share card" | Broadest reach, lowest production cost per attempt | Low hit-rate; algorithm-dependent. Post 3–5, expect 1 to do something. |

---

## 5. Pricing & monetization options

Framed honestly. **The most likely outcome is modest. Optimize for optionality and personal brand, not revenue.**

| Option | Setup | Realistic revenue | When it makes sense |
|---|---|---|---|
| **Free web (itch.io / your URL)** | Lowest effort, ship now | ~£0–500 (optional "tip jar" / itch donations) | **Default.** Maximizes reach + the build narrative. Revenue is rounding error; that's fine. |
| **itch.io "pay what you want"** | Trivial add-on to free | A few hundred £ if it resonates | Free-but-tippable. Captures goodwill money without gating reach. |
| **Steam paid (~£7)** | $100 + real polish + content | ~£10k net @ 2k sales; ~£140k @ viral 20k sales | Only after web signal clears the §6 bar. Wishlists first. |
| **Lottery tier (StS-like)** | Years of work, luck | £1M+ | Not a plan. A fantasy. Name it so you don't anchor on it. |

**Honest framing for yourself and your copy:**
- **Base case:** free web, a strong launch week, a few thousand plays, a portfolio + brand win. Revenue ≈ noise. **This is success.**
- **Good case:** signal is strong enough to justify a £7 Steam build; you net ~£10k over time. Nice, not life-changing.
- **Tail case:** it catches a wave (20k+ sales / front-page everywhere). Possible, not plannable. Don't spend it in your head.
- **Real return:** the *optionality* (a credible AI-built-product story you can point to forever) and the *brand* (you're now "the PM who shipped a satirical roguelike with AI"). That compounds in ways £10k doesn't.

**Don't:** ads, aggressive monetization, or paywalling the joke. It kills shareability and the goodwill that is the whole point.

---

## 6. Metrics to watch + kill/scale decision rule

**Instrument these (privacy-safe, no PII):**
- **Reach:** unique plays, traffic by source (which channel actually delivered).
- **Engagement quality:** % who finish first combat, % who complete a full run, median session length.
- **Virality:** share-card clicks / completed runs (your K-factor proxy), inbound from shares.
- **Resonance:** comment sentiment + "this is too real" density on Reddit/HN/LinkedIn.
- **Intent:** for Steam decision — wishlist adds on a "Coming Soon" page, or "would you pay for more?" clicks.

**Decision rule — should you build a paid Steam version?**

> **SCALE (build Steam)** if, within ~2 weeks of public launch, you hit *at least two* of:
> - **≥ 20,000 unique plays** from launch, OR a front-page hit on HN / top-of-sub on a major subreddit;
> - **≥ 25% full-run completion** rate (people actually like the *game*, not just the joke);
> - **≥ 1,000 Steam wishlists** on a Coming Soon page within 2 weeks, OR a clear flood of "take my money / put this on Steam" comments;
> - **Share ratio ≥ ~0.15** (shares per completed run) — evidence of organic spread.

> **KILL / PARK (stay free web)** if after launch week you see:
> - low completion (people bounce after the joke lands — theme carried it, gameplay didn't);
> - reach plateaus fast with little organic sharing;
> - no meaningful "I'd pay for this" signal.
> → That's still a **win**: you shipped, you have the story, you have the portfolio piece. Write the meta-narrative post and move on. Don't sink weeks into a Steam build the market didn't ask for.

**The trap to avoid:** sunk-cost escalation. The theme is *so* resonant that you'll be tempted to build Steam even on weak gameplay signal. Resist. The shared-trauma hook gets people to *click and laugh*; only good mechanics get them to *pay and finish*. Separate those signals.

---

## 7. READY-TO-POST launch copy

> All copy below is fictional-company-safe. Swap `[itch.io link]` / `[N]` before posting. Keep "Squid Technologies / Move Tentacles Fast" — it does the satire + legal work.

### 7.1 Hacker News — "Show HN"

**Title:**
```
Show HN: A roguelike deckbuilder about surviving Big Tech performance reviews
```

**Body:**
```
I built a Slay-the-Spire-style deckbuilder where the dungeon is a tech-company
career ladder. You climb from IC3 to VP by surviving calibration. It's a satire
of a fictional company, "Squid Technologies" (motto: "Move Tentacles Fast").

The resource renaming is most of the joke:
- HP is "Pulse Score"
- Energy is "Working Hours"
- You also manage "Focus"
- Lose states: you quit, burned out, or got managed out
- Win state: Promoted to Senior
- Final boss: the Calibration Council
- Enemy moves are corporate phrases — "Let's align", "What's the
  incrementality?", "Needs more scope"

It's a zero-build, offline, single-folder web game — vanilla JS, no framework,
no bundler. Runs entirely in the browser. I wrote most of it with AI coding
agents over about [N] weeks, partly as an experiment in how far that workflow
goes for a small-but-complete game (intro cutscene, pixel art, chiptune audio,
a node-based map, combat animations).

Play in browser: [itch.io link]

Happy to go into the agent workflow, the vanilla-JS-no-build choices, or why I
renamed everything. Feedback on the actual deck mechanics very welcome — the
theme is the easy part; the combat math is the hard part.
```

*Notes: no emoji, no hype, factual title (HN penalizes both). Best window: Tue–Thu ~8–10am ET. Reply fast and technical.*

---

### 7.2 Reddit — r/ExperiencedDevs (warmest market)

**Title:**
```
I made a roguelike where the final boss is the calibration meeting
```

**Body:**
```
After enough performance cycles I did the only reasonable thing: I turned the
whole experience into a Slay-the-Spire-style deckbuilder.

You play an IC trying to climb to VP at "Squid Technologies" ("Move Tentacles
Fast"). It's a fictional company and broad-industry satire — if you've survived
calibration anywhere, you'll recognize it.

A few things that are doing numbers in my head:
- HP is "Pulse Score." Energy is "Working Hours." You also spend "Focus."
- Enemies attack with phrases. "Let's align." "What's the incrementality?"
  "Needs more scope."
- You can quit, burn out, or get managed out. Or get Promoted to Senior.
- The final boss is the Calibration Council.

It's free, runs in the browser, no install: [itch.io link]

Not selling anything — mostly wanted to share it with the people most likely to
laugh-cry at it. Would genuinely love feedback, especially on whether the
difficulty curve feels like real calibration (i.e., slightly unfair).
```

*Notes: lead with recognition, explicitly disclaim self-promo, ask for feedback. Check sub rules for self-promo/flair first. If r/cscareerquestions instead, soften the insider jokes and add one line of "for those about to enter the industry, consider this a gentle warning."*

---

### 7.3 LinkedIn — the "built with AI" angle

```
I spent the last [N] weeks building a video game about performance reviews.

It's a roguelike deckbuilder — think Slay the Spire — except instead of fighting
monsters, you're climbing from IC3 to VP at a fictional company called Squid
Technologies. Their motto is "Move Tentacles Fast."

The mechanics are the satire:
→ Your health bar is your "Pulse Score."
→ Your energy is "Working Hours."
→ Enemies attack with phrases like "Let's align" and "What's the
  incrementality?"
→ You can win (Promoted to Senior) or lose (you quit / burned out / managed out).
→ The final boss is the Calibration Council.

Two things I actually want to say about it:

1. I built almost all of it with AI coding agents. I'm a PM, not a game
   developer. The interesting part wasn't "AI wrote code" — it's that a complete,
   polished-ish artifact (pixel art, intro cutscene, chiptune audio, a map,
   combat animations) is now a [N]-week solo side project instead of a [several-month]
   one. That changes what's worth building.

2. The best satire is affectionate. This isn't a complaint about any company —
   it's a love letter to everyone who's ever sat in a calibration meeting and
   thought "this would make a great boss fight."

Play it in your browser (free, no install): [itch.io link]

Curious what other PMs and builders think — both about the game and about what
the AI-agent workflow makes newly possible.
```

*Notes: this is the highest-stakes channel for §8 (real name attached). Keep it industry-general and affectionate. The "what AI makes newly possible" frame is what makes it a *professional* post, not just a brag.*

---

### 7.4 X/Twitter thread (5–8 tweets)

```
1/ I built a roguelike deckbuilder where the final boss is the calibration
meeting.

You climb from IC3 to VP at "Squid Technologies." Motto: Move Tentacles Fast.

Free, plays in your browser 👇 [itch.io link]
[attach GIF: a combat turn]

2/ The renaming is most of the joke:
• HP → "Pulse Score"
• Energy → "Working Hours"
• also: "Focus"
• Lose: you quit / burned out / managed out
• Win: Promoted to Senior

3/ Enemies don't attack you. They *align* with you.

Moves include:
"Let's align" · "What's the incrementality?" · "Needs more scope"
[attach GIF: an enemy phrase landing]

4/ It's a fictional company and broad-industry satire. If you survived
calibration anywhere, you'll recognize the archetypes. That's the whole design
goal: shared-trauma recognition.

5/ The build part: it's zero-build vanilla JS. No framework, no bundler, one
folder, runs offline. I wrote most of it with AI coding agents in ~[N] weeks.

I'm a PM, not a gamedev. That's kind of the point.

6/ It's got an intro cutscene, pixel art, chiptune audio, a node-based map, and
combat animations — all in a single static web folder.

The thing AI changed isn't "writing code." It's the *scope* a solo non-engineer
can finish.

7/ Play it, get Promoted to Senior (or managed out), and tell me how the
difficulty curve feels. It should feel slightly unfair. By design.

[itch.io link]

8/ If this resonates, a repost of tweet 1 helps more than anything. Built this
for the people who'd laugh at it. 🦑
```

*Notes: tweet 1 + a GIF carry the whole thread. Fire this *after* Reddit/HN so you can quote-tweet any traction. Don't claim virality; ask plainly for the repost.*

---

### 7.5 Short-video (TikTok / Reels) — hooks + script

**Hook lines (test all 3, keep the winner):**
1. "I made a video game where the final boss is your calibration meeting."
2. "POV: you turned every performance review you've ever survived into a video game."
3. "Health bar? No. In this game it's called your *Pulse Score*."

**20-second script (screen recording + voiceover):**
```
[0:00–0:03] HOOK (on screen + VO): "I built a video game about surviving
            Big Tech — and the final boss is the calibration meeting."
[0:03–0:07] Show combat. VO: "Your health is your Pulse Score. Your energy is
            literally called Working Hours."
[0:07–0:12] Show an enemy move card flip: "Let's align." Then: "What's the
            incrementality?" VO: "The enemies attack you with... corporate
            phrases."
[0:12–0:16] Show a loss screen ("Managed Out") then a win screen ("Promoted to
            Senior"). VO: "You can get promoted... or managed out."
[0:16–0:20] CTA: "It's free, plays in your browser, link in bio. Tell me how far
            you got." [show the share card: "I got Promoted to Senior on turn 14"]
```

*Notes: first 2 seconds decide everything. Caption on-screen for sound-off viewing. Post 3–5 variants; expect one to outperform the rest 10:1.*

---

## 8. Risk & "should I attach my real name?" (brief)

This is a **personal judgment call**, not a legal opinion. The honest version:

- **Legal safety first (do this regardless of name).** No real company names, logos, product names, real people, real internal codenames, or anything confidential/non-public. Satirize the *archetype* — the performance-review/calibration genre — not your employer. "Squid Technologies / Move Tentacles Fast" + generic corporate phrases keep you in safe, clearly-fictional, broad-industry territory. Keep it affectionate; "love letter, not exposé" is both better art and better cover.
- **The real-name tradeoff.** Attaching your name maximizes the personal-brand upside (the whole §5 thesis) — but it's also what makes a satire-of-my-industry artifact more sensitive, especially on insider-dense channels (Blind, LinkedIn). You can't fully un-ring that bell once it spreads.
- **Pragmatic options:**
  - **Pseudonym for the game / anonymous on Blind**, real name on the *build-with-AI* narrative (LinkedIn/HN) — the AI-workflow story is the lowest-risk, highest-professional-upside piece and is easy to attach your name to without it reading as "complaining about my employer."
  - **Timing:** consider where you are in your own cycle/internal context before posting under your name. There's no rush; the game keeps.
  - **Keep a clean separation** between "satire of the genre" (public, fine) and "anything about a specific workplace" (don't).
- **Bottom line / 底线:** the safest and still-high-upside play is **broad-industry satire + real name on the AI-builder narrative + pseudonym/anonymous on the most insider-coded channels**, with zero confidential content anywhere. When in doubt, make it more generic and more affectionate — it costs you nothing and removes most of the risk.

---

*Living doc. Update §6 metrics with real numbers after launch week, then revisit the §6 decision rule before spending a penny on Steam.*
