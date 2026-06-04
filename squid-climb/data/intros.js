/* =============================================================================
 * V3 DATA — INTROS  (NEW in V3, per plan §8)
 * Per-node intro cards (bilingual). The cinematic IC3->VP beats are ported from
 * v2 INTRO_BEATS. Presentation is built in M4 (RoomIntro); this is data only.
 * Falls back to a generic templated intro when a node omits `intro`.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  // v2 opening cutscene beats (ported verbatim)
  var INTRO_BEATS = [
    { bg: "scene_hq.png", cls: "zoom-slow", cap: "\u4F60\u521A\u6BD5\u4E1A\uFF0C\u62FF\u5230\u4E86 offer\u3002", sub: "Fresh out of school. Offer in hand. Life is good.", player: "happy" },
    { bg: "scene_hq.png", cls: "pan-up", cap: "\u4F60\u52A0\u5165\u4E86 Squid Technologies\u3002Level: IC3\u3002", sub: "You join Squid Technologies. Level: IC3.", player: "walk" },
    { bg: "scene_climb.png", cls: "zoom-bottom", cap: "\u4F60\u60F3\u5F80\u4E0A\u722C\u3002\u4F60\u60F3\u5F53 VP\u3002", sub: "You want to climb. You want to be VP.", player: "climb" },
    { bg: "scene_climb.png", cls: "pull-back", cap: "\u2026\u2026\u8FD9\u6761\u68AF\u5B50\uFF0C\u6BD4\u4F60\u60F3\u8C61\u7684\u957F\u5F97\u591A\u3002", sub: "...the ladder is much longer than it looked.", player: "tiny" },
    { bg: "scene_climb.png", cls: "hold", cap: "\u6D3B\u4E0B\u53BB\u3002\u522B\u8BA9 Pulse Score \u5F52\u96F6\u3002", sub: "Survive. Don't let your Pulse Score hit zero.", player: "tiny" },
  ];

  // Per-node intro cards (data shape per plan §8.1)
  var INTROS = {
    intro_bug_swarm: { title: "Onboarding", subtitle: "\u5165\u804C", art: "scene_hq.png", bodyEN: "Your first ticket. It looks small. They always do.", bodyCN: "\u4F60\u7684\u7B2C\u4E00\u4E2A\u5DE5\u5355\u3002\u770B\u8D77\u6765\u5F88\u5C0F\u3002\u603B\u662F\u5982\u6B64\u3002", music: "combat" },
    intro_legacy: { title: "The Legacy Service", subtitle: "\u9057\u7559\u7CFB\u7EDF", art: "scene_climb.png", bodyEN: "Nobody owns it. Everybody depends on it. You touch it now.", bodyCN: "\u6CA1\u4EBA\u8D1F\u8D23\u3002\u4EBA\u4EBA\u4F9D\u8D56\u3002\u73B0\u5728\u8F6E\u5230\u4F60\u52A8\u5B83\u3002", music: "combat" },
    intro_pm: { title: "Argue with a PM", subtitle: "\u4E0E PM \u4EA4\u950B", art: "scene_climb.png", bodyEN: "\"Quick one\" — three words that have never preceded a quick one.", bodyCN: "\u201C\u5C0F\u95EE\u9898\u201D\u2014\u2014\u4ECE\u6765\u4E0D\u662F\u5C0F\u95EE\u9898\u3002", music: "combat" },
    intro_ds: { title: "Defend Your Metric", subtitle: "\u4FDD\u536B\u4F60\u7684\u6307\u6807", art: "scene_climb.png", bodyEN: "The Data Scientist has a chart. The chart disagrees with you.", bodyCN: "\u6570\u636E\u79D1\u5B66\u5BB6\u6709\u4E00\u5F20\u56FE\u3002\u90A3\u5F20\u56FE\u4E0D\u540C\u610F\u4F60\u3002", music: "combat" },
    intro_half_year: { title: "Half-Year Check-In", subtitle: "\u534A\u5E74\u8003\u6838", art: "boss_halfyear.png", bodyEN: "\"Overall, great progress.\" You brace for the word 'but'.", bodyCN: "\u201C\u603B\u4F53\u8FDB\u5C55\u5F88\u597D\u3002\u201D\u4F60\u7B49\u7740\u90A3\u4E2A\u201C\u4F46\u662F\u201D\u3002", threat: ["Constructive Feedback", "Needs Improvement", "Raised Expectations"], music: "boss" },
    intro_calibration: { title: "Calibration Council", subtitle: "\u6821\u51C6\u4F1A\u8BAE", art: "boss_calibration.png", bodyEN: "A panel, not a person. They will decide who you are this year.", bodyCN: "\u4E00\u4E2A\u59D4\u5458\u4F1A\uFF0C\u4E0D\u662F\u4E00\u4E2A\u4EBA\u3002\u4ED6\u4EEC\u51B3\u5B9A\u4F60\u4ECA\u5E74\u662F\u8C01\u3002", threat: ["Not Aligned", "Needs More Scope", "What's the Incrementality?"], music: "boss" },
    intro_product_review: { title: "Product Review Meeting", subtitle: "\u4EA7\u54C1\u8BC4\u5BA1\u4F1A", art: "scene_hq.png", bodyEN: "Three calendars finally aligned. That's the scary part.", bodyCN: "\u4E09\u4E2A\u4EBA\u7684\u65E5\u5386\u7EC8\u4E8E\u5BF9\u9F50\u4E86\u2014\u2014\u8FD9\u624D\u662F\u53EF\u6015\u7684\u5730\u65B9\u3002", threat: ["PM: Let's Align", "DS: Not stat sig", "Manager: Circle back"], music: "combat" },

    // ---- non-combat node intros (rest / event) ----
    intro_rest: { title: "Rest Stop", subtitle: "\u4F11\u606F\u4E00\u4E0B", art: "scene_climb.png", bodyEN: "A rare quiet evening. Sleep, grind, or network \u2014 your call.", bodyCN: "\u96BE\u5F97\u7684\u5B89\u9759\u591C\u665A\u3002\u7761\u89C9\u3001\u52A0\u73ED\u3001\u8FD8\u662F\u793E\u4EA4\u2014\u2014\u4F60\u51B3\u5B9A\u3002", threat: ["Sleep: +Pulse", "Work Late: +card, -Pulse", "Network: remove Tech Debt"], music: "map" },
    intro_oncall: { title: "On-Call Shift", subtitle: "\u503C\u73ED", art: "scene_climb.png", bodyEN: "PagerDuty is screaming. Prod is down. Your bed is so warm.", bodyCN: "PagerDuty \u5728\u5C16\u53EB\u3002\u7EBF\u4E0A\u6302\u4E86\u3002\u4F60\u7684\u88AB\u7A9D\u90A3\u4E48\u6696\u3002", threat: ["Choice: fix it or mute it"], music: "map" },
    intro_reorg: { title: "Yet Another Reorg", subtitle: "\u53C8\u4E00\u6B21\u91CD\u7EC4", art: "scene_climb.png", bodyEN: "New org chart. New mission. Same desk. Your manager has a new manager.", bodyCN: "\u65B0\u7684\u7EC4\u7EC7\u67B6\u6784\u3002\u65B0\u4F7F\u547D\u3002\u540C\u4E00\u5F20\u684C\u5B50\u3002\u4F60\u7684\u7ECF\u7406\u6709\u4E86\u65B0\u7ECF\u7406\u3002", threat: ["Choice: embrace it or update resume"], music: "map" },
  };

  Squid.INTRO_BEATS = INTRO_BEATS;
  Squid.INTROS = INTROS;
})();
