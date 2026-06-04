/* =============================================================================
 * SCENE — MainMenu  (plan §7.1)
 * New Game / Continue / Load Game / Compendium / Settings.
 * Owns the save-summary read. New Game -> fresh save -> Map. Continue -> latest
 * autosave -> its screen. Load -> slot picker. Settings -> stub w/ mute toggle.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  function MainMenu() { Phaser.Scene.call(this, { key: "MainMenu" }); }
  MainMenu.prototype = Object.create(Phaser.Scene.prototype);
  MainMenu.prototype.constructor = MainMenu;

  MainMenu.prototype.create = function () {
    var L = Squid.LAYOUT.get().menu;
    var W = this.scale.width, H = this.scale.height;
    var Save = Squid.Save, Sound = Squid.Sound, Widgets = Squid.Widgets;

    // background (gray-box if scene_hq missing)
    if (this.textures.exists("scene_hq")) {
      var bg = this.add.image(W / 2, H / 2, "scene_hq");
      var sc = Math.max(W / bg.width, H / bg.height); bg.setScale(sc);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0e151d);
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.55); // scrim

    // logo + tagline
    this.add.text(L.logo.x, L.logo.y, "\u221E SQUID TECHNOLOGIES", { fontFamily: "monospace", fontSize: "34px", color: "#4fd1c5", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(L.tagline.x, L.tagline.y - 4, "PERFORMANCE REVIEW CLIMB", { fontFamily: "monospace", fontSize: "20px", color: "#e6f1ff" }).setOrigin(0.5);
    this.add.text(L.tagline.x, L.tagline.y + 26, "A satirical big-tech deckbuilder. Move Tentacles Fast\u2122.", { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0.5);

    // buttons
    var hasContinue = Save.hasContinue();
    var self = this;
    var items = [
      { label: "\u25B6  New Game", onClick: function () { self.newGame(); } },
      { label: hasContinue ? "Continue" : "Continue (no save)", enabled: hasContinue, onClick: function () { self.continueGame(); } },
      { label: "Load Game", onClick: function () { self.openLoad(); } },
      { label: "Compendium", onClick: function () { self.scene.start("Compendium"); } },
      { label: "Settings", onClick: function () { self.openSettings(); } },
    ];
    items.forEach(function (it, i) {
      Widgets.button(self, {
        x: L.buttonStart.x, y: L.buttonStart.y + i * L.buttonGap,
        w: L.buttonSize.w, h: L.buttonSize.h,
        label: it.label, enabled: it.enabled, onClick: it.onClick,
      });
    });

    // version / footnote
    var ver = (window.Phaser && Phaser.VERSION) ? Phaser.VERSION : "?";
    var v = this.add.text(L.version.x, L.version.y, "v3 foundation \u00B7 Phaser " + ver, { fontFamily: "monospace", fontSize: "12px", color: "#5a6b7b" });
    v.setOrigin(L.version.origin.x, L.version.origin.y);
    this.add.text(W / 2, H - 24, "Fictional company. Any resemblance to your last performance cycle is coincidental.", { fontFamily: "monospace", fontSize: "11px", color: "#5a6b7b" }).setOrigin(0.5);

    // audio toggle
    this.audioLabel = this.add.text(L.audioBtn.x, L.audioBtn.y, Sound.isMuted() ? "\uD83D\uDD07" : "\uD83D\uDD0A", { fontSize: "26px" }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.audioLabel.on("pointerdown", function () { Sound.init(); var m = Sound.toggleMute(); self.audioLabel.setText(m ? "\uD83D\uDD07" : "\uD83D\uDD0A"); });

    // try to start menu music on first interaction (autoplay policy)
    this.input.once("pointerdown", function () { Sound.init(); Sound.resume(); Sound.playMusic("menu"); });

    // mark scene rendered for headless verification
    window.__squidScene = "MainMenu";
  };

  MainMenu.prototype.newGame = function () {
    // V1: single class (swe). Class select is M4; jump straight to a fresh run.
    var save = Squid.Save.newGame({ cls: "swe" });
    Squid.activeSave = save;
    // Play the IC3->VP cutscene ONCE (persisted in settings). Intro -> Map.
    var settings = Squid.Save.getSettings();
    if (settings && settings.introSeen) {
      this.scene.start("Map");
    } else {
      this.scene.start("Intro");
    }
  };

  MainMenu.prototype.continueGame = function () {
    var save = Squid.Save.continueGame();
    if (!save) return;
    Squid.activeSave = save;
    var target = { map: "Map", event: "Event", rest: "Rest", reward: "Reward" }[save.screen] || "Map";
    this.scene.start(target);
  };

  // ---- Load Game slot picker (overlay within this scene) ----
  MainMenu.prototype.openLoad = function () {
    var self = this, Save = Squid.Save, Widgets = Squid.Widgets;
    var W = this.scale.width, H = this.scale.height;
    var layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.82).setInteractive());
    layer.add(this.add.rectangle(W / 2, H / 2, 720, 520, 0x121b24).setStrokeStyle(2, 0x4fd1c5));
    layer.add(this.add.text(W / 2, 140, "LOAD GAME", { fontFamily: "monospace", fontSize: "26px", color: "#4fd1c5" }).setOrigin(0.5));

    var slots = Save.listSlots();
    slots.forEach(function (s, i) {
      var y = 200 + i * 78;
      var name = s.slot === "auto" ? "Autosave" : "Slot " + (s.slot + 1);
      var desc;
      if (s.exists && s.summary) {
        var d = new Date(s.summary.savedAt);
        desc = s.summary.level + " \u00B7 " + s.summary.act + " \u00B7 deck " + s.summary.deckSize + " \u00B7 " + d.toLocaleString();
      } else { desc = "\u2014 empty \u2014"; }
      layer.add(self.add.text(W / 2 - 320, y - 14, name, { fontFamily: "monospace", fontSize: "18px", color: "#e6f1ff" }));
      layer.add(self.add.text(W / 2 - 320, y + 10, desc, { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }));
      layer.add(Widgets.button(self, {
        x: W / 2 + 230, y: y, w: 150, h: 44, label: s.exists ? "Load" : "\u2014", enabled: s.exists,
        onClick: function () { var sv = Save.load(s.slot); if (sv) { Squid.activeSave = sv; var t = { map: "Map", event: "Event", rest: "Rest", reward: "Reward" }[sv.screen] || "Map"; self.scene.start(t); } },
      }));
    });
    layer.add(Widgets.button(self, { x: W / 2, y: H - 150, w: 200, h: 46, label: "Back", onClick: function () { layer.destroy(); } }));
  };

  // ---- Settings (stub + working mute toggle) ----
  MainMenu.prototype.openSettings = function () {
    var self = this, Save = Squid.Save, Sound = Squid.Sound, Widgets = Squid.Widgets;
    var W = this.scale.width, H = this.scale.height;
    var settings = Save.getSettings();
    var layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.82).setInteractive());
    layer.add(this.add.rectangle(W / 2, H / 2, 640, 440, 0x121b24).setStrokeStyle(2, 0x4fd1c5));
    layer.add(this.add.text(W / 2, 180, "SETTINGS", { fontFamily: "monospace", fontSize: "26px", color: "#4fd1c5" }).setOrigin(0.5));
    layer.add(this.add.text(W / 2, 226, "(stub \u2014 full audio/reduceMotion/language land in M1+/M6)", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0.5));

    var muteBtn = Widgets.button(self, {
      x: W / 2, y: 300, w: 360, h: 50,
      label: Sound.isMuted() ? "Audio: MUTED \uD83D\uDD07" : "Audio: ON \uD83D\uDD0A",
      onClick: function () { Sound.init(); var m = Sound.toggleMute(); settings.muted = m; Save.saveSettings(settings); muteBtn.label.setText(m ? "Audio: MUTED \uD83D\uDD07" : "Audio: ON \uD83D\uDD0A"); if (self.audioLabel) self.audioLabel.setText(m ? "\uD83D\uDD07" : "\uD83D\uDD0A"); },
    });
    layer.add(muteBtn);

    // Replay the intro cutscene (nice-to-have). Needs an active run so Intro->Map works.
    layer.add(Widgets.button(self, {
      x: W / 2, y: 366, w: 360, h: 46, label: "Replay Intro \u25B6",
      onClick: function () {
        Squid.activeSave = Squid.activeSave || Save.continueGame() || Save.newGame({ cls: "swe" });
        self.scene.start("Intro");
      },
    }));
    layer.add(Widgets.button(self, {
      x: W / 2, y: 426, w: 360, h: 46, label: "Reset Save Data", fill: 0x3a1f24, hover: 0x4d2730, border: 0xe06c75,
      onClick: function () { Save.resetAll(); self.scene.restart(); },
    }));
    layer.add(Widgets.button(self, { x: W / 2, y: H - 150, w: 200, h: 46, label: "Back", onClick: function () { layer.destroy(); } }));
  };

  Squid.scenes = Squid.scenes || {};
  Squid.scenes.MainMenu = MainMenu;
})();
