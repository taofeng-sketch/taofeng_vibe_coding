const els = {
  startPanel: document.getElementById("startPanel"),
  gamePanel: document.getElementById("gamePanel"),
  resultPanel: document.getElementById("resultPanel"),
  startButton: document.getElementById("startButton"),
  video: document.getElementById("cameraVideo"),
  canvas: document.getElementById("gameCanvas"),
  hud: document.querySelector(".hud"),
  twoPlayerToggle: document.getElementById("twoPlayerToggle"),
  scoreText: document.getElementById("scoreText"),
  score2Text: document.getElementById("score2Text"),
  p2Stat: document.getElementById("p2Stat"),
  comboText: document.getElementById("comboText"),
  timeText: document.getElementById("timeText"),
  energyText: document.getElementById("energyText"),
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
const duration = 32;
const FRUITS = {
  watermelon: { label: "WATERMELON", color: "#4fcf96", flesh: "#ff5f7d", seed: "#131b2a", points: 120, radius: 40 },
  mango: { label: "MANGO", color: "#ffb02e", flesh: "#ffcf5c", seed: "#7a4b11", points: 130, radius: 38 },
  strawberry: { label: "STRAWBERRY", color: "#ff3f6b", flesh: "#ff7d94", seed: "#fff0ad", points: 110, radius: 36 },
  blueberry: { label: "BLUEBERRY", color: "#5c68ff", flesh: "#b99bff", seed: "#fff", points: 100, radius: 34 },
  kiwi: { label: "KIWI", color: "#8fd14f", flesh: "#c8ff80", seed: "#131b2a", points: 140, radius: 37 },
  golden: { label: "GOLDEN MANGO", color: "#ffcf5c", flesh: "#fff0ad", seed: "#8b5a2b", points: 360, radius: 42 },
};
const trackingPill = document.createElement("div");
trackingPill.className = "tracking-pill";
trackingPill.textContent = "Loading face tracking...";
document.querySelector(".stage").appendChild(trackingPill);

let stream = null;
let recorder = null;
let chunks = [];
let replayUrl = "";
let replayExtension = "webm";
let raf = 0;
let startedAt = 0;
let mouthOpen = false;
let mouthWantsOpen = false;
let mouthTired = false;
let stamina = 1;
let player2 = makePlayer2();
let twoPlayerMode = false;
let manualMouthOpen = false;
let hold = 0;
let score = 0;
let combo = 0;
let best = Number(localStorage.getItem("photoMunchiesWebBest") || 0);
let ended = false;
let foods = [];
let pops = [];
let splats = [];
let faceLandmarker = null;
let faceTrackingReady = false;
let faceTrackingFailed = false;
let faceTracked = false;
let lastTrackingAt = 0;
let lastVideoTime = -1;
let mouthOpenSmooth = 0;
let biteFlash = 0;
let screenShake = 0;

function makePlayer2() {
  return {
    mouth: { x: 0.64, y: 0.57, targetX: 0.64, targetY: 0.57, openness: 0 },
    mouthOpen: false,
    mouthWantsOpen: false,
    mouthTired: false,
    stamina: 1,
    score: 0,
    combo: 0,
    tracked: false,
    openSmooth: 0,
    biteFlash: 0,
    lastTrackingAt: 0,
  };
}

function resetFoods() {
  const kinds = ["watermelon", "mango", "strawberry", "blueberry", "kiwi"];
  foods = Array.from({ length: 26 }, (_, index) => {
    const kind = index === 8 || index === 19 ? "golden" : kinds[index % kinds.length];
    const edge = index % 4;
    const start = edge === 0 ? [0.04, 0.14 + Math.random() * 0.72]
      : edge === 1 ? [0.96, 0.14 + Math.random() * 0.72]
      : edge === 2 ? [0.16 + Math.random() * 0.68, 0.06]
      : [0.16 + Math.random() * 0.68, 0.94];
    return food(kind, start[0], start[1], index * 1.08, 0.018 + Math.min(index, 18) * 0.0006);
  });
}

function food(kind, x, y, spawn, speed) {
  const roam = Math.random() < 0.2;
  return {
    kind,
    x,
    y,
    spawn,
    speed,
    done: false,
    atMouthFor: 0,
    mode: roam ? "roam" : "mouth",
    targetPlayer: twoPlayerMode && Math.random() < 0.48 ? 1 : 0,
    targetX: 0.12 + Math.random() * 0.76,
    targetY: 0.16 + Math.random() * 0.68,
    wobble: Math.random() * Math.PI * 2,
    rot: Math.random() * 0.7 - 0.35,
  };
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
      numFaces: 2,
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
  twoPlayerMode = Boolean(els.twoPlayerToggle && els.twoPlayerToggle.checked);
  els.hud.classList.toggle("two-player", twoPlayerMode);
  els.p2Stat.classList.toggle("hidden", !twoPlayerMode);
  resetFoods();
  pops = [];
  splats = [];
  score = 0;
  combo = 0;
  hold = 0;
  stamina = 1;
  mouthTired = false;
  player2 = makePlayer2();
  ended = false;
  startedAt = performance.now();
  chunks = [];
  if (replayUrl) URL.revokeObjectURL(replayUrl);
  replayUrl = "";
  faceTracked = false;
  lastVideoTime = -1;
  mouthOpenSmooth = 0;
  mouth.x = mouth.targetX = 0.5;
  mouth.y = mouth.targetY = 0.57;
  mouth.openness = 0;
  els.score2Text.textContent = "0";
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
    const mimeType = pickRecordingMimeType();
    replayExtension = mimeType.includes("mp4") ? "mp4" : "webm";
    recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
      replayUrl = URL.createObjectURL(blob);
      els.saveButton.disabled = false;
      els.saveHint.textContent = `Tap Save replay to download the local ${replayExtension.toUpperCase()} recording.`;
    };
    recorder.start();
  } catch (error) {
    recorder = null;
    els.saveHint.textContent = "Replay recording could not start here.";
  }
}

function pickRecordingMimeType() {
  const options = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function stopRecording() {
  if (recorder && recorder.state === "recording") recorder.stop();
}

function loop(now) {
  const elapsed = (now - startedAt) / 1000;
  const left = Math.max(0, duration - elapsed);
  updateFaceTracking(now);
  updateStamina();
  updatePlayer2Stamina();
  if (mouthOpen) hold += 1 / 60;
  else hold = 0;
  biteFlash = Math.max(0, biteFlash - 1 / 60);
  player2.biteFlash = Math.max(0, player2.biteFlash - 1 / 60);
  screenShake = Math.max(0, screenShake - 1 / 60);

  updateFoods(elapsed);
  updatePops();
  updateSplats();
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
    const target = getFoodTarget(item);
    const targetD = Math.hypot(item.x - target.x, item.y - target.y);
    const speed = item.atMouthFor > 0 ? item.speed * 0.24 : item.speed;
    item.x += (target.x - item.x) * speed;
    item.y += (target.y - item.y) * speed;
    item.wobble += 0.08;
    if (item.mode === "roam") {
      item.x += Math.cos(item.wobble) * 0.0018;
      item.y += Math.sin(item.wobble * 1.25) * 0.0018;
    }

    const eater = getCatchingPlayer(item);
    if (eater !== -1) {
      eat(item, eater);
      item.done = true;
    } else if (targetD < (item.mode === "roam" ? 0.055 : 0.065)) {
      item.atMouthFor += 1 / 60;
    }
    if (!item.done && item.atMouthFor > (item.mode === "roam" ? 0.55 : 1.1)) {
      if (item.targetPlayer === 1) player2.combo = 0;
      else combo = 0;
      splat(item);
      pops.push(pop("SPLAT!", item.x, item.y, "#fff", true));
      item.done = true;
    }
  }
}

function getFoodTarget(item) {
  if (item.mode === "roam") {
    return { x: item.targetX, y: item.targetY };
  }
  if (twoPlayerMode && item.targetPlayer === 1 && player2.tracked) {
    return player2.mouth;
  }
  return mouth;
}

function getCatchingPlayer(item) {
  const d1 = Math.hypot(item.x - mouth.x, item.y - mouth.y);
  if (mouthOpen && d1 < 0.13) return 0;
  if (twoPlayerMode && player2.tracked) {
    const d2 = Math.hypot(item.x - player2.mouth.x, item.y - player2.mouth.y);
    if (player2.mouthOpen && d2 < 0.13) return 1;
  }
  return -1;
}

function eat(item, playerIndex = 0) {
  const fruit = FRUITS[item.kind] || FRUITS.watermelon;
  const activeCombo = playerIndex === 1 ? player2.combo + 1 : combo + 1;
  const base = fruit.points;
  const timeBonus = duration - (performance.now() - startedAt) / 1000 <= 3 ? 2 : 1;
  const points = (base + Math.min(activeCombo, 5) * 25 + (item.mode === "roam" ? 40 : 0)) * timeBonus;
  if (playerIndex === 1) {
    player2.combo = activeCombo;
    player2.score += points;
    player2.biteFlash = 0.22;
  } else {
    combo = activeCombo;
    score += points;
    biteFlash = 0.22;
  }
  best = Math.max(best, score, player2.score);
  localStorage.setItem("photoMunchiesWebBest", String(best));
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  pops.push(pop(activeCombo >= 3 ? `P${playerIndex + 1} COMBO x${activeCombo}` : `P${playerIndex + 1} +${points}`, activeMouth.x, activeMouth.y, "#ffcf5c", activeCombo >= 3));
}

function splat(item) {
  const fruit = FRUITS[item.kind] || FRUITS.watermelon;
  const drops = Array.from({ length: 46 }, () => ({
    dx: (Math.random() - 0.5) * 0.46,
    dy: (Math.random() - 0.5) * 0.42,
    vx: (Math.random() - 0.5) * 0.012,
    vy: -Math.random() * 0.010 + 0.002,
    r: 8 + Math.random() * 34,
    angle: Math.random() * Math.PI,
    seed: Math.random() > 0.38,
  }));
  const seeds = Array.from({ length: 36 }, () => ({
    dx: (Math.random() - 0.5) * 0.18,
    dy: (Math.random() - 0.5) * 0.14,
    vx: (Math.random() - 0.5) * 0.028,
    vy: (Math.random() - 0.7) * 0.026,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.28,
  }));
  splats.push({
    x: item.x,
    y: item.y,
    color: fruit.flesh,
    seedColor: fruit.seed,
    age: 0,
    drops,
    seeds,
  });
  screenShake = 0.18;
  splats = splats.slice(-10);
}

function pop(text, x, y, color, big = false) {
  return { text, x, y, color, age: 0, big };
}

function updatePops() {
  pops.forEach((item) => (item.age += 1 / 60));
  pops = pops.filter((item) => item.age < 0.8);
}

function updateSplats() {
  splats.forEach((item) => (item.age += 1 / 60));
  splats = splats.filter((item) => item.age < 6.2);
}

function updateStamina() {
  if (mouthWantsOpen && !mouthTired) {
    stamina -= 0.012;
  } else if (!mouthWantsOpen) {
    stamina += mouthTired ? 0.018 : 0.010;
  }
  stamina = clamp(stamina, 0, 1);
  if (stamina <= 0.02) mouthTired = true;
  if (!mouthWantsOpen && stamina >= 0.36) mouthTired = false;
  refreshEffectiveMouth();
}

function updatePlayer2Stamina() {
  if (!twoPlayerMode) return;
  if (player2.mouthWantsOpen && !player2.mouthTired) {
    player2.stamina -= 0.012;
  } else if (!player2.mouthWantsOpen) {
    player2.stamina += player2.mouthTired ? 0.018 : 0.010;
  }
  player2.stamina = clamp(player2.stamina, 0, 1);
  if (player2.stamina <= 0.02) player2.mouthTired = true;
  if (!player2.mouthWantsOpen && player2.stamina >= 0.36) player2.mouthTired = false;
  player2.mouthOpen = player2.mouthWantsOpen && !player2.mouthTired && player2.stamina > 0.04;
}

function refreshEffectiveMouth() {
  mouthOpen = mouthWantsOpen && !mouthTired && stamina > 0.04;
  els.mouthButton.classList.toggle("open", mouthOpen);
  els.mouthButton.classList.toggle("tired", mouthTired);
}

function updateHud(left) {
  els.scoreText.textContent = score;
  els.score2Text.textContent = player2.score;
  els.comboText.textContent = twoPlayerMode ? `P1 x${combo} / P2 x${player2.combo}` : `x${combo}`;
  els.timeText.textContent = Math.ceil(left);
  els.energyText.textContent = Math.round(stamina * 100);
  els.energyText.parentElement.classList.toggle("energy-low", stamina < 0.28);
  els.energyText.parentElement.classList.toggle("energy-good", stamina > 0.72);
  if (faceTrackingFailed) {
    els.statusText.textContent = mouthTired ? "Too tired. Close to recharge!" : mouthOpen ? "Fallback mouth open. CHOMP!" : "Fallback mode: hold when fruit reaches the mouth.";
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
  if (twoPlayerMode && !player2.tracked) {
    els.statusText.textContent = "P1 ready. Move a second face into the camera for P2.";
    return;
  }
  if (mouthTired) {
    els.statusText.textContent = "Mouth tired. Close your mouth to recharge!";
  } else if (mouthOpen) {
    els.statusText.textContent = "Mouth open. Catch the fruit!";
  } else {
    els.statusText.textContent = "Close to recharge. Open when fruit reaches your mouth.";
  }
}

function draw(elapsed, left) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake * 48, (Math.random() - 0.5) * screenShake * 48);
  }
  drawCameraFallback();
  drawFaceTarget();
  drawMouth();
  if (twoPlayerMode && player2.tracked) drawMouth(1);
  foods.forEach((item) => {
    if (!item.done && elapsed >= item.spawn) drawFood(item);
  });
  drawSplats();
  drawPops();
  if (left <= 3) drawFinalRush(left);
  ctx.restore();
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
  const allFaces = result.faceLandmarks || [];
  const landmarks = allFaces[0];
  if (!landmarks) {
    if (now - lastTrackingAt > 250) {
      faceTracked = false;
      setMouth(false);
      setTrackingPill("Find face", "");
    }
    player2.tracked = false;
    return;
  }
  lastTrackingAt = now;
  faceTracked = true;
  const p1Mouth = readMouthFromLandmarks(landmarks, mouth, mouthOpenSmooth);
  mouthOpenSmooth = p1Mouth.smooth;
  mouth.openness = mouthOpenSmooth;
  setMouth(mouthOpenSmooth > 0.36);

  if (twoPlayerMode && allFaces[1]) {
    player2.tracked = true;
    player2.lastTrackingAt = now;
    const p2Mouth = readMouthFromLandmarks(allFaces[1], player2.mouth, player2.openSmooth);
    player2.openSmooth = p2Mouth.smooth;
    player2.mouth.openness = player2.openSmooth;
    player2.mouthWantsOpen = player2.openSmooth > 0.36;
  } else {
    player2.tracked = false;
    player2.mouthWantsOpen = false;
  }

  const label = twoPlayerMode && player2.tracked ? "Two faces ready" : mouthTired ? "Recharge" : mouthOpen ? "Mouth open" : "Face tracked";
  setTrackingPill(label, mouthOpen ? "open" : "ready");
}

function readMouthFromLandmarks(landmarks, targetMouth, previousSmooth) {
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
  const smooth = previousSmooth * 0.64 + openness * 0.36;
  targetMouth.targetX = clamp(center.x, 0.12, 0.88);
  targetMouth.targetY = clamp(center.y + 0.015, 0.18, 0.82);
  targetMouth.x += (targetMouth.targetX - targetMouth.x) * 0.38;
  targetMouth.y += (targetMouth.targetY - targetMouth.y) * 0.38;
  return { smooth };
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

function drawMouth(playerIndex = 0) {
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  const activeOpen = playerIndex === 1 ? player2.mouthOpen : mouthOpen;
  const activeTired = playerIndex === 1 ? player2.mouthTired : mouthTired;
  const activeStamina = playerIndex === 1 ? player2.stamina : stamina;
  const activeFlash = playerIndex === 1 ? player2.biteFlash : biteFlash;
  const x = activeMouth.x * W;
  const y = activeMouth.y * H;
  const openAmount = playerIndex === 1 ? activeMouth.openness : faceTrackingFailed ? (mouthOpen ? 1 : 0) : activeMouth.openness;
  const width = 132 + openAmount * 96 + activeFlash * 120;
  const height = 74 + openAmount * 235 + activeFlash * 120;
  roundRect(x - width / 2, y - height / 2, width, height, activeOpen ? 70 : 34, "#050505");
  ctx.lineWidth = 7;
  ctx.strokeStyle = playerIndex === 1 ? "#8dd9ff" : "#fff";
  ctx.stroke();
  drawTeeth(x, y - height / 2 + 22, width * 0.68, activeOpen ? 38 : 28);
  if (activeOpen) drawTeeth(x, y + height / 2 - 60, width * 0.68, 38);
  ctx.fillStyle = "#ff5f7d";
  if (activeOpen) {
    ctx.beginPath();
    ctx.ellipse(x, y + height * 0.18, width * 0.28, height * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMouthMeter(x, y + height / 2 + 26, activeStamina, activeOpen, activeTired);
  if (playerIndex === 1) {
    ctx.fillStyle = "#8dd9ff";
    ctx.font = "1000 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("P2", x, y - height / 2 - 14);
  }
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

function drawMouthMeter(x, y, activeStamina = stamina, activeOpen = mouthOpen, activeTired = mouthTired) {
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  roundRect(x - 70, y, 140, 18, 9, ctx.fillStyle);
  ctx.fillStyle = activeTired ? "#ff5f7d" : activeOpen ? "#4fcf96" : "#ffcf5c";
  roundRect(x - 70, y, 140 * activeStamina, 18, 9, ctx.fillStyle);
}

function drawFood(item) {
  const fruit = FRUITS[item.kind] || FRUITS.watermelon;
  const x = item.x * W;
  const y = item.y * H;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(item.rot);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#131b2a";
  drawFruitShape(item.kind, fruit);
  ctx.restore();
}

function drawFruitShape(kind, fruit) {
  if (kind === "watermelon") {
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fruit.flesh;
    ctx.beginPath();
    ctx.arc(0, 2, 32, 0, Math.PI * 2);
    ctx.fill();
    drawSeeds(0, 0, fruit.seed, 8, 24);
  } else if (kind === "mango" || kind === "golden") {
    ctx.fillStyle = fruit.flesh;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 44, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-9, -11, 8, 15, -0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "strawberry") {
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.bezierCurveTo(-44, 4, -28, -38, 0, -22);
    ctx.bezierCurveTo(28, -38, 44, 4, 0, 42);
    ctx.fill();
    ctx.stroke();
    drawSeeds(0, 5, fruit.seed, 10, 25);
  } else if (kind === "blueberry") {
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2b357d";
    ctx.beginPath();
    ctx.arc(5, -8, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = fruit.flesh;
    ctx.beginPath();
    ctx.arc(0, 0, 39, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f5ffe0";
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    drawSeeds(0, 0, fruit.seed, 12, 21);
  }
}

function drawSeeds(cx, cy, color, count, radius) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * radius * 0.55, cy + Math.sin(a) * radius * 0.38, 3, 6, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSplats() {
  for (const item of splats) {
    const fade = Math.max(0, 1 - item.age / 6.2);
    ctx.save();
    ctx.globalAlpha = 0.96 * fade;
    ctx.translate(item.x * W, item.y * H);
    ctx.fillStyle = item.color;
    for (const drop of item.drops) {
      const px = (drop.dx + drop.vx * item.age * 9) * W;
      const py = (drop.dy + drop.vy * item.age * 9 + item.age * item.age * 0.006) * H;
      ctx.beginPath();
      ctx.ellipse(px, py, drop.r * (1 + item.age * 0.05), drop.r * (0.65 + Math.sin(item.age + drop.angle) * 0.18), drop.angle, 0, Math.PI * 2);
      ctx.fill();
      if (drop.seed) {
        ctx.fillStyle = item.seedColor;
        ctx.beginPath();
        ctx.ellipse(px + 3, py - 2, 3, 7, drop.angle + item.age * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = item.color;
      }
    }
    ctx.fillStyle = item.seedColor;
    for (const seed of item.seeds) {
      const sx = (seed.dx + seed.vx * item.age * 12) * W;
      const sy = (seed.dy + seed.vy * item.age * 12 + item.age * item.age * 0.009) * H;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4, 9, seed.angle + seed.spin * item.age * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
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
  const totalScore = twoPlayerMode ? Math.max(score, player2.score) : score;
  els.rankText.textContent = totalScore >= 2200 ? "Munch Master" : totalScore >= 1300 ? "Hungry Hero" : "Tiny Chomper";
  if (twoPlayerMode) {
    const winner = score === player2.score ? "Tie game" : score > player2.score ? "P1 wins" : "P2 wins";
    els.finalText.textContent = `${winner} · P1 ${score} · P2 ${player2.score} · Best ${best}`;
  } else {
    els.finalText.textContent = `Score ${score} · Best ${best}`;
  }
  show(els.resultPanel);
}

function setMouth(open) {
  mouthWantsOpen = open;
  refreshEffectiveMouth();
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
  link.download = `photo-munchies-replay.${replayExtension}`;
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
