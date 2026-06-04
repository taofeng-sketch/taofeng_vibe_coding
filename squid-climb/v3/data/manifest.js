/* =============================================================================
 * V3 ASSET MANIFEST — as a JS GLOBAL (file:// safe)  (plan §10.1)
 * -----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS:
 *   Phaser's `load.json()` (like fetch/XHR) is BLOCKED by Chrome under file://
 *   (CORS for local files). Double-clicking index.html therefore loaded an EMPTY
 *   manifest, so no image keys were ever declared and every scene fell back to
 *   the gray-box/glyph placeholder — i.e. "the new version looks like nothing".
 *
 *   `load.image` uses the <img> tag and DOES work under file://, so the fix is
 *   simply to deliver the manifest as a plain <script> global instead of JSON.
 *
 * SOURCE OF TRUTH: this file. `assets/manifest.json` is kept only as a
 * human-readable mirror — nothing fetches it at runtime anymore.
 *
 * Paths are relative to v3/index.html. V2 PNGs are reused from ../assets.
 * ============================================================================= */
(function () {
  "use strict";
  window.SQUID_MANIFEST = {
    version: 1,
    images: [
      { key: "scene_hq", path: "../assets/scene_hq.png" },
      { key: "scene_climb", path: "../assets/scene_climb.png" },
      { key: "player", path: "../assets/player.png" },
      // Intro cutscene art (graduation + the winding VP ladder tower)
      { key: "intro_graduation", path: "../assets/intro_graduation.png" },
      { key: "intro_ladder_tower", path: "../assets/intro_ladder_tower.png" },
      { key: "enemy_bug", path: "../assets/enemy_bug.png" },
      { key: "enemy_legacy", path: "../assets/enemy_legacy.png" },
      { key: "enemy_pm", path: "../assets/enemy_pm.png" },
      { key: "enemy_ds", path: "../assets/enemy_ds.png" },
      { key: "enemy_manager", path: "../assets/enemy_manager.png" },
      { key: "boss_halfyear", path: "../assets/boss_halfyear.png" },
      { key: "boss_calibration", path: "../assets/boss_calibration.png" }
    ],
    spritesheets: [],
    atlases: [],
    audio: []
  };
  console.log(
    "[Squid] SQUID_MANIFEST loaded:",
    window.SQUID_MANIFEST.images.length,
    "images (file:// safe, no XHR)"
  );
})();
