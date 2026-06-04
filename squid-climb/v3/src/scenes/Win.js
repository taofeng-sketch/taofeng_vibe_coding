/* =============================================================================
 * SCENE — Win  (stub; full "You made VP" screen = later). Clears the autosave.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function Win() { Phaser.Scene.call(this, { key: "Win" }); }
  Win.prototype = Object.create(Phaser.Scene.prototype);
  Win.prototype.constructor = Win;

  Win.prototype.create = function () {
    var copy = Squid.WIN_COPY || { stamp: "PROMOTED", title: "You made VP.", body: "" };
    var Sound = Squid.Sound;
    Sound.init(); Sound.resume(); Sound.stopMusic(); Sound.sfx("win");

    // Advance the IC ladder onto the boss node so the run genuinely tops out at VP
    // (the boss node is never cleared by Reward, which only handles non-boss wins).
    // Do this BEFORE wiping the autosave so the climb registers as complete.
    var finalLevel = (Squid.activeSave && Squid.activeSave.run && Squid.activeSave.run.levelTitle) || "VP";
    if (Squid.activeSave && Squid.currentNode && Squid.MapModel && Squid.MapModel.isBossNode(Squid.currentNode)) {
      var r = Squid.MapModel.clearNode(Squid.activeSave, Squid.currentNode.id);
      finalLevel = r.level; // "VP"
    }
    if (Squid.Save) Squid.Save.deleteSlot("auto");
    Squid.activeSave = null;
    window.__squidScene = "Win";

    Squid.Widgets.placeholder(this, {
      title: copy.stamp,
      subtitle: copy.title + "\n" + copy.body + "\n\nFinal level: " + finalLevel,
      nav: [{ label: "Run it back (Menu)", to: "MainMenu" }],
    });
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Win = Win;
})();
