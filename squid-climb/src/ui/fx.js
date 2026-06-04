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

    // Floating combat number that rises and fades (damage / block / heal).
    floatNumber: function (scene, x, y, text, color, size) {
      var t = scene.add.text(x, y, text, {
        fontFamily: "monospace", fontSize: (size || 30) + "px", color: color || "#ffffff",
        fontStyle: "bold", stroke: "#05080c", strokeThickness: 5,
      }).setOrigin(0.5).setDepth(950);
      if (this.reduce) { scene.time.delayedCall(420, function () { t.destroy(); }); return t; }
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
