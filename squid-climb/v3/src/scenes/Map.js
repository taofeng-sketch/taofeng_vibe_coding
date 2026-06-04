/* =============================================================================
 * SCENE — Map  (M4: the full branching CLIMB MAP, plan §11.1 / §4 / map-visual)
 *
 * Renders the Slay-the-Spire-style branching path (data: Squid.CLIMB / MapModel)
 * over the ladder/climb background (scene_climb), using the LAYOUT indirection
 * (§11.7 — no hardcoded x/y here). Bottom row = the start (Onboarding); the top
 * row = the VP office (Calibration Council). Edges show the ascent.
 *
 * Node visual states are distinct (plan map-visual / §4):
 *   cleared    — traversed, dim + check, not clickable
 *   current    — "you are here" (last cleared), highlighted
 *   reachable  — bright + pulsing ring, clickable (the choices you may take)
 *   locked     — dim, not clickable (branches you can no longer reach)
 *
 * Picking a reachable node routes to the per-level INTRO (RoomIntro, §8), which
 * then routes to Combat / Rest / Event. Returning here after a clear shows the
 * IC LEVEL-UP banner (§4 ladder) and autosaves (room-boundary autosave, §7.2).
 * Continue/Load restore the map position + level from save.run.map / run.floor.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var NODE_GLYPH = { combat: "\u2694", elite: "\uD83D\uDC51", rest: "\uD83D\uDD25", event: "\u2753", boss: "\uD83D\uDC80" };
  var NODE_COLOR = { combat: 0xff6b5e, elite: 0xffd479, rest: 0x4fd1c5, event: 0xb083f0, boss: 0xe06c75 };
  var TYPE_TAG = { combat: "COMBAT", elite: "ELITE", rest: "REST", event: "EVENT", boss: "BOSS" };

  function Map() { Phaser.Scene.call(this, { key: "Map" }); }
  Map.prototype = Object.create(Phaser.Scene.prototype);
  Map.prototype.constructor = Map;

  Map.prototype.create = function () {
    var self = this;
    var Save = Squid.Save, Sound = Squid.Sound, MM = Squid.MapModel;
    var W = this.scale.width, H = this.scale.height;
    this.L = Squid.LAYOUT.get().map;
    var settings = (Save && Save.getSettings()) || {};
    this.reduce = !!settings.reduceMotion;
    if (Squid.FX) Squid.FX.setReduce(this.reduce);

    // ensure an active run (Continue/New always set one; defend anyway)
    if (!Squid.activeSave) Squid.activeSave = (Save && (Save.continueGame() || Save.newGame({ cls: "swe" }))) || null;
    var save = Squid.activeSave;
    MM.ensure(save);                 // back-compat: init run.map if missing
    save.screen = "map";
    if (Save) Save.autosave(save);   // room-boundary autosave on map enter (§7.2)

    Sound.init(); Sound.resume(); Sound.playMusic("map");

    // ---- background ----
    if (this.textures.exists("scene_climb")) {
      var bg = this.add.image(W / 2, H / 2, "scene_climb");
      bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.58);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0b1118);
    }

    // ---- header ----
    var level = save.run.levelTitle || (Squid.levelName ? Squid.levelName(save.run.floor) : "IC3");
    var reachable = MM.reachableIds(save);
    var hereNode = save.run.map.lastId ? MM.nodeById(save.run.map.lastId) : null;
    var actBand = hereNode ? hereNode.act : (reachable.length ? (MM.nodeById(reachable[0]) || {}).act : "Act I");
    this.add.text(this.L.header.x, this.L.header.y, "LEVEL " + level + "   \u2022   " + (actBand || "\u2014"),
      { fontFamily: "monospace", fontSize: "16px", color: "#e6f1ff", fontStyle: "bold" }).setOrigin(0, 0.5);
    this.add.text(this.L.header.x, this.L.header.y + 22, "The Performance Review Climb \u2014 pick your next room", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0, 0.5);
    this.add.text(this.L.pulse.x, this.L.pulse.y, "Pulse " + save.run.pulse + "/" + save.run.maxPulse + "   \u2022   Deck " + save.run.deck.length + "   \u2022   autosaved",
      { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(this.L.pulse.origin.x, this.L.pulse.origin.y);

    // ---- VP office marker at the top ----
    var C = this.L.climb;
    this.add.text(C.vpLabel.x, C.vpLabel.y, "\u25B2  " + (MM.CLIMB.topLabel || "VP OFFICE") + "  \u25B2", { fontFamily: "monospace", fontSize: "15px", color: "#ffd479", fontStyle: "bold" }).setOrigin(0.5);

    // ---- draw edges (behind nodes) ----
    this.edgeGfx = this.add.graphics().setDepth(2);
    this.drawEdges(save);

    // ---- draw nodes ----
    this.nodeViews = [];
    MM.CLIMB.list.forEach(function (n) { self.buildNode(save, n); });

    // ---- "you are here" / start marker ----
    if (hereNode) {
      var hp = this.nodeXY(hereNode);
      this.add.text(hp.x, hp.y + C.nodeR + 30, "\u25C6 you are here", { fontFamily: "monospace", fontSize: "11px", color: "#ffd479" }).setOrigin(0.5);
    } else {
      // before any clear, the player stands at the bottom; flag the start row
      var sx = W / 2;
      this.add.text(sx, C.bottomY + C.nodeR + 30, "\u25C6 START \u2014 IC3", { fontFamily: "monospace", fontSize: "11px", color: "#ffd479" }).setOrigin(0.5);
    }

    // ---- footer + menu/compendium access ----
    this.add.text(C.hint.x, C.hint.y, "Click a glowing room to continue \u00B7 traversed rooms are dimmed \u00B7 locked branches are greyed",
      { fontFamily: "monospace", fontSize: "11px", color: "#5a6b7b" }).setOrigin(0.5);
    Squid.Widgets.button(this, { x: 120, y: 700, w: 180, h: 36, label: "Compendium", fontSize: 13, onClick: function () { self.scene.start("Compendium"); } });
    Squid.Widgets.button(this, { x: 1160, y: 700, w: 180, h: 36, label: "Quit to Menu", fontSize: 13, fill: 0x2a2030, hover: 0x3a2a40, border: 0xb083f0, onClick: function () { self.scene.start("MainMenu"); } });

    // audio toggle
    this.audioLabel = this.add.text(W - 30, 700, Sound.isMuted() ? "\uD83D\uDD07" : "\uD83D\uDD0A", { fontSize: "20px" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(60);
    this.audioLabel.on("pointerdown", function () { Sound.init(); var m = Sound.toggleMute(); self.audioLabel.setText(m ? "\uD83D\uDD07" : "\uD83D\uDD0A"); });

    // ---- IC level-up banner (set by the resolve scenes on a clear) ----
    if (Squid.levelUpTo) { this.showLevelUp(Squid.levelUpTo); Squid.levelUpTo = null; }

    // ---- debug handles for the headless verify harness ----
    window.__squidScene = "Map";
    Squid.__map = this;
  };

  // (row,col) -> (x,y) using the LAYOUT climb config (§11.7)
  Map.prototype.nodeXY = function (n) {
    var C = this.L.climb;
    var maxRow = Squid.MapModel.CLIMB.maxRow || 1;
    var x = C.cols[n.col] != null ? C.cols[n.col] : C.cols[1];
    var y = C.bottomY - (n.row / maxRow) * (C.bottomY - C.topY);
    return { x: x, y: y };
  };

  Map.prototype.drawEdges = function (save) {
    var MM = Squid.MapModel, g = this.edgeGfx, self = this;
    g.clear();
    MM.CLIMB.list.forEach(function (n) {
      var a = self.nodeXY(n);
      (n.next || []).forEach(function (toId) {
        var to = MM.nodeById(toId);
        if (!to) return;
        var b = self.nodeXY(to);
        var aCleared = MM.isCleared(save, n.id), bCleared = MM.isCleared(save, toId);
        var fromHere = (MM.ensure(save).lastId === n.id) || (!MM.ensure(save).lastId && MM.CLIMB.entry.indexOf(n.id) >= 0);
        if (aCleared && bCleared) {
          g.lineStyle(4, 0xffd479, 0.9);        // the path you took
        } else if (fromHere && MM.isReachable(save, toId)) {
          g.lineStyle(3, 0x4fd1c5, 0.85);        // choices available now
        } else {
          g.lineStyle(2, 0x33424f, 0.5);         // locked / future
        }
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
      });
    });
  };

  Map.prototype.buildNode = function (save, n) {
    var self = this, MM = Squid.MapModel, C = this.L.climb;
    var p = this.nodeXY(n);
    var cleared = MM.isCleared(save, n.id);
    var reachable = MM.isReachable(save, n.id);
    var current = MM.isCurrent(save, n.id);
    var locked = !cleared && !reachable;

    var baseColor = NODE_COLOR[n.type] || 0x4fd1c5;
    var fillColor, strokeColor, glyphColor, labelColor;
    if (cleared) { fillColor = 0x16202a; strokeColor = 0x4a5a6b; glyphColor = "#5a6b7b"; labelColor = "#5a6b7b"; }
    else if (reachable) { fillColor = 0x121b24; strokeColor = baseColor; glyphColor = Squid.FX ? Squid.FX.hex(baseColor) : "#ffffff"; labelColor = "#e6f1ff"; }
    else { fillColor = 0x0c141c; strokeColor = 0x2a3744; glyphColor = "#3a4754"; labelColor = "#3a4754"; }

    var depth = 10;
    // pulsing ring for reachable nodes (the call-to-action)
    if (reachable && !this.reduce) {
      var ring = this.add.circle(p.x, p.y, C.nodeR + 6).setStrokeStyle(2, baseColor, 0.8).setDepth(depth - 1);
      this.tweens.add({ targets: ring, scale: 1.22, alpha: 0.15, duration: 820, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    var circle = this.add.circle(p.x, p.y, C.nodeR, fillColor).setStrokeStyle(current ? 4 : 3, current ? 0xffd479 : strokeColor).setDepth(depth);
    var glyph = this.add.text(p.x, p.y, cleared ? "\u2713" : (NODE_GLYPH[n.type] || "?"), { fontSize: cleared ? "24px" : "22px", color: cleared ? "#7ee787" : glyphColor }).setOrigin(0.5).setDepth(depth + 1);

    // label below/beside the node (alternate above for top rows to avoid the edge)
    var labelY = p.y + C.nodeR + 13;
    var label = this.add.text(p.x, labelY, n.label, { fontFamily: "monospace", fontSize: "11px", color: labelColor, align: "center", wordWrap: { width: 210 } }).setOrigin(0.5, 0).setDepth(depth + 1);
    // type tag chip above
    this.add.text(p.x, p.y - C.nodeR - 12, TYPE_TAG[n.type] || "", { fontFamily: "monospace", fontSize: "9px", color: cleared ? "#4a5a6b" : (reachable ? Squid.FX.hex(baseColor) : "#3a4754") }).setOrigin(0.5).setDepth(depth + 1);

    if (reachable) {
      circle.setInteractive({ useHandCursor: true });
      circle.on("pointerover", function () { if (!self.reduce) self.tweens.add({ targets: [circle, glyph], scale: 1.12, duration: 110, ease: "Back.out" }); label.setColor("#ffd479"); });
      circle.on("pointerout", function () { if (!self.reduce) self.tweens.add({ targets: [circle, glyph], scale: 1, duration: 110 }); label.setColor("#e6f1ff"); });
      circle.on("pointerdown", function () { self.pickNode(n); });
    }

    this.nodeViews.push({ node: n, circle: circle, glyph: glyph, reachable: reachable });
  };

  // route a chosen node -> per-level intro -> (intro routes to the scene)
  Map.prototype.pickNode = function (n) {
    if (this._picking) return;
    this._picking = true;
    if (Squid.Sound) { Squid.Sound.init(); Squid.Sound.resume(); Squid.Sound.sfx("select"); }
    Squid.currentNode = n;                 // RoomIntro + the target scene read this
    var self = this;
    this.time.delayedCall(this.reduce ? 0 : 120, function () { self.scene.start("RoomIntro"); });
  };

  // ---- IC LEVEL-UP banner (§4 ladder progression) ----
  Map.prototype.showLevelUp = function (title) {
    var C = this.L.climb, self = this;
    if (Squid.Sound) Squid.Sound.sfx("level");
    var box = this.add.container(C.levelUp.x, C.levelUp.y).setDepth(200);
    var bg = this.add.rectangle(0, 0, 520, 110, 0x05080c, 0.94).setStrokeStyle(3, 0xffd479);
    var t1 = this.add.text(0, -24, "\u2B06  LEVEL UP", { fontFamily: "monospace", fontSize: "26px", color: "#ffd479", fontStyle: "bold" }).setOrigin(0.5);
    var t2 = this.add.text(0, 22, "You are now " + title, { fontFamily: "monospace", fontSize: "20px", color: "#e6f1ff" }).setOrigin(0.5);
    box.add([bg, t1, t2]);
    if (this.reduce) {
      this.time.delayedCall(900, function () { box.destroy(); });
      return;
    }
    box.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 260, ease: "Back.out" });
    if (Squid.FX) Squid.FX.burst(this, C.levelUp.x, C.levelUp.y, 0xffd479, 22, 110);
    this.time.delayedCall(1500, function () {
      self.tweens.add({ targets: box, alpha: 0, y: C.levelUp.y - 30, duration: 380, ease: "Cubic.in", onComplete: function () { box.destroy(); } });
    });
  };

  // ---- debug hooks for the headless verify harness ----
  Map.prototype.debugReachableIds = function () { return Squid.MapModel.reachableIds(Squid.activeSave); };
  Map.prototype.debugState = function () {
    var save = Squid.activeSave, MM = Squid.MapModel;
    return {
      scene: "Map",
      floor: save.run.floor,
      level: save.run.levelTitle,
      lastId: save.run.map.lastId,
      cleared: save.run.map.clearedIds.slice(),
      reachable: MM.reachableIds(save),
    };
  };
  Map.prototype.debugSelectNode = function (id) {
    var n = Squid.MapModel.nodeById(id);
    if (n && Squid.MapModel.isReachable(Squid.activeSave, id)) { this.pickNode(n); return true; }
    return false;
  };
  Map.prototype.debugSelectFirstReachable = function () {
    var ids = this.debugReachableIds();
    if (!ids.length) return false;
    return this.debugSelectNode(ids[0]);
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Map = Map;
})();
