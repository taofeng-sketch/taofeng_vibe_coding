import { groups, teams } from "./data.js";
import { schedule, scheduleSource } from "./schedule.js";
import { playerProfiles } from "./profiles.js";
import { calculateProbabilities } from "./model.js";
import {
  broadcasterFor,
  dateKeyForMatch,
  defaultScheduleDate,
  detectViewingRegion,
  formattedMatchTime,
  matchDateTime,
  nextMatch,
  viewingRegions
} from "./viewing.js";

const copy = {
  zh: {
    navSchedule: "赛程", navResults: "赛果", navTeams: "球队", navPredict: "预测",
    snapshotBadge: "2026 世界杯 · 每四小时数据快照",
    heroTitle: "不只是看球。<br><span>看懂每场对决，</span><br>规划你的世界杯。",
    heroDescription: "完整赛程、球队核心、已完赛进球与可解释胜率，全部放在一个中英双语界面里。",
    browseSchedule: "浏览完整赛程", exploreTeams: "探索 48 支球队",
    allMatches: "全部比赛", finished: "已结束", upcoming: "未开始", live: "进行中",
    dataAsOf: "数据截至", liveNow: "正在进行", groupMatches: "小组赛", knockoutMatches: "淘汰赛", officialSource: "官方来源",
    calendarTitle: "今天的比赛", calendarIntro: "默认显示你当地今天的赛程；当天无比赛时自动跳到下一比赛日。开球时间使用你的当地时区。",
    watchRegion: "观赛地区", detectedRegion: "当前选择的观赛地区", localTime: "当地时间", useMyLocation: "使用我的地区",
    whereToWatch: "在哪里看", listingPending: "请查看转播方的具体节目表",
    rightsUnverified: "当地转播信息尚未可靠确认", broadcasterNote: "转播权和节目表可能变化，观看链接通常仅在授权地区可用。",
    matchesShown: "场比赛显示中", allStages: "全部阶段", groupStage: "小组赛", knockoutStage: "淘汰赛",
    allStatuses: "全部状态", searchSchedule: "搜索球队或比赛城市…", resetFilters: "重置筛选",
    resultsTitle: "已经发生了什么", resultsIntro: "查看已结束比赛、已确认的关键进球者，并跳转到 FIFA 官方比赛报告和集锦页面。",
    teamsTitle: "球队与核心球员", teamsIntro: "点击球队查看核心球员特点、模型数据和该队的完整赛程。",
    searchTeams: "搜索球队或球员…", allGroups: "全部小组",
    predictTitle: "为什么它认为<br>这支球队会赢？", predictIntro: "模型不是预言。它把综合实力、近期状态和排名信号转换为相对概率，并明确展示每项权重。",
    homeTeam: "主队", awayTeam: "客队", runAnalysis: "生成分析", readMethod: "阅读完整方法说明 →",
    methodTitle: "模型如何工作", methodIntro: "这是一套透明的演示模型，不使用赔率，也不声称掌握伤病、首发或实时战术信息。",
    strengthFactor: "综合实力", strengthExplain: "人工设定的球队实力指数，反映阵容深度、顶级球员和整体上限。",
    formFactor: "近期状态", formExplain: "由实力和排名生成的演示状态值；生产版本应接入近期正式比赛。",
    rankingFactor: "世界排名", rankingExplain: "排名差被限制在合理区间，避免单一指标压倒全部判断。",
    uncertainty: "不确定性", uncertaintyExplain: "足球存在红牌、伤病、临场战术和随机波动，概率绝不是结果承诺。",
    gameTitle: "点球压力赛", gameIntro: "守门员会读你的习惯。连续选择射门方向，看看你能在 5 轮中拿到几分。",
    thisRound: "本轮", chooseDirection: "选择一个方向开始", restart: "重新开始",
    shootLeft: "射向左侧", shootCenter: "射向中路", shootRight: "射向右侧",
    footerTagline: "为足球判断力而生的独立双语互动产品。",
    dataNote: "数据说明", dataNoteBody: "赛程来自 FIFA 官方 PDF；比赛状态由自动任务每四小时从公开比分数据源刷新。页面不是秒级直播。",
    disclaimer: "重要声明", disclaimerBody: "非 FIFA 官方产品。无真钱、无奖品、无下注功能。官方报告链接归其权利人所有。",
    today: "今天", allDates: "全部日期", match: "比赛", matches: "场",
    matchNo: "第", group: "组", londonTime: "伦敦时间", noMatches: "没有符合筛选条件的比赛。",
    viewReport: "比赛报告 / 集锦 ↗", goals: "关键进球", confirmedScorers: "数据源已确认的进球者",
    rank: "世界排名", power: "实力指数", form: "状态指数", keyPlayer: "核心球员", viewTeam: "查看球队",
    support: "支持这支球队", supported: "✓ 已加入阵营", analyse: "分析这场比赛", schedule: "球队赛程",
    playerProfile: "球员介绍", groupLabel: "小组", win: "胜", draw: "平", homeWin: "主胜", awayWin: "客胜",
    factorStrength: "综合实力", factorForm: "近期状态", factorRanking: "世界排名", modelView: "模型观点",
    favoured: "纸面占优", volatile: "，但足球结果存在高波动。概率不是承诺。",
    weights: "权重", sameTeam: "请选择两支不同球队。",
    predictionSaved: "预测已保存，获得 20 PTS 参与分", joined: "已加入球队阵营", left: "已取消支持",
    profileSummary: "你已支持 {teams} 支球队，完成 {predictions} 次预测",
    goal: "球进了！+15 PTS", saved: "被扑出！守门员读对了方向", gameOver: "本轮已结束，请重新开始",
    gameResult: "挑战结束：5 轮打进 {goals} 球", upcomingLabel: "待开赛", finishedLabel: "完场",
    snapshotWarning: "演示快照，不是实时比分", unknownScorer: "完整进球事件请查看官方报告"
  },
  en: {
    navSchedule: "Schedule", navResults: "Results", navTeams: "Teams", navPredict: "Predict",
    snapshotBadge: "World Cup 2026 · four-hour data snapshot",
    heroTitle: "Do more than watch.<br><span>Understand every matchup,</span><br>plan your World Cup.",
    heroDescription: "The complete schedule, key players, finished-match goals and explainable probabilities in one bilingual experience.",
    browseSchedule: "Browse full schedule", exploreTeams: "Explore all 48 teams",
    allMatches: "All matches", finished: "Finished", upcoming: "Upcoming", live: "Live",
    dataAsOf: "Data as of", liveNow: "Live now", groupMatches: "Group matches", knockoutMatches: "Knockout matches", officialSource: "Official source",
    calendarTitle: "Today's matches", calendarIntro: "Starts with today's fixtures in your local time. If today has no games, it moves to the next match day automatically.",
    watchRegion: "Watch in", detectedRegion: "Selected viewing region", localTime: "Local time", useMyLocation: "Use my region",
    whereToWatch: "Where to watch", listingPending: "Check the broadcaster's listing for this match",
    rightsUnverified: "Reliable local broadcast information is not confirmed yet", broadcasterNote: "Rights and listings can change. Streams are generally limited to their licensed region.",
    matchesShown: "matches shown", allStages: "All stages", groupStage: "Group stage", knockoutStage: "Knockout stage",
    allStatuses: "All statuses", searchSchedule: "Search team or host city…", resetFilters: "Reset filters",
    resultsTitle: "What has happened", resultsIntro: "Review finished matches and confirmed key scorers, then open FIFA's official report and highlights page.",
    teamsTitle: "Teams and key players", teamsIntro: "Open a team to see its key player, model signals and complete tournament schedule.",
    searchTeams: "Search team or player…", allGroups: "All groups",
    predictTitle: "Why does the model think<br>this team will win?", predictIntro: "The model is not a prophecy. It converts team strength, form and ranking signals into relative probabilities and shows every weight.",
    homeTeam: "Home team", awayTeam: "Away team", runAnalysis: "Run analysis", readMethod: "Read the full method →",
    methodTitle: "How the model works", methodIntro: "This is a transparent demonstration model. It does not use betting odds or claim access to injuries, lineups or live tactical information.",
    strengthFactor: "Team strength", strengthExplain: "An editorial power index reflecting squad depth, elite talent and overall ceiling.",
    formFactor: "Recent form", formExplain: "A demo form signal derived from strength and ranking; production should use recent competitive matches.",
    rankingFactor: "World ranking", rankingExplain: "The ranking gap is capped so one metric cannot overwhelm the entire estimate.",
    uncertainty: "Uncertainty", uncertaintyExplain: "Red cards, injuries, tactics and random variation matter. Probability is never a result guarantee.",
    gameTitle: "Penalty pressure", gameIntro: "The goalkeeper learns your habits. Pick a direction for five rounds and see how many you score.",
    thisRound: "This round", chooseDirection: "Choose a direction to begin", restart: "Restart",
    shootLeft: "Shoot left", shootCenter: "Shoot centre", shootRight: "Shoot right",
    footerTagline: "An independent bilingual experience built for football judgement.",
    dataNote: "Data note", dataNoteBody: "Schedule from FIFA's official PDF. Match status refreshes every four hours from a public scoreboard source; this is not a second-by-second live feed.",
    disclaimer: "Important", disclaimerBody: "Not an official FIFA product. No real money, prizes or betting. Official report links belong to their rights holders.",
    today: "Today", allDates: "All dates", match: "match", matches: "matches",
    matchNo: "Match", group: "Group", londonTime: "London time", noMatches: "No matches fit these filters.",
    viewReport: "Match report / highlights ↗", goals: "Key goals", confirmedScorers: "Scorers confirmed by the data source",
    rank: "World rank", power: "Power index", form: "Form index", keyPlayer: "Key player", viewTeam: "View team",
    support: "Support this team", supported: "✓ Supporting", analyse: "Analyse matchup", schedule: "Team schedule",
    playerProfile: "Player profile", groupLabel: "Group", win: "win", draw: "Draw", homeWin: "Home", awayWin: "Away",
    factorStrength: "Team strength", factorForm: "Recent form", factorRanking: "World ranking", modelView: "Model view",
    favoured: "has the stronger paper profile", volatile: ", but football outcomes are highly volatile. Probability is not a promise.",
    weights: "weight", sameTeam: "Choose two different teams.",
    predictionSaved: "Prediction saved. +20 participation PTS", joined: "You joined this team's fan group", left: "Support removed",
    profileSummary: "You support {teams} teams and have made {predictions} predictions",
    goal: "Goal! +15 PTS", saved: "Saved! The keeper read your direction", gameOver: "This round is over. Restart to play again",
    gameResult: "Challenge complete: {goals} goals from five", upcomingLabel: "Upcoming", finishedLabel: "Full time",
    snapshotWarning: "Demo snapshot, not a live score feed", unknownScorer: "Open the official report for the complete goal log"
  }
};

const state = {
  lang: localStorage.getItem("pulse26-language") || "en",
  browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  region: localStorage.getItem("pulse26-region") || null,
  points: Number(localStorage.getItem("pulse26-points") || 1250),
  supported: new Set(JSON.parse(localStorage.getItem("pulse26-supported") || "[]")),
  predictions: JSON.parse(localStorage.getItem("pulse26-predictions") || "{}"),
  selectedDate: null,
  gameRound: 0,
  gameGoals: 0,
  openTeam: null
};
state.region ||= detectViewingRegion(state.browserTimeZone, navigator.language);
state.selectedDate = defaultScheduleDate(schedule, state.browserTimeZone);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const t = (key) => copy[state.lang][key] || key;
const getTeamByName = (name) => teams.find((team) => team.name === name);
const getTeamById = (id) => teams.find((team) => team.id === id);
const teamName = (teamOrName) => {
  const team = typeof teamOrName === "string" ? getTeamByName(teamOrName) : teamOrName;
  if (team) return state.lang === "zh" ? team.zh : team.name;
  return translatePlaceholder(teamOrName);
};
const profileFor = (team) => playerProfiles[team.name];

function translatePlaceholder(value) {
  if (state.lang === "en" || !value) return value;
  return value
    .replace("Group ", "小组 ")
    .replace(" winner", "头名")
    .replace(" runner-up", "第二名")
    .replace("Best third-place team", "最佳小组第三")
    .replace("Winner R32 ", "32 强赛胜者 ")
    .replace("Winner R16 ", "16 强赛胜者 ")
    .replace("Winner QF ", "四分之一决赛胜者 ")
    .replace("Semi-final loser ", "半决赛负者 ")
    .replace("Semi-final winner ", "半决赛胜者 ");
}

function stageLabel(match) {
  if (match.stage === "Group stage") return `${t("group")} ${match.group}`;
  const labels = {
    "Round of 32": ["32 强", "Round of 32"],
    "Round of 16": ["16 强", "Round of 16"],
    "Quarter-final": ["四分之一决赛", "Quarter-final"],
    "Semi-final": ["半决赛", "Semi-final"],
    "Third-place": ["三四名决赛", "Third-place"],
    "Final": ["决赛", "Final"]
  };
  return labels[match.stage]?.[state.lang === "zh" ? 0 : 1] || match.stage;
}

function dateLabel(date, compact = false) {
  const value = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en-GB", {
    month: compact ? "short" : "long",
    day: "numeric",
    weekday: compact ? undefined : "short",
    timeZone: "UTC"
  }).format(value);
}

function localDateKey(match) {
  return dateKeyForMatch(match, state.browserTimeZone);
}

function matchTimeLabel(match) {
  return formattedMatchTime(match, state.browserTimeZone, state.lang === "zh" ? "zh-CN" : "en-GB");
}

function localDateLabel(matchOrDate, compact = false) {
  const isDateKey = typeof matchOrDate === "string";
  const value = isDateKey ? new Date(`${matchOrDate}T12:00:00Z`) : matchDateTime(matchOrDate);
  return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en-GB", {
    month: compact ? "short" : "long",
    day: "numeric",
    weekday: compact ? undefined : "short",
    timeZone: isDateKey ? "UTC" : state.browserTimeZone
  }).format(value);
}

function persist() {
  localStorage.setItem("pulse26-language", state.lang);
  localStorage.setItem("pulse26-points", state.points);
  localStorage.setItem("pulse26-supported", JSON.stringify([...state.supported]));
  localStorage.setItem("pulse26-predictions", JSON.stringify(state.predictions));
  localStorage.setItem("pulse26-region", state.region);
  $("#userPoints").textContent = state.points.toLocaleString();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function applyStaticCopy() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  $$("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  $$("[data-i18n-html]").forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
  $$("[data-i18n-placeholder]").forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  $$("[data-i18n-aria]").forEach((element) => { element.setAttribute("aria-label", t(element.dataset.i18nAria)); });
  $$("[data-lang-option]").forEach((element) => element.classList.toggle("active", element.dataset.langOption === state.lang));
}

function renderSnapshotMeta() {
  const generated = new Date(scheduleSource.snapshot);
  $("#snapshotTime").textContent = new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short"
  }).format(generated);
}

function renderViewingControls() {
  const region = viewingRegions[state.region] || viewingRegions.other;
  $("#regionSelect").innerHTML = Object.entries(viewingRegions).map(([key, item]) =>
    `<option value="${key}">${item.flag} ${state.lang === "zh" ? item.zh : item.name}${item.status === "unverified" ? " · —" : ""}</option>`
  ).join("");
  $("#regionSelect").value = state.region;
  $("#timezoneLabel").textContent = `${t("localTime")}: ${state.browserTimeZone.replaceAll("_", " ")}`;
  $("#regionStatus").textContent = region.status === "available"
    ? `${region.flag} ${t("detectedRegion")}`
    : t("rightsUnverified");
  $("#regionStatus").classList.toggle("unavailable", region.status !== "available");
}

function renderHero() {
  const featured = nextMatch(schedule.filter((match) => getTeamByName(match.home) && getTeamByName(match.away)));
  const home = getTeamByName(featured.home);
  const away = getTeamByName(featured.away);
  const probability = calculateProbabilities(home, away);
  $("#heroMatch").innerHTML = `
    <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
    <div class="match-poster">
      <div class="poster-top"><span>${t("upcomingLabel")}</span><span>${stageLabel(featured)} · ${featured.venue}</span></div>
      <div class="poster-teams">
        <div class="poster-team"><span class="giant-flag">${home.flag}</span><b>${home.name.slice(0, 3).toUpperCase()}</b><small>${teamName(home)}</small></div>
        <div class="versus"><span>${localDateLabel(featured, true)} · ${matchTimeLabel(featured)}</span><b>VS</b><small>${state.browserTimeZone.replaceAll("_", " ")}</small></div>
        <div class="poster-team"><span class="giant-flag">${away.flag}</span><b>${away.name.slice(0, 3).toUpperCase()}</b><small>${teamName(away)}</small></div>
      </div>
      <div class="probability-preview">
        <div class="probability-labels"><span>${teamName(home)} ${probability.home}%</span><span>${t("draw")} ${probability.draw}%</span><span>${teamName(away)} ${probability.away}%</span></div>
        <div class="probability-track"><i style="width:${probability.home}%"></i><i style="width:${probability.draw}%"></i><i style="width:${probability.away}%"></i></div>
        <small>${t("snapshotWarning")}</small>
      </div>
    </div>`;
}

function renderCalendarDays() {
  const dates = [...new Set(schedule.map(localDateKey))].sort();
  $("#calendarDays").innerHTML = `
    <button type="button" data-calendar-date="all" class="${state.selectedDate === "all" ? "active" : ""}"><b>104</b><span>${t("allDates")}</span></button>
    ${dates.map((date) => {
      const dateMatches = schedule.filter((match) => localDateKey(match) === date);
      const count = dateMatches.length;
      return `<button type="button" data-calendar-date="${date}" class="${state.selectedDate === date ? "active" : ""}"><b>${localDateLabel(dateMatches[0], true)}</b><span>${count} ${count === 1 ? t("match") : t("matches")}</span></button>`;
    }).join("")}`;
}

function filteredSchedule() {
  const stage = $("#stageFilter").value;
  const status = $("#statusFilter").value;
  const query = $("#scheduleSearch").value.trim().toLowerCase();
  return schedule.filter((match) => {
    const stageMatch = stage === "all" || (stage === "knockout" ? match.stage !== "Group stage" : match.stage === stage);
    const text = [match.home, match.away, teamName(match.home), teamName(match.away), match.venue].join(" ").toLowerCase();
    return (state.selectedDate === "all" || localDateKey(match) === state.selectedDate)
      && stageMatch
      && (status === "all" || match.status === status)
      && (!query || text.includes(query));
  }).sort((left, right) => matchDateTime(left) - matchDateTime(right));
}

function renderSchedule() {
  const matches = filteredSchedule();
  $("#visibleMatchCount").textContent = matches.length;
  const groupsByDate = matches.reduce((grouped, match) => {
    const date = localDateKey(match);
    grouped[date] ||= [];
    grouped[date].push(match);
    return grouped;
  }, {});
  $("#scheduleList").innerHTML = matches.length ? Object.entries(groupsByDate).map(([date, dateMatches]) => `
    <section class="schedule-day">
      <header><div><b>${localDateLabel(dateMatches[0])}</b><span>${date}</span></div><em>${dateMatches.length} ${dateMatches.length === 1 ? t("match") : t("matches")}</em></header>
      <div class="fixture-rows">${dateMatches.map(renderFixture).join("")}</div>
    </section>`).join("") : `<p class="empty-state">${t("noMatches")}</p>`;
}

function renderFixture(match) {
  const home = getTeamByName(match.home);
  const away = getTeamByName(match.away);
  const canAnalyse = home && away;
  const score = match.score ? `${match.score[0]} — ${match.score[1]}` : matchTimeLabel(match);
  const viewing = broadcasterFor(match, state.region);
  const watchLinks = viewing.providers.map((provider) =>
    `<a class="watch-link" href="${provider.url}" target="_blank" rel="noreferrer">${provider.name} ↗</a>`
  ).join("");
  return `
    <article class="fixture-row ${match.status}">
      <div class="fixture-number"><span>${t("matchNo")}</span><b>${match.id}</b></div>
      <div class="fixture-meta"><b>${stageLabel(match)}</b><span>${match.venue}</span></div>
      <div class="fixture-team home"><b>${teamName(match.home)}</b><span>${home?.flag || "◯"}</span></div>
      <div class="fixture-score"><b>${score}</b><span>${match.status === "finished" ? t("finishedLabel") : state.browserTimeZone.replaceAll("_", " ")}</span></div>
      <div class="fixture-team away"><span>${away?.flag || "◯"}</span><b>${teamName(match.away)}</b></div>
      <div class="fixture-action">
        ${match.report ? `<a href="${match.report}" target="_blank" rel="noreferrer">${t("viewReport")}</a>` : canAnalyse ? `<button type="button" data-analyse-match="${match.id}">${t("analyse")}</button>` : `<span>${t("upcomingLabel")}</span>`}
        ${match.status !== "finished" ? `<div class="watch-option ${viewing.status}">
          <small>${t("whereToWatch")}</small>
          <b>${viewing.label || t("rightsUnverified")}</b>
          <div>${watchLinks || `<span>${t("listingPending")}</span>`}</div>
        </div>` : ""}
      </div>
    </article>`;
}

function renderResults() {
  const finished = schedule.filter((match) => match.status === "finished");
  $("#resultsGrid").innerHTML = finished.map((match) => {
    const home = getTeamByName(match.home);
    const away = getTeamByName(match.away);
    return `
      <article class="result-card">
        <div class="result-top"><span>${dateLabel(match.date)} · ${match.venue}</span><b>${t("finishedLabel")}</b></div>
        <div class="result-score">
          <div><span>${home.flag}</span><b>${teamName(home)}</b></div>
          <strong>${match.score[0]}<i>—</i>${match.score[1]}</strong>
          <div><span>${away.flag}</span><b>${teamName(away)}</b></div>
        </div>
        <div class="goal-log"><small>${t("confirmedScorers")}</small>${match.goals.map((goal) => `<span>${getTeamByName(goal.team)?.flag || "⚽"} ${goal.player}</span>`).join("")}<em>${t("unknownScorer")}</em></div>
        <a class="report-link" href="${match.report}" target="_blank" rel="noreferrer">${t("viewReport")}</a>
      </article>`;
  }).join("");
}

function renderTeams() {
  const query = $("#teamSearch").value.trim().toLowerCase();
  const group = $("#groupFilter").value;
  const filtered = teams.filter((team) => {
    const profile = profileFor(team);
    return (group === "all" || team.group === group)
      && [team.name, team.zh, profile.name].some((value) => value.toLowerCase().includes(query));
  });
  $("#teamGrid").innerHTML = filtered.map((team) => {
    const profile = profileFor(team);
    return `
      <article class="team-card ${state.supported.has(team.id) ? "supported" : ""}">
        <button class="team-open" type="button" data-team-details="${team.id}">
          <div class="team-card-top"><span>${t("group")} ${team.group}</span><span>${t("rank")} #${team.rank}</span></div>
          <span class="large-flag">${team.flag}</span>
          <h3>${teamName(team)}</h3><p>${state.lang === "zh" ? team.name : team.zh}</p>
          <div class="team-star"><span>${t("keyPlayer")}</span><b>${profile.name}</b><small>${state.lang === "zh" ? profile.positionZh : profile.positionEn}</small></div>
          <div class="power-row"><span>${t("power")}</span><b>${team.power}</b></div>
          <div class="power-bar"><i style="width:${team.power}%"></i></div>
          <span class="view-team-label">${t("viewTeam")} →</span>
        </button>
        <button class="support-button" type="button" data-support="${team.id}">${state.supported.has(team.id) ? t("supported") : `+ ${t("support")}`}</button>
      </article>`;
  }).join("") || `<p class="empty-state">${t("noMatches")}</p>`;
}

function renderTeamModal(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;
  state.openTeam = teamId;
  const profile = profileFor(team);
  const fixtures = schedule.filter((match) => match.home === team.name || match.away === team.name);
  $("#teamModalContent").innerHTML = `
    <div class="modal-hero">
      <span class="modal-flag">${team.flag}</span>
      <div><small>${t("groupLabel")} ${team.group} · ${t("rank")} #${team.rank}</small><h2 id="teamModalTitle">${teamName(team)}</h2><p>${state.lang === "zh" ? team.name : team.zh}</p></div>
      <div class="modal-indices"><span>${t("power")}<b>${team.power}</b></span><span>${t("form")}<b>${team.form}</b></span></div>
    </div>
    <div class="player-profile">
      <div class="player-avatar">${profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
      <div><small>${t("playerProfile")} · ${state.lang === "zh" ? profile.positionZh : profile.positionEn}</small><h3>${profile.name}</h3><p>${state.lang === "zh" ? profile.bioZh : profile.bioEn}</p></div>
    </div>
    <div class="team-fixtures">
      <h3>${t("schedule")}</h3>
      ${fixtures.map((match) => `<div><span>${localDateLabel(match, true)} · ${matchTimeLabel(match)}</span><b>${teamName(match.home)} ${match.score ? `${match.score[0]}—${match.score[1]}` : "vs"} ${teamName(match.away)}</b><small>${match.venue}</small></div>`).join("")}
    </div>
    <div class="modal-actions">
      <button class="button button-dark" type="button" data-support="${team.id}">${state.supported.has(team.id) ? t("supported") : t("support")}</button>
      <button class="button button-primary" type="button" data-team-analysis="${team.id}">${t("analyse")}</button>
    </div>`;
  $("#teamModal").hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  $("#teamModal").hidden = true;
  document.body.classList.remove("modal-open");
  state.openTeam = null;
}

function fillSelects(keepValues = false) {
  const nextFixture = nextMatch(schedule.filter((match) => getTeamByName(match.home) && getTeamByName(match.away)));
  const homeValue = keepValues && $("#homeTeamSelect").value ? $("#homeTeamSelect").value : getTeamByName(nextFixture.home).id;
  const awayValue = keepValues && $("#awayTeamSelect").value ? $("#awayTeamSelect").value : getTeamByName(nextFixture.away).id;
  const options = teams.map((team) => `<option value="${team.id}">${team.flag} ${teamName(team)} · #${team.rank}</option>`).join("");
  $("#homeTeamSelect").innerHTML = options;
  $("#awayTeamSelect").innerHTML = options;
  $("#homeTeamSelect").value = homeValue;
  $("#awayTeamSelect").value = awayValue;
  if ($("#groupFilter").options.length === 1) {
    $("#groupFilter").innerHTML += Object.keys(groups).map((group) => `<option value="${group}">GROUP ${group}</option>`).join("");
  }
}

function renderAnalysis() {
  const home = getTeamById($("#homeTeamSelect").value);
  const away = getTeamById($("#awayTeamSelect").value);
  const result = calculateProbabilities(home, away);
  if (home.id === away.id) {
    $("#analysisCard").innerHTML = `<p class="empty-state">${t("sameTeam")}</p>`;
    return;
  }
  const factorNames = { strength: t("factorStrength"), form: t("factorForm"), ranking: t("factorRanking") };
  $("#analysisCard").innerHTML = `
    <div class="analysis-teams">
      <div><span>${home.flag}</span><b>${teamName(home)}</b><small>${result.home}% ${t("win")}</small></div>
      <div class="draw-ring"><b>${result.draw}%</b><small>${t("draw")}</small></div>
      <div><span>${away.flag}</span><b>${teamName(away)}</b><small>${result.away}% ${t("win")}</small></div>
    </div>
    <div class="analysis-track"><i style="width:${result.home}%"></i><i style="width:${result.draw}%"></i><i style="width:${result.away}%"></i></div>
    <div class="factor-list">${result.factors.map((factor) => `
      <div><span>${factorNames[factor.key]} <small>${factor.weight}% ${t("weights")}</small></span><b>${factor.home}</b><i><em style="width:${factor.home / (factor.home + factor.away) * 100}%"></em></i><b>${factor.away}</b></div>`).join("")}
    </div>
    <p class="model-note"><b>${t("modelView")}:</b> ${teamName(result.home > result.away ? home : away)} ${t("favoured")}${t("volatile")}</p>
    <div class="model-picks">
      <button type="button" data-model-predict="home" class="${state.predictions[`${home.id}-${away.id}`] === "home" ? "selected" : ""}">${result.home}% ${t("homeWin")}</button>
      <button type="button" data-model-predict="draw" class="${state.predictions[`${home.id}-${away.id}`] === "draw" ? "selected" : ""}">${result.draw}% ${t("draw")}</button>
      <button type="button" data-model-predict="away" class="${state.predictions[`${home.id}-${away.id}`] === "away" ? "selected" : ""}">${result.away}% ${t("awayWin")}</button>
    </div>`;
}

function renderAll() {
  applyStaticCopy();
  renderSnapshotMeta();
  renderViewingControls();
  renderHero();
  renderCalendarDays();
  renderSchedule();
  renderResults();
  fillSelects(true);
  renderTeams();
  renderAnalysis();
  if (state.openTeam) renderTeamModal(state.openTeam);
  persist();
}

document.addEventListener("click", (event) => {
  const calendarButton = event.target.closest("[data-calendar-date]");
  if (calendarButton) {
    state.selectedDate = calendarButton.dataset.calendarDate;
    renderCalendarDays();
    renderSchedule();
  }

  const teamButton = event.target.closest("[data-team-details]");
  if (teamButton) renderTeamModal(teamButton.dataset.teamDetails);

  const supportButton = event.target.closest("[data-support]");
  if (supportButton) {
    const id = supportButton.dataset.support;
    state.supported.has(id) ? state.supported.delete(id) : state.supported.add(id);
    persist();
    renderTeams();
    if (state.openTeam) renderTeamModal(state.openTeam);
    showToast(state.supported.has(id) ? t("joined") : t("left"));
  }

  const analyseMatch = event.target.closest("[data-analyse-match]");
  if (analyseMatch) {
    const match = schedule.find((item) => item.id === Number(analyseMatch.dataset.analyseMatch));
    $("#homeTeamSelect").value = getTeamByName(match.home).id;
    $("#awayTeamSelect").value = getTeamByName(match.away).id;
    renderAnalysis();
    $("#predict").scrollIntoView({ behavior: "smooth" });
  }

  const teamAnalysis = event.target.closest("[data-team-analysis]");
  if (teamAnalysis) {
    const team = getTeamById(teamAnalysis.dataset.teamAnalysis);
    const opponent = teams.find((item) => item.id !== team.id && item.group === team.group) || teams[0];
    $("#homeTeamSelect").value = team.id;
    $("#awayTeamSelect").value = opponent.id;
    renderAnalysis();
    closeModal();
    $("#predict").scrollIntoView({ behavior: "smooth" });
  }

  const modelPrediction = event.target.closest("[data-model-predict]");
  if (modelPrediction) {
    const home = getTeamById($("#homeTeamSelect").value);
    const away = getTeamById($("#awayTeamSelect").value);
    const key = `${home.id}-${away.id}`;
    if (!state.predictions[key]) state.points += 20;
    state.predictions[key] = modelPrediction.dataset.modelPredict;
    persist();
    renderAnalysis();
    showToast(t("predictionSaved"));
  }

  if (event.target.closest("[data-close-modal]") || event.target === $("#teamModal")) closeModal();
});

$("#languageToggle").addEventListener("click", () => {
  state.lang = state.lang === "zh" ? "en" : "zh";
  renderAll();
});
$("#regionSelect").addEventListener("change", (event) => {
  state.region = event.target.value;
  persist();
  renderViewingControls();
  renderSchedule();
});
$("#detectRegion").addEventListener("click", () => {
  state.region = detectViewingRegion(state.browserTimeZone, navigator.language);
  persist();
  renderViewingControls();
  renderSchedule();
});
$("#stageFilter").addEventListener("change", renderSchedule);
$("#statusFilter").addEventListener("change", renderSchedule);
$("#scheduleSearch").addEventListener("input", renderSchedule);
$("#resetSchedule").addEventListener("click", () => {
  state.selectedDate = defaultScheduleDate(schedule, state.browserTimeZone);
  $("#stageFilter").value = "all";
  $("#statusFilter").value = "all";
  $("#scheduleSearch").value = "";
  renderCalendarDays();
  renderSchedule();
});
$("#teamSearch").addEventListener("input", renderTeams);
$("#groupFilter").addEventListener("change", renderTeams);
$("#runAnalysis").addEventListener("click", renderAnalysis);
$("#methodButton").addEventListener("click", () => $("#method").scrollIntoView({ behavior: "smooth" }));
$("#swapTeams").addEventListener("click", () => {
  const home = $("#homeTeamSelect").value;
  $("#homeTeamSelect").value = $("#awayTeamSelect").value;
  $("#awayTeamSelect").value = home;
  renderAnalysis();
});
$("#profileButton").addEventListener("click", () => showToast(t("profileSummary")
  .replace("{teams}", state.supported.size)
  .replace("{predictions}", Object.keys(state.predictions).length)));

$$("[data-shot]").forEach((button) => button.addEventListener("click", () => {
  if (state.gameRound >= 5) return showToast(t("gameOver"));
  const directions = ["left", "center", "right"];
  const keeperDirection = directions[Math.floor(Math.random() * directions.length)];
  const goal = keeperDirection !== button.dataset.shot;
  state.gameRound += 1;
  if (goal) {
    state.gameGoals += 1;
    state.points += 15;
  }
  $("#keeper").className = `keeper dive-${keeperDirection}`;
  $("#gameScore").textContent = `${state.gameGoals} / 5`;
  $("#gameMessage").textContent = goal ? t("goal") : t("saved");
  persist();
  if (state.gameRound === 5) setTimeout(() => showToast(t("gameResult").replace("{goals}", state.gameGoals)), 400);
}));
$("#resetGame").addEventListener("click", () => {
  state.gameRound = 0;
  state.gameGoals = 0;
  $("#gameScore").textContent = "0 / 5";
  $("#gameMessage").textContent = t("chooseDirection");
  $("#keeper").className = "keeper";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#teamModal").hidden) closeModal();
});

$("#totalMatches").textContent = schedule.length;
$("#finishedMatches").textContent = schedule.filter((match) => match.status === "finished").length;
$("#upcomingMatches").textContent = schedule.filter((match) => match.status === "upcoming").length;
$("#liveMatches").textContent = schedule.filter((match) => match.status === "live").length;
$("#groupFilter").innerHTML = `<option value="all" data-i18n="allGroups">${t("allGroups")}</option>`;
fillSelects();
renderAll();

console.info(`Pulse26 schedule: ${schedule.length} matches; source snapshot ${scheduleSource.snapshot}`);
