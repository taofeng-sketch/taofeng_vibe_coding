#!/usr/bin/env node
/* =============================================================================
 * Combat engine Monte Carlo — many random fights, multi-enemy encounters.
 * Usage: node tests/combat_sim_test.js
 * ============================================================================= */
"use strict";

var path = require("path");
var fs = require("fs");

global.window = { Squid: {} };
var Squid = global.window.Squid;

function load(rel) {
  eval(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
}

load("data/cards.js");
load("data/enemies.js");
load("data/encounters.js");
load("src/engine/combat.js");

var encounters = [
  { label: "solo bug", opts: { enemyId: "bug_swarm" } },
  { label: "duo bugs", opts: { encounterId: "duo_bug_swarm" } },
  { label: "xfn spat", opts: { encounterId: "xfn_spat" } },
  { label: "standup chaos", opts: { encounterId: "standup_chaos" } },
  { label: "product review", opts: { encounterId: "product_review_meeting" } },
];

var seed = 7;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; }

function playRandomTurn(engine, maxPlays) {
  var plays = 0;
  while (plays < maxPlays && !engine.over) {
    var playable = [];
    for (var i = 0; i < engine.hand.length; i++) {
      if (engine.canPlay(i)) playable.push(i);
    }
    if (!playable.length) break;
    var pick = playable[Math.floor(rnd() * playable.length)];
    engine.playCard(pick, engine.target);
    engine.drainFx();
    plays++;
  }
  if (!engine.over && engine.endTurn().ok) {
    engine.drainFx();
    engine.enemyTurn();
    engine.drainFx();
  }
}

var passed = 0;
var failed = 0;
var RUNS_PER = 40;

console.log("=== Combat sim tests (" + (encounters.length * RUNS_PER) + " fights) ===\n");

encounters.forEach(function (enc) {
  for (var r = 0; r < RUNS_PER; r++) {
    try {
      var engine = new Squid.CombatEngine(enc.opts);
      engine.start();
      var turns = 0;
      while (!engine.over && turns < 40) {
        playRandomTurn(engine, 3 + Math.floor(rnd() * 4));
        turns++;
      }
      var multi = engine.enemies.length > 1;
      var ended = engine.over === "win" || engine.over === "lose" || turns >= 40;
      if (!ended) {
        failed++;
        console.error("FAIL:", enc.label, "run", r, "— no terminal state, enemies=" + engine.enemies.length);
      } else {
        passed++;
      }
      if (multi && engine.enemies.length < 2) {
        failed++;
        console.error("FAIL:", enc.label, "— lost multi-enemy flag");
      }
    } catch (e) {
      failed++;
      console.error("FAIL:", enc.label, "run", r, e.message);
    }
  }
  console.log("  ✓ " + enc.label + " ×" + RUNS_PER);
});

console.log("\n--- Results: " + passed + " passed, " + failed + " failed ---");
process.exit(failed > 0 ? 1 : 0);
