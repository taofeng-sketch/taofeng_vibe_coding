/* =============================================================================
 * V3 UI — LAYOUT indirection  (per plan §11.7 — the anti-corner discipline)
 * Single source for ALL screen positions, keyed by orientation. Scenes read
 * coords from here; NO hardcoded x/y in scene logic. `landscape` is filled now
 * (1280x720). `portrait` (720x1280) is stubbed for M6 — swap the design size
 * and this map, and the same scenes reflow without a rewrite.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var LANDSCAPE = {
    design: { width: 1280, height: 720 },
    orientation: "landscape",
    // Generic helpers used across scenes
    center: { x: 640, y: 360 },
    title: { x: 640, y: 120 },
    subtitle: { x: 640, y: 176 },
    footnote: { x: 640, y: 690 },
    // MainMenu vertical button stack
    menu: {
      logo: { x: 640, y: 110 },
      tagline: { x: 640, y: 168 },
      buttonStart: { x: 640, y: 280 },
      buttonGap: 66,
      buttonSize: { w: 320, h: 52 },
      version: { x: 1264, y: 700, origin: { x: 1, y: 1 } },
      audioBtn: { x: 32, y: 32 },
    },
    // Map scene: header + branching CLIMB graph coords (M4). Node (row,col) ->
    // (x,y): row 0 sits at bottomY (start), the top row at topY (VP office).
    // col 0/1/2 -> cols[0/1/2]. No hardcoded x/y in scene logic (§11.7).
    map: {
      header: { x: 40, y: 30 },
      pulse: { x: 1240, y: 30, origin: { x: 1, y: 0.5 } },
      banner: { x: 640, y: 96 },
      listTop: { x: 640, y: 160 },
      rowGap: 64,
      climb: {
        topY: 150,
        bottomY: 648,
        cols: [392, 640, 888],
        nodeR: 27,
        vpLabel: { x: 640, y: 78 },
        levelUp: { x: 640, y: 300 },
        hint: { x: 640, y: 700 },
      },
    },
    // Combat scene: enemy row (left->right) + player anchor + hand fan
    combat: {
      actLabel: { x: 40, y: 28 },
      turnLabel: { x: 1240, y: 28, origin: { x: 1, y: 0.5 } },
      // up to 3 enemy slots in a row (4 hard cap) — see §3.1
      enemySlots: [
        { x: 420, y: 250 },
        { x: 640, y: 250 },
        { x: 860, y: 250 },
      ],
      enemySlots4: [
        { x: 360, y: 250 },
        { x: 560, y: 250 },
        { x: 760, y: 250 },
        { x: 960, y: 250 },
      ],
      player: { x: 200, y: 470 },
      playerStats: { x: 360, y: 430 },
      log: { x: 640, y: 372 },
      handCenter: { x: 700, y: 612 },
      handSpread: 132, // px between card centers when fanning along bottom
      cardSize: { w: 142, h: 196 },
      drawPile: { x: 60, y: 624 },
      discardPile: { x: 1224, y: 624, origin: { x: 1, y: 0.5 } },
      endTurn: { x: 1160, y: 540 },
    },
    // Generic modal (Reward/Rest/Event/GameOver/Win placeholders)
    modal: {
      panel: { x: 640, y: 360, w: 820, h: 460 },
      title: { x: 640, y: 200 },
      body: { x: 640, y: 300 },
      choiceTop: { x: 640, y: 380 },
      choiceGap: 60,
    },
    // Compendium grid
    compendium: {
      tabs: { x: 640, y: 70 },
      gridTop: { x: 200, y: 160 },
      cell: { w: 150, h: 150 },
      cols: 6,
      counter: { x: 1240, y: 36, origin: { x: 1, y: 0.5 } },
    },
  };

  // Portrait stub (M6). Design size flips; coords intentionally left minimal so
  // it's obvious this is not yet authored. Enemy row -> column, hand -> peek
  // strip (plan §11.7). DO NOT author portrait art/UI now.
  var PORTRAIT = {
    design: { width: 720, height: 1280 },
    orientation: "portrait",
    _stub: true,
    center: { x: 360, y: 640 },
  };

  var LAYOUT = {
    landscape: LANDSCAPE,
    portrait: PORTRAIT,
    active: "landscape",
    get: function (orientation) { return this[orientation || this.active] || LANDSCAPE; },
  };

  Squid.LAYOUT = LAYOUT;
})();
