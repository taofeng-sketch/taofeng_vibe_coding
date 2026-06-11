/* =============================================================================
 * V3 UI — shared widgets (button factory, placeholder texture maker)
 * Tiny helpers reused by every scene so we don't repeat Phaser boilerplate.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var Widgets = {
    /**
     * A rectangular text button. Returns the Phaser.Container.
     * opts: { x, y, w, h, label, onClick, enabled, fill, hover, textColor, fontSize }
     */
    button: function (scene, opts) {
      var w = opts.w || 320, h = opts.h || 52;
      var enabled = opts.enabled !== false;
      var fill = opts.fill != null ? opts.fill : 0x1f2a37;
      var hover = opts.hover != null ? opts.hover : 0x2c3e50;
      var border = opts.border != null ? opts.border : 0x4fd1c5;
      var textColor = opts.textColor || (enabled ? "#e6f1ff" : "#5a6b7b");

      var c = scene.add.container(opts.x, opts.y);
      var bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(2, enabled ? border : 0x2a3744);
      var label = scene.add.text(0, 0, opts.label || "", {
        fontFamily: "monospace", fontSize: (opts.fontSize || 20) + "px", color: textColor,
      }).setOrigin(0.5);
      c.add([bg, label]);
      c.setSize(w, h);

      if (enabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on("pointerover", function () { bg.setFillStyle(hover); });
        bg.on("pointerout", function () { bg.setFillStyle(fill); });
        bg.on("pointerdown", function () {
          if (Squid.Sound) { Squid.Sound.init(); Squid.Sound.resume(); Squid.Sound.sfx("select"); }
          if (opts.onClick) opts.onClick();
        });
      } else {
        bg.setAlpha(0.55);
      }
      c.bg = bg; c.label = label;
      return c;
    },

    /**
     * Render a titled placeholder scene body with optional nav buttons so the
     * scene flow is navigable in the foundation. (M0/M1 stub scenes.)
     * opts: { title, subtitle, nav:[{label, to|onClick}], bgImage }
     */
    placeholder: function (scene, opts) {
      var W = scene.scale.width, H = scene.scale.height;
      if (Squid.FX) Squid.FX.fadeIn(scene);
      if (opts.bgImage && scene.textures.exists(opts.bgImage)) {
        var bg = scene.add.image(W / 2, H / 2, opts.bgImage);
        bg.setScale(Math.max(W / bg.width, H / bg.height));
        scene.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.6);
      } else {
        scene.add.rectangle(W / 2, H / 2, W, H, 0x0e151d);
      }
      scene.add.text(W / 2, 150, opts.title || scene.scene.key, { fontFamily: "monospace", fontSize: "40px", color: "#4fd1c5", fontStyle: "bold" }).setOrigin(0.5);
      if (opts.subtitle) {
        scene.add.text(W / 2, 210, opts.subtitle, { fontFamily: "monospace", fontSize: "16px", color: "#9fb3c8", align: "center", wordWrap: { width: 800 } }).setOrigin(0.5);
      }
      scene.add.text(W / 2, 268, "[ foundation stub \u2014 full scene lands in a later milestone ]", { fontFamily: "monospace", fontSize: "13px", color: "#5a6b7b" }).setOrigin(0.5);

      var nav = opts.nav || [];
      var startY = 360, gap = 64;
      nav.forEach(function (n, i) {
        Widgets.button(scene, {
          x: W / 2, y: startY + i * gap, w: 320, h: 50, label: n.label,
          onClick: function () { if (n.onClick) n.onClick(); else if (n.to) Squid.FX.go(scene, n.to); },
        });
      });
      window.__squidScene = scene.scene.key;
    },

    /**
     * Generate a gray-box placeholder texture at runtime when an asset is
     * missing (plan §10.3). Inherits v2's "never break" philosophy.
     */
    ensurePlaceholder: function (scene, key, w, h, glyph) {
      if (scene.textures.exists(key)) return key;
      var pkey = "__ph_" + key;
      if (scene.textures.exists(pkey)) return pkey;
      var g = scene.add.graphics();
      g.fillStyle(0x223040, 1).fillRect(0, 0, w, h);
      g.lineStyle(2, 0x4fd1c5, 1).strokeRect(1, 1, w - 2, h - 2);
      g.generateTexture(pkey, w, h);
      g.destroy();
      return pkey;
    },
  };

  Squid.Widgets = Widgets;
})();
