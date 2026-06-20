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

const MEDIAPIPE_VERSION = "0.10.35";
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const ctx = els.canvas.getContext("2d");
const W = els.canvas.width;
const H = els.canvas.height;
const mouth = { x: 0.5, y: 0.57, targetX: 0.5, targetY: 0.57, openness: 0 };
const duration = 20;
const trackingPill = document.createElement("div");
trackingPill.className = "tracking-pill";
trackingPill.textContent = "Loading face tracking...";
document.querySelector(".stage").appendChild(trackingPill);

let stream = null;
let recorder = null;
let chunks = [];
let replayUrl = "";
let raf = 0;
let startedAt = 0;
let mouthOpen = false;
let manualMouthOpen = false;
let hold = 0;
let score = 0;
let combo = 0;
let best = Number(localStorage.getItem("photoMunchiesWebBest") || 0);
let ended = false;
let foods = [];
let pops = [];
let faceLandmarker = null;
let faceTrackingReady = false;
let faceTrackingFailed = false;
let faceTracked = false;
let lastTrackingAt = 0;
let lastVideoTime = -1;
let mouthOpenSmooth = 0;
let biteFlash = 0;

function resetFoods() {
  foods = [
    food("regular", 0.08, 0.18, 0.0, 0.018),
    food("regular", 0.92, 0.20, 0.9, 0.018),
    food("regular", 0.10, 0.80, 1.8, 0.019),
    food("regular", 0.88, 0.78, 2.7, 0.019),
    food("golden", 0.50, 0.08, 4.0, 0.020),
    food("regular", 0.08, 0.50, 5.2, 0.020),
    food("regular", 0.92, 0.52, 6.1, 0.020),
    food("chili", 0.50, 0.92, 7.2, 0.019),
    food("regular", 0.16, 0.12, 8.7, 0.022),
    food("regular", 0.84, 0.12, 9.6, 0.022),
    food("regular", 0.14, 0.88, 11.4, 0.023),
    food("golden", 0.88, 0.84, 13.0, 0.024),
    food("regular", 0.50, 0.05, 15.2, 0.025),
    food("regular", 0.06, 0.60, 16.6, 0.026),
  ];
}

function food(kind, x, y, spawn, speed) {
  return { kind, x, y, spawn, speed, done: false, atMouthFor: 0, rot: Math.random() * 0.7 - 0.35 };
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1080 } },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
  } catch (error) {
    els.statusText.textContent = "Camera blocked. You can still play the overlay demo.";
  }
}

async function initFaceTracking() {
  if (faceLandmarker || faceTrackingFailed) return;
  try {
    const vision = await import(`${MEDIAPIPE_BASE}/vision_bundle.mjs`);
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE_BASE}/wasm`);
    faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
    });
    faceTrackingReady = true;
    faceTrackingFailed = false;
    els.mouthButton.classList.add("hidden");
    setTrackingPill("Face tracking ready", "ready");
  } catch (error) {
    faceTrackingFailed = true;
    faceTrackingReady = false;
    els.mouthButton.classList.remove("hidden");
    setTrackingPill("Fallback mouth button", "fallback");
    els.statusText.textContent = "Face tracking did not load. Use the fallback mouth button.";
  }
}

function setTrackingPill(text, state) {
  trackingPill.textContent = text;
  trackingPill.classList.remove("ready", "open", "fallback");
  if (state) trackingPill.classList.add(state);
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
  faceTracked = false;
  lastVideoTime = -1;
  mouthOpenSmooth = 0;
  mouth.x = mouth.targetX = 0.5;
  mouth.y = mouth.targetY = 0.57;
  mouth.openness = 0;
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
  updateFaceTracking(now);
  if (mouthOpen) hold += 1 / 60;
  else hold = 0;
  biteFlash = Math.max(0, biteFlash - 1 / 60);

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
    const speed = item.atMouthFor > 0 ? item.speed * 0.34 : item.speed;
    item.x += (mouth.x - item.x) * speed;
    item.y += (mouth.y - item.y) * speed;
    const d = Math.hypot(item.x - mouth.x, item.y - mouth.y);
    if (mouthOpen && d < 0.13) {
      eat(item);
      item.done = true;
    } else if (d < 0.065) {
      item.atMouthFor += 1 / 60;
    }
    if (!item.done && item.atMouthFor > 1.15) {
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
    biteFlash = 0.22;
    return;
  }
  combo += 1;
  const base = item.kind === "golden" ? 500 : 100;
  const timeBonus = duration - (performance.now() - startedAt) / 1000 <= 3 ? 2 : 1;
  const points = (base + Math.min(combo, 5) * 25) * timeBonus;
  score += points;
  best = Math.max(best, score);
  localStorage.setItem("photoMunchiesWebBest", String(best));
  pops.push(pop(combo >= 3 ? `COMBO x${combo}` : `CHOMP +${points}`, mouth.x, mouth.y, "#ffcf5c", combo >= 3));
  biteFlash = 0.22;
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
  if (faceTrackingFailed) {
    els.statusText.textContent = mouthOpen ? "Fallback mouth open. CHOMP!" : "Fallback mode: hold when food reaches the mouth.";
    return;
  }
  if (!faceTrackingReady) {
    els.statusText.textContent = "Loading face tracker...";
    return;
  }
  if (!faceTracked) {
    els.statusText.textContent = "Move your face into the camera.";
    return;
  }
  els.statusText.textContent = mouthOpen
    ? "Mouth open. CHOMP the food!"
    : "Close... wait... open when food reaches your mouth.";
}

function draw(elapsed, left) {
  ctx.clearRect(0, 0, W, H);
  drawCameraFallback();
  drawFaceTarget();
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

function updateFaceTracking(now) {
  const canTrack = faceTrackingReady && faceLandmarker && els.video.readyState >= 2;
  if (!canTrack) {
    setMouth(faceTrackingFailed ? manualMouthOpen : false);
    return;
  }
  if (els.video.currentTime === lastVideoTime) return;
  lastVideoTime = els.video.currentTime;
  const result = faceLandmarker.detectForVideo(els.video, now);
  const landmarks = result.faceLandmarks && result.faceLandmarks[0];
  if (!landmarks) {
    if (now - lastTrackingAt > 250) {
      faceTracked = false;
      setMouth(false);
      setTrackingPill("Find face", "");
    }
    return;
  }
  lastTrackingAt = now;
  faceTracked = true;
  const upperLip = mapLandmark(landmarks[13]);
  const lowerLip = mapLandmark(landmarks[14]);
  const leftCorner = mapLandmark(landmarks[61]);
  const rightCorner = mapLandmark(landmarks[291]);
  const center = {
    x: (upperLip.x + lowerLip.x + leftCorner.x + rightCorner.x) / 4,
    y: (upperLip.y + lowerLip.y + leftCorner.y + rightCorner.y) / 4,
  };
  const verticalGap = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
  const mouthWidth = Math.max(0.001, Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y));
  const openness = Math.min(1, Math.max(0, (verticalGap / mouthWidth - 0.12) / 0.32));
  mouthOpenSmooth = mouthOpenSmooth * 0.64 + openness * 0.36;
  mouth.targetX = clamp(center.x, 0.12, 0.88);
  mouth.targetY = clamp(center.y + 0.015, 0.18, 0.82);
  mouth.x += (mouth.targetX - mouth.x) * 0.38;
  mouth.y += (mouth.targetY - mouth.y) * 0.38;
  mouth.openness = mouthOpenSmooth;
  setMouth(mouthOpenSmooth > 0.36);
  setTrackingPill(mouthOpen ? "Mouth open" : "Face tracked", mouthOpen ? "open" : "ready");
}

function mapLandmark(point) {
  const fit = getVideoFit();
  const rawX = fit.x + point.x * fit.w;
  const rawY = fit.y + point.y * fit.h;
  return {
    x: clamp((W - rawX) / W, 0, 1),
    y: clamp(rawY / H, 0, 1),
  };
}

function getVideoFit() {
  if (!els.video.videoWidth || !els.video.videoHeight) return { x: 0, y: 0, w: W, h: H };
  const scale = Math.max(W / els.video.videoWidth, H / els.video.videoHeight);
  const w = els.video.videoWidth * scale;
  const h = els.video.videoHeight * scale;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

function drawFaceTarget() {
  if (!faceTracked && !faceTrackingFailed) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.44, W * 0.24, H * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMouth() {
  const x = mouth.x * W;
  const y = mouth.y * H;
  const openAmount = faceTrackingFailed ? (mouthOpen ? 1 : 0) : mouth.openness;
  const width = 132 + openAmount * 96 + biteFlash * 120;
  const height = 74 + openAmount * 235 + biteFlash * 120;
  roundRect(x - width / 2, y - height / 2, width, height, mouthOpen ? 70 : 34, "#050505");
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  drawTeeth(x, y - height / 2 + 22, width * 0.68, mouthOpen ? 38 : 28);
  if (mouthOpen) drawTeeth(x, y + height / 2 - 60, width * 0.68, 38);
  ctx.fillStyle = "#ff5f7d";
  if (mouthOpen) {
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.18, width * 0.28, height * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMouthMeter(x, y + height / 2 + 26);
}

function drawTeeth(cx, y, width, height) {
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

function drawMouthMeter(x, y) {
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  roundRect(x - 70, y, 140, 18, 9, ctx.fillStyle);
  ctx.fillStyle = mouthOpen ? "#4fcf96" : "#ffcf5c";
  roundRect(x - 70, y, 140 * Math.min(1, faceTrackingFailed ? hold / 0.2 : mouth.openness), 18, 9, ctx.fillStyle);
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
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
  }
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
  show(els.gamePanel);
  els.statusText.textContent = "Starting camera and face tracker...";
  await startCamera();
  await initFaceTracking();
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
    manualMouthOpen = true;
    setMouth(true);
  });
});
["pointerup", "pointercancel", "pointerleave", "touchend", "touchcancel"].forEach((eventName) => {
  els.mouthButton.addEventListener(eventName, () => {
    manualMouthOpen = false;
    setMouth(false);
  });
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
