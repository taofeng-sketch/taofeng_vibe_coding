/* =============================================================================
 * SCENE — Combat  (M3: MULTI-ENEMY coordinated combat WITH JUICE, §1/§3/§5/§11)
 * Drives the framework-agnostic CombatEngine (src/engine/combat.js) and renders
 * an ENEMY GROUP (up to 3 side by side, 4 hard cap) in Phaser, each with its own
 * HP bar / block / status chips / telegraphed intent and staggered idle bob.
 *
 * Targeting (plan §3.3): the player clicks/hovers an enemy to select it; a reticle
 * marks the target; single-target attack cards hit the selected enemy; self/AoE
 * cards ignore the target. Default target = first living enemy so nothing is
 * unplayable. Killing an enemy removes its queued intent (defuse the combo) and
 * re-homes the target to a living foe.
 *
 * Coordination is made LEGIBLE: per-enemy intent badges + a synergy connector
 * ("PM mark -> Manager +50%") + log lines at resolve. The engine resolves intents
 * in slot order so the PM's setup boosts the Manager's hit the same turn (§3.2).
 *
 * Juice per enemy: lunge, hit flash, recoil, floating numbers, particle bursts,
 * count-up bars, camera shake/flash. Respects the Settings `reduceMotion` toggle.
 * Win = all enemies dead -> Reward/Win; lose = 0 Pulse -> GameOver.
 * All positions come from Squid.LAYOUT (no hardcoded x/y baked into logic, §11.7).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // Global pacing multiplier for the FX queue. The combat choreography was
  // hard-locking player input for ~0.5s per card and ~2.1s per enemy turn (input
  // is gated by `this.locked` for the WHOLE animation queue), which read as
  // "laggy / unresponsive / cards won't click". Scaling every inter-event delay
  // (and the gating tween durations below) makes the game feel snappy while
  // keeping the exact same sequencing. Lower = faster.
  var FX_SPEED = 0.45;

  function Combat() { Phaser.Scene.call(this, { key: "Combat" }); }
  Combat.prototype = Object.create(Phaser.Scene.prototype);
  Combat.prototype.constructor = Combat;

  // ---- intent telegraph summary ----
  function intentSummary(intent) {
    if (!intent) return { icon: "\u2026", main: "", label: "", color: "#9fb3c8" };
    var k = intent.kind, v = intent.value || 0;
    if (k === "attack") return { icon: "\u2694", main: String(v), label: intent.label, color: intent.boosted ? "#ff3b30" : "#ff6b5e" };
    if (k === "defend") return { icon: "\u25C8", main: "+" + v, label: intent.label, color: "#4fd1c5" };
    if (k === "debuff") return { icon: "\u2193", main: "", label: intent.label, color: "#b083f0" };
    if (k === "special") return { icon: "\u2605", main: v > 0 ? String(v) : "", label: intent.label, color: "#ffd479" };
    return { icon: "\u2734", main: "", label: intent.label || "", color: "#e6f1ff" };
  }

  var STATUS_LABEL = { weak: "Weak", burnout: "Burnout", confused: "Confused", motivated: "Motivated", marked: "Marked", denied: "Denied" };
  var STATUS_COLOR = { weak: 0x8a9a5b, burnout: 0xff8a3d, confused: 0xb083f0, motivated: 0xffd479, marked: 0xff6b5e, denied: 0x6fb3ff };

  // ===========================================================================
  // create
  // ===========================================================================
  Combat.prototype.create = function () {
    var self = this;
    this.L = Squid.LAYOUT.get().combat;
    var L = this.L;
    var W = this.scale.width, H = this.scale.height;
    this.centerX = W / 2;       // cast/center stage anchor
    this.castY = 432;

    var settings = (Squid.Save && Squid.Save.getSettings()) || {};
    this.reduce = !!settings.reduceMotion;
    Squid.FX.setReduce(this.reduce);

    // ---- resolve the encounter (group) OR a single enemy from the map node ---
    var node = Squid.currentNode || { enemy: "bug_swarm", label: "Fix the Bug", type: "combat" };
    var save = Squid.activeSave || (Squid.Save ? (Squid.activeSave = Squid.Save.continueGame() || Squid.Save.newGame({ cls: "swe" })) : null);
    var run = (save && save.run) || { deck: (Squid.STARTER_DECK || []).slice(), pulse: 80, maxPulse: 80, powers: { focusSprint: 0 }, stageIndex: 0, floor: 0 };

    var engineOpts = { deck: run.deck, player: { pulse: run.pulse, maxPulse: run.maxPulse, powers: run.powers } };
    if (node.encounter && Squid.ENCOUNTERS && Squid.ENCOUNTERS[node.encounter]) engineOpts.encounterId = node.encounter;
    else engineOpts.enemyId = node.enemy || "bug_swarm";

    this.engine = new Squid.CombatEngine(engineOpts);
    this.isBoss = this.engine.enemies.some(function (e) { return e.tier === "boss"; });
    this.coordinated = !!(node.encounter && Squid.ENCOUNTERS[node.encounter] && Squid.ENCOUNTERS[node.encounter].coordinated);

    // audio
    var Sound = Squid.Sound;
    Sound.init(); Sound.resume(); Sound.playMusic(this.isBoss ? "boss" : "combat");

    // codex: mark every enemy in the group seen
    if (Squid.Save) {
      var cx = Squid.Save.getCodex(), changed = false;
      this.engine.enemies.forEach(function (e) { if (cx.enemiesSeen.indexOf(e.id) < 0) { cx.enemiesSeen.push(e.id); changed = true; } });
      if (changed) Squid.Save.saveCodex(cx);
    }

    this.handViews = [];
    this.locked = true; // gated until the opening deal finishes
    this.drawPos = { x: (L.drawPile && L.drawPile.x) || 60, y: (L.drawPile && L.drawPile.y) || 660 };
    this.discardPos = { x: 1200, y: 660 };

    // ---- background ----
    if (this.textures.exists("scene_hq")) {
      var bg = this.add.image(W / 2, H / 2, "scene_hq");
      bg.setScale(Math.max(W / bg.width, H / bg.height)).setScrollFactor(0);
      this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.62);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d);
    }

    // ---- top bar ----
    // Prefer the current map node's act band; fall back to the legacy STAGES entry.
    var stage = (Squid.STAGES || [])[run.stageIndex] || { act: "\u2014" };
    var actLabel = (node && node.act) || stage.act || "\u2014";
    var level = Squid.levelName ? Squid.levelName(run.floor) : "IC3";
    var tierStr = this.engine.enemies.length > 1 ? "  \u2022  GROUP \u00D7" + this.engine.enemies.length
      : (this.engine.enemies[0].tier !== "normal" ? "  \u2022  " + String(this.engine.enemies[0].tier).toUpperCase() : "");
    this.add.text(L.actLabel.x, L.actLabel.y, actLabel + "  \u2022  " + level + tierStr, { fontFamily: "monospace", fontSize: "15px", color: "#9fb3c8" }).setOrigin(0, 0.5);
    this.turnText = this.add.text(L.turnLabel.x, L.turnLabel.y, "Turn 1", { fontFamily: "monospace", fontSize: "15px", color: "#9fb3c8" }).setOrigin(L.turnLabel.origin.x, L.turnLabel.origin.y);

    // audio toggle
    this.audioLabel = this.add.text(W - 36, 56, Sound.isMuted() ? "\uD83D\uDD07" : "\uD83D\uDD0A", { fontSize: "22px" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(500);
    this.audioLabel.on("pointerdown", function () { Sound.init(); var m = Sound.toggleMute(); self.audioLabel.setText(m ? "\uD83D\uDD07" : "\uD83D\uDD0A"); });

    // ---- combat log (3 lines) ----
    this.logText = this.add.text(W / 2, 86, "", {
      fontFamily: "monospace", fontSize: "13px", color: "#cfe0f0", align: "center", wordWrap: { width: 820 },
    }).setOrigin(0.5, 0).setDepth(20);

    // ===== enemy group =====
    this.synergyGfx = this.add.graphics().setDepth(25); // connector cues between coordinated foes
    this.buildEnemyViews();

    // selection reticle (persistent on the current target)
    this.reticle = this.add.graphics().setDepth(28);
    // hover ring (transient preview)
    this.hoverRing = this.add.graphics().setDepth(27);
    // CARD HOVER-RECOGNITION indicator (§ "can I see which card the mouse is on?"):
    // a live pulsing ring framing whichever hand card is currently detected under
    // the pointer. Redrawn every frame in update() so it tracks the card as it lifts
    // and jumps card-to-card as you move across the hand — visual proof of the hit.
    this.hoverGfx = this.add.graphics().setDepth(410);
    this.hoveredCard = null;

    // ===== player =====
    this.playerSprite = this.makeSprite("player", "\uD83E\uDDD1\u200D\uD83D\uDCBB", 160);
    this.playerSprite.setPosition(L.player.x - 20, L.player.y).setDepth(10);
    if (!this.reduce) {
      this.tweens.add({ targets: this.playerSprite, y: L.player.y - 6, duration: 1900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
    var px = 290;
    this.add.text(px, 404, "You \u2014 " + level, { fontFamily: "monospace", fontSize: "13px", color: "#cfe0f0" }).setOrigin(0, 0.5);
    this.pulseBar = this.makeBar(px, 430, 260, 16, 0x4fd1c5, { prefix: "" });
    this.hoursBar = this.makeBar(px, 458, 260, 14, 0xffd479, { prefix: "" });
    this.add.text(px - 4, 430, "Pulse", { fontFamily: "monospace", fontSize: "9px", color: "#05080c" }).setOrigin(0, 0.5).setDepth(8);
    this.miniText = this.add.text(px, 486, "", { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0, 0.5);
    this.playerStatusText = this.add.text(px, 510, "", { fontFamily: "monospace", fontSize: "12px", color: "#c9a227", wordWrap: { width: 320 } }).setOrigin(0, 0.5);

    // ===== controls =====
    this.endTurnBtn = Squid.Widgets.button(this, {
      x: L.endTurn.x, y: L.endTurn.y, w: 180, h: 56, label: "End Turn",
      fill: 0x2a3744, hover: 0x37526a, border: 0xffd479,
      onClick: function () { self.onEndTurn(); },
    });
    this.endTurnBtn.setDepth(40);
    this.deckText = this.add.text(this.drawPos.x, this.drawPos.y - 28, "Draw 0", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0, 0.5);
    this.discardText = this.add.text(this.discardPos.x, this.discardPos.y - 28, "Discard 0", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(1, 0.5);

    // expose for the headless verify harness / debugging (mirrors v2 window.__squid)
    window.__squidScene = "Combat";
    Squid.__combat = this;

    // ---- kick off: opening deal ----
    this.engine.start();
    this.setTargetView(this.engine.target, false);
    this.runFx(this.engine.drainFx(), function () { self.locked = false; });
    this.refreshStatic(false);
  };

  // ===========================================================================
  // enemy group construction + layout
  // ===========================================================================
  Combat.prototype.enemyPositions = function (n) {
    var L = this.L;
    if (n >= 4) return L.enemySlots4.slice(0, n);
    if (n === 3) return L.enemySlots.slice(0, 3);
    if (n === 2) return [L.enemySlots[0], L.enemySlots[2]];
    return [L.enemySlots[1]]; // single -> center
  };

  Combat.prototype.buildEnemyViews = function () {
    var self = this;
    var enemies = this.engine.enemies;
    var pos = this.enemyPositions(enemies.length);
    var spriteH = enemies.length === 1 ? (this.isBoss ? 200 : 160) : 132;
    this.enemyViews = [];

    enemies.forEach(function (e, i) {
      var p = pos[i] || { x: 640, y: 250 };
      var v = { idx: e.idx, slot: e.slot, x: p.x, y: p.y, dead: false };

      v.sprite = self.makeSprite(e.art, e.glyph, spriteH).setPosition(p.x, p.y).setDepth(10);
      // staggered idle bob (so the group feels alive, not in lockstep, §1)
      if (!self.reduce) {
        self.tweens.add({ targets: v.sprite, y: p.y - 8, duration: 1500 + i * 180, delay: i * 220, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      }

      v.nameText = self.add.text(p.x, p.y + (spriteH / 2) + 6, e.name, { fontFamily: "monospace", fontSize: "13px", color: "#e6f1ff", fontStyle: "bold", align: "center", wordWrap: { width: 200 } }).setOrigin(0.5, 0);
      var barY = p.y + (spriteH / 2) + 44;
      v.hpBar = self.makeBar(p.x - 95, barY, 190, 15, 0xe06c75, { prefix: "", fontSize: 10 });
      v.blockBadge = self.add.text(p.x + 100, barY, "", { fontFamily: "monospace", fontSize: "12px", color: "#4fd1c5" }).setOrigin(0, 0.5);
      v.statusText = self.add.text(p.x, barY + 20, "", { fontFamily: "monospace", fontSize: "11px", color: "#c9a227", align: "center", wordWrap: { width: 220 } }).setOrigin(0.5, 0);

      // per-enemy intent telegraph badge (above the enemy)
      var by = p.y - (spriteH / 2) - 44;
      v.intentBadge = self.add.container(p.x, by).setDepth(30);
      var ibBg = self.add.rectangle(0, 0, 188, 50, 0x121b24, 0.92).setStrokeStyle(2, 0x4fd1c5);
      v.intentIcon = self.add.text(-80, 0, "\u2026", { fontFamily: "monospace", fontSize: "24px", color: "#ff6b5e" }).setOrigin(0.5);
      v.intentMain = self.add.text(-54, 0, "", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
      v.intentLabel = self.add.text(-20, 0, "", { fontFamily: "monospace", fontSize: "9px", color: "#9fb3c8", align: "left", wordWrap: { width: 100 } }).setOrigin(0, 0.5);
      v.intentBadge.add([ibBg, v.intentIcon, v.intentMain, v.intentLabel]);

      // click/hover hit zone (uniform for image OR gray-box container sprites)
      var zw = spriteH * 0.9, zh = spriteH * 1.05;
      v.zone = self.add.zone(p.x, p.y, zw, zh).setInteractive({ useHandCursor: true }).setDepth(15);
      v.zone.on("pointerover", function () { if (!v.dead && !self.locked) self.drawHoverRing(v); });
      v.zone.on("pointerout", function () { self.hoverRing.clear(); });
      v.zone.on("pointerdown", function () { if (!v.dead && !self.locked) self.setTargetView(v.idx, true); });

      self.enemyViews.push(v);
    });
  };

  Combat.prototype.viewFor = function (idx) {
    for (var i = 0; i < this.enemyViews.length; i++) if (this.enemyViews[i].idx === idx) return this.enemyViews[i];
    return this.enemyViews[0];
  };

  // ---- targeting ----
  Combat.prototype.setTargetView = function (idx, sfx) {
    var v = this.viewFor(idx);
    if (!v || v.dead) return;
    this.engine.setTarget(idx);
    this.targetIdx = idx;
    if (sfx && Squid.Sound) Squid.Sound.sfx("select");
    this.drawReticle(v);
    this.updatePlayable();
  };

  Combat.prototype.drawReticle = function (v) {
    var g = this.reticle; g.clear();
    if (!v) return;
    var hw = 78, hh = 92, x = v.x, y = v.y, len = 18;
    g.lineStyle(3, 0xffd479, 1);
    // four corner brackets
    var corners = [[-hw, -hh, 1, 1], [hw, -hh, -1, 1], [-hw, hh, 1, -1], [hw, hh, -1, -1]];
    corners.forEach(function (c) {
      var cx = x + c[0], cy = y + c[1], sx = c[2], sy = c[3];
      g.beginPath(); g.moveTo(cx, cy + sy * len); g.lineTo(cx, cy); g.lineTo(cx + sx * len, cy); g.strokePath();
    });
  };

  Combat.prototype.drawHoverRing = function (v) {
    var g = this.hoverRing; g.clear();
    if (!v || v.idx === this.targetIdx) return;
    g.lineStyle(2, 0x6fb3ff, 0.8).strokeRect(v.x - 80, v.y - 94, 160, 188);
  };

  // ===========================================================================
  // sprite + bar factories
  // ===========================================================================
  Combat.prototype.makeSprite = function (key, glyph, targetH) {
    if (this.textures.exists(key)) {
      var img = this.add.image(0, 0, key);
      img.setScale(targetH / img.height);
      img.isImage = true;
      return img;
    }
    var c = this.add.container(0, 0);
    var r = this.add.rectangle(0, 0, targetH * 0.8, targetH, 0x223040).setStrokeStyle(2, 0x4fd1c5);
    var t = this.add.text(0, 0, glyph || "?", { fontSize: Math.floor(targetH * 0.5) + "px" }).setOrigin(0.5);
    c.add([r, t]);
    c.isImage = false;
    return c;
  };

  Combat.prototype.makeBar = function (x, y, w, h, color, opts) {
    opts = opts || {};
    var scene = this;
    this.add.rectangle(x, y, w, h, 0x05080c).setOrigin(0, 0.5).setStrokeStyle(1, 0x2a3744).setDepth(6);
    var fill = this.add.rectangle(x + 1, y, w - 2, h - 2, color).setOrigin(0, 0.5).setDepth(7);
    var label = this.add.text(x + w / 2, y, "", { fontFamily: "monospace", fontSize: (opts.fontSize || 11) + "px", color: "#e6f1ff", stroke: "#05080c", strokeThickness: 3 }).setOrigin(0.5).setDepth(9);
    var maxW = w - 2;
    return {
      _v: 0, _max: 1, _fill: fill, _label: label,
      setValue: function (v, max, animate) {
        max = max || this._max || 1;
        var target = Math.max(0, Math.min(1, v / max)) * maxW;
        var from = this._v;
        this._v = v; this._max = max;
        var setLabel = function (n) { label.setText((opts.prefix || "") + n + " / " + max); };
        if (animate && !Squid.FX.reduce) {
          var fw = { v: fill.width }, nn = { n: from };
          scene.tweens.add({ targets: fw, v: target, duration: 360, ease: "Cubic.out", onUpdate: function () { fill.width = fw.v; } });
          scene.tweens.add({ targets: nn, n: v, duration: 360, ease: "Cubic.out", onUpdate: function () { setLabel(Math.round(nn.n)); }, onComplete: function () { setLabel(v); } });
        } else {
          fill.width = target; setLabel(v);
        }
      },
    };
  };

  // ===========================================================================
  // static refresh (idempotent; bars optionally count-up)
  // ===========================================================================
  Combat.prototype.refreshStatic = function (animate) {
    var self = this, p = this.engine.player;
    this.engine.enemies.forEach(function (e) {
      var v = self.viewFor(e.idx);
      if (!v || v.dead) return;
      v.hpBar.setValue(e.hp, e.maxHp, animate);
      v.blockBadge.setText(e.block > 0 ? "\u25C8 " + e.block : "");
      v.statusText.setText(self.statusStr(e.status));
    });
    this.pulseBar.setValue(p.pulse, p.maxPulse, animate);
    this.hoursBar.setValue(p.hours, p.hoursPerTurn, animate);
    this.miniText.setText("Focus " + p.focus + "    \u25C8 Block " + p.block + (p.powers.focusSprint ? "    \u21BB FS " + p.powers.focusSprint : ""));
    this.playerStatusText.setText(this.statusStr(p.status));
    this.turnText.setText("Turn " + this.engine.turn);
    this.deckText.setText("Draw " + this.engine.drawPile.length);
    this.discardText.setText("Discard " + this.engine.discardPile.length);
    this.updateIntents();
    this.updatePlayable();
  };

  Combat.prototype.statusStr = function (status) {
    var out = [];
    for (var k in status) if (status[k] > 0 && STATUS_LABEL[k]) out.push(STATUS_LABEL[k] + " " + status[k]);
    return out.join("  ");
  };

  // Render every living enemy's intent + a synergy connector for coordinated foes.
  Combat.prototype.updateIntents = function () {
    var self = this;
    this.engine.enemies.forEach(function (e) {
      var v = self.viewFor(e.idx);
      if (!v) return;
      if (v.dead) { v.intentBadge.setVisible(false); return; }
      var s = intentSummary(e.intent);
      v.intentBadge.setVisible(true);
      v.intentIcon.setText(s.icon).setColor(s.color);
      v.intentMain.setText(s.main);
      v.intentLabel.setText(s.label);
    });
    this.drawSynergy();
  };

  // Visualize the PM-mark -> Manager-+50% chain so coordination is readable (§3.4).
  Combat.prototype.drawSynergy = function () {
    var g = this.synergyGfx; g.clear();
    if (!this.coordinated) return;
    var self = this;
    var mgr = null, src = null;
    this.engine.enemies.forEach(function (e) {
      if (e.hp <= 0 || !e.intent) return;
      if (e.intent.boosted && e.aiRole === "bruiser") mgr = self.viewFor(e.idx);
      if (e.intent.synergyRole === "bruiser") src = self.viewFor(e.idx);
    });
    if (mgr && src) {
      g.lineStyle(2, 0xff6b5e, 0.55);
      var y = Math.min(src.y, mgr.y) - (mgr.sprite ? 64 : 60) - 24;
      g.beginPath(); g.moveTo(src.x, src.y - 96); g.lineTo(src.x, y); g.lineTo(mgr.x, y); g.lineTo(mgr.x, mgr.y - 96); g.strokePath();
      // arrowhead at the manager
      g.fillStyle(0xff6b5e, 0.7);
      g.fillTriangle(mgr.x - 6, mgr.y - 96 - 8, mgr.x + 6, mgr.y - 96 - 8, mgr.x, mgr.y - 96);
    }
  };

  Combat.prototype.updatePlayable = function () {
    var self = this;
    this.handViews.forEach(function (v, i) { v.setPlayable(self.engine.canPlay(i)); });
  };

  // ===========================================================================
  // hand layout + card factory
  // ===========================================================================
  Combat.prototype.makeHandCard = function (cardId) {
    var self = this;
    var cs = this.L.cardSize;
    var view = Squid.CardView(this, cardId, { x: this.drawPos.x, y: this.drawPos.y, w: cs.w, h: cs.h });
    view.setScale(0.4);
    view.setInteractive(new Phaser.Geom.Rectangle(-cs.w / 2, -cs.h / 2, cs.w, cs.h), Phaser.Geom.Rectangle.Contains);

    view.on("pointerover", function () {
      self.hoveredCard = view; // recognition indicator tracks this card (see update())
      if (self.locked || view._raised) return;
      view._raised = true;
      view.setDepth(400);
      if (self.reduce) { view.y = view._baseY - 22; view.setScale(1.08); return; }
      self.tweens.add({ targets: view, y: view._baseY - 26, scaleX: 1.1, scaleY: 1.1, duration: 110, ease: "Back.out" });
    });
    view.on("pointerout", function () {
      if (self.hoveredCard === view) self.hoveredCard = null;
      if (!view._raised) return;
      view._raised = false;
      var idx = self.handViews.indexOf(view);
      view.setDepth(100 + (idx < 0 ? 0 : idx));
      if (self.reduce) { view.y = view._baseY; view.setScale(1); return; }
      self.tweens.add({ targets: view, y: view._baseY, scaleX: 1, scaleY: 1, duration: 130, ease: "Quad.out" });
    });
    view.on("pointerdown", function () {
      if (self.locked) return;
      var idx = self.handViews.indexOf(view);
      if (idx >= 0) self.playCardAt(idx);
    });

    this.handViews.push(view);
    return view;
  };

  // Per-frame: draw the hover-recognition ring around the detected card so the
  // player can SEE which card the mouse is actually on (and confirm accuracy).
  Combat.prototype.update = function (time) {
    var g = this.hoverGfx;
    if (!g) return;
    g.clear();
    var v = this.hoveredCard;
    if (!v || !v.active || this.locked) return;
    var cs = this.L.cardSize;
    var w = (cs.w + 18) * v.scaleX, h = (cs.h + 18) * v.scaleY;
    var pulse = 0.6 + 0.25 * Math.sin((time || 0) / 130);
    g.lineStyle(3, 0xffd479, pulse);
    g.strokeEllipse(v.x, v.y, w * 1.16, h * 1.04);
    g.lineStyle(1.5, 0xffffff, pulse * 0.6);
    g.strokeEllipse(v.x, v.y, w * 1.02, h * 0.94);
  };

  Combat.prototype.relayout = function (animate) {
    var n = this.handViews.length;
    if (!n) return;
    var L = this.L;
    var cw = L.cardSize.w, ch = L.cardSize.h;
    var spread = Math.min(L.handSpread, 920 / n);
    var total = (n - 1) * spread;
    var startX = L.handCenter.x - total / 2;
    for (var i = 0; i < n; i++) {
      var v = this.handViews[i];
      var tx = startX + i * spread;
      var arc = Math.abs(i - (n - 1) / 2) * 5;
      var ty = L.handCenter.y + arc;
      v.handIndex = i;
      v.setBaseY(ty);
      if (!v._raised) v.setDepth(100 + i);
      // ---- TILE THE HIT ZONE (fix: leftmost/overlapped card wouldn't acquire hover)
      // Fanned cards overlap (~spacing < card width), and since each later card has a
      // higher depth, the OVERLAP region was always grabbed by the right-hand neighbor,
      // so hovering a card's covered half popped the wrong card (or nothing on the edge).
      // Give every card an exclusive, non-overlapping local hit rectangle that tiles the
      // hand: middle cards span [-spread/2, +spread/2]; the two end cards extend out to
      // the full card edge so the whole visible hand is reliably hoverable/clickable.
      if (v.input && v.input.hitArea) {
        var leftLocal = (i === 0) ? -cw / 2 : -spread / 2;
        var rightLocal = (i === n - 1) ? cw / 2 : spread / 2;
        var ha = v.input.hitArea;
        ha.x = leftLocal; ha.width = rightLocal - leftLocal;
        ha.y = -ch / 2; ha.height = ch;
      }
      if (animate && !this.reduce) {
        this.tweens.add({ targets: v, x: tx, y: v._raised ? ty - 26 : ty, scaleX: 1, scaleY: 1, duration: 180, ease: "Back.out" });
      } else {
        v.x = tx; v.y = ty; v.setScale(1);
      }
    }
    this.updatePlayable();
  };

  // ===========================================================================
  // fx queue -> animations (sequential stepper)
  // ===========================================================================
  Combat.prototype.runFx = function (list, onComplete) {
    var self = this, i = 0;
    function step() {
      if (i >= list.length) { self.refreshStatic(true); if (onComplete) onComplete(); return; }
      var ev = list[i++];
      var delay = self.applyFxEvent(ev);
      delay = self.reduce ? 0 : Math.round(delay * FX_SPEED);
      self.time.delayedCall(delay, step);
    }
    step();
  };

  Combat.prototype.applyFxEvent = function (ev) {
    var Sound = Squid.Sound, FX = Squid.FX;
    var pxc = this.playerSprite.x, pyc = this.playerSprite.y;
    switch (ev.t) {
      case "log": this.pushLog(ev.msg); return 0;
      case "turnStart": this.turnText.setText("Turn " + ev.turn); return 0;
      case "intents": this.updateIntents(); return 0;
      case "target": this.targetIdx = ev.idx; this.drawReticle(this.viewFor(ev.idx)); return 0;
      case "reshuffle": Sound.sfx("draw"); return 0;
      case "denied": { var dv = this.viewFor(this.targetIdx); if (dv) FX.floatNumber(this, dv.x, dv.y - 30, "HALVED", "#6fb3ff", 20); return this.reduce ? 0 : 60; }

      case "draw": {
        this.makeHandCard(ev.cardId);
        Sound.sfx("draw");
        this.relayout(true);
        return this.reduce ? 0 : 70;
      }

      case "damageEnemy": {
        var v = this.viewFor(ev.idx);
        var ex = v.x, ey = v.y;
        Sound.sfx("hit");
        FX.hitFlash(this, v.sprite);
        this.recoil(v.sprite, ex, +14);
        FX.burst(this, ex, ey, 0xff6b5e, 12, 50);
        if (ev.amount > 0) FX.floatNumber(this, ex, ey - 40, "-" + ev.amount, "#ff6b5e", 34);
        else if (ev.blocked > 0) FX.floatNumber(this, ex, ey - 40, "BLOCKED", "#4fd1c5", 22);
        FX.shake(this, ev.amount);
        if (!v.dead) v.hpBar.setValue(ev.hpAfter, this.engine.enemies[ev.idx].maxHp, true);
        if (ev.hpAfter <= 0 && !v.dead) this.killEnemyView(v);
        return this.reduce ? 0 : 130;
      }

      case "gainBlock": {
        Sound.sfx("block");
        FX.shield(this, pxc, pyc, 56);
        FX.floatNumber(this, pxc, pyc - 30, "+" + ev.amount + " \u25C8", "#4fd1c5", 26);
        return this.reduce ? 0 : 90;
      }
      case "gainHours": { FX.floatNumber(this, pxc + 30, pyc - 10, "+" + ev.amount + "h", "#ffd479", 20); return this.reduce ? 0 : 40; }
      case "gainFocus": { FX.floatNumber(this, pxc - 30, pyc - 10, "+" + ev.amount + " Focus", "#9fb3c8", 18); return this.reduce ? 0 : 40; }

      case "heal": {
        if (ev.amount > 0) {
          Sound.sfx("block");
          FX.stream(this, pxc, pyc, 0x7ee787, 9);
          FX.tint(this, this.playerSprite, 0x7ee787);
          FX.floatNumber(this, pxc, pyc - 30, "+" + ev.amount, "#7ee787", 28);
          this.pulseBar.setValue(ev.after, this.engine.player.maxPulse, true);
        }
        return this.reduce ? 0 : 90;
      }
      case "losePulse": {
        if (ev.amount > 0) {
          Sound.sfx("hurt");
          FX.floatNumber(this, pxc, pyc - 20, "-" + ev.amount, "#ff6b5e", 24);
          this.pulseBar.setValue(ev.after, this.engine.player.maxPulse, true);
        }
        return this.reduce ? 0 : 70;
      }

      case "enemyAct": {
        var av = this.viewFor(ev.idx);
        if (ev.kind === "defend") { Sound.sfx("block"); FX.shield(this, av.x, av.y, 64); return this.reduce ? 0 : 220; }
        if (!this.reduce && av.sprite) this.tweens.add({ targets: av.sprite, scaleY: av.sprite.scaleY * 0.92, duration: 110, yoyo: true, ease: "Quad.out" });
        return this.reduce ? 0 : 130;
      }

      case "enemyAttack": {
        var self = this;
        var avw = this.viewFor(ev.idx);
        var sx = avw.x, sy = avw.y;
        var apply = function () {
          if (ev.taken > 0) {
            Sound.sfx("hurt");
            FX.hitFlash(self, self.playerSprite);
            self.playerHurtAnim();
            FX.burst(self, pxc, pyc, 0xff6b5e, 12, 46);
            FX.floatNumber(self, pxc, pyc - 30, "-" + ev.taken, "#ff6b5e", 32);
            FX.shake(self, ev.taken);
            if (ev.taken >= 14) FX.flash(self, 130, 0, 0, 130);
            self.pulseBar.setValue(ev.after, self.engine.player.maxPulse, true);
          } else {
            Sound.sfx("block");
            FX.shield(self, pxc, pyc, 56);
            FX.floatNumber(self, pxc, pyc - 30, "BLOCK", "#4fd1c5", 22);
          }
        };
        if (this.reduce || !avw.sprite) { apply(); return 0; }
        // lunge from this enemy toward the player, strike at apex, return
        var tx = pxc + 70, ty = pyc - 10;
        this.tweens.add({
          targets: avw.sprite, x: tx, y: ty, duration: 170, ease: "Quad.in",
          onComplete: function () {
            apply();
            self.tweens.add({ targets: avw.sprite, x: sx, y: sy, duration: 220, ease: "Quad.out" });
          },
        });
        return 450;
      }

      case "status": {
        var who = ev.who === "player" ? this.playerSprite : (this.viewFor(ev.idx) || {}).sprite;
        var color = STATUS_COLOR[ev.key] || 0xffffff;
        var sxp = ev.who === "player" ? pxc : (this.viewFor(ev.idx) || { x: pxc }).x;
        var syp = ev.who === "player" ? pyc : (this.viewFor(ev.idx) || { y: pyc }).y;
        FX.tint(this, who, color);
        FX.floatNumber(this, sxp, syp - 50, (STATUS_LABEL[ev.key] || ev.key) + " +" + ev.amt, FX.hex(color), 18);
        return this.reduce ? 0 : 80;
      }

      case "shuffleIn": { Sound.sfx("draw"); return 0; }
      case "enemyDiscard": { Sound.sfx("discard"); return 0; }

      case "discardHand": {
        var views = this.handViews.slice();
        this.handViews = [];
        var dp = this.discardPos, scene = this;
        if (this.reduce) { views.forEach(function (vv) { vv.destroy(); }); return 0; }
        views.forEach(function (vv, k) {
          scene.tweens.add({
            targets: vv, x: dp.x, y: dp.y, scaleX: 0.4, scaleY: 0.4, alpha: 0, angle: 15,
            delay: k * 40, duration: 260, ease: "Cubic.in",
            onComplete: function () { vv.destroy(); },
          });
        });
        Sound.sfx("discard");
        return views.length ? 240 : 0;
      }

      case "win": case "lose": return 0; // routing handled after the sequence
      default: return 0;
    }
  };

  // enemy death dissolve (§1); intent + reticle removed (defuse the combo, §3.2)
  Combat.prototype.killEnemyView = function (v) {
    v.dead = true;
    v.intentBadge.setVisible(false);
    v.blockBadge.setText("");
    v.statusText.setText("");
    if (v.zone) v.zone.disableInteractive();
    Squid.Sound.sfx("win");
    if (!this.reduce) {
      Squid.FX.burst(this, v.x, v.y, 0xffd479, 18, 70);
      if (v.sprite.setTint) v.sprite.setTint(0x445566);
      this.tweens.add({ targets: v.sprite, alpha: 0.18, y: v.y + 18, duration: 480, ease: "Cubic.in" });
    } else if (v.sprite) {
      v.sprite.setAlpha(0.18);
    }
    v.nameText.setAlpha(0.4);
    // if the dead enemy was the target, re-home the reticle to a living foe
    if (v.idx === this.targetIdx) {
      var live = this.engine.livingEnemies();
      if (live.length) this.setTargetView(live[0].idx, false);
      else this.reticle.clear();
    }
    this.drawSynergy();
  };

  Combat.prototype.pushLog = function (msg) {
    var lines = this.engine.logs.slice(-3);
    this.logText.setText(lines.join("\n"));
  };

  Combat.prototype.recoil = function (sprite, baseX, dx) {
    if (this.reduce || !sprite) return;
    this.tweens.add({ targets: sprite, x: baseX + dx, duration: 80, yoyo: true, ease: "Quad.out", onComplete: function () { sprite.x = baseX; } });
  };

  Combat.prototype.nudge = function (view) {
    if (this.reduce || !view) return;
    var bx = view.x;
    this.tweens.add({ targets: view, x: bx + 7, duration: 50, yoyo: true, repeat: 2, onComplete: function () { view.x = bx; } });
  };

  // Player ATTACK animation: lunge toward the target, tilt forward, brief scale-up.
  // Tweens x/angle/scale only (the idle bob owns y) so they never fight. (§ player juice)
  Combat.prototype.playerAttackAnim = function (tx) {
    var sp = this.playerSprite;
    if (this.reduce || !sp) return;
    var bx = sp.x, sx0 = sp.scaleX, sy0 = sp.scaleY;
    var dx = Math.max(40, Math.min(120, ((tx == null ? bx + 200 : tx) - bx) * 0.22));
    this.tweens.add({
      targets: sp, x: bx + dx, angle: 7, scaleX: sx0 * 1.08, scaleY: sy0 * 1.08,
      duration: 120, yoyo: true, ease: "Back.out",
      onComplete: function () { sp.x = bx; sp.angle = 0; sp.setScale(sx0, sy0); },
    });
  };

  // Player HURT animation: stagger BACK, tilt the other way, vertical squash — reads
  // clearly different from the forward attack lunge. Replaces the plain x-recoil.
  Combat.prototype.playerHurtAnim = function () {
    var sp = this.playerSprite;
    if (this.reduce || !sp) return;
    var bx = sp.x, sx0 = sp.scaleX, sy0 = sp.scaleY;
    this.tweens.add({
      targets: sp, x: bx - 20, angle: -9, scaleX: sx0 * 0.9, scaleY: sy0 * 1.08,
      duration: 95, yoyo: true, ease: "Quad.out",
      onComplete: function () { sp.x = bx; sp.angle = 0; sp.setScale(sx0, sy0); },
    });
  };

  // ===========================================================================
  // player actions
  // ===========================================================================
  Combat.prototype.playCardAt = function (i) {
    if (this.locked) return;
    var self = this;
    var view = this.handViews[i];
    var res = this.engine.playCard(i, this.targetIdx);

    if (!res.ok) {
      Squid.Sound.sfx("select");
      this.nudge(view);
      this.runFx(this.engine.drainFx(), null);
      return;
    }

    this.locked = true;
    if (this.hoveredCard === view) this.hoveredCard = null;
    Squid.Sound.sfx("play");
    this.handViews.splice(i, 1);
    var fxList = this.engine.drainFx();
    var cx = this.centerX, cy = this.castY;

    var resolve = function () {
      if (!res.fizzled) self.triggerCardFx(res);
      self.runFx(fxList, function () { self.afterPlay(view, res); });
    };

    if (view && !this.reduce) {
      view.setDepth(800);
      this.tweens.add({ targets: view, x: cx, y: cy, scaleX: 1.15, scaleY: 1.15, duration: 90, ease: "Back.out", onComplete: resolve });
    } else {
      resolve();
    }
    this.relayout(true);
  };

  Combat.prototype.afterPlay = function (view, res) {
    var self = this;
    var done = function () {
      if (view) view.destroy();
      self.relayout(true);
      if (self.engine.over === "win") { self.onWin(); return; }
      self.locked = false;
    };
    if (view && !this.reduce) {
      this.tweens.add({ targets: view, x: this.discardPos.x, y: this.discardPos.y, scaleX: 0.4, scaleY: 0.4, alpha: 0, angle: 18, duration: 100, ease: "Cubic.in", onComplete: done });
    } else {
      done();
    }
  };

  // on-cast card flourish by fx archetype (§5.4), directed at the targeted enemy
  Combat.prototype.triggerCardFx = function (res) {
    var FX = Squid.FX;
    var tv = this.viewFor(res.targetIdx != null ? res.targetIdx : this.targetIdx) || { x: this.centerX, y: this.castY };
    var ex = tv.x, ey = tv.y;
    var pxc = this.playerSprite.x, pyc = this.playerSprite.y;
    switch (res.fx) {
      case "slash": {
        if (this.reduce) return;
        this.playerAttackAnim(ex); // player lunges at the target as the strike lands
        var line = this.add.rectangle(ex, ey, 120, 5, 0xffffff).setAngle(-35).setDepth(940).setAlpha(0.95);
        this.tweens.add({ targets: line, alpha: 0, scaleX: 1.4, duration: 220, ease: "Cubic.out", onComplete: function () { line.destroy(); } });
        break;
      }
      case "guard": FX.shield(this, pxc, pyc, 60); break;
      case "buff": FX.stream(this, pxc, pyc, 0xb083f0, 8); break;
      case "cast": {
        if (this.reduce) return;
        var ring = this.add.circle(this.centerX, this.castY, 24).setStrokeStyle(3, 0xffd479, 0.9).setDepth(940);
        this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: "Cubic.out", onComplete: function () { ring.destroy(); } });
        break;
      }
    }
  };

  Combat.prototype.onEndTurn = function () {
    if (this.locked || this.engine.over) return;
    var self = this;
    var res = this.engine.endTurn();
    if (!res.ok) return;
    this.locked = true;
    var fxList = this.engine.drainFx();
    this.runFx(fxList, function () {
      if (self.engine.over === "lose") { self.onLose(); return; }
      self.telegraph(function () { self.resolveEnemyTurn(); });
    });
  };

  // pulse every living enemy's intent badge before the group resolves
  Combat.prototype.telegraph = function (cb) {
    var self = this;
    if (this.reduce) { this.time.delayedCall(20, cb); return; }
    var live = this.enemyViews.filter(function (v) { return !v.dead; });
    if (!live.length) { cb(); return; }
    var done = 0;
    live.forEach(function (v) {
      self.tweens.add({
        targets: v.intentBadge, scaleX: 1.16, scaleY: 1.16, duration: 150, yoyo: true, repeat: 0, ease: "Sine.inOut",
        onComplete: function () { v.intentBadge.setScale(1); done++; if (done === 1) cb(); },
      });
    });
  };

  Combat.prototype.resolveEnemyTurn = function () {
    var self = this;
    this.engine.enemyTurn();
    var fx = this.engine.drainFx();
    this.runFx(fx, function () {
      if (self.engine.over === "lose") { self.onLose(); return; }
      if (self.engine.over === "win") { self.onWin(); return; }
      self.setTargetView(self.engine.target, false);
      self.locked = false;
    });
  };

  // ===========================================================================
  // win / lose routing
  // ===========================================================================
  Combat.prototype.persistRun = function () {
    var save = Squid.activeSave;
    if (!save || !save.run) return;
    save.run.pulse = this.engine.player.pulse;
    save.run.powers = save.run.powers || {};
    save.run.powers.focusSprint = this.engine.player.powers.focusSprint;
  };

  Combat.prototype.onWin = function () {
    var self = this;
    this.locked = true;
    var boss = this.isBoss;
    this.persistRun();
    this.reticle.clear(); this.hoverRing.clear(); this.synergyGfx.clear();

    // codex: mark every enemy in the group defeated
    if (Squid.Save) {
      var cx = Squid.Save.getCodex(), changed = false;
      this.engine.enemies.forEach(function (e) { if (cx.enemiesDefeated.indexOf(e.id) < 0) { cx.enemiesDefeated.push(e.id); changed = true; } });
      if (changed) Squid.Save.saveCodex(cx);
    }

    Squid.Sound.sfx("win");
    if (!this.reduce) Squid.FX.flash(this, 220, 30, 50, 36);
    this.time.delayedCall(this.reduce ? 40 : 720, function () { self.scene.start(boss ? "Win" : "Reward"); });
  };

  Combat.prototype.onLose = function () {
    var self = this;
    this.locked = true;
    if (!this.reduce) {
      Squid.FX.flash(this, 140, 0, 0, 200);
      if (this.playerSprite.setTint) this.playerSprite.setTint(0x445566);
      this.tweens.add({ targets: this.playerSprite, alpha: 0.4, angle: -8, duration: 500, ease: "Cubic.in" });
    }
    this.time.delayedCall(this.reduce ? 40 : 560, function () { self.scene.start("GameOver"); });
  };

  // ---- debug hooks for the headless verify harness (M2 + M3) ----------------
  Combat.prototype.debugPlayFirstPlayable = function () {
    if (this.locked) return false;
    for (var i = 0; i < this.engine.hand.length; i++) {
      if (this.engine.canPlay(i)) { this.playCardAt(i); return true; }
    }
    return false;
  };
  // play the first playable single-target ATTACK card at the current target
  Combat.prototype.debugPlayFirstAttack = function () {
    if (this.locked) return false;
    for (var i = 0; i < this.engine.hand.length; i++) {
      var c = this.engine.CARDS[this.engine.hand[i]];
      if (c && c.type === "attack" && this.engine.canPlay(i)) { this.playCardAt(i); return true; }
    }
    return false;
  };
  Combat.prototype.debugSetTarget = function (idx) { if (!this.locked) this.setTargetView(idx, false); };
  Combat.prototype.debugInfo = function () {
    return {
      scene: "Combat",
      coordinated: this.coordinated,
      locked: this.locked,
      over: this.engine.over,
      turn: this.engine.turn,
      target: this.engine.target,
      pulse: this.engine.player.pulse,
      enemies: this.engine.enemies.map(function (e) {
        return { id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp, block: e.block, slot: e.slot, intent: e.intent ? e.intent.label : null, intentVal: e.intent ? (e.intent.value || 0) : 0 };
      }),
    };
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Combat = Combat;
})();
