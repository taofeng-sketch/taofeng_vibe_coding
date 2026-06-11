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
 * Paths are relative to index.html (flat layout: art lives in ./assets).
 * ============================================================================= */
(function () {
  "use strict";
  // Cache-bust token for the ART files themselves (the script tags' ?v=N only
  // busts the .js files). Bump together with index.html's ?v=N whenever PNGs
  // change, or a returning browser keeps showing the OLD art from its cache.
  var ART_V = "?av=2";
  window.SQUID_MANIFEST = {
    version: 2,
    images: [
      { key: "scene_hq", path: "assets/scene_hq.png" },
      { key: "scene_climb", path: "assets/scene_climb.png" },
      { key: "player", path: "assets/player.png" },
      // Intro cutscene art (graduation + the winding VP ladder tower)
      { key: "intro_graduation", path: "assets/intro_graduation.png" },
      { key: "intro_ladder_tower", path: "assets/intro_ladder_tower.png" },
      { key: "enemy_bug", path: "assets/enemy_bug.png" },
      { key: "enemy_legacy", path: "assets/enemy_legacy.png" },
      { key: "enemy_pm", path: "assets/enemy_pm.png" },
      { key: "enemy_ds", path: "assets/enemy_ds.png" },
      { key: "enemy_manager", path: "assets/enemy_manager.png" },
      { key: "boss_halfyear", path: "assets/boss_halfyear.png" },
      { key: "boss_calibration", path: "assets/boss_calibration.png" },
      // Per-card art (original 16-bit corporate-cyberpunk icons; see v3/assets/cards).
      // Keys match each card's `art` field in data/cards.js; CardView draws these in
      // the card art window and falls back to the glyph if a texture is missing.
      { key: "card_fix_bug", path: "assets/cards/card_fix_bug.png" },
      { key: "card_refactor", path: "assets/cards/card_refactor.png" },
      { key: "card_write_unit_test", path: "assets/cards/card_write_unit_test.png" },
      { key: "card_coffee", path: "assets/cards/card_coffee.png" },
      { key: "card_push_to_prod", path: "assets/cards/card_push_to_prod.png" },
      { key: "card_hotfix", path: "assets/cards/card_hotfix.png" },
      { key: "card_pair_program", path: "assets/cards/card_pair_program.png" },
      { key: "card_stand_up", path: "assets/cards/card_stand_up.png" },
      { key: "card_work_late", path: "assets/cards/card_work_late.png" },
      { key: "card_deep_work", path: "assets/cards/card_deep_work.png" },
      { key: "card_rubber_duck", path: "assets/cards/card_rubber_duck.png" },
      { key: "card_ship_it", path: "assets/cards/card_ship_it.png" },
      { key: "card_run_experiment", path: "assets/cards/card_run_experiment.png" },
      { key: "card_move_metric", path: "assets/cards/card_move_metric.png" },
      { key: "card_mentorship", path: "assets/cards/card_mentorship.png" },
      { key: "card_touch_grass", path: "assets/cards/card_touch_grass.png" },
      { key: "card_deprecate", path: "assets/cards/card_deprecate.png" },
      { key: "card_focus_sprint", path: "assets/cards/card_focus_sprint.png" },
      { key: "card_caffeinate", path: "assets/cards/card_caffeinate.png" },
      { key: "card_tech_debt", path: "assets/cards/card_tech_debt.png" }
    ],
    spritesheets: [],
    atlases: [],
    audio: []
  };
  // apply the art cache-bust token to every declared path
  window.SQUID_MANIFEST.images.forEach(function (img) { img.path += ART_V; });
  console.log(
    "[Squid] SQUID_MANIFEST loaded:",
    window.SQUID_MANIFEST.images.length,
    "images (file:// safe, no XHR)"
  );
})();
