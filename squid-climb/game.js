/* =============================================================================
 * SQUID TECHNOLOGIES: PERFORMANCE REVIEW CLIMB  (v2 — pixel/audio/map upgrade)
 * Zero-build, offline, single-folder satirical big-tech deckbuilder.
 * Vanilla JS. No frameworks, no CDN, no node_modules. Open index.html and play.
 * ============================================================================= */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Environment guards (so the same file can be driven headless in Node tests)
  // ---------------------------------------------------------------------------
  const HAS_DOM = typeof document !== "undefined" && !!document.createElement;
  const HAS_FXLAYER = () => HAS_DOM && document.getElementById && document.getElementById("fxlayer");
  const ASSET = "assets/"; // sprite folder (relative, offline)

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, attrs, children) => {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  };
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rnd(arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  // ===========================================================================
  // SOUND ENGINE — synthesized chiptune music + SFX via Web Audio (no files)
  // ===========================================================================
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // patterns: arrays of MIDI numbers (0 = rest)
  const SONGS = {
    menu: { bpm: 84, step: 0.22, lead: [69,0,72,0,76,0,72,0,67,0,69,0,72,0,0,0], bass: [45,0,0,0,40,0,0,0,43,0,0,0,40,0,0,0], lt: "triangle", bt: "sine" },
    combat: { bpm: 122, step: 0.13, lead: [69,71,72,76,72,71,69,67,69,72,76,79,76,72,71,69], bass: [45,45,52,52,43,43,50,50,41,41,48,48,40,40,47,47], lt: "square", bt: "triangle" },
    boss: { bpm: 100, step: 0.15, lead: [64,0,63,0,64,67,63,0,60,0,63,0,59,0,58,0], bass: [40,40,39,39,38,38,40,40,36,36,38,38,35,35,34,34], lt: "sawtooth", bt: "triangle" },
    map: { bpm: 76, step: 0.26, lead: [72,0,74,0,76,0,79,0,76,0,74,0,72,0,71,0], bass: [48,0,0,0,43,0,0,0,45,0,0,0,47,0,0,0], lt: "triangle", bt: "sine" },
  };

  const Sound = {
    ctx: null, master: null, musicGain: null, sfxGain: null, muted: false,
    timer: null, song: null, step: 0, nextT: 0, curName: null,
    init() {
      if (this.ctx || typeof window === "undefined") return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.32; this.sfxGain.connect(this.master);
      try { this.muted = localStorage.getItem("squid_mute") === "1"; } catch (e) {}
      this.master.gain.value = this.muted ? 0 : 0.7;
    },
    resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
      try { localStorage.setItem("squid_mute", this.muted ? "1" : "0"); } catch (e) {}
    },
    tone(freq, dur, type, gain, dest, slideTo) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
      const peak = gain == null ? 0.3 : gain;
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(peak, this.ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(dest || this.sfxGain);
      o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
    },
    noise(dur, gain) {
      if (!this.ctx) return;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = gain == null ? 0.25 : gain;
      src.connect(g); g.connect(this.sfxGain); src.start();
    },
    // ---- SFX ----
    sfx(name) {
      if (!this.ctx) return;
      switch (name) {
        case "draw": this.tone(720, 0.05, "square", 0.18); break;
        case "play": this.tone(520, 0.07, "square", 0.22, null, 700); break;
        case "discard": this.tone(300, 0.08, "triangle", 0.18, null, 180); break;
        case "hit": this.noise(0.12, 0.3); this.tone(160, 0.1, "sawtooth", 0.2, null, 90); break;
        case "block": this.tone(880, 0.08, "sine", 0.2, null, 1200); break;
        case "hurt": this.noise(0.18, 0.35); this.tone(120, 0.18, "square", 0.25, null, 60); break;
        case "select": this.tone(620, 0.05, "square", 0.16); break;
        case "level": [60,64,67,72].forEach((n,i)=>setTimeout(()=>this.tone(midi(n),0.16,"square",0.22),i*70)); break;
        case "win": [60,64,67,72,76].forEach((n,i)=>setTimeout(()=>this.tone(midi(n),0.22,"triangle",0.26),i*120)); break;
        case "lose": [60,57,53,48].forEach((n,i)=>setTimeout(()=>this.tone(midi(n),0.3,"sawtooth",0.24),i*160)); break;
      }
    },
    // ---- music sequencer (lookahead scheduler) ----
    playMusic(name) {
      if (!this.ctx || this.curName === name) return;
      this.stopMusic();
      this.curName = name; this.song = SONGS[name]; this.step = 0;
      this.nextT = this.ctx.currentTime + 0.06;
      const self = this;
      this.timer = setInterval(function () { self._sched(); }, 25);
    },
    stopMusic() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.curName = null; },
    _sched() {
      if (!this.ctx || !this.song) return;
      const s = this.song;
      while (this.nextT < this.ctx.currentTime + 0.12) {
        const li = s.lead[this.step % s.lead.length];
        const bi = s.bass[this.step % s.bass.length];
        if (li) this.tone(midi(li), s.step * 0.95, s.lt, 0.5, this.musicGain);
        if (bi) this.tone(midi(bi), s.step * 1.1, s.bt, 0.7, this.musicGain);
        this.nextT += s.step;
        this.step++;
      }
    },
  };

  // ===========================================================================
  // FX — floating numbers, screen shake (DOM only; no-ops headless)
  // ===========================================================================
  const FX = {
    float(text, topPct, cls) {
      const layer = HAS_FXLAYER();
      if (!layer) return;
      const n = el("div", { class: "float " + (cls || "") }, [text]);
      n.style.top = topPct + "%";
      n.style.left = (44 + Math.random() * 12) + "%";
      layer.appendChild(n);
      setTimeout(() => { if (n.parentNode) n.parentNode.removeChild(n); }, 950);
    },
    shake() {
      if (!HAS_DOM) return;
      const app = document.getElementById("app");
      if (!app) return;
      app.classList.remove("shake"); void app.offsetWidth; app.classList.add("shake");
      setTimeout(() => app.classList.remove("shake"), 420);
    },
  };

  // ===========================================================================
  // CARD DATA  (balanced for 8 Working Hours / turn)
  // ===========================================================================
  const CARDS = {
    // ---- SWE starter ----
    fix_bug: { id: "fix_bug", name: "Fix Bug", cost: 2, type: "attack", glyph: "</>", text: "Deal 8 damage.", effect: (g) => g.dealDamage(8) },
    refactor: { id: "refactor", name: "Refactor", cost: 1, type: "skill", glyph: "{}", text: "Gain 6 Block.", effect: (g) => g.gainBlock(6) },
    write_unit_test: { id: "write_unit_test", name: "Write Unit Test", cost: 1, type: "skill", glyph: "[v]", text: "Gain 5 Block. Draw 1.", effect: (g) => { g.gainBlock(5); g.draw(1); } },
    coffee: { id: "coffee", name: "Coffee", cost: 0, type: "skill", glyph: "(c)", text: "Gain 3 Working Hours. Lose 2 Pulse.", effect: (g) => { g.gainHours(3); g.losePulse(2); } },
    push_to_prod: { id: "push_to_prod", name: "Push to Prod", cost: 2, type: "attack", glyph: ">>", text: "Deal 14. Shuffle a Tech Debt into draw pile.", effect: (g) => { g.dealDamage(14); g.shuffleIntoDraw("tech_debt"); } },
    // ---- reward pool ----
    hotfix: { id: "hotfix", name: "Hotfix", cost: 1, type: "attack", glyph: "!!", rarity: "common", text: "Deal 10. If lethal, deal 6 more.", effect: (g) => { const b = g.enemy.hp; g.dealDamage(10); if (g.enemy.hp <= 0 && b > 0) g.dealDamage(6); } },
    pair_program: { id: "pair_program", name: "Pair Program", cost: 1, type: "skill", glyph: "<>", rarity: "common", text: "Gain 9 Block. Draw 1.", effect: (g) => { g.gainBlock(9); g.draw(1); } },
    stand_up: { id: "stand_up", name: "Ask in Workplace", cost: 1, type: "skill", glyph: "@", rarity: "common", text: "Draw 2 cards.", effect: (g) => g.draw(2) },
    work_late: { id: "work_late", name: "Work Late", cost: 1, type: "skill", glyph: "zZ", rarity: "common", text: "Gain 4 Working Hours. Draw 1. Lose 4 Pulse.", effect: (g) => { g.gainHours(4); g.draw(1); g.losePulse(4); } },
    deep_work: { id: "deep_work", name: "Deep Work", cost: 2, type: "skill", glyph: "**", rarity: "uncommon", text: "Gain 2 Focus. Draw 1.", effect: (g) => { g.gainFocus(2); g.draw(1); } },
    rubber_duck: { id: "rubber_duck", name: "Rubber Duck", cost: 0, type: "skill", glyph: "qk", rarity: "common", text: "Gain 1 Focus.", effect: (g) => g.gainFocus(1) },
    ship_it: { id: "ship_it", name: "Ship It", cost: 2, type: "attack", glyph: "^^", rarity: "uncommon", text: "Deal 7, plus 5 per Focus. Spend Focus.", effect: (g) => { const f = g.player.focus; g.dealDamage(7 + 5 * f); g.player.focus = 0; } },
    run_experiment: { id: "run_experiment", name: "Run Experiment", cost: 2, type: "attack", glyph: "AB", rarity: "uncommon", metric: true, text: "50%: Deal 26. 50%: 'Not stat sig' — Weak 1 to self.", effect: (g) => { if (Math.random() < 0.5) { g.dealDamage(26); g.log("The data is undeniable. Deal 26."); } else { g.addStatus("player", "weak", 1); g.log("\u201CNot statistically significant.\u201D Weak 1."); } } },
    move_metric: { id: "move_metric", name: "Move the Metric", cost: 2, type: "attack", glyph: "MM", rarity: "uncommon", metric: true, text: "Deal 8, plus 5 per Focus. Spend Focus.", effect: (g) => { const f = g.player.focus; g.dealDamage(8 + 5 * f); g.player.focus = 0; } },
    mentorship: { id: "mentorship", name: "Mentorship", cost: 1, type: "skill", glyph: "+1", rarity: "common", text: "Heal 12 Pulse.", effect: (g) => g.healPulse(12) },
    touch_grass: { id: "touch_grass", name: "Touch Grass", cost: 1, type: "skill", glyph: "~~", rarity: "common", text: "Remove all Burnout. Heal 7 Pulse.", effect: (g) => { g.player.status.burnout = 0; g.healPulse(7); } },
    deprecate: { id: "deprecate", name: "Deprecate It", cost: 3, type: "attack", glyph: "xx", rarity: "uncommon", exhaust: true, text: "Deal 22 damage. Exhaust.", effect: (g) => g.dealDamage(22) },
    focus_sprint: { id: "focus_sprint", name: "Focus Sprint", cost: 2, type: "power", glyph: "=>", rarity: "uncommon", text: "Power: gain 1 Focus at the start of each turn.", effect: (g) => { g.player.powers.focusSprint += 1; g.log("Focus Sprint online: +1 Focus / turn."); } },
    caffeinate: { id: "caffeinate", name: "Caffeinate", cost: 1, type: "skill", glyph: "++", rarity: "common", text: "Gain 2 Working Hours and Motivated 1 (next attack +50%).", effect: (g) => { g.gainHours(2); g.addStatus("player", "motivated", 1); } },
    // ---- junk ----
    tech_debt: { id: "tech_debt", name: "Tech Debt", cost: 1, type: "status", glyph: "##", unplayable: true, text: "Unplayable. While in hand, lose 2 Pulse at end of turn.", effect: () => {} },
  };

  const REWARD_POOL = ["hotfix","pair_program","stand_up","work_late","deep_work","rubber_duck","ship_it","run_experiment","move_metric","mentorship","touch_grass","deprecate","focus_sprint","caffeinate"];
  const STARTER_DECK = ["fix_bug","fix_bug","fix_bug","fix_bug","refactor","refactor","refactor","write_unit_test","coffee","push_to_prod"];

  // ===========================================================================
  // ENEMY DATA  (HP/damage scaled for the 8-hour economy)
  // ===========================================================================
  function atk(label, value) { return { kind: "attack", value, label, exec: (g) => g.enemyAttack(value, label) }; }
  function def(label, value) { return { kind: "defend", value, label, exec: (g) => { g.enemy.block += value; g.log(g.enemy.name + ": " + label + " (+" + value + " Block)"); } }; }

  const ENEMIES = {
    bug_swarm: { id: "bug_swarm", name: "Bug Swarm", sprite: "enemy_bug.png", glyph: "\uD83D\uDC1B", maxHp: 55, tier: "normal", taunt: "Time to fix this.",
      plan: (g, e) => { e._t = (e._t || 0) + 1; if (e._t % 3 === 0) return { kind: "special", value: 6, label: "Spread to Prod", exec: (gg) => { gg.enemyAttack(6, "Spread to Prod"); gg.shuffleIntoDiscard("tech_debt"); gg.log("A Tech Debt slips into your discard pile."); } }; return atk("Infect Code", 10); } },
    legacy_service: { id: "legacy_service", name: "Legacy Service", sprite: "enemy_legacy.png", glyph: "\uD83D\uDDC4\uFE0F", maxHp: 85, tier: "normal", taunt: "Nobody knows how I work. Do not touch me.",
      plan: (g, e) => { e._t = (e._t || 0) + 1; return e._t % 2 === 1 ? def("Add a Layer of Abstraction", 14) : atk("Cascading Failure", 20); } },
    pm_align: { id: "pm_align", name: "PM Who Says 'Let's Align'", sprite: "enemy_pm.png", glyph: "\uD83E\uDDD1\u200D\uD83D\uDCBC", maxHp: 70, tier: "normal", taunt: "Quick one — is this aligned with the roadmap?",
      plan: (g, e) => { e._t = (e._t || 0) + 1; const r = e._t % 3; if (r === 1) return { kind: "debuff", value: 2, label: "Let's Align", exec: (gg) => { gg.addStatus("player", "weak", 2); gg.log("PM: \u201CLet's align.\u201D You feel Weak."); } }; if (r === 2) return { kind: "special", value: 0, label: "Need More Context", exec: (gg) => { gg.enemyDiscardRandom(); gg.log("PM: \u201CCan you add more context?\u201D A card is discarded."); } }; return atk("Circle Back", 13); } },
    ds_skeptic: { id: "ds_skeptic", name: "DS Who Disagrees With Your Metric", sprite: "enemy_ds.png", glyph: "\u03A3", maxHp: 75, tier: "normal", taunt: "Have you considered that your metric is noise?",
      plan: (g, e) => { e._t = (e._t || 0) + 1; const r = e._t % 3; if (r === 1) return { kind: "debuff", value: 2, label: "Not Stat Sig", exec: (gg) => { gg.addStatus("player", "weak", 2); gg.log("DS: \u201CNot stat sig.\u201D Weak 2."); } }; if (r === 2) return { kind: "special", value: 9, label: "Need More Experimentation", exec: (gg) => { gg.enemyAttack(9, "Need More Experimentation"); gg.addStatus("player", "weak", 1); } }; return atk("Confidence Interval", 14); } },
    half_year: { id: "half_year", name: "Half-Year Check-In", sprite: "boss_halfyear.png", glyph: "\uD83D\uDCCB", maxHp: 115, tier: "elite", taunt: "Overall, great progress — but a few growth areas.",
      plan: (g, e) => { e._t = (e._t || 0) + 1; const r = e._t % 3; if (r === 1) return atk("Constructive Feedback", 14); if (r === 2) return { kind: "debuff", value: 2, label: "Needs Improvement", exec: (gg) => { gg.addStatus("player", "burnout", 2); gg.log("\u201CNeeds improvement.\u201D Burnout 2 applied."); } }; return atk("Raised Expectations", 10); } },
    calibration_council: { id: "calibration_council", name: "Calibration Council", sprite: "boss_calibration.png", glyph: "\u2696\uFE0F", maxHp: 155, tier: "boss", taunt: "Let's calibrate. Did they really operate at the next level?",
      plan: (g, e) => { e._t = (e._t || 0) + 1; const r = e._t % 4;
        if (r === 1) return { kind: "debuff", value: 1, label: "Needs More Scope", exec: (gg) => { gg.addStatus("player", "confused", 1); gg.log("\u201CNeeds more scope.\u201D Your next card will fizzle."); } };
        if (r === 2) return atk("Not Aligned", 20);
        if (r === 3) return { kind: "special", value: 14, label: "What's the Incrementality?", exec: (gg) => { const m = gg.hand.some((c) => CARDS[c].metric); const d = m ? 14 : 27; if (!m) gg.log("No metric in hand. The damage is DOUBLED."); gg.enemyAttack(d, "What's the Incrementality?"); } };
        return def("Stack Ranking", 16); } },
  };

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  const EVENTS = {
    oncall: {
      title: "On-Call, 3 A.M.", glyph: "\uD83D\uDCDF",
      body: "PagerDuty is screaming. Prod is down. Your bed is so warm.",
      choices: [
        { label: "Get up and fix it (lose 6 Pulse, gain Hotfix)", run: (g) => { g.player.pulse = Math.max(1, g.player.pulse - 6); g.run.deck.push("hotfix"); g.log("You shipped a Hotfix at 3 A.M. Hero. Exhausted hero."); } },
        { label: "Mute it (50%: fine / 50%: lose 4 Pulse + a Tech Debt)", run: (g) => { if (Math.random() < 0.5) { g.log("It self-resolved. Nobody noticed. You sleep."); } else { g.player.pulse = Math.max(1, g.player.pulse - 4); g.run.deck.push("tech_debt"); g.log("It did not self-resolve. The incident review has your name on it."); } } },
      ],
    },
    reorg: {
      title: "Yet Another Reorg", glyph: "\uD83D\uDD01",
      body: "New org chart. New mission. Same desk. Your manager has a new manager.",
      choices: [
        { label: "Embrace change (heal 10 Pulse)", run: (g) => { g.healPulse(10); g.log("You said 'excited for the new chapter' in the all-hands. You almost meant it."); } },
        { label: "Update your resume (gain a random reward card)", run: (g) => { const c = pick(REWARD_POOL); g.run.deck.push(c); g.log("You 'explored opportunities'. Gained " + CARDS[c].name + "."); } },
      ],
    },
  };

  // ===========================================================================
  // CLIMB MAP — stages (each is a set of node choices) + IC ladder
  // ===========================================================================
  const STAGES = [
    { act: "Act I — Onboarding", nodes: [{ type: "combat", enemy: "bug_swarm", label: "Fix the Bug" }] },
    { act: "Act I — The System", nodes: [{ type: "combat", enemy: "legacy_service", label: "Touch the Legacy Service" }, { type: "event", id: "oncall", label: "On-Call Shift" }] },
    { act: "Act I — Breather", nodes: [{ type: "rest", label: "Rest Stop" }] },
    { act: "Act I — Boss", nodes: [{ type: "elite", enemy: "half_year", label: "Half-Year Check-In" }] },
    { act: "Act II — XFN Chaos", nodes: [{ type: "combat", enemy: "pm_align", label: "Argue with a PM" }, { type: "combat", enemy: "ds_skeptic", label: "Defend your Metric vs DS" }] },
    { act: "Act II — Politics", nodes: [{ type: "event", id: "reorg", label: "Reorg Event" }, { type: "combat", enemy: "legacy_service", label: "More Legacy Code" }] },
    { act: "Act II — Breather", nodes: [{ type: "rest", label: "Rest Stop" }] },
    { act: "Performance Season — Final", nodes: [{ type: "boss", enemy: "calibration_council", label: "Calibration Council" }] },
  ];
  const LADDER = ["IC3", "IC4", "IC5", "IC6", "Senior (IC7)", "Staff", "Senior Staff", "Principal", "VP"];
  const levelName = (floor) => LADDER[Math.min(floor, LADDER.length - 1)];

  const LOSE_LINES = [
    { title: "YOU QUIT", body: "You opened a blank doc titled 'resignation' and felt, briefly, alive." },
    { title: "YOU BURNED OUT", body: "Your doctor recommended 'less screen.' Your calendar disagreed." },
    { title: "YOU WERE MANAGED OUT", body: "It was framed as a mutual decision. It was not mutual." },
  ];

  // ===========================================================================
  // GAME ENGINE
  // ===========================================================================
  function Game() {
    this.screen = "title";
    this.run = null; this.player = null; this.enemy = null;
    this.hand = []; this.drawPile = []; this.discardPile = []; this.exhaustPile = [];
    this.logs = []; this.turn = 1; this.busy = false;
    this.rewardChoices = []; this.currentNode = null; this.event = null;
    this.loseLine = null; this.levelUpBanner = null; this.dealAnim = false;
  }

  Game.prototype.log = function (m) { this.logs.push(m); if (this.logs.length > 6) this.logs.shift(); };

  Game.prototype.startRun = function () {
    this.run = { stageIndex: 0, deck: STARTER_DECK.slice(), floor: 0 };
    this.player = { pulse: 80, maxPulse: 80, hours: 0, hoursPerTurn: 8, focus: 0, block: 0, powers: { focusSprint: 0 }, status: { weak: 0, burnout: 0, confused: 0, motivated: 0 } };
    this.screen = "map"; this.levelUpBanner = null;
  };

  // ---- map / stage routing ----
  Game.prototype.currentStage = function () { return STAGES[this.run.stageIndex]; };
  Game.prototype.chooseNode = function (i) {
    const stage = this.currentStage();
    const node = stage.nodes[i];
    if (!node) return;
    this.currentNode = node;
    Sound.sfx("select");
    if (node.type === "combat" || node.type === "elite" || node.type === "boss") this.startCombat(node.enemy);
    else if (node.type === "rest") { this.screen = "rest"; render(); }
    else if (node.type === "event") { this.event = EVENTS[node.id]; this.screen = "event"; render(); }
  };

  Game.prototype.completeStage = function () {
    this.run.floor++;
    const newLevel = levelName(this.run.floor);
    this.run.stageIndex++;
    if (this.run.stageIndex >= STAGES.length) { this.winGame(); return; }
    this.levelUpBanner = newLevel;
    Sound.sfx("level");
    this.screen = "map";
    render();
  };

  Game.prototype.chooseEvent = function (i) {
    const c = this.event.choices[i];
    if (c) c.run(this);
    this.event = null;
    this.completeStage();
  };

  Game.prototype.rest = function (choice) {
    if (choice === "sleep") { this.healPulse(24); Sound.sfx("block"); }
    else if (choice === "work_late") { this.run.deck.push("hotfix"); this.losePulse(10); Sound.sfx("hurt"); }
    else if (choice === "network") { const i = this.run.deck.lastIndexOf("tech_debt"); if (i >= 0) this.run.deck.splice(i, 1); else this.healPulse(6); Sound.sfx("select"); }
    this.completeStage();
  };

  // ---- combat ----
  Game.prototype.startCombat = function (enemyId) {
    const d = ENEMIES[enemyId];
    this.enemy = { id: d.id, name: d.name, sprite: d.sprite, glyph: d.glyph, tier: d.tier, hp: d.maxHp, maxHp: d.maxHp, block: 0, _t: 0, status: { weak: 0 }, plan: d.plan, intent: null, taunt: d.taunt, fx: "" };
    this.drawPile = shuffle(this.run.deck.slice());
    this.discardPile = []; this.exhaustPile = []; this.hand = []; this.logs = [];
    this.turn = 1; this.screen = "combat"; this.busy = false;
    this.player.block = 0; this.player.focus = 0;
    this.player.status = { weak: 0, burnout: 0, confused: 0, motivated: 0 };
    this.log(this.enemy.name + " appears. \u201C" + this.enemy.taunt + "\u201D");
    this.beginPlayerTurn(true);
    render();
  };

  Game.prototype.beginPlayerTurn = function (first) {
    const p = this.player;
    if (!first && p.status.burnout > 0) { this.losePulse(p.status.burnout); this.log("Burnout drains " + p.status.burnout + " Pulse."); }
    p.block = 0; p.hours = p.hoursPerTurn;
    if (p.powers.focusSprint > 0) { this.gainFocus(p.powers.focusSprint); }
    this.dealAnim = true;
    this.draw(5);
    this.enemy.intent = this.enemy.plan(this, this.enemy);
    this.busy = false;
  };

  Game.prototype.endTurn = function () {
    if (this.busy || this.screen !== "combat") return;
    this.busy = true;
    const p = this.player;
    const debt = this.hand.filter((c) => c === "tech_debt").length;
    if (debt > 0) { this.losePulse(2 * debt); this.log("Tech Debt rots in your hand: -" + 2 * debt + " Pulse."); }
    Sound.sfx("discard");
    this.discardPile = this.discardPile.concat(this.hand); this.hand = [];
    if (p.status.weak > 0) p.status.weak--;
    this.dealAnim = false;
    render();
    if (this.checkLose()) return;
    const self = this;
    setTimeout(function () { self.enemyTurn(); }, 650);
  };

  Game.prototype.enemyTurn = function () {
    const e = this.enemy;
    e.block = 0;
    if (e.intent && e.intent.exec) {
      if (e.intent.kind === "attack" || e.intent.kind === "special") { e.fx = "lunge"; }
      e.intent.exec(this);
    }
    if (e.status.weak > 0) e.status.weak--;
    render();
    e.fx = "";
    if (this.checkLose()) return;
    this.turn++;
    this.beginPlayerTurn(false);
    render();
  };

  Game.prototype.draw = function (n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) break;
      if (this.drawPile.length === 0) { if (this.discardPile.length === 0) break; this.drawPile = shuffle(this.discardPile); this.discardPile = []; }
      this.hand.push(this.drawPile.pop());
    }
    Sound.sfx("draw");
  };

  Game.prototype.playCard = function (i) {
    if (this.busy || this.screen !== "combat") return;
    const id = this.hand[i]; if (id == null) return;
    const card = CARDS[id];
    if (card.unplayable) { this.log(card.name + " is unplayable. That's the joke."); render(); return; }
    if (this.player.hours < card.cost) { this.log("Not enough Working Hours for " + card.name + "."); render(); return; }
    this.player.hours -= card.cost;
    this.hand.splice(i, 1);
    if (this.player.status.confused > 0) { this.player.status.confused--; this.log("\u201CNeeds more scope.\u201D " + card.name + " fizzles."); this.route(card); render(); return; }
    Sound.sfx("play");
    this.log("You play " + card.name + ".");
    card.effect(this);
    this.route(card);
    render();
    this.checkWin();
  };

  Game.prototype.route = function (card) { if (card.exhaust) this.exhaustPile.push(card.id); else this.discardPile.push(card.id); };

  // ---- combat math ----
  Game.prototype.dealDamage = function (amount) {
    let dmg = amount;
    if (this.player.status.weak > 0) dmg = Math.floor(dmg * 0.75);
    if (this.player.status.motivated > 0) { dmg = Math.floor(dmg * 1.5); this.player.status.motivated--; }
    const e = this.enemy;
    if (e.block > 0) { const a = Math.min(e.block, dmg); e.block -= a; dmg -= a; }
    e.hp = Math.max(0, e.hp - dmg);
    e.fx = "hurt"; Sound.sfx("hit"); FX.float("-" + dmg, 20, "dmg"); FX.shake();
  };
  Game.prototype.gainBlock = function (n) { this.player.block += n; Sound.sfx("block"); FX.float("+" + n + " \u25C8", 60, "block"); };
  Game.prototype.gainHours = function (n) { this.player.hours += n; };
  Game.prototype.gainFocus = function (n) { this.player.focus += n; };
  Game.prototype.healPulse = function (n) { this.player.pulse = Math.min(this.player.maxPulse, this.player.pulse + n); FX.float("+" + n, 60, "heal"); };
  Game.prototype.losePulse = function (n) { this.player.pulse = Math.max(0, this.player.pulse - n); };
  Game.prototype.enemyAttack = function (amount, label) {
    let dmg = amount; if (this.enemy.status.weak > 0) dmg = Math.floor(dmg * 0.75);
    const p = this.player; let rem = dmg;
    if (p.block > 0) { const a = Math.min(p.block, rem); p.block -= a; rem -= a; }
    if (rem > 0) { this.losePulse(rem); Sound.sfx("hurt"); FX.float("-" + rem, 60, "dmg"); FX.shake(); }
    else { Sound.sfx("block"); }
    this.log(this.enemy.name + ": " + label + " for " + dmg + (dmg !== rem ? " (" + (dmg - rem) + " blocked)" : "") + ".");
  };
  Game.prototype.addStatus = function (target, key, amt) { const o = target === "player" ? this.player.status : this.enemy.status; o[key] = (o[key] || 0) + amt; };
  Game.prototype.shuffleIntoDraw = function (id) { this.drawPile.splice(rnd(this.drawPile.length + 1), 0, id); };
  Game.prototype.shuffleIntoDiscard = function (id) { this.discardPile.push(id); };
  Game.prototype.enemyDiscardRandom = function () { if (!this.hand.length) return; const i = rnd(this.hand.length); this.discardPile.push(this.hand[i]); this.hand.splice(i, 1); };

  // ---- win/lose ----
  Game.prototype.checkWin = function () {
    if (this.enemy.hp <= 0 && this.screen === "combat") {
      if (this.enemy.tier === "boss") { this.winGame(); return true; }
      this.busy = true; this.offerRewards(); return true;
    }
    return false;
  };
  Game.prototype.checkLose = function () {
    if (this.player.pulse <= 0 && this.screen === "combat") { this.screen = "lose"; this.loseLine = pick(LOSE_LINES); Sound.stopMusic(); Sound.sfx("lose"); render(); return true; }
    return false;
  };
  Game.prototype.winGame = function () { this.screen = "win"; Sound.stopMusic(); Sound.sfx("win"); render(); };

  Game.prototype.offerRewards = function () { this.rewardChoices = shuffle(REWARD_POOL).slice(0, 3); this.screen = "reward"; render(); };
  Game.prototype.takeReward = function (id) { if (id) { this.run.deck.push(id); Sound.sfx("select"); } this.completeStage(); };

  // global instance
  let game = new Game();

  // ===========================================================================
  // RENDERING
  // ===========================================================================
  function spriteEl(file, glyph, cls) {
    const wrap = el("div", { class: "sprite " + (cls || "") });
    const img = el("img", { src: ASSET + file, alt: "", class: "sprite-img" });
    img.addEventListener("error", function () { img.style.display = "none"; wrap.classList.add("sprite-fallback"); wrap.appendChild(document.createTextNode(glyph || "?")); });
    wrap.appendChild(img);
    return wrap;
  }

  function audioBtn() {
    return el("button", { class: "audio-btn", title: "Mute / unmute", onclick: function () { Sound.init(); Sound.toggleMute(); render(); } }, [Sound.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"]);
  }

  function statPill(label, value, max, cls) {
    const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return el("div", { class: "pill " + cls }, [
      el("div", { class: "pill-label" }, [label]),
      el("div", { class: "pill-bar" }, [el("div", { class: "pill-fill", style: "width:" + pct + "%" })]),
      el("div", { class: "pill-val" }, [max ? value + " / " + max : String(value)]),
    ]);
  }

  function statusChips(status) {
    const map = { weak: ["Weak", "Deals 25% less."], burnout: ["Burnout", "Lose Pulse each turn."], confused: ["Confused", "Next card fizzles."], motivated: ["Motivated", "Next attack +50%."] };
    const chips = [];
    for (const k in status) if (status[k] > 0 && map[k]) chips.push(el("span", { class: "chip chip-" + k, title: map[k][1] }, [map[k][0] + " " + status[k]]));
    return el("div", { class: "chips" }, chips);
  }

  function cardEl(id, i, playable) {
    const c = CARDS[id];
    return el("div", { class: "card card-" + c.type + (playable ? "" : " card-disabled") + (game.dealAnim ? " card-deal" : ""), style: game.dealAnim ? "animation-delay:" + (i * 60) + "ms" : null, onclick: playable ? function () { game.playCard(i); } : null }, [
      el("div", { class: "card-cost" }, [String(c.cost)]),
      el("div", { class: "card-glyph" }, [c.glyph || ""]),
      el("div", { class: "card-name" }, [c.name]),
      el("div", { class: "card-text" }, [c.text]),
      el("div", { class: "card-type" }, [c.type.toUpperCase()]),
    ]);
  }

  // ---- title ----
  function renderTitle() {
    return el("div", { class: "screen screen-title", style: "background-image:url(" + ASSET + "scene_hq.png)" }, [
      el("div", { class: "title-scrim" }, [
        el("div", { class: "logo" }, [el("span", { class: "logo-mark" }, ["\u221E"]), "SQUID TECHNOLOGIES"]),
        el("h1", { class: "title-h1" }, ["PERFORMANCE REVIEW CLIMB"]),
        el("p", { class: "tagline" }, ["A satirical big-tech deckbuilder. Move Tentacles Fast\u2122."]),
        el("button", { class: "primary-btn big", onclick: function () { Sound.init(); Sound.resume(); Sound.playMusic("menu"); game.screen = "intro"; game.introBeat = 0; render(); startIntro(); } }, ["\u25B6  New Grad. Day One."]),
        el("p", { class: "footnote" }, ["Fictional company. Any resemblance to your last performance cycle is coincidental."]),
      ]),
      audioBtn(),
    ]);
  }

  // ---- intro cutscene ----
  const INTRO_BEATS = [
    { bg: "scene_hq.png", cls: "zoom-slow", cap: "你刚毕业,拿到了 offer。", sub: "Fresh out of school. Offer in hand. Life is good.", player: "happy" },
    { bg: "scene_hq.png", cls: "pan-up", cap: "你加入了 Squid Technologies。Level: IC3。", sub: "You join Squid Technologies. Level: IC3.", player: "walk" },
    { bg: "scene_climb.png", cls: "zoom-bottom", cap: "你想往上爬。你想当 VP。", sub: "You want to climb. You want to be VP.", player: "climb" },
    { bg: "scene_climb.png", cls: "pull-back", cap: "……这条梯子,比你想象的长得多。", sub: "...the ladder is much longer than it looked.", player: "tiny" },
    { bg: "scene_climb.png", cls: "hold", cap: "活下去。别让 Pulse Score 归零。", sub: "Survive. Don't let your Pulse Score hit zero.", player: "tiny" },
  ];
  let introTimer = null;
  function startIntro() {
    if (introTimer) clearTimeout(introTimer);
    function step() {
      if (game.screen !== "intro") return;
      if (game.introBeat >= INTRO_BEATS.length - 1) return; // last beat holds until button
      game.introBeat++;
      Sound.sfx("select");
      render();
      introTimer = setTimeout(step, 3200);
    }
    introTimer = setTimeout(step, 3200);
  }
  function endIntro() { if (introTimer) clearTimeout(introTimer); introTimer = null; game.screen = "class-select"; Sound.sfx("select"); render(); }

  function renderIntro() {
    const b = INTRO_BEATS[game.introBeat || 0];
    const last = (game.introBeat || 0) >= INTRO_BEATS.length - 1;
    return el("div", { class: "screen screen-intro" }, [
      el("div", { class: "intro-stage" }, [
        el("div", { class: "intro-bg " + b.cls, style: "background-image:url(" + ASSET + b.bg + ")" }),
        el("div", { class: "intro-player intro-" + b.player }, [spriteEl("player.png", "\uD83E\uDDD1\u200D\uD83D\uDCBB", "")]),
        el("div", { class: "intro-cap" }, [el("div", { class: "intro-cn" }, [b.cap]), el("div", { class: "intro-en" }, [b.sub])]),
      ]),
      el("div", { class: "intro-controls" }, [
        last ? el("button", { class: "primary-btn big", onclick: endIntro }, ["\u25B2  Begin the Climb"]) : el("button", { class: "ghost-btn", onclick: endIntro }, ["Skip intro \u00BB"]),
      ]),
      audioBtn(),
    ]);
  }

  // ---- class select ----
  function renderClassSelect() {
    const classes = [
      { id: "swe", name: "Software Engineer", glyph: "</>", focus: "Code, Fix, Ship", on: true },
      { id: "ds", name: "Data Scientist", glyph: "\u03A3", focus: "Data, Experiment, Insight", on: false },
      { id: "pm", name: "Product Manager", glyph: "\u25A4", focus: "Roadmap, Alignment, Delivery", on: false },
      { id: "pd", name: "Product Designer", glyph: "\u270E", focus: "User, Design, Polish", on: false },
    ];
    return el("div", { class: "screen screen-select" }, [
      el("p", { class: "select-prompt" }, ["Choose your path:"]),
      el("div", { class: "class-grid" }, classes.map((cl) => el("div", { class: "class-card" + (cl.on ? "" : " class-locked"), onclick: cl.on ? function () { Sound.sfx("select"); Sound.playMusic("map"); game.startRun(); render(); } : null }, [
        el("div", { class: "class-glyph" }, [cl.glyph]),
        el("div", { class: "class-name" }, [cl.name]),
        el("div", { class: "class-focus" }, [cl.focus]),
        el("div", { class: "class-badge" }, [cl.on ? "PLAYABLE" : "COMING SOON"]),
      ]))),
      audioBtn(),
    ]);
  }

  // ---- climb map ----
  function renderMap() {
    Sound.playMusic("map");
    const stage = game.currentStage();
    const nodeIcon = { combat: "\u2694\uFE0F", elite: "\uD83D\uDC51", boss: "\uD83D\uDC80", rest: "\uD83D\uDD25", event: "\u2753" };
    const rows = [];
    // future (top), current (highlighted), past (bottom) — render top-down
    for (let s = STAGES.length - 1; s >= 0; s--) {
      const st = STAGES[s];
      let cls = "map-row", content;
      if (s < game.run.stageIndex) { cls += " map-past"; content = [el("span", { class: "map-check" }, ["\u2713"]), el("span", { class: "map-actlabel" }, [st.act])]; }
      else if (s === game.run.stageIndex) {
        cls += " map-current";
        content = [el("div", { class: "map-actlabel cur" }, [st.act]), el("div", { class: "map-nodes" }, st.nodes.map((n, i) => el("button", { class: "map-node node-" + n.type, onclick: function () { game.chooseNode(i); } }, [el("span", { class: "node-ic" }, [nodeIcon[n.type] || "?"]), el("span", { class: "node-label" }, [n.label]), n.enemy ? el("span", { class: "node-hp" }, [ENEMIES[n.enemy].maxHp + " HP" + (n.type !== "combat" ? " \u2022 " + n.type.toUpperCase() : "")]) : null]))) ];
      } else { cls += " map-future"; content = [el("span", { class: "map-lock" }, ["\uD83D\uDD12"]), el("span", { class: "map-actlabel" }, [st.act])]; }
      rows.push(el("div", { class: cls }, content));
    }
    return el("div", { class: "screen screen-map", style: "background-image:url(" + ASSET + "scene_climb.png)" }, [
      el("div", { class: "map-scrim" }, [
        el("div", { class: "map-head" }, [
          el("div", { class: "level-badge" }, ["LEVEL ", el("b", {}, [levelName(game.run.floor)])]),
          el("div", { class: "map-pulse" }, ["Pulse ", el("b", {}, [game.player.pulse + " / " + game.player.maxPulse]), "  \u2022  Deck ", el("b", {}, [String(game.run.deck.length)])]),
        ]),
        game.levelUpBanner ? el("div", { class: "levelup-banner" }, ["\u25B2 LEVEL UP \u2014 you are now " + game.levelUpBanner]) : null,
        el("div", { class: "map-list" }, rows),
      ]),
      audioBtn(),
    ]);
  }

  // ---- combat ----
  function renderCombat() {
    Sound.playMusic(game.enemy.tier === "boss" ? "boss" : "combat");
    const p = game.player, e = game.enemy;
    const intentText = e.intent ? (e.intent.kind === "attack" ? "Attacks for " + e.intent.value : e.intent.kind === "defend" ? "Defends (+" + e.intent.value + ")" : e.intent.label) : "...";
    const efx = e.fx; e.fx = "";
    const hand = el("div", { class: "hand" }, game.hand.map((cid, i) => { const c = CARDS[cid]; const playable = !game.busy && !c.unplayable && p.hours >= c.cost; return cardEl(cid, i, playable); }));
    return el("div", { class: "screen screen-combat" }, [
      el("div", { class: "combat-top" }, [
        el("div", { class: "act-label" }, [game.currentStage().act + "  \u2022  " + levelName(game.run.floor) + (e.tier !== "normal" ? "  \u2022  " + e.tier.toUpperCase() : "")]),
        el("div", { class: "turn-row" }, [el("span", { class: "turn-label" }, ["Turn " + game.turn]), audioBtn()]),
      ]),
      el("div", { class: "enemy-zone" }, [
        el("div", { class: "intent-bubble" }, [el("div", { class: "intent-label" }, [e.intent ? e.intent.label : ""]), el("div", { class: "intent-sub" }, [intentText])]),
        spriteEl(e.sprite, e.glyph, "enemy-sprite" + (e.tier === "boss" ? " boss" : "") + (efx ? " fx-" + efx : "")),
        el("div", { class: "enemy-name" }, [e.name]),
        statPill("HP", e.hp, e.maxHp, "hp"),
        e.block > 0 ? el("div", { class: "block-tag" }, ["\u25C8 " + e.block + " Block"]) : null,
        statusChips(e.status),
      ]),
      el("div", { class: "log" }, game.logs.map((l) => el("div", { class: "log-line" }, [l]))),
      el("div", { class: "player-zone" }, [
        el("div", { class: "player-row" }, [
          spriteEl("player.png", "\uD83E\uDDD1\u200D\uD83D\uDCBB", "player-sprite"),
          el("div", { class: "player-stats" }, [
            el("div", { class: "stat-row" }, [statPill("Pulse Score", p.pulse, p.maxPulse, "pulse"), statPill("Working Hours", p.hours, p.hoursPerTurn, "hours")]),
            el("div", { class: "mini-row" }, [el("div", { class: "mini focus" }, ["Focus " + p.focus]), el("div", { class: "mini block" }, ["\u25C8 Block " + p.block]), p.powers.focusSprint ? el("div", { class: "mini power" }, ["\u21BB Focus Sprint " + p.powers.focusSprint]) : null]),
            statusChips(p.status),
          ]),
        ]),
      ]),
      el("div", { class: "control-row" }, [
        el("div", { class: "deck-counts" }, [el("span", {}, ["Draw " + game.drawPile.length]), el("span", {}, ["Discard " + game.discardPile.length])]),
        hand,
        el("button", { class: "end-turn", onclick: function () { game.endTurn(); }, disabled: game.busy ? "true" : null }, ["End Turn"]),
      ]),
    ]);
  }

  function renderReward() {
    return el("div", { class: "screen screen-modal" }, [el("div", { class: "modal-card" }, [
      el("h2", {}, ["Performance bump"]),
      el("p", { class: "modal-sub" }, ["You survived " + game.enemy.name + ". Add one card to your deck:"]),
      el("div", { class: "reward-row" }, game.rewardChoices.map((cid) => el("div", { class: "reward-pick", onclick: function () { game.takeReward(cid); } }, [cardEl(cid, -1, false)]))),
      el("button", { class: "ghost-btn", onclick: function () { game.takeReward(null); } }, ["Skip (touch grass)"]),
    ])]);
  }

  function renderRest() {
    const hasDebt = game.run.deck.indexOf("tech_debt") >= 0;
    return el("div", { class: "screen screen-modal" }, [el("div", { class: "modal-card" }, [
      el("h2", {}, ["A rare quiet evening"]),
      el("p", { class: "modal-sub" }, ["Something big is on the calendar. How do you spend tonight?"]),
      el("div", { class: "rest-row" }, [
        el("div", { class: "rest-opt", onclick: function () { game.rest("sleep"); } }, [el("div", { class: "rest-glyph" }, ["zZ"]), el("div", { class: "rest-name" }, ["Sleep"]), el("div", { class: "rest-desc" }, ["Restore 24 Pulse Score. Radical."])]),
        el("div", { class: "rest-opt", onclick: function () { game.rest("work_late"); } }, [el("div", { class: "rest-glyph" }, [">>"]), el("div", { class: "rest-name" }, ["Work Late"]), el("div", { class: "rest-desc" }, ["Add a Hotfix to your deck. Lose 10 Pulse."])]),
        el("div", { class: "rest-opt", onclick: function () { game.rest("network"); } }, [el("div", { class: "rest-glyph" }, ["@@"]), el("div", { class: "rest-name" }, ["Network"]), el("div", { class: "rest-desc" }, [hasDebt ? "Remove a Tech Debt from your deck." : "No Tech Debt to remove. Heal 6 instead."])]),
      ]),
    ])]);
  }

  function renderEvent() {
    const ev = game.event;
    return el("div", { class: "screen screen-modal" }, [el("div", { class: "modal-card" }, [
      el("div", { class: "event-glyph" }, [ev.glyph]),
      el("h2", {}, [ev.title]),
      el("p", { class: "modal-sub" }, [ev.body]),
      el("div", { class: "event-choices" }, ev.choices.map((c, i) => el("button", { class: "ghost-btn wide", onclick: function () { game.chooseEvent(i); } }, [c.label]))),
    ])]);
  }

  function renderWin() {
    return el("div", { class: "screen screen-modal" }, [el("div", { class: "modal-card win" }, [
      el("div", { class: "big-stamp" }, ["PROMOTED"]),
      el("h2", {}, ["You made VP."]),
      el("p", { class: "modal-sub" }, ["The Calibration Council reconvened, sighed, and agreed you \u201Coperated at the next level, mostly.\u201D You now own more scope, more meetings, and the exact same Pulse Score."]),
      el("p", { class: "fine" }, ["Promotion effective next half. Comp adjustment: pending alignment."]),
      el("button", { class: "primary-btn", onclick: function () { restart(); } }, ["Run it back (IC3)"]),
    ])]);
  }

  function renderLose() {
    const line = game.loseLine || LOSE_LINES[0];
    return el("div", { class: "screen screen-modal" }, [el("div", { class: "modal-card lose" }, [
      el("div", { class: "big-stamp lose-stamp" }, [line.title]),
      el("p", { class: "modal-sub" }, [line.body]),
      el("p", { class: "fine" }, ["You reached " + levelName(game.run.floor) + "."]),
      el("button", { class: "primary-btn", onclick: function () { restart(); } }, ["New grad, who dis (Restart)"]),
    ])]);
  }

  function restart() { game = new Game(); game.screen = "class-select"; Sound.playMusic("menu"); Sound.sfx("select"); render(); }

  function render() {
    if (!HAS_DOM) return;
    const app = $("#app"); if (!app) return;
    app.innerHTML = "";
    let view;
    switch (game.screen) {
      case "title": view = renderTitle(); break;
      case "intro": view = renderIntro(); break;
      case "class-select": view = renderClassSelect(); break;
      case "map": view = renderMap(); break;
      case "combat": view = renderCombat(); break;
      case "reward": view = renderReward(); break;
      case "rest": view = renderRest(); break;
      case "event": view = renderEvent(); break;
      case "win": view = renderWin(); break;
      case "lose": view = renderLose(); break;
      default: view = renderTitle();
    }
    app.appendChild(view);
    // clear one-shot level-up banner after it shows once
    if (game.screen === "map" && game.levelUpBanner) setTimeout(function () { game.levelUpBanner = null; }, 2600);
  }

  if (typeof window !== "undefined") {
    window.addEventListener && window.addEventListener("DOMContentLoaded", render);
    window.__squid = { get game() { return game; }, set game(v) { game = v; }, CARDS, ENEMIES, STAGES, EVENTS, Sound, render: render };
  }
})();
