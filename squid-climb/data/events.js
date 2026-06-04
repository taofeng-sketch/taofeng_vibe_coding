/* =============================================================================
 * V3 DATA — EVENTS  (ported verbatim from v2 game.js)
 * `run(g)` signatures kept intact for the future engine.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var EVENTS = {
    oncall: {
      title: "On-Call, 3 A.M.", glyph: "\uD83D\uDCDF",
      body: "PagerDuty is screaming. Prod is down. Your bed is so warm.",
      choices: [
        { label: "Get up and fix it (lose 6 Pulse, gain Hotfix)", run: function (g) { g.player.pulse = Math.max(1, g.player.pulse - 6); g.run.deck.push("hotfix"); g.log("You shipped a Hotfix at 3 A.M. Hero. Exhausted hero."); } },
        { label: "Mute it (50%: fine / 50%: lose 4 Pulse + a Tech Debt)", run: function (g) { if (Math.random() < 0.5) { g.log("It self-resolved. Nobody noticed. You sleep."); } else { g.player.pulse = Math.max(1, g.player.pulse - 4); g.run.deck.push("tech_debt"); g.log("It did not self-resolve. The incident review has your name on it."); } } },
      ],
    },
    reorg: {
      title: "Yet Another Reorg", glyph: "\uD83D\uDD01",
      body: "New org chart. New mission. Same desk. Your manager has a new manager.",
      choices: [
        { label: "Embrace change (heal 10 Pulse)", run: function (g) { g.healPulse(10); g.log("You said 'excited for the new chapter' in the all-hands. You almost meant it."); } },
        { label: "Update your resume (gain a random reward card)", run: function (g) { var c = g.pick(Squid.REWARD_POOL); g.run.deck.push(c); g.log("You 'explored opportunities'. Gained " + Squid.CARDS[c].name + "."); } },
      ],
    },
  };

  Squid.EVENTS = EVENTS;
})();
