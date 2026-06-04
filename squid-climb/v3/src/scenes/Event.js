/* =============================================================================
 * SCENE — Event  (M4: choice-based corporate dilemmas, ported from v2 EVENTS)
 * Reads EVENTS[node.event]; each choice runs its v2 `run(g)` against a small save
 * adapter, shows the outcome, then clears the node + advances the ladder via
 * Reward.resolveToMap (autosave + level-up) and returns to the Map.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function Event() { Phaser.Scene.call(this, { key: "Event" }); }
  Event.prototype = Object.create(Phaser.Scene.prototype);
  Event.prototype.constructor = Event;

  // a minimal `g` so v2 choice.run(g) works verbatim against the save's run
  function adapter(run) {
    return {
      player: { pulse: run.pulse, maxPulse: run.maxPulse },
      run: run,
      _log: "",
      healPulse: function (n) { this.player.pulse = Math.min(this.player.maxPulse, this.player.pulse + n); },
      losePulse: function (n) { this.player.pulse = Math.max(0, this.player.pulse - n); },
      log: function (m) { this._log = m; },
      pick: function (arr) { return arr[(Math.random() * arr.length) | 0]; },
    };
  }

  Event.prototype.create = function () {
    var self = this, W = this.scale.width, H = this.scale.height;
    var save = Squid.activeSave;
    var node = Squid.currentNode || {};
    var ev = (Squid.EVENTS && (node.event || node.id)) ? Squid.EVENTS[node.event || node.id] : null;
    this.ev = ev;
    var Sound = Squid.Sound; Sound.init(); Sound.resume(); Sound.playMusic("map");

    if (this.textures.exists("scene_climb")) {
      var bg = this.add.image(W / 2, H / 2, "scene_climb"); bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.7);
    } else { this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d); }

    this.add.text(W / 2, 120, (ev ? ev.title : "Event").toUpperCase(), { fontFamily: "monospace", fontSize: "32px", color: "#b083f0", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(W / 2, 178, ev ? ev.body : "A text event with choices.", { fontFamily: "monospace", fontSize: "16px", color: "#cfe0f0", align: "center", wordWrap: { width: 860 } }).setOrigin(0.5);

    this.body = this.add.container(0, 0);
    this.renderChoices();

    window.__squidScene = "Event";
    Squid.__event = this;
  };

  Event.prototype.renderChoices = function () {
    var self = this, W = this.scale.width;
    var ev = this.ev;
    var choices = ev ? ev.choices : [{ label: "Continue", run: function () {} }];
    var y0 = 320, gap = 70;
    choices.forEach(function (c, i) {
      var b = Squid.Widgets.button(self, { x: W / 2, y: y0 + i * gap, w: 720, h: 54, label: c.label, border: 0xb083f0, onClick: function () { self.choose(i); } });
      self.body.add(b);
    });
  };

  Event.prototype.choose = function (i) {
    if (this._chosen) return;
    this._chosen = true;
    var save = Squid.activeSave, run = save ? save.run : null;
    var ev = this.ev;
    var outcome = "";
    if (ev && run) {
      var g = adapter(run);
      var c = ev.choices[i];
      if (c && c.run) c.run(g);
      run.pulse = g.player.pulse; // write the choice's pulse change back
      outcome = g._log || "Decision made.";
    }
    if (Squid.Sound) Squid.Sound.sfx("select");
    this.renderOutcome(outcome);
  };

  Event.prototype.renderOutcome = function (text) {
    var self = this, W = this.scale.width, save = Squid.activeSave;
    this.body.destroy();
    this.add.text(W / 2, 340, text, { fontFamily: "monospace", fontSize: "16px", color: "#ffd479", align: "center", wordWrap: { width: 820 } }).setOrigin(0.5);
    this.add.text(W / 2, 392, "Pulse now " + (save ? save.run.pulse : "?") + "/" + (save ? save.run.maxPulse : "?"), { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0.5);
    Squid.Widgets.button(this, { x: W / 2, y: 480, w: 280, h: 54, label: "\u25B6  Back to the Climb", onClick: function () { Squid.scenes.Reward.resolveToMap(self, save); } });
  };

  // ---- debug hook for the headless verify harness ----
  Event.prototype.debugChoose = function (i) { this.choose(i || 0); };
  Event.prototype.debugResolve = function () { var s = Squid.activeSave; Squid.scenes.Reward.resolveToMap(this, s); };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Event = Event;
})();
