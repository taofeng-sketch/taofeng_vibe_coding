/* =============================================================================
 * V3 UI — Hand layout math (pure, testable)
 * Single source for fan positions + spread. Combat.relayout() delegates here so
 * Node tests can run hundreds of iterations without Phaser.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  /**
   * Compute px between card centers for n cards in the hand panel.
   * Goals: even spacing, no visual "hole" in the middle, cards overlap enough
   * to read as one continuous fan (StS-style).
   */
  function handSpread(n, L) {
    if (!n || n <= 1) return 0;
    L = L || (Squid.LAYOUT && Squid.LAYOUT.get().combat) || {};
    var cardW = (L.cardSize && L.cardSize.w) || 142;
    var panelW = (L.handPanel && L.handPanel.w) || 920;
    var base = L.handSpread || 136;
    // Keep at least ~42% overlap so the fan never "breaks apart"
    var minOverlapSpread = cardW * 0.58;
    var densityCap = 920 / n;

    // Small hands stay CLUSTERED near center — spreading 2–3 cards across the
    // full panel is what caused the visible "hole in the middle" after plays.
    if (n <= 4) {
      return Math.min(base, densityCap, minOverlapSpread + (n - 2) * 20);
    }

    var fillSpread = (panelW - cardW) / (n - 1);
    return Math.min(base, fillSpread, densityCap, Math.max(minOverlapSpread, fillSpread * 0.92));
  }

  /** @returns {{ spread, startX, positions: {x,y,angle,arc}[] }} */
  function computeHandLayout(n, L) {
    L = L || (Squid.LAYOUT && Squid.LAYOUT.get().combat) || {};
    if (!n) return { spread: 0, startX: L.handCenter ? L.handCenter.x : 640, positions: [] };
    var spread = handSpread(n, L);
    var total = (n - 1) * spread;
    var cx = (L.handCenter && L.handCenter.x) || 640;
    var cy = (L.handCenter && L.handCenter.y) || 600;
    var startX = cx - total / 2;
    var positions = [];
    for (var i = 0; i < n; i++) {
      var off = i - (n - 1) / 2;
      var arc = Math.abs(off) * Math.abs(off) * 2.6;
      positions.push({
        x: startX + i * spread,
        y: cy + arc,
        angle: off * 3.2,
        arc: arc,
        index: i,
      });
    }
    return { spread: spread, startX: startX, centerX: cx, positions: positions };
  }

  /**
   * Validate layout invariants. Returns { ok, errors[], gaps[], maxGap }.
   * maxGap = largest horizontal gap between adjacent card bounding boxes.
   */
  function validateHandLayout(n, L) {
    L = L || (Squid.LAYOUT && Squid.LAYOUT.get().combat) || {};
    var errors = [];
    if (!n) return { ok: true, errors: errors, gaps: [], maxGap: 0 };
    var layout = computeHandLayout(n, L);
    var cardW = (L.cardSize && L.cardSize.w) || 142;
    var positions = layout.positions;
    var gaps = [];

    if (n > 1) {
      for (var i = 0; i < n - 1; i++) {
        var dx = positions[i + 1].x - positions[i].x;
        if (Math.abs(dx - layout.spread) > 0.01) {
          errors.push("uneven spacing at " + i + ": dx=" + dx + " spread=" + layout.spread);
        }
        // gap between right edge of card i and left edge of card i+1
        var gap = (positions[i + 1].x - cardW / 2) - (positions[i].x + cardW / 2);
        gaps.push(gap);
        if (gap > 8) errors.push("visual hole at " + i + ": gap=" + gap.toFixed(1) + "px");
      }
    }

    // hand should be centered on handCenter.x
    if (n > 0) {
      var mid = (positions[0].x + positions[n - 1].x) / 2;
      if (Math.abs(mid - layout.centerX) > 1) {
        errors.push("off-center: mid=" + mid + " want=" + layout.centerX);
      }
    }

    var maxGap = gaps.length ? Math.max.apply(null, gaps) : 0;
    return { ok: errors.length === 0, errors: errors, gaps: gaps, maxGap: maxGap, layout: layout };
  }

  /** Tile bounds for card i (world coords) — mirrors Combat.handTileBounds */
  function handTileBounds(i, n, L) {
    L = L || (Squid.LAYOUT && Squid.LAYOUT.get().combat) || {};
    if (i < 0 || i >= n) return null;
    var layout = computeHandLayout(n, L);
    var spread = layout.spread;
    var cw = (L.cardSize && L.cardSize.w) || 142;
    var ch = (L.cardSize && L.cardSize.h) || 196;
    var cy = (L.handCenter && L.handCenter.y) || 600;
    var tx = layout.positions[i].x;
    var left = (i === 0) ? tx - cw / 2 : tx - spread / 2;
    var right = (i === n - 1) ? tx + cw / 2 : tx + spread / 2;
    return { left: left, right: right, top: cy - ch / 2 - 24, bottom: cy + ch / 2 + 36, tx: tx };
  }

  /** Simulate playing cards from hand sizes 5->0 and validate after each step */
  function stressPlaySequence(startN, playOrder, L) {
    var results = [];
    var n = startN;
    for (var s = 0; s < playOrder.length; s++) {
      var v = validateHandLayout(n, L);
      results.push({ step: s, handSize: n, ok: v.ok, maxGap: v.maxGap, errors: v.errors.slice() });
      if (!v.ok) break;
      n--;
      if (n < 0) break;
    }
    if (n >= 0) {
      var final = validateHandLayout(n, L);
      results.push({ step: playOrder.length, handSize: n, ok: final.ok, maxGap: final.maxGap, errors: final.errors.slice() });
    }
    return results;
  }

  Squid.HandLayout = {
    handSpread: handSpread,
    compute: computeHandLayout,
    validate: validateHandLayout,
    tileBounds: handTileBounds,
    stressPlaySequence: stressPlaySequence,
  };
})();
