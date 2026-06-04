/* =============================================================================
 * SCENE — Intro  (the IC3 -> VP cinematic cutscene, plan §8 / ports v2 INTRO_BEATS)
 *
 * A scripted, fully SKIPPABLE pixel-art cutscene played once on New Game:
 *   1. Graduation      — intro_graduation, fresh-out-of-school optimism
 *   2. Joining Squid    — scene_hq, the player walks in small at the base (IC3)
 *   3. Start climbing    — scene_climb, the tiny figure begins the ascent (hopeful)
 *   4. THE PULL-BACK     — intro_ladder_tower: open zoomed in on the tiny figure
 *                          near the bottom, then slowly zoom-out / pan-up to reveal
 *                          the ENTIRE winding ladder up to the glowing VP office.
 *                          Hold on the daunting full view. -> fade to Map.
 *
 * file://-SAFE: textures come from window.SQUID_MANIFEST (loaded by Preload via
 * <img>, no XHR). Missing art falls back to a gray-box (Widgets.ensurePlaceholder).
 * Music/SFX from the synth engine (Squid.Sound). Skip via button / ESC / click/tap.
 *
 * Debug hooks for the headless verify harness:
 *   window.__squidScene        — "Intro" then "Intro:beat<N>"
 *   Squid.__intro              — the live scene
 *   scene.debugBeat()          — current beat index
 *   scene.debugGotoBeat(i)     — jump straight to beat i (cancels timers)
 *   scene.debugSkip()          — skip to Map
 *   scene.debugTextures()      — { intro_graduation: bool, intro_ladder_tower: bool, ... }
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // The script. cap = English line, cn = 中文 line. `art` is the manifest key
  // (gray-boxed if missing). `kind` selects the staging treatment.
  var BEATS = [
    {
      art: "intro_graduation", kind: "still", fit: "cover", ken: true,
      cap: "Fresh out of school. Diploma in hand. Infinite optimism.",
      cn: "\u521A\u6BD5\u4E1A\uFF0C\u624B\u63E1\u6587\u51ED\uFF0C\u6EE1\u8154\u70ED\u8840\u3002",
      dur: 3800,
    },
    {
      art: "scene_hq", kind: "walkin", fit: "cover",
      cap: "Day one at Squid Technologies. IC3. Time to climb.",
      cn: "\u5165\u804C\u9C7F\u9C7C\u5382\u7B2C\u4E00\u5929\u3002IC3\u3002\u5F00\u59CB\u5F80\u4E0A\u722C\u3002",
      dur: 4200,
    },
    {
      art: "scene_climb", kind: "climb", fit: "cover",
      cap: "If I just keep climbing... VP, here I come.",
      cn: "\u53EA\u8981\u4E00\u76F4\u5F80\u4E0A\u722C\u2026\u2026VP\uFF0C\u6211\u6765\u4E86\u3002",
      dur: 4200,
    },
    {
      art: "intro_ladder_tower", kind: "pullback", fit: "contain",
      cap: "VP is just... up there. How hard can it be?",
      cn: "VP \u5C31\u5728\u2026\u2026\u4E0A\u9762\u3002\u80FD\u6709\u591A\u96BE\u5462\uFF1F",
      dur: 7200,
    },
    {
      // how-it-works beat (rules), bridges the cutscene into the deckbuilder loop
      art: "scene_hq", kind: "still", fit: "cover", ken: true,
      cap: "How it works: spend Working Hours to play cards \u2014 deal damage, gain Block. Keep your Pulse above zero, or you're managed out. Climb IC3 \u2192 VP.",
      cn: "\u73A9\u6CD5\uFF1A\u7528\u300C\u5DE5\u65F6\u300D\u6253\u51FA\u5361\u724C\u2014\u2014\u9020\u4F24\u5BB3\u3001\u62FF\u683C\u6321\u3002\u522B\u8BA9\u300CPulse\u300D\u5F52\u96F6\uFF0C\u5426\u5219\u88AB managed out\u3002\u4ECE IC3 \u4E00\u8DEF\u722C\u5230 VP\u3002",
      dur: 6400,
    },
  ];

  function Intro() { Phaser.Scene.call(this, { key: "Intro" }); }
  Intro.prototype = Object.create(Phaser.Scene.prototype);
  Intro.prototype.constructor = Intro;

  Intro.prototype.create = function () {
    var self = this;
    var W = this.scale.width, H = this.scale.height;
    var Sound = Squid.Sound;

    this._done = false;
    this._beat = -1;
    this._timers = [];
    this._beatLayer = null;

    // honour reduceMotion (settings) — collapse to fast, no-tween beats
    var settings = (Squid.Save && Squid.Save.getSettings()) || {};
    this.reduce = !!settings.reduceMotion;

    // solid base so fades read as black, never the canvas clear color
    this.cameras.main.setBackgroundColor("#05080c");

    // dedicated hopeful "intro" theme; swaps to the wandering "map" theme on the pull-back
    try { if (Sound) { Sound.init(); Sound.resume(); Sound.playMusic("intro"); } } catch (e) {}

    // ---- persistent caption band (rebuilt text per beat) ----
    this.capScrim = this.add.rectangle(W / 2, H - 86, W, 132, 0x05080c, 0.62).setDepth(40);
    this.capEn = this.add.text(W / 2, H - 104, "", {
      fontFamily: "monospace", fontSize: "22px", color: "#e6f1ff", align: "center",
      wordWrap: { width: W - 160 },
    }).setOrigin(0.5).setDepth(41);
    this.capCn = this.add.text(W / 2, H - 64, "", {
      fontFamily: "monospace", fontSize: "18px", color: "#4fd1c5", align: "center",
      wordWrap: { width: W - 160 },
    }).setOrigin(0.5).setDepth(41);

    // ---- skip affordance (button + ESC + click/tap anywhere) ----
    this.skipBtn = Squid.Widgets.button(this, {
      x: W - 92, y: 36, w: 148, h: 38, label: "Skip \u00BB", fontSize: 15,
      fill: 0x121b24, hover: 0x22303d,
      onClick: function () { self.finish(true); },
    });
    this.skipBtn.setDepth(60);
    this.skipHint = this.add.text(W - 92, 64, "ESC / click to skip", {
      fontFamily: "monospace", fontSize: "10px", color: "#5a6b7b",
    }).setOrigin(0.5).setDepth(60);

    // click/tap anywhere skips (the skip button handles its own pointer).
    this.input.on("pointerdown", function (p, over) {
      // ignore the click that landed on the skip button itself (already handled)
      if (over && over.length) return;
      self.finish(true);
    });
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", function () { self.finish(true); });
      this.input.keyboard.on("keydown-SPACE", function () { self.advance(); });
    }

    // debug handle for the headless harness
    Squid.__intro = this;
    window.__squidScene = "Intro";

    // kick off beat 0 with a fade-in from black
    this.cameras.main.fadeIn(this.reduce ? 0 : 600, 5, 8, 12);
    this.playBeat(0);
  };

  // texture key or a gray-box placeholder if the art never loaded (§10.3)
  Intro.prototype.bgKey = function (key) {
    var W = this.scale.width, H = this.scale.height;
    return Squid.Widgets.ensurePlaceholder(this, key, W, H, "");
  };

  Intro.prototype.clearTimers = function () {
    (this._timers || []).forEach(function (t) { if (t && t.remove) t.remove(false); });
    this._timers = [];
  };

  Intro.prototype.later = function (ms, fn) {
    var t = this.time.delayedCall(this.reduce ? Math.min(ms, 600) : ms, fn);
    this._timers.push(t);
    return t;
  };

  // ---- build + play a single beat ----
  Intro.prototype.playBeat = function (i) {
    var self = this, W = this.scale.width, H = this.scale.height;
    if (this._done) return;
    if (i >= BEATS.length) { this.finish(false); return; }

    this._beat = i;
    window.__squidScene = "Intro:beat" + i;
    var b = BEATS[i];

    // tear down previous beat visuals (captions/skip persist)
    if (this._beatLayer) { this._beatLayer.destroy(true); this._beatLayer = null; }
    var layer = this._beatLayer = this.add.container(0, 0).setDepth(5);

    var key = this.bgKey(b.art);
    var img = this.add.image(W / 2, H / 2, key);
    layer.add(img);

    if (b.kind === "pullback") {
      this.stagePullback(layer, img, b);
    } else {
      // cover-fit background (fills the 16:9 frame)
      var sc = Math.max(W / img.width, H / img.height);
      img.setScale(sc);

      // a soft scrim so captions stay legible over busy art
      var scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.18);
      layer.add(scrim);

      if (b.ken && !this.reduce) {
        // slow Ken-Burns drift for the "still" graduation beat
        img.setScale(sc * 1.06);
        this.tweens.add({ targets: img, scale: sc * 1.14, x: W / 2 - 18, duration: b.dur + 600, ease: "Sine.inOut" });
      }
      if (b.kind === "walkin") this.stageWalkin(layer, b);
      if (b.kind === "climb") this.stageClimb(layer, b);
    }

    // caption: fade in fresh text
    this.setCaption(b);

    // schedule the transition to the next beat (pull-back self-finishes inside its stager)
    if (b.kind !== "pullback") {
      this.later(b.dur, function () { self.transitionTo(i + 1); });
    }
  };

  Intro.prototype.setCaption = function (b) {
    var self = this;
    this.capEn.setText(b.cap || "");
    this.capCn.setText(b.cn || "");
    if (this.reduce) { this.capEn.setAlpha(1); this.capCn.setAlpha(1); return; }
    this.capEn.setAlpha(0); this.capCn.setAlpha(0);
    this.tweens.add({ targets: this.capEn, alpha: 1, duration: 420, ease: "Quad.out" });
    this.tweens.add({ targets: this.capCn, alpha: 1, delay: 140, duration: 420, ease: "Quad.out" });
  };

  // Beat 2 — the player walks in small at the base of HQ.
  Intro.prototype.stageWalkin = function (layer, b) {
    var W = this.scale.width, H = this.scale.height;
    var p = this.makePlayer(W * 0.5, H * 0.74, 150);
    layer.add(p);
    if (this.reduce) return;
    p.x = -120; p.setAlpha(0);
    this.tweens.add({ targets: p, x: W * 0.5, alpha: 1, duration: 1500, ease: "Sine.out" });
    // gentle settle bob once arrived
    this.tweens.add({ targets: p, y: H * 0.74 - 8, duration: 700, yoyo: true, repeat: -1, delay: 1500, ease: "Sine.inOut" });
  };

  // Beat 3 — the tiny figure begins to climb (hopeful, bobbing upward).
  Intro.prototype.stageClimb = function (layer, b) {
    var W = this.scale.width, H = this.scale.height;
    var p = this.makePlayer(W * 0.5, H * 0.78, 96);
    layer.add(p);
    if (this.reduce) return;
    p.setAlpha(0);
    this.tweens.add({ targets: p, alpha: 1, duration: 500 });
    // little upward climb hops
    this.tweens.add({ targets: p, y: H * 0.62, duration: 3600, ease: "Sine.inOut" });
    this.tweens.add({ targets: p, scaleX: 0.9, duration: 280, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  };

  // Beat 4 — THE PULL-BACK. Open zoomed in on the tiny figure near the bottom of
  // intro_ladder_tower, then slowly zoom-out + pan-up to the full winding ladder
  // and the glowing VP office at the top. Hold, then fade to Map.
  Intro.prototype.stagePullback = function (layer, img, b) {
    var self = this, W = this.scale.width, H = this.scale.height;

    // contain-fit (END): the WHOLE tower visible, VP office at the top.
    var endScale = Math.min(W / img.width, H / img.height);
    var endX = W / 2, endY = H / 2;

    // START: zoomed in near the bottom-centre (where the lone figure stands).
    // Map a normalized image point (0.5, ~0.84) to screen-centre at a big scale.
    var startScale = endScale * 2.35;
    var figNY = 0.84; // figure sits ~84% down the frame
    var startX = W / 2;
    var startY = H / 2 - (figNY - 0.5) * img.height * startScale;

    // a faint "VP office" glow pinned to the top of the image, revealed on zoom-out
    var topNY = 0.13;
    var glow = this.add.circle(0, 0, 26 * endScale * 3.2, 0xffd479, 0.0);
    layer.add(glow);
    var positionGlow = function () {
      glow.x = img.x + (0.5 - 0.5) * img.width * img.scaleX;
      glow.y = img.y + (topNY - 0.5) * img.height * img.scaleY;
      glow.setScale(img.scaleX / endScale);
    };

    if (this.reduce) {
      img.setPosition(endX, endY).setScale(endScale);
      positionGlow(); glow.setFillStyle(0xffd479, 0.5);
      this.later(900, function () { self.finish(false); });
      return;
    }

    img.setPosition(startX, startY).setScale(startScale);
    positionGlow();

    // swap to the weightier theme for the reveal
    try { if (Squid.Sound) Squid.Sound.playMusic("map"); } catch (e) {}

    // the slow reveal: zoom-out + pan-up over ~5s
    this.tweens.add({
      targets: img,
      scale: endScale, x: endX, y: endY,
      duration: 5200, ease: "Sine.inOut",
      onUpdate: positionGlow,
      onComplete: function () { positionGlow(); },
    });
    // glow blooms in as the top of the tower comes into view
    this.tweens.add({ targets: glow, fillAlpha: 0.55, duration: 2600, delay: 2600, ease: "Quad.out", onUpdate: positionGlow });
    this.tweens.add({ targets: glow, scale: 1.18, duration: 1400, yoyo: true, repeat: -1, delay: 3200, ease: "Sine.inOut" });

    // hold on the daunting full view, then fade to the Map
    this.later(b.dur, function () { self.finish(false); });
  };

  // a small player sprite (gray-box fallback if player.png is missing)
  Intro.prototype.makePlayer = function (x, y, targetH) {
    var key = "player";
    if (this.textures.exists(key)) {
      var img = this.add.image(x, y, key).setOrigin(0.5, 1);
      img.setScale(targetH / img.height);
      return img;
    }
    var ph = Squid.Widgets.ensurePlaceholder(this, "player", Math.round(targetH * 0.62), targetH, "");
    return this.add.image(x, y, ph).setOrigin(0.5, 1);
  };

  // fade between beats
  Intro.prototype.transitionTo = function (i) {
    var self = this;
    if (this._done) return;
    if (this.reduce) { this.playBeat(i); return; }
    var cam = this.cameras.main;
    cam.fadeOut(420, 5, 8, 12);
    cam.once("camerafadeoutcomplete", function () {
      if (self._done) return;
      cam.fadeIn(460, 5, 8, 12);
      self.playBeat(i);
    });
  };

  // SPACE advances to the next beat early (debug/QoL); not a skip.
  Intro.prototype.advance = function () {
    if (this._done) return;
    this.clearTimers();
    this.transitionTo(this._beat + 1);
  };

  // finish the cutscene -> Map. Marks intro as seen so it never auto-replays.
  Intro.prototype.finish = function (skipped) {
    var self = this;
    if (this._done) return;
    this._done = true;
    this.clearTimers();

    // persist "intro seen" in settings so New Game won't replay it (§7.2)
    try {
      if (Squid.Save) {
        var s = Squid.Save.getSettings();
        s.introSeen = true;
        Squid.Save.saveSettings(s);
      }
    } catch (e) {}

    window.__squidScene = "Intro:done";
    if (this.reduce) { this.scene.start("Map"); return; }
    var cam = this.cameras.main;
    cam.fadeOut(skipped ? 240 : 700, 5, 8, 12);
    cam.once("camerafadeoutcomplete", function () { self.scene.start("Map"); });
  };

  // ---- headless verify hooks ----
  Intro.prototype.debugBeat = function () { return this._beat; };
  Intro.prototype.debugGotoBeat = function (i) {
    this.clearTimers();
    if (this.cameras && this.cameras.main) this.cameras.main.resetFX();
    this.playBeat(i);
    return this._beat;
  };
  Intro.prototype.debugSkip = function () { this.finish(true); return true; };
  Intro.prototype.debugTextures = function () {
    var keys = ["intro_graduation", "scene_hq", "scene_climb", "intro_ladder_tower", "player"];
    var out = {};
    var self = this;
    keys.forEach(function (k) { out[k] = self.textures.exists(k); });
    return out;
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.Intro = Intro;
})();
