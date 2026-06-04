/* =============================================================================
 * SCENE — Preload  (plan §11.1 / §10.1 / §10.3)
 * Reads the manifest, loads all declared assets with a progress bar, registers
 * a missing-key fallback (gray-box, §10.3), then -> MainMenu.
 * Also runs a console sanity log confirming every data module loaded.
 *
 * ROBUST BOOT (never soft-lock): the ONLY happy-path transition to MainMenu is
 * the loader 'complete' event. But under file:// (double-click) an <img> for a
 * slow/stalled asset (e.g. a Google-Drive "online-only"/dataless PNG that has to
 * materialize on access) can fire NEITHER 'load' NOR 'error' — so the loader
 * never reaches 'complete', create() is never called, and the game hangs forever
 * on the loading screen with the bar frozen at completed/total. A 'loaderror'
 * handler does NOT save us because a stall is not an error. To make this
 * impossible we (a) transition on 'complete', (b) keep going on 'loaderror', and
 * (c) arm a wall-clock safety timeout (window.setTimeout, independent of the
 * Phaser/scene update loop) that proceeds to MainMenu even if 'complete' never
 * fires. All routes funnel through an idempotent _finish() so we transition once.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // How long to wait for the loader before booting the menu anyway. Any assets
  // that haven't arrived gray-box via the runtime fallback (§10.3). The happy
  // path normally fires 'complete' in well under a second.
  var SAFETY_TIMEOUT_MS = 3000;

  function Preload() { Phaser.Scene.call(this, { key: "Preload" }); }
  Preload.prototype = Object.create(Phaser.Scene.prototype);
  Preload.prototype.constructor = Preload;

  Preload.prototype.preload = function () {
    var W = this.scale.width, H = this.scale.height;
    var self = this;

    this._done = false;
    this._failed = [];
    this._timeoutId = null;

    // progress bar
    this.add.rectangle(W / 2, H / 2, 420, 28, 0x1f2a37).setStrokeStyle(2, 0x4fd1c5);
    var bar = this.add.rectangle(W / 2 - 206, H / 2, 4, 18, 0x4fd1c5).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 44, "Loading Squid Technologies\u2026", { fontFamily: "monospace", fontSize: "18px", color: "#9fb3c8" }).setOrigin(0.5);
    this.load.on("progress", function (p) { bar.width = 4 + 408 * p; });

    // load manifest images
    var manifest = Squid.manifest || { images: [] };
    (manifest.images || []).forEach(function (img) { self.load.image(img.key, img.path); });

    // A failed asset must NEVER block the boot: record it (gray-box, §10.3) and
    // let the loader carry on. (Note: this only fires for true errors, not stalls.)
    this.load.on("loaderror", function (file) {
      var key = file && file.key;
      self._failed.push(key);
      console.warn("[Squid] loaderror (continuing, will gray-box):", key, file && file.src);
    });

    // Happy-path transition. Phaser also calls create() on 'complete'; both routes
    // funnel through the idempotent _finish() so we transition exactly once.
    this.load.once("complete", function () { self._finish("loader complete"); });

    // Wall-clock safety net (independent of the scene update loop): if the loader
    // never reaches 'complete' (a stalled <img> that neither loads nor errors),
    // proceed to MainMenu anyway so the game can never hang on the loading screen.
    this._timeoutId = window.setTimeout(function () {
      self._finish("safety timeout (" + SAFETY_TIMEOUT_MS + "ms) — proceeding despite stalled/slow assets");
    }, SAFETY_TIMEOUT_MS);
  };

  Preload.prototype.create = function () {
    // Reached only when the loader completed normally; _finish() is idempotent.
    this._finish("create");
  };

  // Idempotent: transitions to MainMenu exactly once, no matter which path
  // (loader 'complete', create(), or the safety timeout) fires first.
  Preload.prototype._finish = function (reason) {
    if (this._done) return;
    this._done = true;

    if (this._timeoutId != null) { window.clearTimeout(this._timeoutId); this._timeoutId = null; }
    try { this.load.removeAllListeners(); } catch (e) {}

    if (this._failed && this._failed.length) {
      console.warn("[Squid] Missing assets (gray-box fallback will apply):", this._failed);
    }

    // SMOOTH downscaling: every loaded image is large illustrated/photographic art
    // shown small (portraits) or as a background. Pin LINEAR filtering so the GPU
    // downscale is clean, not crunchy. (Belt-and-suspenders alongside the global
    // pixelArt:false in main.js — keeps art crisp even if the global flag changes.)
    try {
      var L = (Phaser.Textures && Phaser.Textures.FilterMode && Phaser.Textures.FilterMode.LINEAR);
      var manifest = Squid.manifest || { images: [] };
      var self = this;
      (manifest.images || []).forEach(function (img) {
        if (L != null && self.textures.exists(img.key)) self.textures.get(img.key).setFilter(L);
      });
    } catch (e) { console.warn("[Squid] could not set LINEAR filter:", e && e.message); }

    console.log("[Squid] Preload -> MainMenu via:", reason);

    // ---- data sanity log (user-requested) ----
    this.dataSanityCheck();

    this.scene.start("MainMenu");
  };

  Preload.prototype.dataSanityCheck = function () {
    var ok = true;
    function check(name, obj, kind) {
      var present = obj != null && (kind === "fn" ? typeof obj === "function" : Object.keys(obj).length > 0);
      if (!present) ok = false;
      return present;
    }
    var report = {
      CARDS: Object.keys(Squid.CARDS || {}).length,
      ENEMIES: Object.keys(Squid.ENEMIES || {}).length,
      ENCOUNTERS: Object.keys(Squid.ENCOUNTERS || {}).length,
      STAGES: (Squid.STAGES || []).length,
      EVENTS: Object.keys(Squid.EVENTS || {}).length,
      INTROS: Object.keys(Squid.INTROS || {}).length,
      ENEMY_LORE: Object.keys(Squid.ENEMY_LORE || {}).length,
      Sound: !!Squid.Sound,
      Save: !!Squid.Save,
      LAYOUT: !!Squid.LAYOUT,
    };
    check("CARDS", Squid.CARDS); check("ENEMIES", Squid.ENEMIES); check("STAGES", Squid.STAGES);
    check("EVENTS", Squid.EVENTS); check("Save", Squid.Save);
    Squid.__dataOk = ok;
    Squid.__dataReport = report;
    console.log("[Squid] data modules loaded:", report, "ALL_OK=" + ok);
    if (window.__squidReady) window.__squidReady(report, ok);
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Preload = Preload;
})();
