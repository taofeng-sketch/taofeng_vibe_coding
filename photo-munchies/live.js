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
  resultShot: document.getElementById("resultShot"),
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
const DEBUG_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_FACE = DEBUG_PARAMS.has("debugFace");
const DEBUG_BOMB = DEBUG_PARAMS.has("debugBomb");
const DEBUG_BOMB_MISS = DEBUG_PARAMS.has("debugBombMiss");
const DEBUG_FATAL = DEBUG_PARAMS.has("debugFatal");
const mouth = { x: 0.5, y: 0.57, targetX: 0.5, targetY: 0.57, faceX: 0.5, faceY: 0.46, openness: 0 };
const duration = 32;
const MAX_SMEARS = 20;
const BOMB_LOCK_SECONDS = 1.2;
const FRUITS = {
  watermelon: { label: "WATERMELON", color: "#4fcf96", flesh: "#ff5f7d", seed: "#131b2a", points: 120, radius: 40 },
  mango: { label: "MANGO", color: "#ffb02e", flesh: "#ffcf5c", seed: "#7a4b11", points: 130, radius: 38 },
  strawberry: { label: "STRAWBERRY", color: "#ff3f6b", flesh: "#ff7d94", seed: "#fff0ad", points: 110, radius: 36 },
  blueberry: { label: "BLUEBERRY", color: "#5c68ff", flesh: "#b99bff", seed: "#fff", points: 100, radius: 34 },
  kiwi: { label: "KIWI", color: "#8fd14f", flesh: "#c8ff80", seed: "#131b2a", points: 140, radius: 37 },
  apple: { label: "APPLE", color: "#ff435f", flesh: "#fff4d6", seed: "#1b1326", points: 125, radius: 38 },
  orange: { label: "ORANGE", color: "#ff9d2e", flesh: "#ffbf3f", seed: "#fff4d6", points: 120, radius: 38 },
  peach: { label: "PEACH", color: "#ff9d7a", flesh: "#ffc08f", seed: "#7a4b2a", points: 135, radius: 38 },
  grape: { label: "GRAPE", color: "#9b6bff", flesh: "#8c4bff", seed: "#fff", points: 145, radius: 38 },
  golden: { label: "GOLDEN ORANGE", color: "#ffcf5c", flesh: "#fff0ad", seed: "#8b5a2b", points: 360, radius: 42 },
  bomb: { label: "BOMB", color: "#14101d", flesh: "#2d2638", seed: "#ff2d8e", points: -80, radius: 42 },
};
const SMASH_FILES = {
  watermelon: "art/watermelon_smash.png",
  strawberry: "art/strawberry_smash.png",
  peach: "art/peach_smash.png",
  apple: "art/apple_smash.png",
  kiwi: "art/kiwi_smash.png",
  orange: "art/orange_smash.png",
  mango: "art/orange_smash.png",
  golden: "art/orange_smash.png",
  grape: "art/grape_smash.png",
  blueberry: "art/blueberry_smash.png",
};
const SMASH = Object.fromEntries(Object.entries(SMASH_FILES).map(([kind, src]) => {
  const image = new Image();
  image.src = src;
  return [kind, image];
}));
const BOMB_EXPLOSION = new Image();
BOMB_EXPLOSION.src = "art/bomb_explosion.png";
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
let energyResetGrace = 0;
let lives = 3;
let bombLock = 0;
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
let debugSeeded = false;
let gameOverPlayer = null;

function makePlayer2() {
  return {
    mouth: { x: 0.64, y: 0.57, targetX: 0.64, targetY: 0.57, faceX: 0.64, faceY: 0.46, openness: 0 },
    mouthOpen: false,
    mouthWantsOpen: false,
    mouthTired: false,
    stamina: 1,
    energyResetGrace: 0,
    lives: 3,
    bombLock: 0,
    score: 0,
    combo: 0,
    tracked: false,
    openSmooth: 0,
    biteFlash: 0,
    lastTrackingAt: 0,
  };
}

function resetFoods() {
  const kinds = ["watermelon", "mango", "strawberry", "blueberry", "kiwi", "apple", "orange", "peach", "grape"];
  foods = Array.from({ length: 34 }, (_, index) => {
    const progress = index / 33;
    const bombChance = 0.07 + progress * 0.09;
    const goldenChance = index > 4 && Math.random() < 0.08;
    const kind = Math.random() < bombChance ? "bomb" : goldenChance ? "golden" : kinds[Math.floor(Math.random() * kinds.length)];
    const edge = Math.floor(Math.random() * 4);
    const start = edge === 0 ? [0.04, 0.14 + Math.random() * 0.72]
      : edge === 1 ? [0.96, 0.14 + Math.random() * 0.72]
      : edge === 2 ? [0.16 + Math.random() * 0.68, 0.06]
      : [0.16 + Math.random() * 0.68, 0.94];
    return food(kind, start[0], start[1], index * 0.76 + Math.random() * 0.62, 0.018 + Math.min(index, 20) * 0.0009 + Math.random() * 0.007, progress);
  });
}

function food(kind, x, y, spawn, speed, progress = 0) {
  const roam = Math.random() < 0.42;
  const size = kind === "golden" ? 1.18 + Math.random() * 0.32 : kind === "bomb" ? 0.9 + Math.random() * 0.48 : 0.62 + Math.random() * 0.92;
  const baseHoverLife = (1.0 - progress * 0.30) * (size > 1.15 ? 1.12 : 0.94 + Math.random() * 0.18);
  return {
    kind,
    x,
    y,
    spawn,
    speed,
    size,
    splatScale: size * (0.92 + Math.random() * 0.55),
    done: false,
    arrived: false,
    hoverAge: 0,
    hoverLife: kind === "bomb" ? 3.15 : baseHoverLife,
    mode: roam ? "roam" : "face",
    targetPlayer: twoPlayerMode && Math.random() < 0.48 ? 1 : 0,
    targetX: 0.06 + Math.random() * 0.88,
    targetY: 0.10 + Math.random() * 0.80,
    targetLocked: false,
    wobble: Math.random() * Math.PI * 2,
    rot: Math.random() * 1.4 - 0.7,
  };
}

async function startCamera() {
  if (DEBUG_FACE) {
    els.statusText.textContent = "Debug face simulation: checking face-stuck splats.";
    return;
  }
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
  if (DEBUG_FACE) {
    faceTrackingReady = true;
    faceTrackingFailed = false;
    faceTracked = true;
    els.mouthButton.classList.add("hidden");
    setTrackingPill("Debug face", "ready");
    return;
  }
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
  energyResetGrace = 0;
  lives = 3;
  mouthTired = false;
  bombLock = 0;
  player2 = makePlayer2();
  gameOverPlayer = null;
  ended = false;
  startedAt = performance.now();
  chunks = [];
  if (replayUrl) URL.revokeObjectURL(replayUrl);
  replayUrl = "";
  faceTracked = false;
  debugSeeded = false;
  lastVideoTime = -1;
  mouthOpenSmooth = 0;
  mouth.x = mouth.targetX = 0.5;
  mouth.y = mouth.targetY = 0.57;
  mouth.faceX = 0.5;
  mouth.faceY = 0.46;
  mouth.openness = 0;
  if (DEBUG_FACE) {
    updateDebugFace(performance.now());
    seedDebugSplats();
  }
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

  if (gameOverPlayer !== null && !ended) {
    drawGameOverOverlay(gameOverPlayer);
    finishRound(true, gameOverPlayer);
    return;
  }

  if (left <= 0 && !ended) {
    finishRound();
    return;
  }
  raf = requestAnimationFrame(loop);
}

function updateFoods(elapsed) {
  for (const item of foods) {
    if (item.done || elapsed < item.spawn) continue;
    lockFoodTarget(item);
    const target = getFoodTarget(item);
    const targetD = Math.hypot(item.x - target.x, item.y - target.y);
    const rushMultiplier = duration - elapsed <= 3 ? 2 : 1;
    const speed = item.arrived ? item.speed * 0.08 : item.speed * rushMultiplier;
    item.x += (target.x - item.x) * speed;
    item.y += (target.y - item.y) * speed;
    item.wobble += 0.08;
    if (item.arrived) {
      item.x += Math.cos(item.wobble) * 0.0018;
      item.y += Math.sin(item.wobble * 1.25) * 0.0018;
    }

    const eater = getCatchingPlayer(item);
    if (eater !== -1) {
      eat(item, eater);
      item.done = true;
    } else if (targetD < 0.052) {
      item.arrived = true;
      item.hoverAge += 1 / 60;
    }
    if (!item.done && item.arrived && item.hoverAge > item.hoverLife) {
      if (item.kind === "bomb") {
        pops.push(pop("SAFE!", item.x, item.y, "#28e6ff", false, "arcade"));
        item.done = true;
        continue;
      }
      if (item.targetPlayer === 1) player2.combo = 0;
      else combo = 0;
      const attachTo = item.mode === "face" ? item.targetPlayer : nearestFaceAttachment(item);
      splat(item, item.kind === "bomb" ? "bomb" : "fruit", attachTo);
      pops.push(pop("SPLAT!", item.x, item.y, "#fff", true));
      item.done = true;
    }
  }
}

function lockFoodTarget(item) {
  if (item.targetLocked) return;
  if (item.mode === "roam") {
    item.targetLocked = true;
    return;
  }
  const activeMouth = twoPlayerMode && item.targetPlayer === 1 && player2.tracked ? player2.mouth : mouth;
  const anchorX = activeMouth.faceX || activeMouth.x;
  const anchorY = activeMouth.faceY || activeMouth.y;
  item.targetX = clamp(anchorX + (Math.random() - 0.5) * 0.64, 0.08, 0.92);
  item.targetY = clamp(anchorY + 0.10 + (Math.random() - 0.5) * 0.52, 0.14, 0.86);
  item.targetLocked = true;
}

function getFoodTarget(item) {
  return { x: item.targetX, y: item.targetY };
}

function getCatchingPlayer(item) {
  const catchRadius = 0.105 + (item.size || 1) * 0.035;
  const d1 = Math.hypot(item.x - mouth.x, item.y - mouth.y);
  if (mouthOpen && d1 < catchRadius) return 0;
  if (twoPlayerMode && player2.tracked) {
    const d2 = Math.hypot(item.x - player2.mouth.x, item.y - player2.mouth.y);
    if (player2.mouthOpen && d2 < catchRadius) return 1;
  }
  return -1;
}

function nearestFaceAttachment(item) {
  const candidates = [];
  if (faceTracked || DEBUG_FACE || faceTrackingFailed) {
    candidates.push({ player: 0, distance: Math.hypot(item.x - mouth.faceX, item.y - mouth.faceY) });
  }
  if (twoPlayerMode && player2.tracked) {
    candidates.push({ player: 1, distance: Math.hypot(item.x - player2.mouth.faceX, item.y - player2.mouth.faceY) });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const threshold = 0.30 + Math.min(0.18, (item.size || 1) * 0.08);
  return candidates[0].distance < threshold ? candidates[0].player : null;
}

function eat(item, playerIndex = 0) {
  if (item.kind === "bomb") {
    eatBomb(item, playerIndex);
    return;
  }
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

function eatBomb(item, playerIndex = 0) {
  const remainingLives = applyBombPenalty(playerIndex);
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  screenShake = 0.48;
  splat(item, "bomb", playerIndex);
  pops.push(pop("-1 LIFE!", 0.5, 0.30, "#ff2d8e", true, "arcade"));
  pops.push(pop("ENERGY RESET", 0.5, 0.43, "#c6ff36", false, "arcade"));
  if (remainingLives <= 0) {
    gameOverPlayer = playerIndex;
    pops.push(pop("GAME OVER", activeMouth.x, activeMouth.y - 0.18, "#28e6ff", true, "arcade"));
  }
}

function applyBombPenalty(playerIndex = 0) {
  if (playerIndex === 1) {
    player2.combo = 0;
    player2.score = Math.max(0, player2.score - 80);
    player2.lives = Math.max(0, player2.lives - 1);
    player2.stamina = 1;
    player2.energyResetGrace = 1.8;
    player2.mouthTired = false;
    player2.mouthWantsOpen = false;
    player2.bombLock = 0;
    player2.biteFlash = 0.28;
    return player2.lives;
  }

  combo = 0;
  score = Math.max(0, score - 80);
  lives = Math.max(0, lives - 1);
  stamina = 1;
  energyResetGrace = 1.8;
  mouthTired = false;
  mouthWantsOpen = false;
  bombLock = 0;
  biteFlash = 0.28;
  return lives;
}

function splat(item, effect = "fruit", attachTo = null) {
  const fruit = FRUITS[item.kind] || FRUITS.watermelon;
  const anchor = attachTo === 1 ? player2.mouth : attachTo === 0 ? mouth : null;
  const anchorX = anchor ? anchor.faceX || anchor.x : 0;
  const anchorY = anchor ? anchor.faceY || anchor.y : 0;
  const splatScale = Math.max(0.55, item.splatScale || item.size || 1);
  const dropCount = Math.round((effect === "bomb" ? 24 : 34) + splatScale * 18);
  const seedCount = Math.round(24 + splatScale * 20);
  const spreadX = 0.36 + splatScale * 0.20;
  const spreadY = 0.32 + splatScale * 0.18;
  const drops = Array.from({ length: dropCount }, () => ({
    dx: (Math.random() - 0.5) * spreadX,
    dy: (Math.random() - 0.5) * spreadY,
    vx: (Math.random() - 0.5) * (0.010 + splatScale * 0.005),
    vy: -Math.random() * (0.008 + splatScale * 0.004) + 0.002,
    r: (7 + Math.random() * 31) * (0.72 + splatScale * 0.34),
    angle: Math.random() * Math.PI,
    seed: Math.random() > 0.38,
  }));
  const seeds = Array.from({ length: seedCount }, () => ({
    dx: (Math.random() - 0.5) * (0.18 + splatScale * 0.08),
    dy: (Math.random() - 0.5) * (0.14 + splatScale * 0.06),
    vx: (Math.random() - 0.5) * (0.024 + splatScale * 0.010),
    vy: (Math.random() - 0.7) * (0.022 + splatScale * 0.010),
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.28,
  }));
  splats.push({
    x: item.x,
    y: item.y,
    attachTo,
    offsetX: anchor ? item.x - anchorX : 0,
    offsetY: anchor ? item.y - anchorY : 0,
    kind: item.kind,
    effect,
    color: fruit.flesh,
    seedColor: fruit.seed,
    age: 0,
    rot: Math.random() * 0.7 - 0.35,
    scale: splatScale * (0.92 + Math.random() * 0.38),
    drops,
    seeds,
  });
  screenShake = 0.18;
  splats = splats.slice(-MAX_SMEARS);
}

function pop(text, x, y, color, big = false, variant = "normal") {
  return { text, x, y, color, age: 0, big, variant, duration: variant === "arcade" ? 2 : 0.8 };
}

function updatePops() {
  pops.forEach((item) => (item.age += 1 / 60));
  pops = pops.filter((item) => item.age < item.duration);
}

function updateSplats() {
  splats.forEach((item) => (item.age += 1 / 60));
  if (splats.length > MAX_SMEARS) splats = splats.slice(-MAX_SMEARS);
}

function updateStamina() {
  energyResetGrace = Math.max(0, energyResetGrace - 1 / 60);
  if (energyResetGrace > 0) {
    stamina = 1;
    mouthTired = false;
    refreshEffectiveMouth();
    return;
  }
  bombLock = Math.max(0, bombLock - 1 / 60);
  if (bombLock > 0) {
    stamina = 0;
    mouthTired = true;
  } else if (mouthWantsOpen && !mouthTired) {
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
  player2.energyResetGrace = Math.max(0, player2.energyResetGrace - 1 / 60);
  if (player2.energyResetGrace > 0) {
    player2.stamina = 1;
    player2.mouthTired = false;
    player2.mouthOpen = player2.mouthWantsOpen && player2.stamina > 0.04;
    return;
  }
  player2.bombLock = Math.max(0, player2.bombLock - 1 / 60);
  if (player2.bombLock > 0) {
    player2.stamina = 0;
    player2.mouthTired = true;
  } else if (player2.mouthWantsOpen && !player2.mouthTired) {
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
  if (bombLock > 0) {
    els.statusText.textContent = "Bomb blast! Mouth locked!";
  } else if (mouthTired) {
    els.statusText.textContent = "Mouth tired. Close your mouth to recharge!";
  } else if (splats.length >= 12) {
    els.statusText.textContent = "The screen is getting totally messy!";
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
  drawSplats("screen");
  drawFaceTarget();
  drawSplats("face");
  drawMouth();
  if (twoPlayerMode && player2.tracked) drawMouth(1);
  foods.forEach((item) => {
    if (!item.done && elapsed >= item.spawn) drawFood(item);
  });
  drawPeekEyes(0);
  if (twoPlayerMode && player2.tracked) drawPeekEyes(1);
  drawLives();
  drawPops();
  if (left <= 3) drawFinalRush(left);
  if (DEBUG_FACE) els.canvas.dataset.debugState = JSON.stringify(debugState());
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
  if (DEBUG_FACE) {
    updateDebugFace(now);
    if (!debugSeeded) seedDebugSplats();
    return;
  }
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

function updateDebugFace(now) {
  const t = now / 1000;
  faceTracked = true;
  faceTrackingReady = true;
  faceTrackingFailed = false;
  mouth.faceX = 0.50 + Math.sin(t * 1.45) * 0.18;
  mouth.faceY = 0.42 + Math.cos(t * 1.12) * 0.055;
  mouth.x = mouth.faceX + Math.sin(t * 2.1) * 0.018;
  mouth.y = mouth.faceY + 0.15 + Math.cos(t * 1.8) * 0.015;
  mouth.targetX = mouth.x;
  mouth.targetY = mouth.y;
  mouth.openness = 0.55 + Math.sin(t * 3.2) * 0.35;
  setMouth(mouth.openness > 0.42);
  setTrackingPill("Debug face moving", mouthOpen ? "open" : "ready");
}

function seedDebugSplats() {
  debugSeeded = true;
  const kinds = ["watermelon", "mango", "strawberry", "kiwi", "orange", "grape"];
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2 + Math.random() * 0.4;
    const size = 0.85 + Math.random() * 0.85;
    splat({
      kind: kinds[index % kinds.length],
      x: mouth.faceX + Math.cos(angle) * (0.04 + Math.random() * 0.10),
      y: mouth.faceY + Math.sin(angle) * (0.03 + Math.random() * 0.08),
      size,
      splatScale: size * 1.12,
    }, "fruit", 0);
  }
  if (DEBUG_BOMB) {
    if (DEBUG_FATAL) lives = 1;
    splat({
      kind: "bomb",
      x: mouth.faceX + 0.08,
      y: mouth.faceY + 0.06,
      size: 1.2,
      splatScale: 1.35,
    }, "bomb", 0);
    const remainingLives = applyBombPenalty(0);
    if (remainingLives <= 0) gameOverPlayer = 0;
    pops.push(pop(DEBUG_FATAL ? "GAME OVER" : "-1 LIFE!", 0.5, 0.30, "#ff2d8e", true, "arcade"));
    pops.push(pop("ENERGY RESET", 0.5, 0.43, "#c6ff36", false, "arcade"));
  }
  if (DEBUG_BOMB_MISS) {
    foods = [{
      kind: "bomb",
      x: clamp(mouth.faceX - 0.28, 0.12, 0.88),
      y: clamp(mouth.faceY - 0.08, 0.16, 0.78),
      spawn: 0,
      speed: 0.01,
      size: 1.2,
      splatScale: 1.35,
      done: false,
      arrived: true,
      hoverAge: 0,
      hoverLife: 3.15,
      mode: "roam",
      targetPlayer: 0,
      targetX: clamp(mouth.faceX - 0.28, 0.12, 0.88),
      targetY: clamp(mouth.faceY - 0.08, 0.16, 0.78),
      targetLocked: true,
      wobble: 0,
      rot: -0.2,
    }];
  }
}

function readMouthFromLandmarks(landmarks, targetMouth, previousSmooth) {
  const upperLip = mapLandmark(landmarks[13]);
  const lowerLip = mapLandmark(landmarks[14]);
  const leftCorner = mapLandmark(landmarks[61]);
  const rightCorner = mapLandmark(landmarks[291]);
  const leftEye = mapLandmark(landmarks[33]);
  const rightEye = mapLandmark(landmarks[263]);
  const nose = mapLandmark(landmarks[1]);
  const center = {
    x: (upperLip.x + lowerLip.x + leftCorner.x + rightCorner.x) / 4,
    y: (upperLip.y + lowerLip.y + leftCorner.y + rightCorner.y) / 4,
  };
  const eyeMid = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
  const verticalGap = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
  const mouthWidth = Math.max(0.001, Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y));
  const openness = Math.min(1, Math.max(0, (verticalGap / mouthWidth - 0.12) / 0.32));
  const smooth = previousSmooth * 0.64 + openness * 0.36;
  targetMouth.targetX = clamp(center.x, 0.12, 0.88);
  targetMouth.targetY = clamp(center.y + 0.015, 0.18, 0.82);
  targetMouth.x += (targetMouth.targetX - targetMouth.x) * 0.38;
  targetMouth.y += (targetMouth.targetY - targetMouth.y) * 0.38;
  targetMouth.faceX += (clamp((eyeMid.x + nose.x + center.x) / 3, 0.14, 0.86) - targetMouth.faceX) * 0.34;
  targetMouth.faceY += (clamp((eyeMid.y * 1.6 + nose.y + center.y * 0.5) / 3.1, 0.16, 0.76) - targetMouth.faceY) * 0.34;
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
  if (item.arrived && item.hoverLife - item.hoverAge < 0.28) {
    ctx.translate((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
  }
  ctx.translate(x, y);
  ctx.rotate(item.rot);
  ctx.scale(item.size || 1, item.size || 1);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#131b2a";
  if (item.kind === "bomb") drawBomb(item);
  else drawFruitShape(item.kind, fruit);
  drawFoodTimer(item, fruit);
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
  } else if (kind === "mango" || kind === "golden" || kind === "orange" || kind === "peach") {
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
  } else if (kind === "grape") {
    ctx.fillStyle = fruit.color;
    for (let i = 0; i < 7; i += 1) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      ctx.beginPath();
      ctx.arc((col - 1) * 20 + (row % 2) * 9, -20 + row * 23, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === "apple") {
    ctx.fillStyle = fruit.color;
    ctx.beginPath();
    ctx.arc(-14, 2, 28, 0, Math.PI * 2);
    ctx.arc(14, 2, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5c3b16";
    roundRect(-4, -42, 8, 24, 4, "#5c3b16");
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

function drawBomb(item) {
  const pulse = item.arrived ? 1 + Math.sin(item.hoverAge * 22) * 0.08 : 1;
  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#100c18";
  ctx.beginPath();
  ctx.arc(0, 6, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ff2d8e";
  ctx.stroke();
  ctx.fillStyle = "#282034";
  ctx.beginPath();
  ctx.arc(-10, -8, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c6ff36";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(24, -24);
  ctx.quadraticCurveTo(42, -45, 58, -28);
  ctx.stroke();
  ctx.fillStyle = "#ff9d2e";
  ctx.beginPath();
  ctx.moveTo(62, -34);
  ctx.lineTo(72, -18);
  ctx.lineTo(54, -21);
  ctx.closePath();
  ctx.fill();
  ctx.font = "900 19px 'Bangers', system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6ff";
  ctx.strokeStyle = "#0a0612";
  ctx.lineWidth = 5;
  ctx.strokeText("DON'T!", 0, 68);
  ctx.fillText("DON'T!", 0, 68);
  ctx.restore();
}

function drawFoodTimer(item, fruit) {
  if (!item.arrived) return;
  const remaining = clamp(1 - item.hoverAge / item.hoverLife, 0, 1);
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = remaining > 0.6 ? "#c6ff36" : remaining > 0.3 ? "#ff9d2e" : "#ff2d8e";
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius + 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
  ctx.stroke();
  ctx.setLineDash([7, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = item.kind === "bomb" ? "#ff2d8e" : "rgba(255,246,255,0.8)";
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius + 24, 0, Math.PI * 2);
  ctx.stroke();
  if (item.kind === "bomb") {
    const number = Math.max(1, Math.ceil(remaining * 3));
    ctx.font = "1000 54px 'Bangers', system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff6ff";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 9;
    ctx.shadowColor = "#ff2d8e";
    ctx.shadowBlur = 16;
    ctx.strokeText(String(number), 0, 6);
    ctx.fillText(String(number), 0, 6);
  }
  ctx.restore();
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

function drawSplats(layer = "all") {
  for (const item of splats) {
    const isFaceLayer = item.attachTo === 0 || item.attachTo === 1;
    if (layer === "screen" && isFaceLayer) continue;
    if (layer === "face" && !isFaceLayer) continue;
    const position = getSplatPosition(item);
    const fade = Math.max(item.attachTo === null ? 0.84 : 0.94, 1 - item.age / 5.2);
    ctx.save();
    ctx.globalAlpha = item.effect === "bomb" ? 0.96 * fade : 1 * fade;
    ctx.translate(position.x * W, position.y * H);
    const smash = item.effect === "bomb" ? BOMB_EXPLOSION : SMASH[item.kind] || SMASH.orange;
    if (smash && smash.complete && smash.naturalWidth) {
      ctx.save();
      ctx.rotate(item.rot);
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = item.effect === "bomb" ? "saturate(1.4) contrast(1.08)" : "saturate(1.65) contrast(1.14)";
      ctx.shadowColor = item.color;
      ctx.shadowBlur = item.effect === "bomb" ? 16 : item.attachTo === null ? 18 : 10;
      const size = Math.min(W, H) * (item.effect === "bomb" ? 0.68 + item.scale * 0.26 : 0.45 + item.scale * 0.34);
      const sourceHeight = item.effect === "bomb" ? smash.naturalHeight : Math.floor(smash.naturalHeight * 0.86);
      ctx.drawImage(smash, 0, 0, smash.naturalWidth, sourceHeight, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else if (item.effect === "bomb") {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(7,5,10,0.86)";
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.22 * item.scale, H * 0.15 * item.scale, item.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.12 * item.scale, H * 0.075 * item.scale, item.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255,246,255,0.55)";
      ctx.lineWidth = 7;
      ctx.setLineDash([12, 13]);
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.14 * item.scale, H * 0.09 * item.scale, item.rot, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
    if (item.age > 2.2 && !isFaceLayer) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(21,16,31,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.21 * item.scale, H * 0.15 * item.scale, item.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }
}

function getSplatPosition(item) {
  if (item.attachTo === 0) {
    return { x: clamp(mouth.faceX + item.offsetX, -0.2, 1.2), y: clamp(mouth.faceY + item.offsetY, -0.2, 1.2) };
  }
  if (item.attachTo === 1) {
    return { x: clamp(player2.mouth.faceX + item.offsetX, -0.2, 1.2), y: clamp(player2.mouth.faceY + item.offsetY, -0.2, 1.2) };
  }
  return { x: item.x, y: item.y };
}

function debugState() {
  const attached = splats.filter((item) => item.attachTo === 0).slice(0, 6).map((item) => {
    const position = getSplatPosition(item);
    return {
      kind: item.kind,
      offsetX: Number(item.offsetX.toFixed(4)),
      offsetY: Number(item.offsetY.toFixed(4)),
      drawnX: Number(position.x.toFixed(4)),
      drawnY: Number(position.y.toFixed(4)),
      scale: Number(item.scale.toFixed(2)),
    };
  });
  return {
    debugFace: DEBUG_FACE,
    debugBomb: DEBUG_BOMB,
    debugBombMiss: DEBUG_BOMB_MISS,
    debugFatal: DEBUG_FATAL,
    faceX: Number(mouth.faceX.toFixed(4)),
    faceY: Number(mouth.faceY.toFixed(4)),
    mouthX: Number(mouth.x.toFixed(4)),
    mouthY: Number(mouth.y.toFixed(4)),
    lives,
    stamina: Number(stamina.toFixed(4)),
    energyResetGrace: Number(energyResetGrace.toFixed(4)),
    gameOverPlayer,
    attachedCount: splats.filter((item) => item.attachTo === 0).length,
    bombCount: splats.filter((item) => item.effect === "bomb").length,
    activeBombs: foods.filter((item) => item.kind === "bomb" && !item.done).length,
    screenCount: splats.filter((item) => item.attachTo === null).length,
    attached,
  };
}

window.photoMunchiesDebugState = debugState;

function faceSplatCount(playerIndex = 0) {
  return splats.filter((item) => item.attachTo === playerIndex && item.effect !== "bomb").length;
}

function drawPeekEyes(playerIndex = 0) {
  if (faceSplatCount(playerIndex) < 4) return;
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  const cx = activeMouth.faceX * W;
  const cy = activeMouth.faceY * H - 30;
  const blinkWave = Math.sin(performance.now() / 155);
  const blink = blinkWave > 0.55;
  const spread = 64;
  const eyeW = 38;
  const eyeH = blink ? 8 : 47;
  ctx.save();
  ctx.shadowColor = "#fff6ff";
  ctx.shadowBlur = 24;
  for (const side of [-1, 1]) {
    const x = cx + side * spread;
    ctx.fillStyle = "#fff6ff";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    if (blink) {
      ctx.moveTo(x - eyeW, cy);
      ctx.quadraticCurveTo(x, cy + 12, x + eyeW, cy);
      ctx.stroke();
      drawEyelashes(x, cy, side, true, eyeW, 20);
    } else {
      ctx.ellipse(x, cy, eyeW, eyeH, side * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0a0612";
      ctx.beginPath();
      ctx.arc(x + side * 8, cy + 5, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + side * 14, cy - 7, 5, 0, Math.PI * 2);
      ctx.fill();
      drawEyelashes(x, cy, side, false, eyeW, eyeH);
    }
  }
  ctx.fillStyle = "#c6ff36";
  ctx.font = "900 29px 'Bangers', system-ui";
  ctx.textAlign = "center";
  ctx.strokeStyle = "#0a0612";
  ctx.lineWidth = 6;
  const label = playerIndex === 1 ? "P2 PEEK!" : "PEEK!";
  ctx.strokeText(label, cx, cy + 78);
  ctx.fillText(label, cx, cy + 78);
  ctx.restore();
}

function drawEyelashes(cx, cy, side, blink, eyeW, eyeH) {
  const t = performance.now() / 240;
  const colors = ["#ff5f7d", "#c6ff36", "#9b6bff", "#ff9d2e"];
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const p = i / 4;
    const baseX = cx - eyeW * 0.66 + p * eyeW * 1.32;
    const baseY = cy - (blink ? 1 : eyeH * (0.78 + Math.sin(t + i) * 0.02));
    const lean = (p - 0.5) * 22 + side * 5 + Math.sin(t + i) * 4;
    const tipX = baseX + lean;
    const tipY = baseY - 32 - Math.sin(t * 1.6 + i) * 5;
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo((baseX + tipX) / 2, baseY - 20, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tipX - 9, tipY + 5);
    ctx.lineTo(tipX + 9, tipY - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLives() {
  drawPlayerLives(lives, W - 126, 38, "#ff5f7d");
  if (twoPlayerMode && player2.tracked) drawPlayerLives(player2.lives, W - 126, 82, "#8dd9ff");
}

function drawPlayerLives(activeLives, x, y, color) {
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    const cx = x + i * 34;
    ctx.fillStyle = i < activeLives ? color : "rgba(8,3,15,0.42)";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, y + 18);
    ctx.bezierCurveTo(cx - 25, y + 2, cx - 12, y - 18, cx, y - 6);
    ctx.bezierCurveTo(cx + 12, y - 18, cx + 25, y + 2, cx, y + 18);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPops() {
  for (const item of pops) {
    if (item.variant === "arcade") {
      drawArcadePop(item);
    } else {
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
  }
  ctx.globalAlpha = 1;
}

function drawArcadePop(item) {
  const t = clamp(item.age / item.duration, 0, 1);
  const popIn = t < 0.18 ? 0.72 + t / 0.18 * 0.42 : 1.08 - Math.min(0.18, (t - 0.18) * 0.24);
  const alpha = t < 0.72 ? 1 : clamp(1 - (t - 0.72) / 0.28, 0, 1);
  const wobble = Math.sin(item.age * 26) * 0.035;
  const x = item.x * W;
  const y = item.y * H - item.age * 44;
  const fontSize = item.big ? 76 : 42;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(wobble);
  ctx.scale(popIn, popIn);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `1000 ${fontSize}px 'Bangers', system-ui`;
  const badgeW = Math.min(W * 0.88, ctx.measureText(item.text).width + fontSize * 0.76);
  const badgeH = fontSize * 0.78;
  ctx.shadowBlur = 18;
  ctx.shadowColor = item.color;
  roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 14, "rgba(8,3,15,0.82)");
  ctx.strokeStyle = "#fff6ff";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = item.color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowColor = "#28e6ff";
  ctx.shadowBlur = 10;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff6ff";
  ctx.lineWidth = item.big ? 20 : 14;
  ctx.strokeText(item.text, 0, 0);
  ctx.strokeStyle = "#0a0612";
  ctx.lineWidth = item.big ? 9 : 6;
  ctx.strokeText(item.text, 0, 0);
  ctx.fillStyle = item.color;
  ctx.fillText(item.text, 0, 0);
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = `1000 ${Math.round(fontSize * 0.34)}px 'Bangers', system-ui`;
  ctx.fillText("POW!", fontSize * 1.02, -fontSize * 0.48);
  ctx.restore();
}

function drawFinalRush(left) {
  ctx.fillStyle = "rgba(255,95,125,0.18)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = "1000 42px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("DOUBLE SCORE!", W / 2, 98);
}

function drawGameOverOverlay(playerIndex = 0) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#08030f";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(40,230,255,0.22)";
  ctx.lineWidth = 3;
  for (let y = 0; y < H; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = -W; x < W * 2; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(W / 2 + (x - W / 2) * 0.18, H * 0.35);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "1000 112px 'Bangers', system-ui";
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#ff2d8e";
  ctx.strokeStyle = "#fff6ff";
  ctx.lineWidth = 24;
  ctx.strokeText("GAME", W / 2, H * 0.38);
  ctx.strokeText("OVER", W / 2, H * 0.50);
  ctx.strokeStyle = "#0a0612";
  ctx.lineWidth = 10;
  ctx.strokeText("GAME", W / 2, H * 0.38);
  ctx.strokeText("OVER", W / 2, H * 0.50);
  ctx.fillStyle = "#ff2d8e";
  ctx.fillText("GAME", W / 2 - 6, H * 0.38);
  ctx.fillStyle = "#28e6ff";
  ctx.fillText("OVER", W / 2 + 6, H * 0.50);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#c6ff36";
  ctx.font = "1000 32px 'Bangers', system-ui";
  const playerText = twoPlayerMode ? `P${playerIndex + 1} OUT - TAP PLAY AGAIN` : "TAP PLAY AGAIN";
  ctx.fillText(playerText, W / 2, H * 0.64);
  ctx.fillStyle = "rgba(255,246,255,0.2)";
  for (let y = 0; y < H; y += 8) {
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();
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

function finishRound(gameOver = false, playerIndex = 0) {
  ended = true;
  cancelAnimationFrame(raf);
  stopRecording();
  els.resultPanel.classList.toggle("game-over-panel", gameOver);
  try {
    els.resultShot.src = els.canvas.toDataURL("image/png");
  } catch (error) {
    els.resultShot.removeAttribute("src");
  }
  const totalScore = twoPlayerMode ? Math.max(score, player2.score) : score;
  els.rankText.textContent = gameOver ? "GAME OVER" : totalScore >= 2200 ? "Munch Master" : totalScore >= 1300 ? "Hungry Hero" : "Tiny Chomper";
  if (gameOver) {
    const playerText = twoPlayerMode ? `P${playerIndex + 1} ran out of hearts` : "You ran out of hearts";
    els.finalText.textContent = `${playerText} · Score ${score} · Best ${best}`;
    show(els.resultPanel);
    return;
  }
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
