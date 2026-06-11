#!/usr/bin/env node
/* =============================================================================
 * Hand layout unit tests — run many iterations without Phaser.
 * Usage: node tests/hand_layout_test.js
 * ============================================================================= */
"use strict";

var path = require("path");
var fs = require("fs");

// Minimal Squid stub so hand_layout.js can load in Node
global.window = { Squid: {} };
var Squid = global.window.Squid;

// Load layout data (no Phaser deps)
eval(fs.readFileSync(path.join(__dirname, "../src/ui/layout.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "../src/ui/hand_layout.js"), "utf8"));

var HL = Squid.HandLayout;
var L = Squid.LAYOUT.get().combat;
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; return; }
  failed++;
  console.error("FAIL:", msg);
}

console.log("=== Hand layout unit tests ===\n");

// 1) Every hand size 1..10 should be valid
for (var n = 1; n <= 10; n++) {
  var v = HL.validate(n, L);
  assert(v.ok, "hand size " + n + " valid (maxGap=" + v.maxGap + ") " + v.errors.join("; "));
}

// 2) Stress: simulate playing from 5,4,3,2 cards (all play orders from center-out)
var orders = [
  [2, 2, 1, 0],       // always play middle
  [0, 0, 0, 0],       // always play left
  [3, 2, 1, 0],       // play right to left (5-card hand indices before removal)
  [1, 1, 0, 0],       // play second card repeatedly
];
orders.forEach(function (order, oi) {
  var seq = HL.stressPlaySequence(5, order, L);
  var bad = seq.filter(function (r) { return !r.ok; });
  assert(bad.length === 0, "stress order #" + oi + " — " + (bad[0] && bad[0].errors.join("; ")));
});

// 3) Monte Carlo: 200 random hand sizes + random play counts
var seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
for (var trial = 0; trial < 200; trial++) {
  var hn = 1 + Math.floor(rnd() * 10);
  var v2 = HL.validate(hn, L);
  assert(v2.ok, "trial " + trial + " size " + hn);
  // tile bounds should tile without holes
  if (hn > 1) {
    for (var ti = 0; ti < hn - 1; ti++) {
      var b0 = HL.tileBounds(ti, hn, L);
      var b1 = HL.tileBounds(ti + 1, hn, L);
      assert(b0.right >= b1.left - 1, "tile overlap trial " + trial + " i=" + ti);
    }
  }
}

// 4) Large hands (5+): more cards => tighter spread
var prevSp = Infinity;
for (var c = 5; c <= 10; c++) {
  var sp = HL.handSpread(c, L);
  assert(sp <= prevSp + 0.01, "spread should not grow with more cards: n=" + c + " sp=" + sp);
  prevSp = sp;
}
// 5) Small hands (2–4) stay clustered — spread stays below base
for (var s = 2; s <= 4; s++) {
  assert(HL.handSpread(s, L) < L.handSpread, "small hand n=" + s + " should cluster below base spread");
}

console.log("\n--- Results: " + passed + " passed, " + failed + " failed ---");
process.exit(failed > 0 ? 1 : 0);
