/* =============================================================================
 * SCENE — RoomIntro  (M4: per-level intro cards, plan §8)
 *
 * Shown when the player picks a map node, BEFORE the room starts. A full-screen
 * card: art (slow ken-burns pan/zoom), node name + bilingual subtitle, a 1-2 line
 * flavor body, and optional THREAT-PREVIEW chips (which enemies / mechanics you
 * are walking into, §8.2). Then routes to the correct scene:
 *   combat/elite/boss -> Combat (boss reuses Combat via the node's boss type)
 *   rest -> Rest   ·   event -> Event
 *
 * Intro copy comes from Squid.INTROS[node.intro]; if a node omits it we build a
 * generic templated intro from the node type + enemy names (§8.1 fallback) so we
 * never block on copy. All positions read from Squid.LAYOUT (§11.7).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function RoomIntro() { Phaser.Scene.call(this, { key: "RoomIntro" }); }
  RoomIntro.prototype = Object.create(Phaser.Scene.prototype);
  RoomIntro.prototype.constructor = RoomIntro;

  // node type -> destination scene
  function targetScene(node) {
    if (!node) return "Combat";
    if (node.type === "rest") return "Rest";
    if (node.type === "event") return "Event";
    return "Combat"; // combat / elite / boss
  }

  // assemble the intro view-model from INTROS + node, with a templated fallback
  function resolveIntro(node) {
    var INTROS = Squid.INTROS || {};
    var base = (node && node.intro && INTROS[node.intro]) || null;
    var vm = {
      title: base ? base.title : (node ? node.label : "Next Room"),
      subtitle: base ? base.subtitle : "",
      bodyEN: base ? base.bodyEN : "",
      bodyCN: base ? base.bodyCN : "",
      art: base ? base.art : "scene_climb.png",
      music: base ? base.music : "combat",
      threat: base && base.threat ? base.threat.slice() : null,
    };
    // derive threat chips for combat nodes that lack explicit ones
    if (!vm.threat && node && (node.type === "combat" || node.type === "elite" || node.type === "boss")) {
      vm.threat = threatFromNode(node);
    }
    if (!vm.bodyEN) vm.bodyEN = templateBody(node);
    return vm;
  }

  function threatFromNode(node) {
    var ENEMIES = Squid.ENEMIES || {}, ENC = Squid.ENCOUNTERS || {};
    var ids = [];
    if (node.encounter && ENC[node.encounter]) ids = ENC[node.encounter].slots.slice();
    else if (node.enemy) ids = [node.enemy];
    return ids.map(function (id) { return (ENEMIES[id] && ENEMIES[id].name) || id; });
  }

  function templateBody(node) {
    if (!node) return "";
    if (node.type === "rest") return "A rare quiet evening.";
    if (node.type === "event") return "A corporate dilemma with no clean answer.";
    var threat = threatFromNode(node);
    return "You walk into: " + threat.join(", ") + ".";
  }

  function texKey(scene, art) {
    if (!art) return null;
    var key = String(art).replace(/\.png$/i, "");
    return scene.textures.exists(key) ? key : null;
  }

  RoomIntro.prototype.create = function () {
    var self = this;
    // Phaser reuses scene instances; reset the one-shot "go" guard each entry, else
    // after the first room the Begin/Skip buttons no-op and the player is soft-locked
    // on the intro card (§ scene-reuse guard).
    this._going = false;
    var W = this.scale.width, H = this.scale.height;
    var L = Squid.LAYOUT.get();
    var settings = (Squid.Save && Squid.Save.getSettings()) || {};
    this.reduce = !!settings.reduceMotion;

    var node = Squid.currentNode || { type: "combat", enemy: "bug_swarm", label: "Fix the Bug" };
    var vm = resolveIntro(node);
    var dest = targetScene(node);
    this.dest = dest;

    var Sound = Squid.Sound;
    Sound.init(); Sound.resume(); Sound.playMusic(vm.music || "combat");

    // ---- art (ken-burns slow pan/zoom) ----
    var key = texKey(this, vm.art);
    if (key) {
      var img = this.add.image(W / 2, H / 2, key);
      var sc = Math.max(W / img.width, H / img.height);
      img.setScale(sc);
      if (!this.reduce) this.tweens.add({ targets: img, scale: sc * 1.08, x: W / 2 + 18, duration: 5200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0b1118);
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.62); // legibility scrim

    // ---- node-type ribbon + title ----
    var tagColor = node.type === "boss" ? "#e06c75" : node.type === "elite" ? "#ffd479" : node.type === "event" ? "#b083f0" : node.type === "rest" ? "#4fd1c5" : "#ff6b5e";
    this.add.text(L.title.x, L.title.y - 56, "\u2014  " + (node.type || "room").toUpperCase() + "  \u2014", { fontFamily: "monospace", fontSize: "15px", color: tagColor, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(L.title.x, L.title.y, vm.title, { fontFamily: "monospace", fontSize: "40px", color: "#e6f1ff", fontStyle: "bold", align: "center", wordWrap: { width: 1000 } }).setOrigin(0.5);
    if (vm.subtitle) this.add.text(L.subtitle.x, L.subtitle.y, vm.subtitle, { fontFamily: "monospace", fontSize: "20px", color: "#9fb3c8" }).setOrigin(0.5);

    // ---- flavor body (bilingual) ----
    var bodyY = 280;
    this.add.text(W / 2, bodyY, vm.bodyEN || "", { fontFamily: "monospace", fontSize: "17px", color: "#cfe0f0", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);
    if (vm.bodyCN) this.add.text(W / 2, bodyY + 36, vm.bodyCN, { fontFamily: "monospace", fontSize: "15px", color: "#8aa0b4", align: "center", wordWrap: { width: 880 } }).setOrigin(0.5);

    // ---- threat-preview chips (§8.2) ----
    if (vm.threat && vm.threat.length) {
      this.add.text(W / 2, 384, "THREAT PREVIEW", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0.5);
      this.buildChips(vm.threat, W / 2, 422);
    }

    // ---- buttons: Begin + Skip (both route to dest; Skip just elides flourish) ----
    var label = node.type === "rest" ? "\u25B6  Enter" : node.type === "event" ? "\u25B6  Face it" : "\u25B6  Begin";
    Squid.Widgets.button(this, { x: W / 2 - 130, y: 560, w: 230, h: 56, label: label, border: 0x4fd1c5, onClick: function () { self.go(); } });
    Squid.Widgets.button(this, { x: W / 2 + 130, y: 560, w: 200, h: 56, label: "Skip \u00BB", fill: 0x1a242e, hover: 0x26333f, onClick: function () { self.go(); } });

    window.__squidScene = "RoomIntro";
    Squid.__roomIntro = this;
  };

  // lay out threat chips centered on (cx, y)
  RoomIntro.prototype.buildChips = function (chips, cx, y) {
    var self = this;
    // measure-ish: estimate widths, then center the row
    var pad = 16, gap = 14, charW = 8.2, hgt = 34;
    var widths = chips.map(function (c) { return Math.max(120, c.length * charW + pad * 2); });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (chips.length - 1);
    // wrap to <= 1100px by splitting into rows if needed
    var maxW = 1120;
    var rows = [[]], rowW = [0], ri = 0;
    chips.forEach(function (c, i) {
      if (rowW[ri] + widths[i] + (rows[ri].length ? gap : 0) > maxW) { ri++; rows[ri] = []; rowW[ri] = 0; }
      rows[ri].push(i); rowW[ri] += widths[i] + (rows[ri].length > 1 ? gap : 0);
    });
    rows.forEach(function (row, r) {
      var w = rowW[r];
      var x = cx - w / 2;
      var ry = y + r * (hgt + 10);
      row.forEach(function (i) {
        var ww = widths[i];
        var box = self.add.container(x + ww / 2, ry);
        var bg = self.add.rectangle(0, 0, ww, hgt, 0x121b24, 0.92).setStrokeStyle(2, 0xff6b5e);
        var t = self.add.text(0, 0, chips[i], { fontFamily: "monospace", fontSize: "13px", color: "#ffd0c8" }).setOrigin(0.5);
        box.add([bg, t]);
        if (!self.reduce) { box.setScale(0.8).setAlpha(0); self.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, delay: i * 70, ease: "Back.out" }); }
        x += ww + gap;
      });
    });
  };

  RoomIntro.prototype.go = function () {
    if (this._going) return;
    this._going = true;
    if (Squid.Sound) Squid.Sound.sfx("select");
    this.scene.start(this.dest);
  };

  // ---- debug hook for the headless verify harness ----
  RoomIntro.prototype.debugBegin = function () { this.go(); return this.dest; };
  RoomIntro.prototype.debugInfo = function () {
    var node = Squid.currentNode || {};
    return { scene: "RoomIntro", dest: this.dest, nodeId: node.id, type: node.type };
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.RoomIntro = RoomIntro;
})();
