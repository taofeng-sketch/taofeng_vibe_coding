/* =============================================================================
 * V3 ENGINE — Save / Load  (per plan §7.2, SaveSchemaV1)
 * localStorage slots: squid_save_0..2 (manual) + squid_save_auto.
 * squid_meta holds menu summaries so Load Game renders without parsing saves.
 * squid_codex holds Compendium unlock set (persists across runs, §9.2).
 * squid_settings holds audio/mute/reduceMotion/language.
 * Room-boundary autosave only (no mid-combat save in V1, §13.4).
 *
 * NOTE: localStorage is per-browser-profile. Saves do NOT travel with the
 * folder across machines/Drive sync — a known zero-build/local constraint.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var SCHEMA_VERSION = 1;
  var SLOT_KEYS = { 0: "squid_save_0", 1: "squid_save_1", 2: "squid_save_2", auto: "squid_save_auto" };
  var META_KEY = "squid_meta";
  var CODEX_KEY = "squid_codex";
  var SETTINGS_KEY = "squid_settings";

  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function readJSON(key) { var s = ls(); if (!s) return null; try { var raw = s.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function writeJSON(key, obj) { var s = ls(); if (!s) return false; try { s.setItem(key, JSON.stringify(obj)); return true; } catch (e) { return false; } }
  function removeKey(key) { var s = ls(); if (!s) return; try { s.removeItem(key); } catch (e) {} }
  function normSlot(slot) { return slot === "auto" ? "auto" : Number(slot); }

  // ---- SaveSchemaV1 factory (the canonical run-state shape) ----
  function newSave(opts) {
    opts = opts || {};
    return {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      class: opts.cls || "swe",
      run: {
        stageIndex: 0,
        floor: 0,
        levelTitle: Squid.levelName ? Squid.levelName(0) : "IC3",
        // branching CLIMB map progress (M4, §11.1). clearedIds = traversed nodes,
        // lastId = where you stand; reachable nodes are derived from lastId.next.
        map: { clearedIds: [], lastId: null },
        deck: (Squid.STARTER_DECK || []).slice(),
        pulse: 80,
        maxPulse: 80,
        powers: { focusSprint: 0 },
        seed: opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0,
      },
      screen: "map", // resume target (map/event/rest/reward). Never mid-combat in V1.
      compendium: { enemiesSeen: [], enemiesDefeated: [], cardsSeen: [] },
      settings: getSettings(),
    };
  }

  // ---- schema migration (forward-compat hook, §7.2) ----
  function migrate(save) {
    if (!save || typeof save !== "object") return null;
    if (save.version === SCHEMA_VERSION) return save;
    // No prior versions exist yet. If a future bump arrives, branch here.
    // Worst case: refuse-and-explain rather than crash.
    if (save.version == null || save.version > SCHEMA_VERSION) return null;
    return save;
  }

  // ---- meta summary (slot -> {level, act, deckSize, savedAt}) ----
  function summarize(save) {
    // Prefer the branching-map act band (where you stand on the climb); fall
    // back to the legacy linear STAGES act for older/foreign saves.
    var act = "\u2014";
    var MM = Squid.MapModel, run = save.run || {};
    if (MM) {
      var lastId = run.map && run.map.lastId;
      var node = lastId ? MM.nodeById(lastId) : null;
      if (!node) {
        var reach = MM.reachableIds(save);
        if (reach && reach.length) node = MM.nodeById(reach[0]);
      }
      if (node) act = node.act;
    }
    if (act === "\u2014") {
      var STAGES = Squid.STAGES || [];
      var stage = STAGES[run.stageIndex || 0];
      if (stage) act = stage.act;
    }
    return {
      level: run.levelTitle || (Squid.levelName ? Squid.levelName(run.floor || 0) : "IC3"),
      act: act,
      deckSize: run.deck ? run.deck.length : 0,
      savedAt: save.savedAt || Date.now(),
      cls: save.class || "swe",
    };
  }
  function readMeta() { return readJSON(META_KEY) || {}; }
  function writeMetaFor(slot, save) { var meta = readMeta(); meta[slot] = save ? summarize(save) : null; writeJSON(META_KEY, meta); }

  // ---- public API ----
  var Save = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    SLOT_KEYS: SLOT_KEYS,

    available: function () { return !!ls(); },

    newGame: function (opts) {
      var save = newSave(opts);
      // persist immediately into the autosave slot so Continue works right away
      this.save("auto", save);
      return save;
    },

    save: function (slot, save) {
      slot = normSlot(slot);
      var key = SLOT_KEYS[slot];
      if (!key) return false;
      save.savedAt = Date.now();
      save.version = SCHEMA_VERSION;
      var ok = writeJSON(key, save);
      if (ok) writeMetaFor(slot, save);
      return ok;
    },

    // Autosave hook — call on room boundaries (map enter, node clear, reward, rest/event).
    autosave: function (save) { return this.save("auto", save); },

    load: function (slot) {
      slot = normSlot(slot);
      var key = SLOT_KEYS[slot];
      if (!key) return null;
      var raw = readJSON(key);
      if (!raw) return null;
      return migrate(raw);
    },

    has: function (slot) { slot = normSlot(slot); var key = SLOT_KEYS[slot]; return !!(key && readJSON(key)); },

    deleteSlot: function (slot) {
      slot = normSlot(slot);
      var key = SLOT_KEYS[slot];
      if (!key) return;
      removeKey(key);
      writeMetaFor(slot, null);
    },

    // Returns [{slot, key, summary|null, exists}] for the Load Game UI.
    listSlots: function () {
      var meta = readMeta();
      var out = [];
      ["auto", 0, 1, 2].forEach(function (slot) {
        var key = SLOT_KEYS[slot];
        var exists = !!readJSON(key);
        out.push({ slot: slot, key: key, exists: exists, summary: exists ? (meta[slot] || summarize(readJSON(key))) : null });
      });
      return out;
    },

    // "Continue" — most-recent autosave (§7.2).
    continueGame: function () { return this.load("auto"); },
    hasContinue: function () { return this.has("auto"); },

    // ---- Compendium unlock set (separate key, persists across runs, §9.2) ----
    getCodex: function () { return readJSON(CODEX_KEY) || { enemiesSeen: [], enemiesDefeated: [], cardsSeen: [] }; },
    saveCodex: function (codex) { return writeJSON(CODEX_KEY, codex); },

    // ---- Settings (audio/mute/reduceMotion/language) ----
    getSettings: function () { return getSettings(); },
    saveSettings: function (s) { return writeJSON(SETTINGS_KEY, s); },

    resetAll: function () {
      ["auto", 0, 1, 2].forEach(function (slot) { removeKey(SLOT_KEYS[slot]); });
      removeKey(META_KEY);
      // codex + settings are intentionally NOT wiped by a save reset; expose
      // a separate hard reset if ever needed.
    },
  };

  function getSettings() {
    var s = readJSON(SETTINGS_KEY);
    if (s) return s;
    var muted = false;
    try { muted = window.localStorage.getItem("squid_mute") === "1"; } catch (e) {}
    return { muted: muted, musicVol: 0.16, sfxVol: 0.32, reduceMotion: false, language: "en" };
  }

  Squid.Save = Save;
})();
