/* =============================================================================
 * SCENE — GameOver  (stub; full lose screen = later). Clears the autosave.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function GameOver() { Phaser.Scene.call(this, { key: "GameOver" }); }
  GameOver.prototype = Object.create(Phaser.Scene.prototype);
  GameOver.prototype.constructor = GameOver;

  GameOver.prototype.create = function () {
    var lines = Squid.LOSE_LINES || [{ title: "GAME OVER", body: "" }];
    var line = lines[(Math.random() * lines.length) | 0];
    var Sound = Squid.Sound;
    Sound.init(); Sound.resume(); Sound.stopMusic(); Sound.sfx("lose");
    // run is over — clear autosave so Continue won't resume a dead run
    if (Squid.Save) Squid.Save.deleteSlot("auto");
    Squid.activeSave = null;
    window.__squidScene = "GameOver";

    Squid.Widgets.placeholder(this, {
      title: line.title,
      subtitle: line.body,
      nav: [{ label: "New grad, who dis (Menu)", to: "MainMenu" }],
    });
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.GameOver = GameOver;
})();
