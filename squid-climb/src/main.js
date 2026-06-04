/* =============================================================================
 * V3 MAIN — Phaser.Game bootstrap  (plan §11.1 / §0)
 * Desktop LANDSCAPE first: 1280x720 design canvas, Scale.FIT + CENTER_BOTH,
 * SMOOTH (LINEAR) texture filtering for clean downscaling of the illustrated art.
 * All scenes registered in order; Boot runs first.
 * Loaded LAST (after phaser.min.js + all data/engine/ui/scenes scripts).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  if (typeof Phaser === "undefined") {
    console.error("[Squid] Phaser not loaded — cannot start. See assets/vendor/.");
    return;
  }

  var L = Squid.LAYOUT.get("landscape").design; // 1280x720

  var S = Squid.scenes;
  var config = {
    // CANVAS (not AUTO/WebGL) is REQUIRED for double-click (file://) play.
    // Under file:// every file is its own opaque origin, so the art PNGs are
    // cross-origin. WebGL refuses to upload cross-origin ("tainted") images as
    // textures (SecurityError) -> every texture fails -> the whole game falls back
    // to glyph/emoji placeholders with a black background. The Canvas2D renderer
    // CAN draw cross-origin images (only pixel READBACK is blocked, which we never
    // do), so all art renders correctly offline. Measured 60fps on the canvas path.
    type: Phaser.CANVAS,
    parent: "game",
    backgroundColor: "#05080c",
    // Art here is large AI-illustrated/photographic PNGs shown SMALL (portraits)
    // or as backgrounds — NEAREST (pixelArt:true) made downscaled non-pixel-grid
    // art look crunchy/soft. Use SMOOTH (LINEAR) filtering + antialiasing so the
    // downscale is clean. (Preload also pins LINEAR per-texture defensively.)
    // The "UI" (buttons/bars/text) is vector + monospace text, not textures, so it
    // stays crisp regardless. (§ blur fix)
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    // CRITICAL for file:// (double-click) play: load images via <img> (HTMLImageElement)
    // instead of Phaser's default XHR/blob fetch, which Chrome BLOCKS under file://
    // (CORS, origin "null"). Without this every PNG fails to load and the whole game
    // falls back to gray-box/glyph placeholders — i.e. "looks like nothing". (§10.1)
    loader: { imageLoadType: "HTMLImageElement" },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: L.width,
      height: L.height,
    },
    scene: [S.Boot, S.Preload, S.MainMenu, S.Intro, S.Map, S.RoomIntro, S.Combat, S.Reward, S.Rest, S.Event, S.Compendium, S.GameOver, S.Win],
  };

  Squid.game = new Phaser.Game(config);

  // expose a small debug handle (mirrors v2's window.__squid)
  window.__squid = {
    get game() { return Squid.game; },
    Squid: Squid,
    CARDS: Squid.CARDS, ENEMIES: Squid.ENEMIES, ENCOUNTERS: Squid.ENCOUNTERS,
    STAGES: Squid.STAGES, EVENTS: Squid.EVENTS, Save: Squid.Save, Sound: Squid.Sound,
  };
})();
