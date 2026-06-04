/* =============================================================================
 * V3 DATA — ENEMIES  (ported verbatim from v2 game.js, plus V3 fields)
 * New per-enemy fields per V3 plan Appendix A: `aiRole`, `slot`, anim keys.
 * `lore` lives in data/lore.js (a separate view layer for the Compendium).
 * `plan(g, e)` signatures kept intact for the future combat engine (M2+).
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // intent factory helpers (ported from v2)
  function atk(label, value) { return { kind: "attack", value: value, label: label, exec: function (g) { g.enemyAttack(value, label); } }; }
  function def(label, value) { return { kind: "defend", value: value, label: label, exec: function (g) { g.enemy.block += value; g.log(g.enemy.name + ": " + label + " (+" + value + " Block)"); } }; }

  var ENEMIES = {
    bug_swarm: {
      id: "bug_swarm", name: "Bug Swarm", sprite: "enemy_bug.png", art: "enemy_bug", glyph: "\uD83D\uDC1B", maxHp: 55, tier: "normal", aiRole: "bruiser", slot: 0,
      anims: { idle: "enemy_bug_idle", attack: "enemy_bug_attack", hurt: "enemy_bug_hurt" }, taunt: "Time to fix this.",
      plan: function (g, e) { e._t = (e._t || 0) + 1; if (e._t % 3 === 0) return { kind: "special", value: 6, label: "Spread to Prod", exec: function (gg) { gg.enemyAttack(6, "Spread to Prod"); gg.shuffleIntoDiscard("tech_debt"); gg.log("A Tech Debt slips into your discard pile."); } }; return atk("Infect Code", 10); },
    },
    legacy_service: {
      id: "legacy_service", name: "Legacy Service", sprite: "enemy_legacy.png", art: "enemy_legacy", glyph: "\uD83D\uDDC4\uFE0F", maxHp: 85, tier: "normal", aiRole: "tank", slot: 0,
      anims: { idle: "enemy_legacy_idle", attack: "enemy_legacy_attack", hurt: "enemy_legacy_hurt" }, taunt: "Nobody knows how I work. Do not touch me.",
      plan: function (g, e) { e._t = (e._t || 0) + 1; return e._t % 2 === 1 ? def("Add a Layer of Abstraction", 14) : atk("Cascading Failure", 20); },
    },
    pm_align: {
      id: "pm_align", name: "PM Who Says 'Let's Align'", sprite: "enemy_pm.png", art: "enemy_pm", glyph: "\uD83E\uDDD1\u200D\uD83D\uDCBC", maxHp: 70, tier: "normal", aiRole: "controller", slot: 0,
      anims: { idle: "enemy_pm_idle", attack: "enemy_pm_attack", hurt: "enemy_pm_hurt" }, taunt: "Quick one \u2014 is this aligned with the roadmap?",
      plan: function (g, e) { e._t = (e._t || 0) + 1; var r = e._t % 3; if (r === 1) return { kind: "debuff", value: 2, label: "Let's Align", exec: function (gg) { gg.addStatus("player", "weak", 2); gg.log("PM: \u201CLet's align.\u201D You feel Weak."); } }; if (r === 2) return { kind: "special", value: 0, label: "Need More Context", exec: function (gg) { gg.enemyDiscardRandom(); gg.log("PM: \u201CCan you add more context?\u201D A card is discarded."); } }; return atk("Circle Back", 13); },
    },
    ds_skeptic: {
      id: "ds_skeptic", name: "DS Who Disagrees With Your Metric", sprite: "enemy_ds.png", art: "enemy_ds", glyph: "\u03A3", maxHp: 75, tier: "normal", aiRole: "denier", slot: 0,
      anims: { idle: "enemy_ds_idle", attack: "enemy_ds_attack", hurt: "enemy_ds_hurt" }, taunt: "Have you considered that your metric is noise?",
      plan: function (g, e) { e._t = (e._t || 0) + 1; var r = e._t % 3; if (r === 1) return { kind: "debuff", value: 2, label: "Not Stat Sig", exec: function (gg) { gg.addStatus("player", "weak", 2); gg.log("DS: \u201CNot stat sig.\u201D Weak 2."); } }; if (r === 2) return { kind: "special", value: 9, label: "Need More Experimentation", exec: function (gg) { gg.enemyAttack(9, "Need More Experimentation"); gg.addStatus("player", "weak", 1); } }; return atk("Confidence Interval", 14); },
    },
    eng_manager: {
      // bruiser (plan §3.3 / §3.4): big single-target hit, +50% vs a Weak/Marked
      // target so it consumes the PM controller's setup. Has its own dedicated
      // pixel sprite (enemy_manager.png); glyph is the gray-box fallback only.
      id: "eng_manager", name: "Engineering Manager", sprite: "enemy_manager.png", art: "enemy_manager", glyph: "\uD83D\uDCAA", maxHp: 64, tier: "normal", aiRole: "bruiser", slot: 0,
      anims: { idle: "enemy_manager_idle", attack: "enemy_manager_attack", hurt: "enemy_manager_hurt" }, taunt: "Let's circle back offline.",
      plan: function (g, e) {
        // Standalone (solo / fallback) bruiser logic. In the Product Review group
        // the encounter's planGroup overrides this with the coordinated version.
        e._t = (e._t || 0) + 1;
        if (e._t % 3 === 0) return def("Set Expectations", 12);
        var setup = g.player.status.weak > 0 || g.player.status.marked > 0;
        var base = 12, amt = setup ? Math.floor(base * 1.5) : base;
        return { kind: "attack", value: amt, label: "Circle Back Offline", boosted: setup, exec: function (gg) {
          var s = gg.player.status.weak > 0 || gg.player.status.marked > 0;
          gg.enemyAttack(s ? Math.floor(base * 1.5) : base, "Circle Back Offline");
        } };
      },
    },
    half_year: {
      id: "half_year", name: "Half-Year Check-In", sprite: "boss_halfyear.png", art: "boss_halfyear", glyph: "\uD83D\uDCCB", maxHp: 115, tier: "elite", aiRole: "boss", slot: 0,
      anims: { idle: "boss_halfyear_idle", attack: "boss_halfyear_attack", hurt: "boss_halfyear_hurt" }, taunt: "Overall, great progress \u2014 but a few growth areas.",
      plan: function (g, e) { e._t = (e._t || 0) + 1; var r = e._t % 3; if (r === 1) return atk("Constructive Feedback", 14); if (r === 2) return { kind: "debuff", value: 2, label: "Needs Improvement", exec: function (gg) { gg.addStatus("player", "burnout", 2); gg.log("\u201CNeeds improvement.\u201D Burnout 2 applied."); } }; return atk("Raised Expectations", 10); },
    },
    calibration_council: {
      id: "calibration_council", name: "Calibration Council", sprite: "boss_calibration.png", art: "boss_calibration", glyph: "\u2696\uFE0F", maxHp: 155, tier: "boss", aiRole: "boss", slot: 0,
      anims: { idle: "boss_calibration_idle", attack: "boss_calibration_attack", hurt: "boss_calibration_hurt" }, taunt: "Let's calibrate. Did they really operate at the next level?",
      plan: function (g, e) {
        e._t = (e._t || 0) + 1; var r = e._t % 4;
        if (r === 1) return { kind: "debuff", value: 1, label: "Needs More Scope", exec: function (gg) { gg.addStatus("player", "confused", 1); gg.log("\u201CNeeds more scope.\u201D Your next card will fizzle."); } };
        if (r === 2) return atk("Not Aligned", 20);
        if (r === 3) return { kind: "special", value: 14, label: "What's the Incrementality?", exec: function (gg) { var m = gg.hand.some(function (c) { return Squid.CARDS[c].metric; }); var d = m ? 14 : 27; if (!m) gg.log("No metric in hand. The damage is DOUBLED."); gg.enemyAttack(d, "What's the Incrementality?"); } };
        return def("Stack Ranking", 16);
      },
    },
  };

  Squid.ENEMIES = ENEMIES;
})();
