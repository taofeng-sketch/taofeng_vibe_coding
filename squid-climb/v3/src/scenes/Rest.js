/* =============================================================================
 * SCENE — Rest  (M4: Sleep / Work Late / Network, ported from v2 `rest`)
 * Resolves on the active save, then clears the node + advances the ladder via
 * Reward.resolveToMap (autosave + level-up banner) and returns to the Map.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function Rest() { Phaser.Scene.call(this, { key: "Rest" }); }
  Rest.prototype = Object.create(Phaser.Scene.prototype);
  Rest.prototype.constructor = Rest;

  function heal(run, n) { run.pulse = Math.min(run.maxPulse, run.pulse + n); }
  function hurt(run, n) { run.pulse = Math.max(1, run.pulse - n); }

  Rest.prototype.create = function () {
    var self = this, W = this.scale.width, H = this.scale.height;
    var save = Squid.activeSave;
    var run = save ? save.run : { pulse: 80, maxPulse: 80, deck: [] };
    var Sound = Squid.Sound; Sound.init(); Sound.resume(); Sound.playMusic("map");

    if (this.textures.exists("scene_climb")) {
      var bg = this.add.image(W / 2, H / 2, "scene_climb"); bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.66);
    } else { this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d); }

    this.add.text(W / 2, 110, "REST STOP", { fontFamily: "monospace", fontSize: "34px", color: "#4fd1c5", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(W / 2, 156, "A rare quiet evening. Pulse " + run.pulse + "/" + run.maxPulse + ".", { fontFamily: "monospace", fontSize: "15px", color: "#9fb3c8" }).setOrigin(0.5);

    var hasDebt = (run.deck || []).indexOf("tech_debt") >= 0;
    var opts = [
      { key: "sleep", name: "Sleep", glyph: "zZ", desc: "Restore 24 Pulse Score. Radical." },
      { key: "work_late", name: "Work Late", glyph: ">>", desc: "Add a Hotfix to your deck. Lose 10 Pulse." },
      { key: "network", name: "Network", glyph: "@@", desc: hasDebt ? "Remove a Tech Debt from your deck." : "No Tech Debt to remove. Heal 6 instead." },
    ];
    var spread = 360, startX = W / 2 - spread, y = 380;
    opts.forEach(function (o, i) {
      var x = startX + i * spread;
      var card = self.add.container(x, y);
      var box = self.add.rectangle(0, 0, 300, 220, 0x121b24, 0.95).setStrokeStyle(2, 0x4fd1c5);
      var g = self.add.text(0, -70, o.glyph, { fontFamily: "monospace", fontSize: "40px", color: "#4fd1c5" }).setOrigin(0.5);
      var nm = self.add.text(0, -10, o.name, { fontFamily: "monospace", fontSize: "22px", color: "#e6f1ff", fontStyle: "bold" }).setOrigin(0.5);
      var ds = self.add.text(0, 46, o.desc, { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8", align: "center", wordWrap: { width: 270 } }).setOrigin(0.5);
      card.add([box, g, nm, ds]);
      box.setInteractive({ useHandCursor: true });
      box.on("pointerover", function () { box.setStrokeStyle(3, 0xffd479); });
      box.on("pointerout", function () { box.setStrokeStyle(2, 0x4fd1c5); });
      box.on("pointerdown", function () { self.choose(o.key); });
    });

    window.__squidScene = "Rest";
    Squid.__rest = this;
  };

  Rest.prototype.choose = function (key) {
    if (this._done) return;
    this._done = true;
    var save = Squid.activeSave, run = save ? save.run : null, Sound = Squid.Sound;
    if (run) {
      if (key === "sleep") { heal(run, 24); Sound.sfx("block"); }
      else if (key === "work_late") { run.deck.push("hotfix"); hurt(run, 10); Sound.sfx("hurt"); }
      else if (key === "network") { var i = run.deck.lastIndexOf("tech_debt"); if (i >= 0) run.deck.splice(i, 1); else heal(run, 6); Sound.sfx("select"); }
    }
    Squid.scenes.Reward.resolveToMap(this, save);
  };

  // ---- debug hook for the headless verify harness ----
  Rest.prototype.debugChoose = function (key) { this.choose(key || "sleep"); };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Rest = Rest;
})();
