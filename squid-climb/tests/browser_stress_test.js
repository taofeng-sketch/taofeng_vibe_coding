#!/usr/bin/env node
/* =============================================================================
 * Browser stress — run N combat sessions, validate hand layout after each play.
 * Requires: python3 -m http.server 8642 in game root.
 * Usage: node tests/browser_stress_test.js [runs=25]
 * ============================================================================= */
"use strict";

var RUNS = parseInt(process.argv[2] || "25", 10);
var PORT = 8642;

async function main() {
  var playwright;
  try { playwright = require("playwright"); } catch (e) {
    console.error("Install playwright: npm i -D playwright (or run via MCP)");
    process.exit(2);
  }

  var browser = await playwright.chromium.launch({ headless: true });
  var page = await browser.newPage();
  var failures = [];
  var passes = 0;

  for (var run = 0; run < RUNS; run++) {
    await page.goto("http://localhost:" + PORT + "/index.html?stress=" + run, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    var result = await page.evaluate(function (playIdx) {
      return new Promise(function (resolve) {
        var S = window.Squid;
        if (!S || !S.Save) { resolve({ ok: false, err: "Squid not booted" }); return; }
        S.activeSave = S.Save.newGame({ cls: "swe" });
        var st = S.Save.getSettings(); st.introSeen = true; S.Save.saveSettings(st);
        S.FX.go(S.game.scene.getScene("MainMenu"), "Map");
        setTimeout(function () {
          S.__map.debugSelectFirstReachable();
          setTimeout(function () {
            if (S.__roomIntro) S.__roomIntro.debugBegin();
            setTimeout(function () {
              var c = S.__combat;
              if (!c) { resolve({ ok: false, err: "no combat" }); return; }
              var checks = [];
              function check(label) {
                var v = c.debugValidateHand();
                checks.push({ label: label, ok: v.ok, errors: v.errors, handSize: v.handSize, maxGap: v.maxGap });
              }
              check("opening");
              // play up to 4 cards from varied indices
              var indices = [0, Math.floor(c.handViews.length / 2), 0, 1];
              var played = 0;
              function playNext(i) {
                if (i >= indices.length || c.locked || c.engine.over) {
                  check("final");
                  resolve({ ok: checks.every(function (x) { return x.ok; }), checks: checks, enemies: c.engine.enemies.length, playIdx: playIdx });
                  return;
                }
                var idx = indices[i] % Math.max(1, c.handViews.length);
                if (c.engine.canPlay(idx)) {
                  c.playCardAt(idx);
                  setTimeout(function () {
                    if (!c.locked) { check("after play " + i); playNext(i + 1); }
                    else setTimeout(function () { if (!c.locked) { check("after play " + i); playNext(i + 1); } else playNext(i + 1); }, 800);
                  }, 900);
                } else {
                  playNext(i + 1);
                }
              }
              if (!c.locked) playNext(0);
              else setTimeout(function () { check("dealt"); playNext(0); }, 2000);
            }, 2600);
          }, 1400);
        }, 1600);
      });
    }, run);

    if (result.ok) {
      passes++;
      process.stdout.write(".");
    } else {
      failures.push({ run: run, result: result });
      process.stdout.write("X");
    }
  }

  console.log("\n--- Browser stress: " + passes + "/" + RUNS + " passed ---");
  if (failures.length) {
    failures.slice(0, 3).forEach(function (f) {
      console.error("Run", f.run, JSON.stringify(f.result, null, 2));
    });
  }
  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
