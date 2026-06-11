/* =============================================================================
 * V3 UI — FX helpers  (plan §1 — the juice)
 * Phaser-native effects with a global "reduce motion" gate (plan §1 / §7.1):
 * when `reduce` is on, every effect collapses to its end-state instantly and
 * shake/flash are disabled. Particles use plain rectangles/circles so NOTHING
 * depends on a VFX texture existing (gray-box safe, §10.3).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function hex(n) { return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6); }

  var FX = {
    reduce: false,
    setReduce: function (v) { this.reduce = !!v; },

    // ---- scene transitions (fade through near-black) ------------------------
    // Every scene that uses these gets a uniform crossfade instead of a hard
    // cut: call FX.fadeIn(scene) at the top of create(), and FX.go(scene, key)
    // instead of scene.scene.start(key). `_fxLeaving` guards double-clicks; it
    // resets in fadeIn() because Phaser REUSES scene instances across starts.
    fadeIn: function (scene, dur) {
      scene._fxLeaving = false;
      if (this.reduce) return;
      scene.cameras.main.fadeIn(dur || 260, 5, 8, 12);
    },
    go: function (scene, key, dur) {
      if (scene._fxLeaving) return;
      scene._fxLeaving = true;
      if (this.reduce) { scene.scene.start(key); return; }
      var cam = scene.cameras.main;
      cam.fadeOut(dur || 200, 5, 8, 12);
      cam.once("camerafadeoutcomplete", function () { scene.scene.start(key); });
    },

    // Floating combat number that pops in, rises and fades (damage / block / heal).
    floatNumber: function (scene, x, y, text, color, size) {
      var t = scene.add.text(x, y, text, {
        fontFamily: "monospace", fontSize: (size || 30) + "px", color: color || "#ffffff",
        fontStyle: "bold", stroke: "#05080c", strokeThickness: 5,
      }).setOrigin(0.5).setDepth(950);
      if (this.reduce) { scene.time.delayedCall(420, function () { t.destroy(); }); return t; }
      t.setScale(1.45); // punch-in pop, then settle while rising
      scene.tweens.add({ targets: t, scale: 1, duration: 130, ease: "Back.out" });
      scene.tweens.add({
        targets: t, y: y - 58, alpha: 0, duration: 880, ease: "Cubic.out",
        onComplete: function () { t.destroy(); },
      });
      return t;
    },

    // 1-frame white fill flash on a sprite (reads instantly as "got hit").
    hitFlash: function (scene, sprite) {
      if (!sprite || !sprite.setTintFill) return;
      sprite.setTintFill(0xffffff);
      scene.time.delayedCall(this.reduce ? 0 : 100, function () { if (sprite.clearTint) sprite.clearTint(); });
    },

    // Brief tint toward a color (e.g. green heal) then clear.
    tint: function (scene, sprite, color) {
      if (!sprite || !sprite.setTint) return;
      sprite.setTint(color);
      scene.time.delayedCall(this.reduce ? 0 : 220, function () { if (sprite.clearTint) sprite.clearTint(); });
    },

    // Camera shake scaled to damage.
    shake: function (scene, dmg) {
      if (this.reduce) return;
      scene.cameras.main.shake(140, Math.min(0.022, 0.0035 + (dmg || 0) * 0.00045));
    },

    // Camera color flash (red on heavy player hit, white on big moments).
    flash: function (scene, r, g, b, dur) {
      if (this.reduce) return;
      scene.cameras.main.flash(dur || 120, r, g, b);
    },

    // HIT-STOP: freeze the scene's tweens + clock for a few ms on impact so big
    // hits "land" (fighting-game style). Restore runs on the WALL clock
    // (window.setTimeout) because the scene clock itself is frozen. Scaled to
    // damage; tiny hits skip it so chip damage stays fluid. Re-entrant calls
    // during an active stop are ignored (multi-hit bursts won't stack-freeze).
    hitStop: function (scene, dmg) {
      if (this.reduce) return;
      var ms = dmg >= 14 ? 95 : dmg >= 8 ? 65 : dmg >= 4 ? 40 : 0;
      if (!ms || scene._hitStopActive) return;
      scene._hitStopActive = true;
      scene.tweens.timeScale = 0.05;
      scene.time.timeScale = 0.05;
      window.setTimeout(function () {
        scene._hitStopActive = false;
        if (scene.tweens) scene.tweens.timeScale = 1;
        if (scene.time) scene.time.timeScale = 1;
      }, ms);
    },

    // Camera punch-zoom (used sparingly for "this matters" hits).
    punchZoom: function (scene) {
      if (this.reduce) return;
      var cam = scene.cameras.main, z = cam.zoom;
      scene.tweens.add({ targets: cam, zoom: z * 1.03, duration: 80, yoyo: true, ease: "Quad.out" });
    },

    // Particle burst (texture-free: small tweened rectangles).
    burst: function (scene, x, y, color, count, spread) {
      if (this.reduce) return;
      count = count || 10; spread = spread || 46;
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2;
        var dist = spread * (0.4 + Math.random() * 0.8);
        var s = 3 + Math.random() * 3;
        var p = scene.add.rectangle(x, y, s, s, color).setDepth(930);
        scene.tweens.add({
          targets: p, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
          alpha: 0, angle: Math.random() * 180, duration: 360 + Math.random() * 260, ease: "Cubic.out",
          onComplete: (function (pp) { return function () { pp.destroy(); }; })(p),
        });
      }
    },

    // Upward stream of particles (heal).
    stream: function (scene, x, y, color, count) {
      if (this.reduce) return;
      count = count || 8;
      for (var i = 0; i < count; i++) {
        var px = x + (Math.random() * 60 - 30);
        var p = scene.add.circle(px, y + 20, 2 + Math.random() * 2, color).setDepth(930);
        scene.tweens.add({
          targets: p, y: y - 50 - Math.random() * 30, alpha: 0, duration: 600 + Math.random() * 300,
          delay: i * 40, ease: "Sine.out",
          onComplete: (function (pp) { return function () { pp.destroy(); }; })(p),
        });
      }
    },

    // Full-width turn banner (StS-style "ENEMY TURN" sweep): a tinted strip
    // slides in, the label punches, both sweep out. cb fires at the midpoint
    // so the caller can start resolving while the banner is still readable.
    banner: function (scene, text, color, cb) {
      if (this.reduce) { if (cb) scene.time.delayedCall(20, cb); return; }
      var W = scene.scale.width, H = scene.scale.height, cy = H * 0.40;
      var strip = scene.add.rectangle(W / 2, cy, W, 64, color, 0.18).setDepth(960).setScale(1, 0);
      var line1 = scene.add.rectangle(W / 2, cy - 34, W, 2, color, 0.8).setDepth(960).setScale(0, 1);
      var line2 = scene.add.rectangle(W / 2, cy + 34, W, 2, color, 0.8).setDepth(960).setScale(0, 1);
      var label = scene.add.text(W / 2 - 70, cy, text, {
        fontFamily: "monospace", fontSize: "30px", color: this.hex(color), fontStyle: "bold",
        stroke: "#05080c", strokeThickness: 6,
      }).setOrigin(0.5).setDepth(961).setAlpha(0);
      scene.tweens.add({ targets: strip, scaleY: 1, duration: 130, ease: "Quad.out" });
      scene.tweens.add({ targets: [line1, line2], scaleX: 1, duration: 200, ease: "Cubic.out" });
      scene.tweens.add({ targets: label, x: W / 2, alpha: 1, duration: 180, ease: "Cubic.out" });
      var all = [strip, line1, line2, label];
      scene.time.delayedCall(520, function () {
        if (cb) cb();
        scene.tweens.add({
          targets: label, x: W / 2 + 70, alpha: 0, duration: 160, ease: "Cubic.in",
        });
        scene.tweens.add({
          targets: [strip, line1, line2], scaleY: 0, alpha: 0, duration: 180, ease: "Quad.in",
          onComplete: function () { all.forEach(function (o) { o.destroy(); }); },
        });
      });
    },

    // Soft vignette — darkens corners so the stage reads cinematic.
    vignette: function (scene, strength) {
      if (this.reduce) return null;
      var W = scene.scale.width, H = scene.scale.height;
      var g = scene.add.graphics().setDepth(880).setScrollFactor(0);
      var s = strength || 0.42;
      g.fillGradientStyle(0x05080c, 0x05080c, 0x05080c, 0x05080c, s, s, 0, 0);
      g.fillRect(0, 0, W, H * 0.14);
      g.fillGradientStyle(0x05080c, 0x05080c, 0x05080c, 0x05080c, 0, 0, s * 0.9, s * 0.9);
      g.fillRect(0, H * 0.72, W, H * 0.28);
      // side falloff via thin strips
      g.fillStyle(0x05080c, s * 0.35);
      g.fillRect(0, 0, W * 0.06, H);
      g.fillRect(W * 0.94, 0, W * 0.06, H);
      return g;
    },

    // Slow ambient drift — tiny glyphs/particles that sell "living" UI without noise.
    ambientDrift: function (scene, opts) {
      if (this.reduce) return;
      opts = opts || {};
      var W = scene.scale.width, H = scene.scale.height;
      var glyphs = opts.glyphs || ["0", "1", "{", "}", "</>", "//", ";;"];
      var color = opts.color || "#4fd1c5";
      var count = opts.count || 14;
      var depth = opts.depth || 3;
      for (var i = 0; i < count; i++) {
        var t = scene.add.text(
          Math.random() * W, Math.random() * H,
          glyphs[Math.floor(Math.random() * glyphs.length)],
          { fontFamily: "monospace", fontSize: (10 + Math.random() * 8) + "px", color: color }
        ).setAlpha(0.06 + Math.random() * 0.1).setDepth(depth);
        scene.tweens.add({
          targets: t,
          y: t.y - 40 - Math.random() * 80,
          x: t.x + (Math.random() * 60 - 30),
          alpha: 0,
          duration: 6000 + Math.random() * 8000,
          delay: Math.random() * 4000,
          repeat: -1,
          onRepeat: function () { t.y = H + 20; t.x = Math.random() * W; t.setAlpha(0.06 + Math.random() * 0.1); },
          ease: "Sine.inOut",
        });
      }
    },

    // Gentle parallax on a full-screen bg image (combat/map atmosphere).
    parallaxBg: function (scene, bg, amount) {
      if (this.reduce || !bg) return;
      amount = amount || 8;
      scene.input.on("pointermove", function (ptr) {
        var W = scene.scale.width, H = scene.scale.height;
        var nx = (ptr.x / W - 0.5) * amount;
        var ny = (ptr.y / H - 0.5) * amount * 0.5;
        bg.x = W / 2 + nx;
        bg.y = H / 2 + ny;
      });
    },

    // Rarity shimmer on reward / hand cards (uncommon+).
    cardShimmer: function (scene, container, rarity) {
      if (this.reduce || !container) return;
      if (rarity !== "uncommon" && rarity !== "rare") return;
      var color = rarity === "rare" ? 0x4fd1c5 : 0xc9a227;
      var glow = scene.add.rectangle(0, 0, (container.width || 142) + 6, (container.height || 196) + 6, color, 0)
        .setStrokeStyle(2, color, 0.55).setDepth(-1);
      container.addAt(glow, 0);
      scene.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.55 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    },

    // Shield shimmer ring (block gain).
    shield: function (scene, x, y, radius) {
      var c = scene.add.circle(x, y, radius || 50).setStrokeStyle(3, 0x4fd1c5, 0.95).setFillStyle(0x4fd1c5, 0.06).setDepth(920);
      if (this.reduce) { scene.time.delayedCall(120, function () { c.destroy(); }); return; }
      c.setScale(0.35);
      scene.tweens.add({
        targets: c, scale: 1.25, alpha: 0, duration: 480, ease: "Back.out",
        onComplete: function () { c.destroy(); },
      });
    },

    hex: hex,
  };

  Squid.FX = FX;
})();
