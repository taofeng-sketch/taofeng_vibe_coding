/* =============================================================================
 * SCENE — Compendium / 图鉴  (plan §9 — monster + card gallery)
 * A *view* over CARDS / ENEMIES / ENEMY_LORE plus the squid_codex unlock set.
 * Two tabs: Card Library (卡牌图鉴) and Bestiary (敌人图鉴). Browsable pre-game
 * from MainMenu; ESC / Back returns. Reuses CardView (src/ui/card.js) to render
 * cards and the manifest enemy textures (gray-box / glyph fallback, §10.3).
 *
 * SCOPE NOTE: this milestone touches ONLY this file. All layout constants and
 * the (view-only) enemy move tables live here on purpose — they are presentation
 * data derived by reading enemies.js `plan()` labels, not a second database, and
 * are intentionally NOT added to the shared layout.js.
 *
 * DISCOVERED MODEL (see §9.1 + task option 4): SHOW-ALL with a discovered tick.
 *   - Every card/enemy is browsable pre-game (so the library is useful before a
 *     run), and a subtle badge shows progress: cards = "✓ in collection" vs
 *     "not yet seen"; enemies = "defeated" / "encountered" / "not yet encountered".
 *   - Starter-deck cards are marked discovered by default so a fresh player always
 *     sees their opening hand unlocked. Enemy detail still gates lore/stats behind
 *     "defeated" to preserve the meta-progression carrot.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // ---- local layout (kept INSIDE Compendium.js per scope rules) --------------
  var CL = {
    W: 1280, H: 720,
    titleY: 38,
    tabsY: 88,
    countY: 126,
    chipTypeY: 158,
    chipSourceY: 192,
    navY: 686,
    cardGrid: { cols: 6, rows: 2, w: 132, h: 185, stepX: 150, stepY: 210, topY: 318, cx: 640 },
    enemyGrid: { cols: 4, rows: 2, w: 214, h: 220, stepX: 240, stepY: 244, topY: 300, cx: 640 },
  };

  var TYPE_ACCENT = { attack: 0xff6b5e, skill: 0x4fd1c5, power: 0xb083f0, status: 0x8a9a5b };
  var TIER_COLOR = { normal: 0x4fd1c5, elite: 0xc9a227, boss: 0xff6b5e };
  var TIER_LABEL = { normal: "NORMAL", elite: "ELITE", boss: "BOSS" };

  function hex(n) { return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // View-only enemy move lists, authored from enemies.js `plan()` labels/values
  // (the procedural plans aren't statically introspectable; this mirrors them).
  var ENEMY_MOVES = {
    bug_swarm: [
      { name: "Infect Code", kind: "attack", desc: "Deal 10 damage." },
      { name: "Spread to Prod", kind: "special", desc: "Every 3rd turn: deal 6 and shuffle a Tech Debt into your discard." },
    ],
    legacy_service: [
      { name: "Add a Layer of Abstraction", kind: "defend", desc: "Gain 14 Block." },
      { name: "Cascading Failure", kind: "attack", desc: "Deal 20 damage. (alternates with Block)" },
    ],
    pm_align: [
      { name: "Let's Align", kind: "debuff", desc: "Apply Weak 2." },
      { name: "Need More Context", kind: "special", desc: "Forces you to discard a card." },
      { name: "Circle Back", kind: "attack", desc: "Deal 13 damage." },
    ],
    ds_skeptic: [
      { name: "Not Stat Sig", kind: "debuff", desc: "Apply Weak 2." },
      { name: "Need More Experimentation", kind: "special", desc: "Deal 9 and apply Weak 1." },
      { name: "Confidence Interval", kind: "attack", desc: "Deal 14 damage." },
    ],
    eng_manager: [
      { name: "Set Expectations", kind: "defend", desc: "Every 3rd turn: gain 12 Block." },
      { name: "Circle Back Offline", kind: "attack", desc: "Deal 18 — or 27 (+50%) if you are Weak or Marked." },
    ],
    half_year: [
      { name: "Constructive Feedback", kind: "attack", desc: "Deal 14 damage." },
      { name: "Needs Improvement", kind: "debuff", desc: "Apply Burnout 2." },
      { name: "Raised Expectations", kind: "attack", desc: "Deal 10 damage." },
    ],
    calibration_council: [
      { name: "Needs More Scope", kind: "debuff", desc: "Confused 1 — your next card fizzles." },
      { name: "Not Aligned", kind: "attack", desc: "Deal 20 damage." },
      { name: "What's the Incrementality?", kind: "special", desc: "Deal 14 — DOUBLED to 27 if you hold no metric card." },
      { name: "Stack Ranking", kind: "defend", desc: "Gain 16 Block." },
    ],
  };
  var MOVE_COLOR = { attack: "#ff6b5e", defend: "#4fd1c5", debuff: "#b083f0", special: "#ffd479" };

  // Lore fallback for enemies missing from data/lore.js (eng_manager has none).
  // View-only; does NOT mutate Squid.ENEMY_LORE.
  var EXTRA_LORE = {
    eng_manager: {
      en: "The bruiser of the Product Review Meeting. Hits hardest right after the PM has softened you up.",
      cn: "\u4EA7\u54C1\u8BC4\u5BA1\u4F1A\u91CC\u7684\u8F93\u51FA\u4F4D\u3002\u5728 PM \u7ED9\u4F60\u4E0A\u4E86 Weak/Marked \u4E4B\u540E\u4E0B\u624B\u6700\u72E0\u3002",
      tip: "Don't take its swing while Weak or Marked \u2014 clear the debuff or kill the PM first.",
    },
  };

  function Compendium() { Phaser.Scene.call(this, { key: "Compendium" }); }
  Compendium.prototype = Object.create(Phaser.Scene.prototype);
  Compendium.prototype.constructor = Compendium;

  // ---------------------------------------------------------------------------
  Compendium.prototype.create = function () {
    var self = this;
    var W = CL.W, H = CL.H;

    this.Save = Squid.Save;
    this.codex = (this.Save && this.Save.getCodex) ? this.Save.getCodex() : { enemiesSeen: [], enemiesDefeated: [], cardsSeen: [] };

    // starter-deck unique ids = discovered-by-default (pre-game guarantee)
    this.starterSet = {};
    (Squid.STARTER_DECK || []).forEach(function (id) { self.starterSet[id] = true; });
    this.rewardSet = {};
    (Squid.REWARD_POOL || []).forEach(function (id) { self.rewardSet[id] = true; });

    // view state
    this.tab = "cards";       // "cards" | "bestiary"
    this.page = 0;
    this.typeFilter = "all";  // all | attack | skill | power | status
    this.sourceFilter = "all"; // all | starter | reward
    this.detailOpen = false;

    // test hook (used by temp headless harness; harmless in production)
    var T = window.__COMPENDIUM_TEST;
    if (T) {
      if (T.tab) this.tab = T.tab;
      if (T.typeFilter) this.typeFilter = T.typeFilter;
    }

    // static backdrop + title (never rebuilt)
    this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d);
    this.add.rectangle(W / 2, H / 2, W - 24, H - 24, 0x0e151d, 0).setStrokeStyle(1, 0x1c2734);
    this.add.text(W / 2, CL.titleY, "COMPENDIUM \u00B7 \u56FE\u9274", {
      fontFamily: "monospace", fontSize: "30px", color: "#4fd1c5", fontStyle: "bold",
    }).setOrigin(0.5);

    // input (registered once; reads live state via closures)
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", function () { self.onEsc(); });
      this.input.keyboard.on("keydown-LEFT", function () { self.flipPage(-1); });
      this.input.keyboard.on("keydown-RIGHT", function () { self.flipPage(1); });
      this.input.keyboard.on("keydown-UP", function () { self.flipPage(-1); });
      this.input.keyboard.on("keydown-DOWN", function () { self.flipPage(1); });
    }
    this.input.on("wheel", function (p, objs, dx, dy) {
      if (self.detailOpen) return;
      self.flipPage(dy > 0 ? 1 : -1);
    });

    this.render();

    // expose a small handle so a headless harness can drive tabs/detail
    window.__compendium = {
      setTab: function (t) { self.setTab(t); },
      flipPage: function (d) { self.flipPage(d); },
      openFirstDetail: function () { self.openFirstDetail(); },
      closeDetail: function () { self.closeDetail(); },
    };
    if (T && T.openDetail) { this.time.delayedCall(60, function () { self.openFirstDetail(); }); }

    window.__squidScene = "Compendium";
  };

  // ---- sound helper (read-only use of the shared module) ---------------------
  Compendium.prototype.click = function () {
    var S = Squid.Sound;
    if (S) { try { S.init(); S.resume(); S.sfx("select"); } catch (e) {} }
  };

  Compendium.prototype.onEsc = function () {
    if (this.detailOpen) { this.closeDetail(); return; }
    this.scene.start("MainMenu");
  };

  Compendium.prototype.setTab = function (t) {
    if (this.tab === t) return;
    this.tab = t; this.page = 0;
    this.click();
    this.render();
  };

  Compendium.prototype.flipPage = function (dir) {
    if (this.detailOpen) return;
    var n = this.pageCount();
    var np = this.page + dir;
    if (np < 0) np = 0;
    if (np > n - 1) np = n - 1;
    if (np === this.page) return;
    this.page = np;
    this.click();
    this.render();
  };

  // ---- data builders ---------------------------------------------------------
  Compendium.prototype.cardSource = function (id) {
    if (this.starterSet[id]) return "starter";
    if (this.rewardSet[id]) return "reward";
    return "status";
  };
  Compendium.prototype.cardDiscovered = function (id) {
    if (this.starterSet[id]) return true;
    return (this.codex.cardsSeen || []).indexOf(id) >= 0;
  };

  Compendium.prototype.cardEntries = function () {
    var self = this;
    var ids = Object.keys(Squid.CARDS || {});
    return ids.filter(function (id) {
      var c = Squid.CARDS[id];
      if (self.typeFilter !== "all" && c.type !== self.typeFilter) return false;
      if (self.sourceFilter !== "all" && self.cardSource(id) !== self.sourceFilter) return false;
      return true;
    });
  };

  Compendium.prototype.enemyEntries = function () {
    return Object.keys(Squid.ENEMIES || {});
  };

  Compendium.prototype.pageSize = function () {
    return this.tab === "cards"
      ? CL.cardGrid.cols * CL.cardGrid.rows
      : CL.enemyGrid.cols * CL.enemyGrid.rows;
  };
  Compendium.prototype.entryCount = function () {
    return this.tab === "cards" ? this.cardEntries().length : this.enemyEntries().length;
  };
  Compendium.prototype.pageCount = function () {
    return Math.max(1, Math.ceil(this.entryCount() / this.pageSize()));
  };

  // ---- main render -----------------------------------------------------------
  Compendium.prototype.render = function () {
    var self = this, W = CL.W, H = CL.H;
    if (this.ui) { this.ui.destroy(true); this.ui = null; }
    this.ui = this.add.container(0, 0);

    // ---- tabs ----
    this.ui.add(this.tabButton("Card Library \u00B7 \u5361\u724C", 640 - 150, CL.tabsY, this.tab === "cards", function () { self.setTab("cards"); }));
    this.ui.add(this.tabButton("Bestiary \u00B7 \u654C\u4EBA", 640 + 150, CL.tabsY, this.tab === "bestiary", function () { self.setTab("bestiary"); }));

    // ---- back (top-left) ----
    this.ui.add(Squid.Widgets.button(this, {
      x: 96, y: CL.titleY, w: 150, h: 34, fontSize: 14, label: "\u2039 Back",
      onClick: function () { self.scene.start("MainMenu"); },
    }));

    // ---- count line + filters ----
    if (this.tab === "cards") this.renderCardChrome();
    else this.renderEnemyCount();

    // ---- grid ----
    if (this.tab === "cards") this.renderCardGrid();
    else this.renderEnemyGrid();

    // ---- pagination ----
    this.renderNav();
  };

  Compendium.prototype.tabButton = function (label, x, y, active, onClick) {
    return Squid.Widgets.button(this, {
      x: x, y: y, w: 250, h: 42, fontSize: 16, label: label, onClick: onClick,
      fill: active ? 0x123e3e : 0x1f2a37,
      hover: active ? 0x16494a : 0x2c3e50,
      border: active ? 0x4fd1c5 : 0x2a3744,
      textColor: active ? "#4fd1c5" : "#9fb3c8",
    });
  };

  Compendium.prototype.chip = function (label, x, y, active, onClick) {
    var w = 8 + label.length * 8.4;
    if (w < 64) w = 64;
    return Squid.Widgets.button(this, {
      x: x, y: y, w: w, h: 28, fontSize: 12, label: label, onClick: onClick,
      fill: active ? 0x123e3e : 0x161f29,
      hover: 0x223040,
      border: active ? 0x4fd1c5 : 0x2a3744,
      textColor: active ? "#4fd1c5" : "#8aa0b6",
    });
  };

  // ---- CARD tab chrome (count + type + source filters) -----------------------
  Compendium.prototype.renderCardChrome = function () {
    var self = this;
    var all = Object.keys(Squid.CARDS || {});
    var shown = this.cardEntries().length;
    var disc = 0;
    all.forEach(function (id) { if (self.cardDiscovered(id)) disc++; });
    this.ui.add(this.add.text(640, CL.countY,
      shown + " card" + (shown === 1 ? "" : "s") + " shown  \u00B7  " + disc + " / " + all.length + " in collection",
      { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0.5));

    // type filter row
    var types = [["all", "All"], ["attack", "Attack"], ["skill", "Skill"], ["power", "Power"], ["status", "Status"]];
    var tx = 640 - (types.length - 1) * 56;
    types.forEach(function (t) {
      self.ui.add(self.chip(t[1], tx, CL.chipTypeY, self.typeFilter === t[0], function () {
        self.typeFilter = t[0]; self.page = 0; self.click(); self.render();
      }));
      tx += 112;
    });

    // source filter row
    var srcs = [["all", "All sources"], ["starter", "Starter deck"], ["reward", "Reward pool"]];
    var sx = 640 - (srcs.length - 1) * 88;
    srcs.forEach(function (s) {
      self.ui.add(self.chip(s[1], sx, CL.chipSourceY, self.sourceFilter === s[0], function () {
        self.sourceFilter = s[0]; self.page = 0; self.click(); self.render();
      }));
      sx += 176;
    });
  };

  Compendium.prototype.renderEnemyCount = function () {
    var seen = (this.codex.enemiesSeen || []).length;
    var def = (this.codex.enemiesDefeated || []).length;
    var total = this.enemyEntries().length;
    this.ui.add(this.add.text(640, CL.countY,
      total + " entries  \u00B7  " + seen + " encountered  \u00B7  " + def + " defeated",
      { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0.5));
  };

  // ---- CARD grid -------------------------------------------------------------
  Compendium.prototype.renderCardGrid = function () {
    var self = this, g = CL.cardGrid;
    var ids = this.cardEntries();
    var start = this.page * this.pageSize();
    var slice = ids.slice(start, start + this.pageSize());

    if (slice.length === 0) {
      this.ui.add(this.add.text(640, 400, "No cards match this filter.", {
        fontFamily: "monospace", fontSize: "16px", color: "#5a6b7b",
      }).setOrigin(0.5));
      return;
    }

    var startX = g.cx - (g.cols - 1) * g.stepX / 2;
    slice.forEach(function (id, i) {
      var col = i % g.cols, row = Math.floor(i / g.cols);
      var x = startX + col * g.stepX;
      var y = g.topY + row * g.stepY;

      var cv = Squid.CardView(self, id, { x: x, y: y, w: g.w, h: g.h });
      var disc = self.cardDiscovered(id);
      if (!disc) cv.setAlpha(0.82);
      // discovered badge (top-left, above cost orb area edge)
      var badge = self.add.text(x - g.w / 2 + 4, y + g.h / 2 - 16,
        disc ? "\u2713" : "\u25CB",
        { fontFamily: "monospace", fontSize: "12px", color: disc ? "#7CFC9B" : "#5a6b7b" });
      self.ui.add(cv);
      self.ui.add(badge);

      cv.setInteractive(new Phaser.Geom.Rectangle(-g.w / 2, -g.h / 2, g.w, g.h), Phaser.Geom.Rectangle.Contains);
      if (cv.input) cv.input.cursor = "pointer";
      cv.on("pointerover", function () { cv._frame.setStrokeStyle(3, 0xffffff); });
      cv.on("pointerout", function () { cv._frame.setStrokeStyle(3, cv.accent); });
      cv.on("pointerdown", function () { self.click(); self.openCardDetail(id); });
    });
  };

  // ---- ENEMY grid ------------------------------------------------------------
  Compendium.prototype.renderEnemyGrid = function () {
    var self = this, g = CL.enemyGrid;
    var ids = this.enemyEntries();
    var start = this.page * this.pageSize();
    var slice = ids.slice(start, start + this.pageSize());
    var startX = g.cx - (g.cols - 1) * g.stepX / 2;

    slice.forEach(function (id, i) {
      var col = i % g.cols, row = Math.floor(i / g.cols);
      var x = startX + col * g.stepX;
      var y = g.topY + row * g.stepY;
      self.ui.add(self.enemyTile(id, x, y, g.w, g.h));
    });
  };

  Compendium.prototype.enemyTile = function (id, x, y, w, h) {
    var self = this;
    var e = Squid.ENEMIES[id];
    var seen = (this.codex.enemiesSeen || []).indexOf(id) >= 0;
    var defeated = (this.codex.enemiesDefeated || []).indexOf(id) >= 0;
    var tierC = TIER_COLOR[e.tier] || 0x4fd1c5;

    var tile = this.add.container(x, y);
    var bg = this.add.rectangle(0, 0, w, h, 0x121b24).setStrokeStyle(2, tierC);
    tile.add(bg);

    // sprite art box (top)
    var boxH = h - 60;
    this.placeSprite(tile, e.art, e.glyph, 0, -28, w - 24, boxH);

    // name
    tile.add(this.add.text(0, h / 2 - 34, e.name, {
      fontFamily: "monospace", fontSize: "13px", color: "#e6f1ff", fontStyle: "bold",
      align: "center", wordWrap: { width: w - 16 },
    }).setOrigin(0.5));

    // tier badge + discovered status
    tile.add(this.add.text(0, h / 2 - 14, TIER_LABEL[e.tier] || "?", {
      fontFamily: "monospace", fontSize: "11px", color: hex(tierC),
    }).setOrigin(0.5));

    var status = defeated ? "\u2713 defeated" : (seen ? "\u00B7 encountered" : "\u25CB not yet encountered");
    var statusC = defeated ? "#7CFC9B" : (seen ? "#9fb3c8" : "#5a6b7b");
    tile.add(this.add.text(w / 2 - 6, -h / 2 + 6, defeated ? "\u2713" : (seen ? "\u00B7" : "\u25CB"), {
      fontFamily: "monospace", fontSize: "13px", color: statusC,
    }).setOrigin(1, 0));

    tile.setSize(w, h);
    tile.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (tile.input) tile.input.cursor = "pointer";
    tile.on("pointerover", function () { bg.setStrokeStyle(3, 0xffffff); });
    tile.on("pointerout", function () { bg.setStrokeStyle(2, tierC); });
    tile.on("pointerdown", function () { self.click(); self.openEnemyDetail(id); });
    return tile;
  };

  // Place a sprite scaled to fit a box; gray-box + glyph fallback (§10.3).
  Compendium.prototype.placeSprite = function (parent, artKey, glyph, x, y, boxW, boxH) {
    if (artKey && this.textures.exists(artKey)) {
      var img = this.add.image(x, y, artKey);
      var s = Math.min(boxW / img.width, boxH / img.height);
      if (s > 0 && isFinite(s)) img.setScale(s);
      parent.add(img);
      return img;
    }
    var box = this.add.rectangle(x, y, boxW, boxH, 0x05080c).setStrokeStyle(1, 0x2a3744);
    var fs = Math.floor(Math.min(boxW, boxH) * 0.5);
    var gl = this.add.text(x, y, glyph || "?", {
      fontFamily: "monospace", fontSize: fs + "px", color: "#9fb3c8",
    }).setOrigin(0.5);
    parent.add([box, gl]);
    return box;
  };

  // ---- pagination ------------------------------------------------------------
  Compendium.prototype.renderNav = function () {
    var self = this, n = this.pageCount();
    var canPrev = this.page > 0, canNext = this.page < n - 1;
    this.ui.add(Squid.Widgets.button(this, {
      x: 430, y: CL.navY, w: 132, h: 40, fontSize: 15, label: "\u2039 Prev", enabled: canPrev,
      onClick: function () { self.flipPage(-1); },
    }));
    this.ui.add(this.add.text(640, CL.navY, "Page " + (this.page + 1) + " / " + n, {
      fontFamily: "monospace", fontSize: "15px", color: "#e6f1ff",
    }).setOrigin(0.5));
    this.ui.add(Squid.Widgets.button(this, {
      x: 850, y: CL.navY, w: 132, h: 40, fontSize: 15, label: "Next \u203A", enabled: canNext,
      onClick: function () { self.flipPage(1); },
    }));
    this.ui.add(this.add.text(640, CL.navY + 24, "\u2190 / \u2192  \u00B7  scroll wheel  \u00B7  ESC to exit", {
      fontFamily: "monospace", fontSize: "11px", color: "#5a6b7b",
    }).setOrigin(0.5));
  };

  // ---- DETAIL: card ----------------------------------------------------------
  Compendium.prototype.openCardDetail = function (id) {
    this.closeDetail();
    var self = this, W = CL.W, H = CL.H;
    var c = Squid.CARDS[id];
    var accent = TYPE_ACCENT[c.type] != null ? TYPE_ACCENT[c.type] : 0x4fd1c5;
    var disc = this.cardDiscovered(id);
    var src = this.cardSource(id);
    var srcLabel = src === "starter" ? "Starter deck" : (src === "reward" ? "Reward pool" : "Status / junk card");

    var layer = this.add.container(0, 0).setDepth(1000);
    this.detail = layer; this.detailOpen = true;
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.86).setInteractive());
    layer.add(this.add.rectangle(W / 2, H / 2, 860, 470, 0x121b24).setStrokeStyle(2, accent));

    // big card on the left
    layer.add(Squid.CardView(this, id, { x: 360, y: 360, w: 224, h: 314 }));

    // right column
    var rx = 540, ry = 168;
    layer.add(this.add.text(rx, ry, c.name, { fontFamily: "monospace", fontSize: "26px", color: "#e6f1ff", fontStyle: "bold", wordWrap: { width: 380 } }));
    layer.add(this.add.text(rx, ry + 46, cap(c.type) + "  \u00B7  Cost " + c.cost + "  \u00B7  " + cap(c.rarity || "common"), {
      fontFamily: "monospace", fontSize: "14px", color: hex(accent),
    }));
    layer.add(this.add.text(rx, ry + 74, "Source: " + srcLabel, { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }));

    var flags = [];
    if (c.exhaust) flags.push("Exhaust");
    if (c.unplayable) flags.push("Unplayable");
    if (c.metric) flags.push("Metric card");
    if (flags.length) layer.add(this.add.text(rx, ry + 98, "Tags: " + flags.join("  \u00B7  "), { fontFamily: "monospace", fontSize: "12px", color: "#ffd479" }));

    // rules text box
    layer.add(this.add.rectangle(rx + 180, ry + 168, 388, 110, 0x0e151d).setStrokeStyle(1, 0x2a3744));
    layer.add(this.add.text(rx, ry + 130, c.text || "", {
      fontFamily: "monospace", fontSize: "15px", color: "#cddceb", lineSpacing: 5, wordWrap: { width: 360 },
    }));

    layer.add(this.add.text(rx, ry + 250, disc ? "\u2713 In your collection" : "\u25CB Not yet collected \u2014 seen in a run to unlock", {
      fontFamily: "monospace", fontSize: "13px", color: disc ? "#7CFC9B" : "#5a6b7b",
    }));

    this.addDetailClose(layer);
  };

  // ---- DETAIL: enemy ---------------------------------------------------------
  Compendium.prototype.openEnemyDetail = function (id) {
    this.closeDetail();
    var self = this, W = CL.W, H = CL.H;
    var e = Squid.ENEMIES[id];
    var seen = (this.codex.enemiesSeen || []).indexOf(id) >= 0;
    var defeated = (this.codex.enemiesDefeated || []).indexOf(id) >= 0;
    var tierC = TIER_COLOR[e.tier] || 0x4fd1c5;
    var lore = (Squid.ENEMY_LORE && Squid.ENEMY_LORE[id]) || EXTRA_LORE[id] || null;

    var layer = this.add.container(0, 0).setDepth(1000);
    this.detail = layer; this.detailOpen = true;
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.86).setInteractive());
    layer.add(this.add.rectangle(W / 2, H / 2, 900, 500, 0x121b24).setStrokeStyle(2, tierC));

    // sprite (left)
    layer.add(this.add.rectangle(360, 320, 248, 248, 0x0e151d).setStrokeStyle(1, 0x2a3744));
    this.placeSprite(layer, e.art, e.glyph, 360, 320, 232, 232);

    // header (right)
    var rx = 520, ry = 150;
    layer.add(this.add.text(rx, ry, e.name, { fontFamily: "monospace", fontSize: "24px", color: "#e6f1ff", fontStyle: "bold", wordWrap: { width: 400 } }));
    layer.add(this.add.text(rx, ry + 44, (TIER_LABEL[e.tier] || "?") + "  \u00B7  HP " + e.maxHp + "  \u00B7  role: " + (e.aiRole || "\u2014"), {
      fontFamily: "monospace", fontSize: "14px", color: hex(tierC),
    }));
    if (e.taunt) layer.add(this.add.text(rx, ry + 70, "\u201C" + e.taunt + "\u201D", { fontFamily: "monospace", fontSize: "12px", color: "#8aa0b6", fontStyle: "italic", wordWrap: { width: 400 } }));

    // move list
    var moves = ENEMY_MOVES[id] || [];
    var my = ry + 110;
    layer.add(this.add.text(rx, my, "MOVES", { fontFamily: "monospace", fontSize: "13px", color: "#4fd1c5", fontStyle: "bold" }));
    my += 22;
    moves.forEach(function (m) {
      layer.add(self.add.text(rx, my, "\u25B8 " + m.name, { fontFamily: "monospace", fontSize: "13px", color: MOVE_COLOR[m.kind] || "#e6f1ff" }));
      layer.add(self.add.text(rx + 16, my + 16, m.desc, { fontFamily: "monospace", fontSize: "11px", color: "#9fb3c8", wordWrap: { width: 380 } }));
      my += 40;
    });

    // lore / tip (bottom, gated on defeated for the "full unlock", §9.1)
    var ly = 470, scrim = !defeated;
    if (lore) {
      var loreText = scrim ? (seen ? "Encountered \u2014 defeat it to reveal full lore & tactics." : "Not yet encountered.") : lore.en;
      layer.add(this.add.text(120, ly, loreText, { fontFamily: "monospace", fontSize: "13px", color: scrim ? "#5a6b7b" : "#cddceb", wordWrap: { width: 760 }, lineSpacing: 3 }));
      if (!scrim) {
        layer.add(this.add.text(120, ly + 40, lore.cn || "", { fontFamily: "monospace", fontSize: "13px", color: "#8aa0b6", wordWrap: { width: 760 }, lineSpacing: 3 }));
        if (lore.tip) layer.add(this.add.text(120, ly + 76, "\uD83D\uDCA1 " + lore.tip, { fontFamily: "monospace", fontSize: "12px", color: "#ffd479", wordWrap: { width: 760 } }));
      }
    }

    this.addDetailClose(layer);
  };

  Compendium.prototype.addDetailClose = function (layer) {
    var self = this, W = CL.W, H = CL.H;
    layer.add(Squid.Widgets.button(this, {
      x: W / 2 + 408, y: H / 2 - 226, w: 40, h: 40, fontSize: 18, label: "\u2715",
      onClick: function () { self.closeDetail(); },
    }));
    layer.add(Squid.Widgets.button(this, {
      x: W / 2, y: H / 2 + 268, w: 160, h: 40, fontSize: 14, label: "Close",
      onClick: function () { self.closeDetail(); },
    }));
  };

  Compendium.prototype.closeDetail = function () {
    if (this.detail) { this.detail.destroy(true); this.detail = null; }
    this.detailOpen = false;
  };

  // ---- headless-harness convenience -----------------------------------------
  Compendium.prototype.openFirstDetail = function () {
    if (this.tab === "cards") {
      var cids = this.cardEntries();
      if (cids.length) this.openCardDetail(cids[0]);
    } else {
      var eids = this.enemyEntries();
      if (eids.length) this.openEnemyDetail(eids[0]);
    }
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Compendium = Compendium;
})();
