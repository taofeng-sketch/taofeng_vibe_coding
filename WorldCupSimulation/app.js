import { groups, teams, matchDays, hydrateMatch } from "./data.js";
import { calculateProbabilities } from "./model.js";

const state = {
  points: Number(localStorage.getItem("pulse26-points") || 1250),
  supported: new Set(JSON.parse(localStorage.getItem("pulse26-supported") || "[]")),
  predictions: JSON.parse(localStorage.getItem("pulse26-predictions") || "{}"),
  cheers: JSON.parse(localStorage.getItem("pulse26-cheers") || "[]"),
  gameRound: 0,
  gameGoals: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const getTeam = (name) => teams.find((team) => team.name === name);

function persist() {
  localStorage.setItem("pulse26-points", state.points);
  localStorage.setItem("pulse26-supported", JSON.stringify([...state.supported]));
  localStorage.setItem("pulse26-predictions", JSON.stringify(state.predictions));
  localStorage.setItem("pulse26-cheers", JSON.stringify(state.cheers));
  $("#userPoints").textContent = state.points.toLocaleString();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function renderMatches(day = "today") {
  $("#matchGrid").innerHTML = matchDays[day].map(hydrateMatch).map((match, index) => {
    const probability = calculateProbabilities(match.homeTeam, match.awayTeam);
    const key = `${day}-${index}`;
    const prediction = state.predictions[key];
    return `
      <article class="match-card ${match.status === "featured" ? "featured" : ""}">
        <div class="match-meta"><span>${match.status === "finished" ? "比赛结束" : `GROUP ${match.homeTeam.group}`}</span><span>${match.venue}</span></div>
        <div class="match-time">${match.score || match.time}</div>
        <div class="match-teams">
          <div><span class="team-flag">${match.homeTeam.flag}</span><b>${match.homeTeam.zh}</b><small>#${match.homeTeam.rank}</small></div>
          <span class="vs">${match.status === "finished" ? "FT" : "VS"}</span>
          <div><span class="team-flag">${match.awayTeam.flag}</span><b>${match.awayTeam.zh}</b><small>#${match.awayTeam.rank}</small></div>
        </div>
        <div class="mini-probability">
          <span style="width:${probability.home}%"></span><span style="width:${probability.draw}%"></span><span style="width:${probability.away}%"></span>
        </div>
        <div class="match-actions">
          ${match.status === "finished" ? `<button type="button" disabled>查看复盘</button>` : `
            <button type="button" class="${prediction === "home" ? "selected" : ""}" data-predict="${key}" data-outcome="home">${probability.home}% 主胜</button>
            <button type="button" class="${prediction === "draw" ? "selected" : ""}" data-predict="${key}" data-outcome="draw">${probability.draw}% 平</button>
            <button type="button" class="${prediction === "away" ? "selected" : ""}" data-predict="${key}" data-outcome="away">${probability.away}% 客胜</button>
          `}
        </div>
      </article>`;
  }).join("");
}

function renderTeams() {
  const query = $("#teamSearch").value.trim().toLowerCase();
  const group = $("#groupFilter").value;
  const filtered = teams.filter((team) =>
    (group === "all" || team.group === group) &&
    [team.name, team.zh, team.star].some((value) => value.toLowerCase().includes(query))
  );
  $("#teamGrid").innerHTML = filtered.map((team) => `
    <article class="team-card ${state.supported.has(team.id) ? "supported" : ""}">
      <div class="team-card-top"><span>GROUP ${team.group}</span><span>世界 #${team.rank}</span></div>
      <span class="large-flag">${team.flag}</span>
      <h3>${team.zh}</h3><p>${team.name}</p>
      <div class="team-star"><span>关键球员</span><b>${team.star}</b></div>
      <div class="power-row"><span>实力指数</span><b>${team.power}</b></div>
      <div class="power-bar"><i style="width:${team.power}%"></i></div>
      <button type="button" data-support="${team.id}">${state.supported.has(team.id) ? "✓ 已加入阵营" : "+ 支持这支球队"}</button>
    </article>
  `).join("") || `<p class="empty-state">没有找到匹配的球队。</p>`;
}

function fillSelects() {
  const options = teams.map((team) => `<option value="${team.id}">${team.flag} ${team.zh} · #${team.rank}</option>`).join("");
  $("#homeTeamSelect").innerHTML = options;
  $("#awayTeamSelect").innerHTML = options;
  $("#cheerTeam").innerHTML = options;
  $("#homeTeamSelect").value = getTeam("Brazil").id;
  $("#awayTeamSelect").value = getTeam("Morocco").id;
  $("#groupFilter").innerHTML += Object.keys(groups).map((group) => `<option value="${group}">GROUP ${group}</option>`).join("");
}

function renderAnalysis() {
  const home = teams.find((team) => team.id === $("#homeTeamSelect").value);
  const away = teams.find((team) => team.id === $("#awayTeamSelect").value);
  const result = calculateProbabilities(home, away);
  $("#analysisCard").innerHTML = `
    <div class="analysis-teams">
      <div><span>${home.flag}</span><b>${home.zh}</b><small>${result.home}% 胜</small></div>
      <div class="draw-ring"><b>${result.draw}%</b><small>平局</small></div>
      <div><span>${away.flag}</span><b>${away.zh}</b><small>${result.away}% 胜</small></div>
    </div>
    <div class="analysis-track"><i style="width:${result.home}%"></i><i style="width:${result.draw}%"></i><i style="width:${result.away}%"></i></div>
    <div class="factor-list">
      ${result.factors.map((factor) => `<div><span>${factor.label}</span><b>${factor.home}</b><i><em style="width:${factor.home / (factor.home + factor.away) * 100}%"></em></i><b>${factor.away}</b></div>`).join("")}
    </div>
    <p class="model-note">模型观点：${result.home > result.away ? home.zh : away.zh}纸面占优，但足球结果存在高波动。概率不是承诺。</p>`;
}

function renderCheers() {
  const defaults = [
    { team: getTeam("Japan").id, message: "保持节奏，把每一次逼抢做到极致。", time: "刚刚" },
    { team: getTeam("Morocco").id, message: "继续写下属于北非足球的新故事！", time: "2 分钟前" }
  ];
  const entries = [...state.cheers, ...defaults].slice(0, 5);
  $("#cheerWall").innerHTML = entries.map((entry) => {
    const team = teams.find((item) => item.id === entry.team);
    return `<div class="cheer-item"><span>${team.flag}</span><div><b>${team.zh}球迷</b><p>${entry.message}</p><small>${entry.time}</small></div></div>`;
  }).join("");
}

document.addEventListener("click", (event) => {
  const predictionButton = event.target.closest("[data-predict]");
  if (predictionButton) {
    const key = predictionButton.dataset.predict;
    if (!state.predictions[key]) state.points += 20;
    state.predictions[key] = predictionButton.dataset.outcome;
    persist();
    renderMatches($(".date-tabs .active").dataset.day);
    showToast("预测已锁定，获得 20 PTS 参与分");
  }

  const supportButton = event.target.closest("[data-support]");
  if (supportButton) {
    const id = supportButton.dataset.support;
    state.supported.has(id) ? state.supported.delete(id) : state.supported.add(id);
    persist();
    renderTeams();
    showToast(state.supported.has(id) ? "已加入球队阵营" : "已取消支持");
  }
});

$$(".date-tabs button").forEach((button) => button.addEventListener("click", () => {
  $$(".date-tabs button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  renderMatches(button.dataset.day);
}));

$("#teamSearch").addEventListener("input", renderTeams);
$("#groupFilter").addEventListener("change", renderTeams);
$("#runAnalysis").addEventListener("click", renderAnalysis);
$("#swapTeams").addEventListener("click", () => {
  const home = $("#homeTeamSelect").value;
  $("#homeTeamSelect").value = $("#awayTeamSelect").value;
  $("#awayTeamSelect").value = home;
  renderAnalysis();
});
$("#profileButton").addEventListener("click", () => showToast(`你已支持 ${state.supported.size} 支球队，完成 ${Object.keys(state.predictions).length} 次预测`));

$("#cheerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.cheers.unshift({ team: $("#cheerTeam").value, message: $("#cheerMessage").value.trim(), time: "刚刚" });
  state.points += 10;
  $("#cheerMessage").value = "";
  persist();
  renderCheers();
  showToast("助威已加入你的本地看台，+10 PTS");
});

$$("[data-shot]").forEach((button) => button.addEventListener("click", () => {
  if (state.gameRound >= 5) return showToast("本轮已结束，请重新开始");
  const directions = ["left", "center", "right"];
  const keeperDirection = directions[Math.floor(Math.random() * directions.length)];
  const shot = button.dataset.shot;
  const goal = keeperDirection !== shot;
  state.gameRound += 1;
  if (goal) {
    state.gameGoals += 1;
    state.points += 15;
  }
  $("#keeper").className = `keeper dive-${keeperDirection}`;
  $("#gameScore").textContent = `${state.gameGoals} / 5`;
  $("#gameMessage").textContent = goal ? "球进了！+15 PTS" : "被扑出！守门员读对了方向";
  persist();
  if (state.gameRound === 5) setTimeout(() => showToast(`挑战结束：5 轮打进 ${state.gameGoals} 球`), 500);
}));

$("#resetGame").addEventListener("click", () => {
  state.gameRound = 0;
  state.gameGoals = 0;
  $("#gameScore").textContent = "0 / 5";
  $("#gameMessage").textContent = "选择一个方向开始";
  $("#keeper").className = "keeper";
});

fillSelects();
renderMatches();
renderTeams();
renderAnalysis();
renderCheers();
persist();
