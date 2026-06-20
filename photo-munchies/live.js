const els = {
  startPanel: document.getElementById("startPanel"),
  gamePanel: document.getElementById("gamePanel"),
  resultPanel: document.getElementById("resultPanel"),
  startButton: document.getElementById("startButton"),
  video: document.getElementById("cameraVideo"),
  canvas: document.getElementById("gameCanvas"),
  scoreText: document.getElementById("scoreText"),
  comboText: document.getElementById("comboText"),
  timeText: document.getElementById("timeText"),
  mouthButton: document.getElementById("mouthButton"),
  restartButton: document.getElementById("restartButton"),
  statusText: document.getElementById("statusText"),
  rankText: document.getElementById("rankText"),
  finalText: document.getElementById("finalText"),
  saveButton: document.getElementById("saveButton"),
  playAgainButton: document.getElementById("playAgainButton"),
  saveHint: document.getElementById("saveHint"),
};

const ctx = els.canvas.getContext("2d");
const W = els.canvas.width;
const H = els.canvas.height;
const mouth = { x: 0.5, y: 0.57 };
const duration = 20;

let stream = null;
let recorder = null;
let chunks = [];
let replayUrl = "";
let raf = 0;
let startedAt = 0;
let mouthOpen = false;
let hold = 0;
let score = 0;
let combo = 0;
let best = Number(localStorage.getItem("photoMunchiesWebBest") || 0);
let ended = false;
let foods = [];
let pops = [];

function resetFoods() {
  foods = [
    food("regular", 0.08, 0.18, 0.0, 0.010),
    food("regular", 0.92, 0.20, 0.7, 0.010),
    food("regular", 0.10, 0.80, 1.5, 0.011),
    food("regular", 0.88, 0.78, 2.2, 0.011),
    food("golden", 0.50, 0.08, 3.8, 0.013),
    food("regular", 0.08, 0.50, 5.0, 0.012),
    food("regular", 0.92, 0.52, 5.5, 0.012),
    food("chili", 0.50, 0.92, 6.4, 0.011),
    food("regular", 0.16, 0.12, 7.8, 0.014),
    food("regular", 0.84, 0.12, 8.1, 0.014),
    food("regular", 0.14, 0.88, 10.0, 0.015),
    food("golden", 0.88, 0.84, 12.0, 0.016),
  ];
}

function food(kind, x, y, spawn, speed) {
  return { kind, x, y, spawn, speed, done: false, rot: Math.random() * 0.7 - 0.35 };
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1080 } },
      audio: false,
    });
    els.video.srcObject = stream;
  } catch (error) {
    els.statusText.textContent = "Camera blocked. You can still play the overlay demo.";
  }
}

function show(panel) {
  [els.startPanel, els.gamePanel, els.resultPanel].forEach((el) => el.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function startRound() {
  show(els.gamePanel);
  resetFoods();
  pops = [];
  score = 0;
  combo = 0;
  hold = 0;
  ended = false;
  startedAt = performance.now();
  chunks = [];
  replayUrl = "";
  els.saveButton.disabled = true;
  startRecording();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function startRecording() {
  if (!els.canvas.captureStream || !window.MediaRecorder) {
    els.saveHint.textContent = "Replay recording is not supported in this browser.";
    return;
  }
  try {
    const canvasStream = els.canvas.captureStream(30);
    recorder = new MediaRecorder(canvasStream, { mimeType: "video/webm" });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      replayUrl = URL.createObjectURL(blob);
      els.saveButton.disabled = false;
      els.saveHint.textContent = "Tap Save replay to download the web recording.";
    };
    recorder.start();
  } catch (error) {
    recorder = null;
    els.saveHint.textContent = "Replay recording could not start here.";
  }
}

function stopRecording() {
  if (recorder && recorder.state === "recording") recorder.stop();
}

function loop(now) {
  const elapsed = (now - startedAt) / 1000;
  const left = Math.max(0, duration - elapsed);
  if (mouthOpen) hold += 1 / 60;
  else hold = 0;

  updateFoods(elapsed);
  updatePops();
  draw(elapsed, left);
  updateHud(left);

  if (left <= 0 && !ended) {
    finishRound();
    return;
  }
  raf = requestAnimationFrame(loop);
}

function updateFoods(elapsed) {
  for (const item of foods) {
    if (item.done || elapsed < item.spawn) continue;
    item.x += (mouth.x - item.x) * item.speed;
    item.y += (mouth.y - item.y) * item.speed;
    const d = Math.hypot(item.x - mouth.x, item.y - mouth.y);
    if (mouthOpen && hold >= 0.24 && d < 0.11) {
      eat(item);
      item.done = true;
    } else if (d < 0.035) {
      if (item.kind !== "chili") {
        combo = 0;
        pops.push(pop("MISS", item.x, item.y, "#fff"));
      }
      item.done = true;
    }
  }
}

function eat(item) {
  if (item.kind === "chili") {
    combo = 0;
    score = Math.max(0, score - 150);
    pops.push(pop("YUCK!", mouth.x, mouth.y, "#b99bff", true));
    return;
  }
  combo += 1;
  const base = item.kind === "golden" ? 500 : 100;
  const points = base + Math.min(combo, 5) * 25;
  score += points;
  best = Math.max(best, score);
  localStorage.setItem("photoMunchiesWebBest", String(best));
  pops.push(pop(combo >= 3 ? `COMBO x${combo}` : `CHOMP +${points}`, mouth.x, mouth.y, "#ffcf5c", combo >= 3));
}

function pop(text, x, y, color, big = false) {
  return { text, x, y, color, age: 0, big };
}

function updatePops() {
  pops.forEach((item) => (item.age += 1 / 60));
  pops = pops.filter((item) => item.age < 0.8);
}

function updateHud(left) {
  els.scoreText.textContent = score;
  els.comboText.textContent = `x${combo}`;
  els.timeText.textContent = Math.ceil(left);
  els.statusText.textContent = mouthOpen
    ? hold >= 0.24 ? "Mouth locked. CHOMP!" : "Keep holding..."
    : "Hold when food reaches the giant mouth.";
}

function draw(elapsed, left) {
  ctx.clearRect(0, 0, W, H);
  drawCameraFallback();
  drawMouth();
  foods.forEach((item) => {
    if (!item.done && elapsed >= item.spawn) drawFood(item);
  });
  drawPops();
  if (left <= 3) drawFinalRush(left);
}

function drawCameraFallback() {
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  if (els.video.readyState >= 2) {
    const scale = Math.max(W / els.video.videoWidth, H / els.video.videoHeight);
    const w = els.video.videoWidth * scale;
    const h = els.video.videoHeight * scale;
    ctx.drawImage(els.video, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#d7f1ff");
    gradient.addColorStop(1, "#fff0c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, W, H);
}

function drawMouth() {
  const x = mouth.x * W;
  const y = mouth.y * H;
  const width = mouthOpen ? 220 : 140;
  const height = mouthOpen ? 300 : 82;
  roundRect(x - width / 2, y - height / 2, width, height, mouthOpen ? 70 : 34, "#050505");
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  drawTeeth(x, y - height / 2 + 22, width * 0.68, mouthOpen ? 38 : 28, false);
  if (mouthOpen) drawTeeth(x, y + height / 2 - 60, width * 0.68, 38, true);
  ctx.fillStyle = "#ff5f7d";
  if (mouthOpen) {
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.18, width * 0.28, height * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHoldMeter(x, y + height / 2 + 26);
}

function drawTeeth(cx, y, width, height, flipped) {
  const count = 5;
  const toothW = width / count - 5;
  ctx.fillStyle = "#fff";
  for (let i = 0; i < count; i += 1) {
    const x = cx - width / 2 + i * (width / count) + 3;
    roundRect(x, y, toothW, height, 8, "#fff");
    ctx.strokeStyle = "#d8d8d8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawHoldMeter(x, y) {
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  roundRect(x - 70, y, 140, 18, 9, ctx.fillStyle);
  ctx.fillStyle = hold >= 0.24 ? "#4fcf96" : "#ffcf5c";
  roundRect(x - 70, y, 140 * Math.min(1, hold / 0.24), 18, 9, ctx.fillStyle);
}

function drawFood(item) {
  const x = item.x * W;
  const y = item.y * H;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(item.rot);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#131b2a";
  ctx.fillStyle = "#8b5a2b";
  roundRect(-54, -5, 108, 10, 5, "#8b5a2b");
  const colors = item.kind === "golden" ? ["#ffcf5c", "#fff0ad"] : item.kind === "chili" ? ["#ff5f7d", "#b99bff"] : ["#ff8b6b", "#ffcf5c"];
  for (let i = 0; i < 4; i += 1) {
    roundRect(-42 + i * 26, -22 + (i % 2) * 4, 30, 44, 10, colors[i % 2]);
    ctx.stroke();
  }
  if (item.kind === "chili") {
    ctx.fillStyle = "#fff";
    ctx.font = "900 30px system-ui";
    ctx.fillText("!", 38, -24);
  }
  ctx.restore();
}

function drawPops() {
  for (const item of pops) {
    ctx.globalAlpha = Math.max(0, 1 - item.age * 1.5);
    ctx.fillStyle = item.color;
    ctx.font = `1000 ${item.big ? 52 : 36}px system-ui`;
    ctx.textAlign = "center";
    ctx.strokeStyle = "#131b2a";
    ctx.lineWidth = 7;
    const y = item.y * H - item.age * 70;
    ctx.strokeText(item.text, item.x * W, y);
    ctx.fillText(item.text, item.x * W, y);
  }
  ctx.globalAlpha = 1;
}

function drawFinalRush(left) {
  ctx.fillStyle = "rgba(255,95,125,0.18)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = "1000 42px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("DOUBLE SCORE!", W / 2, 98);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function finishRound() {
  ended = true;
  cancelAnimationFrame(raf);
  stopRecording();
  els.rankText.textContent = score >= 1400 ? "Munch Master" : score >= 900 ? "Hungry Hero" : "Tiny Chomper";
  els.finalText.textContent = `Score ${score} · Best ${best}`;
  show(els.resultPanel);
}

function setMouth(open) {
  mouthOpen = open;
  els.mouthButton.classList.toggle("open", open);
}

els.startButton.addEventListener("click", async () => {
  await startCamera();
  startRound();
});
els.playAgainButton.addEventListener("click", startRound);
els.restartButton.addEventListener("click", startRound);
els.saveButton.addEventListener("click", () => {
  if (!replayUrl) return;
  const link = document.createElement("a");
  link.href = replayUrl;
  link.download = "photo-munchies-replay.webm";
  link.click();
});

["pointerdown", "touchstart"].forEach((eventName) => {
  els.mouthButton.addEventListener(eventName, (event) => {
    event.preventDefault();
    setMouth(true);
  });
});
["pointerup", "pointercancel", "pointerleave", "touchend", "touchcancel"].forEach((eventName) => {
  els.mouthButton.addEventListener(eventName, () => setMouth(false));
});
