/* =============================================================================
 * SCENE — Reward  (M4: card pick + node resolve + IC level-up, plan §7.2 / §4)
 * Reached after a non-boss combat win. Offers 3 reward cards (port of v2
 * offerRewards); taking or skipping CLEARS the just-played map node, advances the
 * IC ladder (sets the level-up banner for the Map), autosaves, and returns to Map.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function Reward() { Phaser.Scene.call(this, { key: "Reward" }); }
  Reward.prototype = Object.create(Phaser.Scene.prototype);
  Reward.prototype.constructor = Reward;

  // clear the current node, advance the ladder, autosave, return to the map
  function resolveToMap(scene, save) {
    var node = Squid.currentNode;
    if (save && node && Squid.MapModel) {
      var r = Squid.MapModel.clearNode(save, node.id);
      if (r.leveledUp) Squid.levelUpTo = r.level;
      save.screen = "map";
      if (Squid.Save) Squid.Save.autosave(save);
    }
    Squid.FX.go(scene, "Map");
  }
  Reward.resolveToMap = resolveToMap; // shared with Rest/Event

  Reward.prototype.create = function () {
    var self = this, W = this.scale.width, H = this.scale.height;
    // Phaser reuses scene instances; reset the one-shot "taken" guard each entry, else
    // the SECOND reward (after the 2nd combat win) can never be taken/skipped and the
    // run is hard soft-locked on the reward screen (§ scene-reuse guard).
    this._taken = false;
    var save = Squid.activeSave;
    var Sound = Squid.Sound; Sound.init(); Sound.resume(); Sound.playMusic("reward");
    Squid.FX.fadeIn(this);

    // background
    if (this.textures.exists("scene_hq")) {
      var bg = this.add.image(W / 2, H / 2, "scene_hq"); bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.66);
    } else { this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d); }

    this.add.text(W / 2, 110, "PERFORMANCE BUMP", { fontFamily: "monospace", fontSize: "34px", color: "#4fd1c5", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(W / 2, 156, "Add one card to your deck.", { fontFamily: "monospace", fontSize: "15px", color: "#9fb3c8" }).setOrigin(0.5);

    // 3 random reward cards (port of v2 offerRewards)
    var pool = (Squid.REWARD_POOL || []).slice();
    var shuffle = (Squid.CombatEngine && Squid.CombatEngine.shuffle) || function (a) { return a; };
    this.choices = shuffle(pool).slice(0, 3);
    var cs = { w: 150, h: 210 };
    var spread = 220, startX = W / 2 - spread, y = 380;
    var reduce = Squid.FX && Squid.FX.reduce;
    this.choices.forEach(function (id, i) {
      var view = Squid.CardView(self, id, { x: startX + i * spread, y: y, w: cs.w, h: cs.h });
      view.setInteractive(new Phaser.Geom.Rectangle(-cs.w / 2, -cs.h / 2, cs.w, cs.h), Phaser.Geom.Rectangle.Contains);
      view._rewardY = y;
      var meta = Squid.CARDS[id];
      if (Squid.FX && meta && meta.rarity) Squid.FX.cardShimmer(self, view, meta.rarity);
      if (!reduce) {
        view.setScale(0.6).setAlpha(0);
        self.tweens.add({ targets: view, scale: 1, alpha: 1, duration: 260, delay: 120 + i * 110, ease: "Cubic.out" });
      }
      view.on("pointerover", function () {
        self.tweens.killTweensOf(view);
        self.tweens.add({ targets: view, y: y - 14, scaleX: 1.06, scaleY: 1.06, duration: 160, ease: "Cubic.out" });
      });
      view.on("pointerout", function () {
        self.tweens.killTweensOf(view);
        self.tweens.add({ targets: view, y: y, scaleX: 1, scaleY: 1, duration: 160, ease: "Cubic.out" });
      });
      view.on("pointerdown", function () { self.take(id); });
    });

    Squid.Widgets.button(this, { x: W / 2, y: 600, w: 320, h: 50, label: "Skip (touch grass)", fill: 0x1a242e, hover: 0x26333f, onClick: function () { self.take(null); } });

    window.__squidScene = "Reward";
    Squid.__reward = this;
  };

  Reward.prototype.take = function (id) {
    if (this._taken) return;
    this._taken = true;
    var save = Squid.activeSave;
    if (id && save && save.run) save.run.deck.push(id);
    if (Squid.Sound) Squid.Sound.sfx(id ? "win" : "select");
    resolveToMap(this, save);
  };

  // ---- debug hook for the headless verify harness ----
  Reward.prototype.debugTake = function (which) {
    if (which === "skip" || which == null) { this.take(null); return null; }
    var id = this.choices && this.choices[0];
    this.take(id); return id;
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Reward = Reward;
})();
