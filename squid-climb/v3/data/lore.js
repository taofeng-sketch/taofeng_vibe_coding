/* =============================================================================
 * V3 DATA — LORE  (NEW in V3, per plan §9.2)
 * Per-enemy bilingual lore + a gameplay tip, surfaced in the Compendium (图鉴).
 * The Compendium is a *view* over ENEMIES/CARDS + this lore + an unlock set
 * (squid_codex in localStorage). No duplicate database.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var ENEMY_LORE = {
    bug_swarm: { en: "A cluster of defects that multiply when ignored. Cheap to kill, expensive to neglect.", cn: "\u88AB\u5FFD\u89C6\u65F6\u4F1A\u7E41\u6B96\u7684\u7F3A\u9677\u96C6\u7FA4\u3002\u597D\u6740\uFF0C\u4F46\u62D6\u4E0D\u5F97\u3002", tip: "Clear it fast before 'Spread to Prod' clogs your deck with Tech Debt." },
    legacy_service: { en: "A beige tower nobody documented and everybody depends on.", cn: "\u4E00\u5EA7\u6CA1\u4EBA\u5199\u6587\u6863\u3001\u4EBA\u4EBA\u90FD\u4F9D\u8D56\u7684\u7C73\u8272\u670D\u52A1\u5668\u3002", tip: "It alternates block and a big hit \u2014 time your damage for its block-down turns." },
    pm_align: { en: "Speaks fluent roadmap. Every sentence ends in 'let's align'.", cn: "\u4E00\u53E3\u6D41\u5229\u7684 roadmap \u8BED\u3002\u6BCF\u53E5\u8BDD\u90FD\u4EE5\u201Clet's align\u201D\u7ED3\u5C3E\u3002", tip: "In a group, killing the PM removes the mark/Weak setup that powers the bruiser." },
    ds_skeptic: { en: "Has a confidence interval for your self-worth.", cn: "\u5BF9\u4F60\u7684\u81EA\u6211\u4EF7\u503C\u4E5F\u80FD\u7ED9\u51FA\u7F6E\u4FE1\u533A\u95F4\u3002", tip: "Denies your biggest hit \u2014 don't put all your damage in one card against it." },
    half_year: { en: "The mid-year review that's 'mostly positive, but...'. Death by a thousand growth areas.", cn: "\u90A3\u573A\u201C\u603B\u4F53\u6B63\u9762\uFF0C\u4F46\u2026\u2026\u201D\u7684\u534A\u5E74\u8003\u6838\u3002\u88AB\u65E0\u6570\u201C\u6210\u957F\u70B9\u201D\u51CC\u8FDF\u3002", tip: "The praise is bait. Block through 'Constructive Feedback' and clear Burnout." },
    calibration_council: { en: "The year-end calibration room. A panel, not a person. Build your case, don't just race HP.", cn: "\u5E74\u7EC8\u6821\u51C6\u5BA4\u3002\u4E00\u4E2A\u59D4\u5458\u4F1A\uFF0C\u4E0D\u662F\u4E00\u4E2A\u4EBA\u3002\u8BB2\u597D\u4F60\u7684\u6545\u4E8B\uFF0C\u522B\u53EA\u662F\u62FC\u8840\u91CF\u3002", tip: "Always hold a metric card before 'What's the Incrementality?' or eat double damage." },
  };

  Squid.ENEMY_LORE = ENEMY_LORE;
})();
