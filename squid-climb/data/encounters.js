/* =============================================================================
 * V3 DATA — ENCOUNTERS  (M3: multi-enemy groups, plan §3 / §11.3 / Appendix A)
 * Group definitions: { id, slots:[enemyId], planGroup(state), intro }.
 *
 * `planGroup(g)` is the heart of coordination (plan §3.2): it runs at the START
 * of every player turn and sets each LIVING enemy's `intent`. Because the engine
 * resolves intents in SLOT ORDER, a debuff authored into an early slot modifies
 * an attack authored into a later slot THIS SAME TURN — that's the difference
 * between three solo enemies and one coordinated encounter.
 *
 * AI roles (plan §3.3): controller (PM) marks + Weak -> denier (DS) halves your
 * next attack -> bruiser (Manager) big hit, +50% vs a Weak/Marked target.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // Default planner: each living enemy plans independently (no synergy yet).
  // Used by single-enemy wrappers and Act II "independent intents" rooms.
  function independentPlan(state) {
    state.enemies.forEach(function (e) { if (e.hp > 0 && e.plan) e.intent = e.plan(state, e); });
  }

  // find a living enemy by aiRole
  function byRole(g, role) {
    var live = g.enemies.filter(function (e) { return e.hp > 0 && e.aiRole === role; });
    return live.length ? live[0] : null;
  }

  // ---- coordinated intents for the Product Review Meeting (plan §3.4) --------
  // PM (controller): marks you + Weak 2 ("let's align"); primes the Manager.
  function pmAlignIntent(mgrAlive) {
    return {
      kind: "debuff", value: 0,
      label: mgrAlive ? "Let's Align \u2014 Mark + Weak 1 (sets up Manager)" : "Let's Align \u2014 Mark + Weak 1",
      synergyRole: mgrAlive ? "bruiser" : null,
      exec: function (g) {
        g.addStatus("player", "marked", 2);
        g.addStatus("player", "weak", 1);
        g.log("PM: \u201CLet's align.\u201D You are Marked and Weak \u2014 the Manager is watching.");
      },
    };
  }
  // PM when the Manager is already dead: just argues for chip damage.
  function pmSoloIntent() {
    return { kind: "attack", value: 13, label: "Circle Back", exec: function (g) { g.enemyAttack(13, "Circle Back"); } };
  }

  // DS (denier): halves your next attack ("not stat sig"). The denial IS the
  // identity; it no longer also stacks Weak (that compounded with the PM's Weak
  // into a permanent offense lockdown that made the fight unwinnable — §3.4 tune).
  function dsDenyIntent() {
    return {
      kind: "special", value: 0, label: "Not Stat Sig \u2014 halves your next attack",
      exec: function (g) {
        g.addStatus("player", "denied", 1);
        g.log("DS: \u201CThat's not stat sig.\u201D Your next attack will be halved.");
      },
    };
  }
  // DS when alone: confidence interval to the face.
  function dsSoloIntent() {
    return { kind: "attack", value: 14, label: "Confidence Interval", exec: function (g) { g.enemyAttack(14, "Confidence Interval"); } };
  }

  // Manager (bruiser): 18 base, +50% (27) if you're Weak/Marked when it lands.
  // Telegraph shows the PROJECTED number (assumes the PM setup that resolves
  // before it this turn) so the chain is legible BEFORE you act (plan §3.4).
  function managerHitIntent(projectedBoost) {
    var base = 12, shown = projectedBoost ? Math.floor(base * 1.5) : base;
    return {
      kind: "attack", value: shown, boosted: projectedBoost,
      label: projectedBoost ? "Circle Back Offline (+50% on Weak/Marked)" : "Circle Back Offline",
      exec: function (g) {
        var setup = g.player.status.weak > 0 || g.player.status.marked > 0;
        var amt = setup ? Math.floor(base * 1.5) : base;
        if (setup) g.log("Manager swings harder \u2014 you were softened up. +50%.");
        g.enemyAttack(amt, "Circle Back Offline");
      },
    };
  }

  // The flagship coordinated planner.
  function productReviewPlan(g) {
    var pm = byRole(g, "controller");
    var ds = byRole(g, "denier");
    var mgr = byRole(g, "bruiser");

    if (pm) pm.intent = mgr ? pmAlignIntent(true) : pmSoloIntent();
    // DS denies your damage while there's still a threat to protect; alone it attacks.
    if (ds) ds.intent = (!pm && !mgr) ? dsSoloIntent() : dsDenyIntent();
    if (mgr) {
      // projected boost: PM will mark this turn, OR you're already Weak/Marked
      var willSetup = !!pm || g.player.status.weak > 0 || g.player.status.marked > 0;
      mgr.intent = managerHitIntent(willSetup);
    }
  }

  var ENCOUNTERS = {
    // ---- single-enemy wrappers (Act I / early) ----
    e_bug_swarm: { id: "e_bug_swarm", slots: ["bug_swarm"], planGroup: independentPlan, intro: "intro_bug_swarm" },
    e_legacy: { id: "e_legacy", slots: ["legacy_service"], planGroup: independentPlan, intro: "intro_legacy" },
    e_pm: { id: "e_pm", slots: ["pm_align"], planGroup: independentPlan, intro: "intro_pm" },
    e_ds: { id: "e_ds", slots: ["ds_skeptic"], planGroup: independentPlan, intro: "intro_ds" },
    e_half_year: { id: "e_half_year", slots: ["half_year"], planGroup: independentPlan, intro: "intro_half_year" },
    e_calibration: { id: "e_calibration", slots: ["calibration_council"], planGroup: independentPlan, intro: "intro_calibration" },

    // ---- multi-enemy variety (earlier than the flagship PRM) ----
    // Two bugs: teaches targeting without the full PM/DS/Manager puzzle.
    duo_bug_swarm: {
      id: "duo_bug_swarm", slots: ["bug_swarm", "bug_swarm"], hpScale: 0.72,
      planGroup: independentPlan, intro: "intro_bug_swarm", tag: "DUO",
    },
    // PM + DS arguing with each other AND you — pick who to silence first.
    xfn_spat: {
      id: "xfn_spat", slots: ["pm_align", "ds_skeptic"], hpScale: 0.82,
      planGroup: independentPlan, intro: "intro_pm", tag: "DUO",
    },
    // Standup gone wrong: bugs in prod while the PM "just has a quick sync."
    standup_chaos: {
      id: "standup_chaos", slots: ["bug_swarm", "pm_align"], hpScale: 0.78,
      planGroup: independentPlan, intro: "intro_bug_swarm", tag: "DUO",
    },
    // Legacy monolith sprouted a second head (tanky + chip damage).
    legacy_infestation: {
      id: "legacy_infestation", slots: ["legacy_service", "bug_swarm"], hpScale: 0.85,
      planGroup: independentPlan, intro: "intro_legacy", tag: "DUO",
    },

    // ---- flagship 3-enemy coordinated fight (plan §3.4) ----
    // Slot 0 PM (controller) marks/Weak -> slot 1 DS (denier) halves your damage
    // -> slot 2 Manager (bruiser) hits the Marked/Weak target for +50%.
    // Kill priority is the puzzle: PM stops the setup, DS protects your damage,
    // racing the Manager dodges the big hit. No single right answer.
    product_review_meeting: {
      id: "product_review_meeting",
      slots: ["pm_align", "ds_skeptic", "eng_manager"],
      planGroup: productReviewPlan,
      intro: "intro_product_review",
      coordinated: true,
    },
  };

  Squid.ENCOUNTERS = ENCOUNTERS;
  Squid.independentPlan = independentPlan;
})();
