/* =============================================================================
 * V3 DATA — CARDS  (ported verbatim from v2 game.js, plus V3 fields)
 * Plain JS data module. No bundler: attaches to the global Squid namespace.
 * New per-card fields per V3 plan Appendix A: `targeting`, `fx`, `art`.
 * The `effect(g)` signatures are kept intact for the future group-aware engine
 * (M2+). The foundation (M0/M1) does NOT execute them — data only.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // targeting: "single" | "all" | "self"  ·  fx: "slash" | "guard" | "buff" | "cast"
  var CARDS = {
    // ---- SWE starter ----
    fix_bug: { id: "fix_bug", name: "Fix Bug", cost: 2, type: "attack", glyph: "</>", targeting: "single", fx: "slash", art: "card_fix_bug", text: "Deal 8 damage.", effect: function (g) { g.dealDamage(8); } },
    refactor: { id: "refactor", name: "Refactor", cost: 1, type: "skill", glyph: "{}", targeting: "self", fx: "guard", art: "card_refactor", text: "Gain 6 Block.", effect: function (g) { g.gainBlock(6); } },
    write_unit_test: { id: "write_unit_test", name: "Write Unit Test", cost: 1, type: "skill", glyph: "[v]", targeting: "self", fx: "guard", art: "card_write_unit_test", text: "Gain 5 Block. Draw 1.", effect: function (g) { g.gainBlock(5); g.draw(1); } },
    coffee: { id: "coffee", name: "Coffee", cost: 0, type: "skill", glyph: "(c)", targeting: "self", fx: "buff", art: "card_coffee", text: "Gain 3 Working Hours. Lose 2 Pulse.", effect: function (g) { g.gainHours(3); g.losePulse(2); } },
    push_to_prod: { id: "push_to_prod", name: "Push to Prod", cost: 2, type: "attack", glyph: ">>", targeting: "single", fx: "slash", art: "card_push_to_prod", text: "Deal 14. Shuffle a Tech Debt into draw pile.", effect: function (g) { g.dealDamage(14); g.shuffleIntoDraw("tech_debt"); } },
    // ---- reward pool ----
    hotfix: { id: "hotfix", name: "Hotfix", cost: 1, type: "attack", glyph: "!!", rarity: "common", targeting: "single", fx: "slash", art: "card_hotfix", text: "Deal 10. If lethal, deal 6 more.", effect: function (g) { var b = g.enemy.hp; g.dealDamage(10); if (g.enemy.hp <= 0 && b > 0) g.dealDamage(6); } },
    pair_program: { id: "pair_program", name: "Pair Program", cost: 1, type: "skill", glyph: "<>", rarity: "common", targeting: "self", fx: "guard", art: "card_pair_program", text: "Gain 9 Block. Draw 1.", effect: function (g) { g.gainBlock(9); g.draw(1); } },
    stand_up: { id: "stand_up", name: "Ask in Workplace", cost: 1, type: "skill", glyph: "@", rarity: "common", targeting: "self", fx: "buff", art: "card_stand_up", text: "Draw 2 cards.", effect: function (g) { g.draw(2); } },
    work_late: { id: "work_late", name: "Work Late", cost: 1, type: "skill", glyph: "zZ", rarity: "common", targeting: "self", fx: "buff", art: "card_work_late", text: "Gain 4 Working Hours. Draw 1. Lose 4 Pulse.", effect: function (g) { g.gainHours(4); g.draw(1); g.losePulse(4); } },
    deep_work: { id: "deep_work", name: "Deep Work", cost: 2, type: "skill", glyph: "**", rarity: "uncommon", targeting: "self", fx: "buff", art: "card_deep_work", text: "Gain 2 Focus. Draw 1.", effect: function (g) { g.gainFocus(2); g.draw(1); } },
    rubber_duck: { id: "rubber_duck", name: "Rubber Duck", cost: 0, type: "skill", glyph: "qk", rarity: "common", targeting: "self", fx: "buff", art: "card_rubber_duck", text: "Gain 1 Focus.", effect: function (g) { g.gainFocus(1); } },
    ship_it: { id: "ship_it", name: "Ship It", cost: 2, type: "attack", glyph: "^^", rarity: "uncommon", targeting: "single", fx: "slash", art: "card_ship_it", text: "Deal 7, plus 5 per Focus. Spend Focus.", effect: function (g) { var f = g.player.focus; g.dealDamage(7 + 5 * f); g.player.focus = 0; } },
    run_experiment: { id: "run_experiment", name: "Run Experiment", cost: 2, type: "attack", glyph: "AB", rarity: "uncommon", metric: true, targeting: "single", fx: "cast", art: "card_run_experiment", text: "50%: Deal 26. 50%: 'Not stat sig' \u2014 Weak 1 to self.", effect: function (g) { if (Math.random() < 0.5) { g.dealDamage(26); g.log("The data is undeniable. Deal 26."); } else { g.addStatus("player", "weak", 1); g.log("\u201CNot statistically significant.\u201D Weak 1."); } } },
    move_metric: { id: "move_metric", name: "Move the Metric", cost: 2, type: "attack", glyph: "MM", rarity: "uncommon", metric: true, targeting: "single", fx: "cast", art: "card_move_metric", text: "Deal 8, plus 5 per Focus. Spend Focus.", effect: function (g) { var f = g.player.focus; g.dealDamage(8 + 5 * f); g.player.focus = 0; } },
    mentorship: { id: "mentorship", name: "Mentorship", cost: 1, type: "skill", glyph: "+1", rarity: "common", targeting: "self", fx: "buff", art: "card_mentorship", text: "Heal 12 Pulse.", effect: function (g) { g.healPulse(12); } },
    touch_grass: { id: "touch_grass", name: "Touch Grass", cost: 1, type: "skill", glyph: "~~", rarity: "common", targeting: "self", fx: "buff", art: "card_touch_grass", text: "Remove all Burnout. Heal 7 Pulse.", effect: function (g) { g.player.status.burnout = 0; g.healPulse(7); } },
    deprecate: { id: "deprecate", name: "Deprecate It", cost: 3, type: "attack", glyph: "xx", rarity: "uncommon", exhaust: true, targeting: "single", fx: "slash", art: "card_deprecate", text: "Deal 22 damage. Exhaust.", effect: function (g) { g.dealDamage(22); } },
    focus_sprint: { id: "focus_sprint", name: "Focus Sprint", cost: 2, type: "power", glyph: "=>", rarity: "uncommon", targeting: "self", fx: "buff", art: "card_focus_sprint", text: "Power: gain 1 Focus at the start of each turn.", effect: function (g) { g.player.powers.focusSprint += 1; g.log("Focus Sprint online: +1 Focus / turn."); } },
    caffeinate: { id: "caffeinate", name: "Caffeinate", cost: 1, type: "skill", glyph: "++", rarity: "common", targeting: "self", fx: "buff", art: "card_caffeinate", text: "Gain 2 Working Hours and Motivated 1 (next attack +50%).", effect: function (g) { g.gainHours(2); g.addStatus("player", "motivated", 1); } },
    // ---- junk ----
    tech_debt: { id: "tech_debt", name: "Tech Debt", cost: 1, type: "status", glyph: "##", unplayable: true, targeting: "self", fx: "cast", art: "card_tech_debt", text: "Unplayable. While in hand, lose 2 Pulse at end of turn.", effect: function () {} },
  };

  var REWARD_POOL = ["hotfix", "pair_program", "stand_up", "work_late", "deep_work", "rubber_duck", "ship_it", "run_experiment", "move_metric", "mentorship", "touch_grass", "deprecate", "focus_sprint", "caffeinate"];
  var STARTER_DECK = ["fix_bug", "fix_bug", "fix_bug", "fix_bug", "refactor", "refactor", "refactor", "write_unit_test", "coffee", "push_to_prod"];

  Squid.CARDS = CARDS;
  Squid.REWARD_POOL = REWARD_POOL;
  Squid.STARTER_DECK = STARTER_DECK;
})();
