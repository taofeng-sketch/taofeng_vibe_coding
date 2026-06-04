/* =============================================================================
 * SCENE — Boot  (plan §11.1)
 * Sets scale already handled by the Game config; Boot loads the asset manifest
 * (data, not code) so Preload can drive everything from it. Then -> Preload.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function Boot() { Phaser.Scene.call(this, { key: "Boot" }); }
  Boot.prototype = Object.create(Phaser.Scene.prototype);
  Boot.prototype.constructor = Boot;

  Boot.prototype.preload = function () {
    // No asset loads here. The manifest is delivered as a plain <script> global
    // (window.SQUID_MANIFEST) because Phaser's load.json/XHR is BLOCKED under
    // file:// (CORS for local files). See data/manifest.js (§10.1). Keep it XHR-free.
  };

  Boot.prototype.create = function () {
    // Single source of truth: the in-page global. No fetch/XHR -> file:// safe.
    Squid.manifest = window.SQUID_MANIFEST || { images: [] };
    if (!window.SQUID_MANIFEST) {
      console.warn("[Squid] SQUID_MANIFEST missing — did data/manifest.js load before main.js?");
    }
    this.scene.start("Preload");
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Boot = Boot;
})();
