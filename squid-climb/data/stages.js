/* =============================================================================
 * V3 DATA — STAGES / branching CLIMB MAP + IC ladder + lose/win lines
 *
 * M4 (plan §11.1 Map, §4 difficulty ramp, "map/ladder visual"): the climb is a
 * branching, Slay-the-Spire-style path authored as ROWS of NODES with explicit
 * BRANCHING EDGES (`next`). Bottom row = the start (IC3, Onboarding); the top row
 * = the VP office (Calibration Council). Every complete path traverses one node
 * per row, so the IC ladder advances exactly one rung per cleared node.
 *
 * The map is DATA so it stays tunable (procedural generation is OUT of V1 per
 * §13.4). Node types: combat / elite / rest / event / boss. The Product Review
 * Meeting (M3, 3-enemy coordinated) sits at Act III early and the bosses
 * (Half-Year Check-In = Act I capstone elite; Calibration Council = finale) sit
 * at the tiers the §4 ramp prescribes.
 *
 * `Squid.MapModel` is a tiny, framework-agnostic helper the Map scene + the
 * resolve scenes (Reward/Rest/Event/Combat) use to read reachable/cleared/locked
 * state and to advance progress. Progress persists in the save (run.map).
 *
 * The legacy linear `STAGES` array is kept for back-compat display only.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // ---- legacy linear stages (kept for back-compat / reference) --------------
  var STAGES = [
    { act: "Act I \u2014 Onboarding", nodes: [{ type: "combat", enemy: "bug_swarm", label: "Fix the Bug" }] },
    { act: "Act I \u2014 The System", nodes: [{ type: "combat", enemy: "legacy_service", label: "Touch the Legacy Service" }, { type: "event", id: "oncall", label: "On-Call Shift" }] },
    { act: "Act I \u2014 Breather", nodes: [{ type: "rest", label: "Rest Stop" }] },
    { act: "Act I \u2014 Boss", nodes: [{ type: "elite", enemy: "half_year", label: "Half-Year Check-In" }] },
    { act: "Act II \u2014 XFN Chaos", nodes: [{ type: "combat", enemy: "pm_align", label: "Argue with a PM" }, { type: "combat", enemy: "ds_skeptic", label: "Defend your Metric vs DS" }] },
    { act: "Act II \u2014 Politics", nodes: [{ type: "event", id: "reorg", label: "Reorg Event" }, { type: "combat", enemy: "legacy_service", label: "More Legacy Code" }] },
    { act: "Act III \u2014 Product Review", nodes: [{ type: "combat", encounter: "product_review_meeting", label: "Product Review Meeting (3 \u2014 coordinated)" }] },
    { act: "Act II \u2014 Breather", nodes: [{ type: "rest", label: "Rest Stop" }] },
    { act: "Performance Season \u2014 Final", nodes: [{ type: "boss", enemy: "calibration_council", label: "Calibration Council" }] },
  ];

  // ---- IC ladder ------------------------------------------------------------
  var LADDER = ["IC3", "IC4", "IC5", "IC6", "Senior (IC7)", "Staff", "Senior Staff", "Principal", "VP"];
  function levelName(floor) { return LADDER[Math.min(floor, LADDER.length - 1)]; }

  // ===========================================================================
  // BRANCHING CLIMB MAP (the M4 deliverable)
  // ---------------------------------------------------------------------------
  // Flat node list with explicit edges. `row` 0 = bottom/start, higher = up the
  // ladder; `col` 0..2 = left/center/right slot. `next` lists the node ids the
  // player may advance to. Convergence at act bosses keeps every path the same
  // length (one node per row -> one ladder rung per clear).
  //
  // Routing fields per node:
  //   type:    "combat" | "elite" | "rest" | "event" | "boss"
  //   enemy:   single-enemy id (combat/elite/boss)
  //   encounter: multi-enemy ENCOUNTERS id (overrides enemy)
  //   event:   EVENTS id (event nodes)
  //   intro:   INTROS id (per-level intro card, §8); falls back to a template
  //   act:     band label (shown in the header / combat top bar)
  // ===========================================================================
  var CLIMB_NODES = [
    // row 0 — Onboarding (single weak enemy: basic loop) — §4 Act I early
    { id: "n0", row: 0, col: 1, type: "combat", enemy: "bug_swarm", label: "Fix the Bug", act: "Act I \u2014 Onboarding", intro: "intro_bug_swarm", next: ["n1a", "n1b"] },

    // row 1 — The System (branch: tanky enemy vs an on-call event) — §4 Act I mid
    { id: "n1a", row: 1, col: 0, type: "combat", encounter: "legacy_infestation", label: "Legacy + Bugs (DUO)", act: "Act I \u2014 The System", intro: "intro_legacy", next: ["n2a", "n2b"] },
    { id: "n1b", row: 1, col: 2, type: "event", event: "oncall", label: "On-Call Shift", act: "Act I \u2014 The System", intro: "intro_oncall", next: ["n2a", "n2b"] },

    // row 2 — branch: breather rest vs a debuffer fight
    { id: "n2a", row: 2, col: 0, type: "rest", label: "Rest Stop", act: "Act I \u2014 Breather", intro: "intro_rest", next: ["n3"] },
    { id: "n2b", row: 2, col: 2, type: "combat", encounter: "xfn_spat", label: "PM vs DS Spat (DUO)", act: "Act I \u2014 The System", intro: "intro_ds", next: ["n3"] },

    // row 3 — Act I capstone boss (2-phase teachable) — §4 Act I boss. Convergence.
    { id: "n3", row: 3, col: 1, type: "elite", enemy: "half_year", label: "Half-Year Check-In", act: "Act I \u2014 Boss", intro: "intro_half_year", next: ["n4a", "n4b"] },

    // row 4 — Act II XFN chaos (branch: standup chaos vs legacy duo)
    { id: "n4a", row: 4, col: 0, type: "combat", encounter: "standup_chaos", label: "Standup Gone Wrong (DUO)", act: "Act II \u2014 XFN Chaos", intro: "intro_pm", next: ["n5a", "n5b"] },
    { id: "n4b", row: 4, col: 2, type: "combat", encounter: "duo_bug_swarm", label: "Bug Swarm ×2", act: "Act II \u2014 XFN Chaos", intro: "intro_bug_swarm", next: ["n5a", "n5b"] },

    // row 5 — Act II politics (branch: reorg event vs a breather)
    { id: "n5a", row: 5, col: 0, type: "event", event: "reorg", label: "Reorg Event", act: "Act II \u2014 Politics", intro: "intro_reorg", next: ["n6"] },
    { id: "n5b", row: 5, col: 2, type: "rest", label: "Rest Stop", act: "Act II \u2014 Breather", intro: "intro_rest", next: ["n6"] },

    // row 6 — Act III early: Product Review Meeting (3-enemy coordinated) — §4 / §3.4. Convergence.
    { id: "n6", row: 6, col: 1, type: "combat", encounter: "product_review_meeting", label: "Product Review Meeting", act: "Act III \u2014 Product Review", intro: "intro_product_review", next: ["n7"] },

    // row 7 — the VP office: Calibration Council (3-phase finale) — §4 Finale.
    { id: "n7", row: 7, col: 1, type: "boss", enemy: "calibration_council", label: "Calibration Council", act: "Performance Season \u2014 Final", intro: "intro_calibration", next: [] },
  ];

  // build index + derived metadata
  var byId = {};
  var maxRow = 0;
  var hasIncoming = {};
  CLIMB_NODES.forEach(function (n) { byId[n.id] = n; if (n.row > maxRow) maxRow = n.row; });
  CLIMB_NODES.forEach(function (n) { (n.next || []).forEach(function (id) { hasIncoming[id] = true; }); });
  var entryIds = CLIMB_NODES.filter(function (n) { return !hasIncoming[n.id]; }).map(function (n) { return n.id; });

  var CLIMB = {
    title: "The Climb",
    nodes: byId,
    list: CLIMB_NODES,
    entry: entryIds,
    maxRow: maxRow,
    topLabel: "VP OFFICE",
  };

  // ---- MapModel: progress state machine (framework-agnostic) ----------------
  // Progress lives in save.run.map = { clearedIds:[], lastId:string|null }.
  // Reachable = entry rows (if nothing cleared) OR the last-cleared node's `next`
  // minus anything already cleared. Locked = neither cleared nor reachable.
  // floor (the IC ladder index) == number of nodes cleared.
  var MapModel = {
    CLIMB: CLIMB,

    nodeById: function (id) { return byId[id] || null; },

    // make sure the progress object exists (back-compat for older saves)
    ensure: function (save) {
      if (!save || !save.run) return { clearedIds: [], lastId: null };
      if (!save.run.map || !Array.isArray(save.run.map.clearedIds)) {
        save.run.map = { clearedIds: [], lastId: null };
      }
      return save.run.map;
    },

    isCleared: function (save, id) { return this.ensure(save).clearedIds.indexOf(id) >= 0; },

    // ids the player may pick right now
    reachableIds: function (save) {
      var m = this.ensure(save);
      var src = m.lastId ? ((byId[m.lastId] && byId[m.lastId].next) || []) : entryIds;
      var cleared = m.clearedIds;
      return src.filter(function (id) { return cleared.indexOf(id) < 0; });
    },

    isReachable: function (save, id) { return this.reachableIds(save).indexOf(id) >= 0; },

    isLocked: function (save, id) { return !this.isCleared(save, id) && !this.isReachable(save, id); },

    isCurrent: function (save, id) { return this.ensure(save).lastId === id; },

    isBossNode: function (node) { return !!node && node.type === "boss"; },

    // advance progress: mark `id` cleared, point lastId at it, sync floor (level).
    // Returns { floor, level, prevLevel, leveledUp }.
    clearNode: function (save, id) {
      var m = this.ensure(save);
      var prevFloor = save.run.floor || 0;
      if (m.clearedIds.indexOf(id) < 0) m.clearedIds.push(id);
      m.lastId = id;
      save.run.floor = m.clearedIds.length;
      save.run.levelTitle = levelName(save.run.floor);
      return {
        floor: save.run.floor,
        level: levelName(save.run.floor),
        prevLevel: levelName(prevFloor),
        leveledUp: levelName(save.run.floor) !== levelName(prevFloor),
      };
    },

    // whole climb done = the boss node has been cleared
    isComplete: function (save) {
      var m = this.ensure(save);
      return m.clearedIds.some(function (id) { return byId[id] && byId[id].type === "boss"; });
    },
  };

  var LOSE_LINES = [
    { title: "YOU QUIT", body: "You opened a blank doc titled 'resignation' and felt, briefly, alive." },
    { title: "YOU BURNED OUT", body: "Your doctor recommended 'less screen.' Your calendar disagreed." },
    { title: "YOU WERE MANAGED OUT", body: "It was framed as a mutual decision. It was not mutual." },
  ];

  var WIN_COPY = {
    stamp: "PROMOTED",
    title: "You made VP.",
    body: "The Calibration Council reconvened, sighed, and agreed you \u201Coperated at the next level, mostly.\u201D You now own more scope, more meetings, and the exact same Pulse Score.",
    fine: "Promotion effective next half. Comp adjustment: pending alignment.",
  };

  Squid.STAGES = STAGES;
  Squid.LADDER = LADDER;
  Squid.levelName = levelName;
  Squid.CLIMB = CLIMB;
  Squid.MapModel = MapModel;
  Squid.LOSE_LINES = LOSE_LINES;
  Squid.WIN_COPY = WIN_COPY;
})();
