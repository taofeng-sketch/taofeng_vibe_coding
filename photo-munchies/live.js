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
  audioButton: document.getElementById("audioButton"),
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
const DEBUG_SECONDS = Number(DEBUG_PARAMS.get("debugSeconds") || 0);
const mouth = makeMouthState(0.5);
const duration = DEBUG_SECONDS >= 4 && DEBUG_SECONDS <= 32 ? DEBUG_SECONDS : 32;
const MAX_SMEARS = 20;
const BOMB_LOCK_SECONDS = 1.2;
const STARTING_LIVES = 10;
const FRUIT_KINDS = ["watermelon", "mango", "strawberry", "blueberry", "kiwi", "apple", "orange", "peach", "grape"];
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
let lives = STARTING_LIVES;
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
let gameOverStartedAt = 0;
let preGameOverShot = "";
let audioCtx = null;
let audioDestination = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = 0;
let musicStep = 0;
let audioEnabled = localStorage.getItem("photoMunchiesAudio") !== "off";
let finalRushAnnounced = false;
let finalRushSpawned = false;
let finalRushSpawnCount = 0;

const FRUIT_SOUND = {
  watermelon: { tone: 150, pop: 340, crunch: 0.16, squish: 0.42 },
  mango: { tone: 220, pop: 480, crunch: 0.08, squish: 0.34 },
  strawberry: { tone: 310, pop: 760, crunch: 0.06, squish: 0.28 },
  blueberry: { tone: 430, pop: 980, crunch: 0.04, squish: 0.22 },
  kiwi: { tone: 260, pop: 620, crunch: 0.13, squish: 0.26 },
  apple: { tone: 190, pop: 560, crunch: 0.42, squish: 0.12 },
  orange: { tone: 240, pop: 700, crunch: 0.10, squish: 0.32 },
  peach: { tone: 175, pop: 430, crunch: 0.05, squish: 0.46 },
  grape: { tone: 360, pop: 840, crunch: 0.05, squish: 0.25 },
  golden: { tone: 520, pop: 1040, crunch: 0.12, squish: 0.38 },
};

function makePlayer2() {
  return {
    mouth: makeMouthState(0.64),
    mouthOpen: false,
    mouthWantsOpen: false,
    mouthTired: false,
    stamina: 1,
    energyResetGrace: 0,
    lives: STARTING_LIVES,
    bombLock: 0,
    score: 0,
    combo: 0,
    tracked: false,
    openSmooth: 0,
    biteFlash: 0,
    lastTrackingAt: 0,
  };
}

function makeMouthState(centerX = 0.5) {
  return {
    x: centerX,
    y: 0.57,
    targetX: centerX,
    targetY: 0.57,
    faceX: centerX,
    faceY: 0.46,
    leftEyeX: centerX - 0.085,
    leftEyeY: 0.39,
    rightEyeX: centerX + 0.085,
    rightEyeY: 0.39,
    openness: 0,
  };
}

function ensureAudio() {
  if (audioCtx || !audioEnabled) return Boolean(audioCtx);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    els.audioButton.disabled = true;
    els.audioButton.textContent = "No Sound";
    return false;
  }
  audioCtx = new AudioContextClass();
  audioDestination = audioCtx.createMediaStreamDestination ? audioCtx.createMediaStreamDestination() : null;
  masterGain = audioCtx.createGain();
  musicGain = audioCtx.createGain();
  sfxGain = audioCtx.createGain();
  masterGain.gain.value = 0.82;
  musicGain.gain.value = 0.23;
  sfxGain.gain.value = 0.52;
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
  if (audioDestination) masterGain.connect(audioDestination);
  return true;
}

async function startAudio() {
  if (!audioEnabled || !ensureAudio()) return;
  if (audioCtx.state === "suspended") {
    await audioCtx.resume().catch(() => {});
  }
  startMusic();
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = 0;
  }
}

function startMusic() {
  if (!audioCtx || musicTimer) return;
  musicStep = 0;
  musicTimer = window.setInterval(playMusicStep, 170);
}

function setAudioEnabled(enabled) {
  audioEnabled = enabled;
  localStorage.setItem("photoMunchiesAudio", enabled ? "on" : "off");
  updateAudioButton();
  if (!enabled) {
    stopMusic();
    if (masterGain) masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
    return;
  }
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(0.82, audioCtx.currentTime, 0.03);
  startAudio();
}

function updateAudioButton() {
  if (!els.audioButton) return;
  els.audioButton.textContent = audioEnabled ? "Sound On" : "Sound Off";
  els.audioButton.classList.toggle("off", !audioEnabled);
}

function playMusicStep() {
  if (!audioEnabled || !audioCtx || ended) return;
  const now = audioCtx.currentTime;
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
  const rush = duration - elapsed <= 3;
  const step = musicStep % 16;
  const root = rush ? 130.81 : 123.47;
  const bassNotes = [root, root, root * 1.5, root, root * 1.25, root, root * 1.5, root * 1.12];
  const melodyNotes = [root * 3, root * 3.75, root * 4.5, root * 3.35, root * 5, root * 4.5, root * 3.75, root * 3];
  if (step % 2 === 0) playTone(bassNotes[(musicStep / 2) % bassNotes.length | 0], rush ? 0.12 : 0.16, "sawtooth", rush ? 0.045 : 0.033, musicGain, now, 0.008);
  if (step % 4 === 0) playKick(now, rush ? 0.95 : 0.65);
  if (step % 8 === 4) playSnare(now, rush ? 0.28 : 0.18);
  if (step % 2 === 1) playHat(now, rush ? 0.13 : 0.08);
  if (step % 4 === 2) playTone(root * [2, 2.25, 2.5, 3][(musicStep / 4) % 4 | 0], 0.08, "triangle", 0.014, musicGain, now, 0.002);
  if (step % 4 === 1 || (rush && step % 4 === 3)) {
    playTone(melodyNotes[musicStep % melodyNotes.length], rush ? 0.10 : 0.13, "square", rush ? 0.024 : 0.019, musicGain, now, 0.003);
    playTone(melodyNotes[(musicStep + 2) % melodyNotes.length] * 0.5, rush ? 0.08 : 0.10, "triangle", 0.010, musicGain, now + 0.035, 0.003);
  }
  musicStep += rush ? 2 : 1;
}

function playTone(freq, durationSeconds, type, gainValue, destination = sfxGain, when = audioCtx?.currentTime || 0, attack = 0.004, detune = 0) {
  if (!audioEnabled || !audioCtx || !destination) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  osc.detune.setValueAtTime(detune, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSeconds);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + durationSeconds + 0.03);
}

function playNoise(durationSeconds, gainValue, destination = sfxGain, when = audioCtx?.currentTime || 0, filterFreq = 1600, type = "bandpass") {
  if (!audioEnabled || !audioCtx || !destination) return;
  const length = Math.max(1, Math.floor(audioCtx.sampleRate * durationSeconds));
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSeconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(when);
}

function playKick(when, amount = 0.7) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.11);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.16 * amount, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(when);
  osc.stop(when + 0.22);
}

function playSnare(when, amount = 0.2) {
  playNoise(0.11, amount, musicGain, when, 1500, "highpass");
  playTone(210, 0.08, "triangle", amount * 0.18, musicGain, when, 0.002);
}

function playHat(when, amount = 0.08) {
  playNoise(0.035, amount, musicGain, when, 5200, "highpass");
}

function playFruitSound(kind, comboCount = 1) {
  if (!audioEnabled || !ensureAudio()) return;
  const spec = FRUIT_SOUND[kind] || FRUIT_SOUND.orange;
  const now = audioCtx.currentTime;
  playNoise(0.08 + spec.crunch * 0.10, 0.10 + spec.crunch * 0.25, sfxGain, now, 2400 + spec.pop, "highpass");
  playTone(spec.tone, 0.10 + spec.squish * 0.16, "triangle", 0.10 + spec.squish * 0.08, sfxGain, now, 0.006);
  playTone(spec.pop, 0.08, "sine", 0.05 + Math.min(comboCount, 5) * 0.008, sfxGain, now + 0.035, 0.002);
  if (kind === "golden") {
    playTone(880, 0.12, "triangle", 0.08, sfxGain, now + 0.06, 0.003);
    playTone(1320, 0.14, "triangle", 0.055, sfxGain, now + 0.12, 0.003);
  }
}

function playSmashSound(kind) {
  if (!audioEnabled || !ensureAudio()) return;
  const spec = FRUIT_SOUND[kind] || FRUIT_SOUND.orange;
  const now = audioCtx.currentTime;
  playNoise(0.18, 0.20 + spec.squish * 0.16, sfxGain, now, 900 + spec.pop * 0.7, "bandpass");
  playTone(spec.tone * 0.55, 0.18, "sine", 0.09, sfxGain, now, 0.004);
}

function playBombCountdownSound(number) {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  playTone(260 + number * 90, 0.09, "square", 0.08, sfxGain, now, 0.002);
  playNoise(0.045, 0.08, sfxGain, now, 3200, "bandpass");
}

function playBombExplosionSound() {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  playNoise(0.42, 0.46, sfxGain, now, 460, "lowpass");
  playNoise(0.16, 0.32, sfxGain, now, 1800, "bandpass");
  playTone(82, 0.34, "sine", 0.28, sfxGain, now, 0.002);
  playTone(45, 0.42, "triangle", 0.18, sfxGain, now + 0.04, 0.002);
}

function playSafeSound() {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  playTone(520, 0.08, "triangle", 0.06, sfxGain, now, 0.003);
  playTone(780, 0.12, "triangle", 0.05, sfxGain, now + 0.07, 0.003);
}

function playFinalRushSound() {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  [440, 660, 880, 1320].forEach((freq, index) => playTone(freq, 0.11, "square", 0.045, sfxGain, now + index * 0.055, 0.002));
}

function playGameOverSound() {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  [330, 247, 196, 123].forEach((freq, index) => playTone(freq, 0.28, "sawtooth", 0.08, sfxGain, now + index * 0.18, 0.006));
}

function playWinSound() {
  if (!audioEnabled || !ensureAudio()) return;
  const now = audioCtx.currentTime;
  [523, 659, 784, 1046].forEach((freq, index) => playTone(freq, 0.16, "triangle", 0.06, sfxGain, now + index * 0.08, 0.004));
}

function bombChanceForSpawn(spawn) {
  if (spawn < 10) return 0;
  if (spawn < 20) return 0;
  const lateWindow = Math.max(1, duration - 23);
  return 0.08 + Math.min(1, (spawn - 20) / lateWindow) * 0.08;
}

function chooseQueuedKind(spawn, index, forceBomb = false) {
  if (forceBomb) return "bomb";
  const goldenChance = index > 4 && Math.random() < 0.08;
  if (Math.random() < bombChanceForSpawn(spawn)) return "bomb";
  return goldenChance ? "golden" : FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
}

function choosePlayTarget(spawn, kind, placedTargets, targetPlayer = 0, chaotic = false) {
  const minDistance = chaotic ? 0.10 : kind === "bomb" ? 0.24 : spawn < 20 ? 0.19 : 0.14;
  const timeWindow = chaotic ? 0.45 : spawn < 20 ? 1.45 : 1.0;
  const centerX = twoPlayerMode ? (targetPlayer === 1 ? 0.62 : 0.38) : 0.5;
  const spreadX = kind === "bomb" ? 0.32 : chaotic ? 0.48 : 0.38;
  const spreadY = kind === "bomb" ? 0.20 : chaotic ? 0.46 : 0.34;
  const baseY = kind === "bomb" ? 0.42 : 0.55;
  let fallback = { x: centerX, y: baseY };
  let bestFallback = fallback;
  let bestDistance = -1;

  for (let tries = 0; tries < 18; tries += 1) {
    const target = {
      x: clamp(centerX + (Math.random() - 0.5) * spreadX, 0.24, 0.76),
      y: clamp(baseY + (Math.random() - 0.5) * spreadY, 0.30, 0.76),
    };
    fallback = target;
    const nearbyTargets = placedTargets.filter((other) => Math.abs(other.spawn - spawn) < timeWindow);
    const nearest = nearbyTargets.length
      ? Math.min(...nearbyTargets.map((other) => Math.hypot(other.x - target.x, other.y - target.y)))
      : Infinity;
    if (nearest > bestDistance) {
      bestDistance = nearest;
      bestFallback = target;
    }
    const close = nearest < minDistance;
    if (!close) {
      placedTargets.push({ ...target, spawn, kind });
      return target;
    }
  }

  placedTargets.push({ ...bestFallback, spawn, kind });
  return bestFallback;
}

function prepareBombDrop(item) {
  item.mode = "roam";
  item.x = clamp(item.targetX + (Math.random() - 0.5) * 0.16, 0.22, 0.78);
  item.y = -0.08;
  item.pathStartX = item.x;
  item.pathStartY = item.y;
  item.flightTime = Math.max(0.82, item.flightTime * 0.72);
}

function resetFoods() {
  const placedTargets = [];
  const midBombIndexes = new Set([17, 24]);
  foods = Array.from({ length: 34 }, (_, index) => {
    const progress = index / 33;
    const spawn = index * 0.76 + Math.random() * 0.62;
    const kind = chooseQueuedKind(spawn, index, midBombIndexes.has(index));
    const edge = Math.floor(Math.random() * 4);
    const start = edge === 0 ? [0.04, 0.14 + Math.random() * 0.72]
      : edge === 1 ? [0.96, 0.14 + Math.random() * 0.72]
      : edge === 2 ? [0.16 + Math.random() * 0.68, 0.06]
      : [0.16 + Math.random() * 0.68, 0.94];
    const item = food(kind, start[0], start[1], spawn, 0.018 + Math.min(index, 20) * 0.0009 + Math.random() * 0.007, progress);
    const target = choosePlayTarget(spawn, kind, placedTargets, item.targetPlayer, false);
    item.targetX = target.x;
    item.targetY = target.y;
    if (item.kind === "bomb") prepareBombDrop(item);
    return item;
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
    pathStartX: x,
    pathStartY: y,
    pathControlX: 0.5,
    pathControlY: 0.42,
    flightTime: Math.max(0.72, 2.2 - progress * 0.64 - speed * 6 + Math.random() * 0.22),
    wobble: Math.random() * Math.PI * 2,
    rot: Math.random() * 1.4 - 0.7,
    lastCountdownNumber: 0,
  };
}

function spawnFinalRushWave(elapsed) {
  finalRushSpawned = true;
  const placedTargets = foods
    .filter((item) => !item.done && item.spawn > elapsed - 0.5)
    .map((item) => ({ x: item.targetX, y: item.targetY, spawn: item.spawn, kind: item.kind }));
  const burst = Array.from({ length: 18 }, (_, index) => {
    const kindRoll = Math.random();
    const kind = index % 5 === 0 ? "bomb" : kindRoll > 0.88 ? "golden" : FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
    const edge = index % 4;
    const start = edge === 0 ? [0.02, 0.10 + Math.random() * 0.80]
      : edge === 1 ? [0.98, 0.10 + Math.random() * 0.80]
      : edge === 2 ? [0.08 + Math.random() * 0.84, 0.02]
      : [0.08 + Math.random() * 0.84, 0.98];
    const item = food(kind, start[0], start[1], elapsed + index * 0.055, 0.078 + Math.random() * 0.046, 1);
    item.mode = Math.random() < 0.78 ? "face" : "roam";
    const target = choosePlayTarget(item.spawn, kind, placedTargets, item.targetPlayer, true);
    item.targetX = target.x;
    item.targetY = target.y;
    if (item.kind === "bomb") prepareBombDrop(item);
    item.targetLocked = false;
    item.hoverLife = kind === "bomb" ? 1.85 : 0.52 + Math.random() * 0.32;
    item.flightTime = 0.58 + Math.random() * 0.22;
    item.size *= 1.08 + Math.random() * 0.36;
    item.splatScale *= 1.18 + Math.random() * 0.36;
    return item;
  });
  foods.push(...burst);
  finalRushSpawnCount = burst.length;
  pops.push(pop("DOUBLE TIME!", 0.5, 0.22, "#c6ff36", true, "arcade"));
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
  document.body.classList.toggle("game-active", panel === els.gamePanel);
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
  lives = STARTING_LIVES;
  mouthTired = false;
  bombLock = 0;
  player2 = makePlayer2();
  gameOverPlayer = null;
  gameOverStartedAt = 0;
  preGameOverShot = "";
  finalRushAnnounced = false;
  finalRushSpawned = false;
  finalRushSpawnCount = 0;
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
  mouth.leftEyeX = 0.415;
  mouth.leftEyeY = 0.39;
  mouth.rightEyeX = 0.585;
  mouth.rightEyeY = 0.39;
  mouth.openness = 0;
  if (DEBUG_FACE) {
    updateDebugFace(performance.now());
    seedDebugSplats();
  }
  els.score2Text.textContent = "0";
  els.saveButton.disabled = true;
  startAudio();
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
    if (audioDestination && audioDestination.stream) {
      audioDestination.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    }
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
    if (!gameOverStartedAt) {
      gameOverStartedAt = now;
      preGameOverShot = captureResultShot(true);
      playGameOverSound();
    }
    const gameOverAge = (now - gameOverStartedAt) / 1000;
    drawGameOverOverlay(gameOverPlayer, gameOverAge);
    if (gameOverAge >= 1.7) {
      finishRound(true, gameOverPlayer);
      return;
    }
    raf = requestAnimationFrame(loop);
    return;
  }

  if (left <= 3 && !finalRushAnnounced) {
    finalRushAnnounced = true;
    spawnFinalRushWave(elapsed);
    playFinalRushSound();
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
    item.wobble += 0.08;
    if (!item.arrived) {
      const rushMultiplier = duration - elapsed <= 3 ? 1.28 : 1;
      const t = clamp(((elapsed - item.spawn) / item.flightTime) * rushMultiplier, 0, 1);
      const wobble = Math.sin(item.wobble * 1.45) * 0.010 * (1 - t);
      item.x = quadraticAt(item.pathStartX, item.pathControlX, item.targetX, t) + wobble;
      item.y = quadraticAt(item.pathStartY, item.pathControlY, item.targetY, t) + Math.cos(item.wobble) * 0.006 * (1 - t);
      if (t >= 1) item.arrived = true;
    } else {
      if (item.kind !== "bomb") {
        item.x += Math.cos(item.wobble) * 0.0018;
        item.y += Math.sin(item.wobble * 1.25) * 0.0018;
      }
    }

    const eater = getCatchingPlayer(item);
    if (eater !== -1) {
      eat(item, eater);
      item.done = true;
    } else if (item.arrived) {
      item.hoverAge += 1 / 60;
      if (item.kind === "bomb") {
        const countdownNumber = Math.max(1, Math.ceil((1 - item.hoverAge / item.hoverLife) * 3));
        if (countdownNumber !== item.lastCountdownNumber) {
          item.lastCountdownNumber = countdownNumber;
          playBombCountdownSound(countdownNumber);
        }
      }
    }
    if (!item.done && item.arrived && item.hoverAge > item.hoverLife) {
      if (item.kind === "bomb") {
        pops.push(pop("SAFE!", item.x, item.y, "#28e6ff", false, "arcade"));
        playSafeSound();
        item.done = true;
        continue;
      }
      if (item.targetPlayer === 1) player2.combo = 0;
      else combo = 0;
      const attachTo = item.mode === "face" ? item.targetPlayer : nearestFaceAttachment(item);
      splat(item, item.kind === "bomb" ? "bomb" : "fruit", attachTo);
      playSmashSound(item.kind);
      pops.push(pop("SPLAT!", item.x, item.y, "#fff", true));
      item.done = true;
    }
  }
}

function lockFoodTarget(item) {
  if (item.targetLocked) return;
  item.pathStartX = item.x;
  item.pathStartY = item.y;
  if (item.kind === "bomb") {
    item.pathControlX = clamp((item.pathStartX + item.targetX) / 2, 0.18, 0.82);
    item.pathControlY = clamp((item.pathStartY + item.targetY) / 2 - 0.04, 0.02, 0.72);
  } else {
    item.pathControlX = clamp((item.pathStartX + item.targetX) / 2 + (Math.random() - 0.5) * 0.18, 0.18, 0.82);
    item.pathControlY = clamp(Math.min(item.pathStartY, item.targetY) - 0.18 - Math.random() * 0.16, 0.08, 0.78);
  }
  item.targetLocked = true;
}

function getFoodTarget(item) {
  return { x: item.targetX, y: item.targetY };
}

function quadraticAt(start, control, end, t) {
  const inv = 1 - t;
  return inv * inv * start + 2 * inv * t * control + t * t * end;
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
  playFruitSound(item.kind, activeCombo);
  best = Math.max(best, score, player2.score);
  localStorage.setItem("photoMunchiesWebBest", String(best));
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  pops.push(pop(activeCombo >= 3 ? `P${playerIndex + 1} COMBO x${activeCombo}` : `P${playerIndex + 1} +${points}`, activeMouth.x, activeMouth.y, "#ffcf5c", activeCombo >= 3));
}

function eatBomb(item, playerIndex = 0) {
  const remainingLives = applyBombPenalty(playerIndex);
  screenShake = 0.48;
  splat(item, "bomb", playerIndex);
  playBombExplosionSound();
  pops.push(pop("-1 LIFE!", 0.5, 0.30, "#ff2d8e", true, "arcade"));
  pops.push(pop("ENERGY RESET", 0.5, 0.43, "#c6ff36", false, "arcade"));
  if (remainingLives <= 0) {
    gameOverPlayer = playerIndex;
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

function draw(elapsed, left, options = {}) {
  const shareMode = Boolean(options.shareMode);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (screenShake > 0 && !shareMode) {
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
  if (shareMode) {
    drawShareScore(options.totalScore ?? score, options.gameOver ?? false);
  } else {
    drawLives();
    drawPops();
    if (left <= 3) drawFinalRush(left);
    if (DEBUG_FACE) els.canvas.dataset.debugState = JSON.stringify(debugState());
  }
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
  mouth.leftEyeX = mouth.faceX - 0.085;
  mouth.leftEyeY = mouth.faceY - 0.055 + Math.sin(t * 1.8) * 0.004;
  mouth.rightEyeX = mouth.faceX + 0.085;
  mouth.rightEyeY = mouth.faceY - 0.055 + Math.cos(t * 1.6) * 0.004;
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
    pops.push(pop("-1 LIFE!", 0.5, 0.30, "#ff2d8e", true, "arcade"));
    pops.push(pop("ENERGY RESET", 0.5, 0.43, "#c6ff36", false, "arcade"));
  }
  if (DEBUG_BOMB_MISS) {
    foods = [{
      kind: "bomb",
      x: 0.34,
      y: 0.42,
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
      targetX: 0.34,
      targetY: 0.42,
      targetLocked: true,
      wobble: 0,
      rot: -0.2,
      lastCountdownNumber: 0,
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
  targetMouth.leftEyeX += (clamp(leftEye.x, 0.08, 0.92) - targetMouth.leftEyeX) * 0.42;
  targetMouth.leftEyeY += (clamp(leftEye.y, 0.10, 0.72) - targetMouth.leftEyeY) * 0.42;
  targetMouth.rightEyeX += (clamp(rightEye.x, 0.08, 0.92) - targetMouth.rightEyeX) * 0.42;
  targetMouth.rightEyeY += (clamp(rightEye.y, 0.10, 0.72) - targetMouth.rightEyeY) * 0.42;
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
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : 0;
  const earlyTargets = foods.filter((item) => item.spawn < 20);
  let minEarlyTargetDistance = 1;
  for (let i = 0; i < earlyTargets.length; i += 1) {
    for (let j = i + 1; j < earlyTargets.length; j += 1) {
      if (Math.abs(earlyTargets[i].spawn - earlyTargets[j].spawn) < 1.45) {
        minEarlyTargetDistance = Math.min(
          minEarlyTargetDistance,
          Math.hypot(earlyTargets[i].targetX - earlyTargets[j].targetX, earlyTargets[i].targetY - earlyTargets[j].targetY),
        );
      }
    }
  }
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
    duration,
    faceX: Number(mouth.faceX.toFixed(4)),
    faceY: Number(mouth.faceY.toFixed(4)),
    leftEyeX: Number(mouth.leftEyeX.toFixed(4)),
    leftEyeY: Number(mouth.leftEyeY.toFixed(4)),
    rightEyeX: Number(mouth.rightEyeX.toFixed(4)),
    rightEyeY: Number(mouth.rightEyeY.toFixed(4)),
    eyeMess: Number(clamp((faceSplatCount(0) - 2) / 7, 0, 1).toFixed(4)),
    mouthX: Number(mouth.x.toFixed(4)),
    mouthY: Number(mouth.y.toFixed(4)),
    lives,
    stamina: Number(stamina.toFixed(4)),
    energyResetGrace: Number(energyResetGrace.toFixed(4)),
    gameOverPlayer,
    attachedCount: splats.filter((item) => item.attachTo === 0).length,
    bombCount: splats.filter((item) => item.effect === "bomb").length,
    activeBombs: foods.filter((item) => item.kind === "bomb" && !item.done).length,
    spawnedBombs: foods.filter((item) => item.kind === "bomb" && !item.done && item.spawn <= elapsed).length,
    earlyBombs: foods.filter((item) => item.kind === "bomb" && item.spawn < 10).length,
    midBombs: foods.filter((item) => item.kind === "bomb" && item.spawn >= 10 && item.spawn < 20).length,
    activeFoods: foods.filter((item) => !item.done).length,
    finalRushAnnounced,
    finalRushSpawned,
    finalRushSpawnCount,
    minEarlyTargetDistance: Number(minEarlyTargetDistance.toFixed(4)),
    edgeTargetCount: foods.filter((item) => item.targetX < 0.22 || item.targetX > 0.78 || item.targetY < 0.28 || item.targetY > 0.78).length,
    screenCount: splats.filter((item) => item.attachTo === null).length,
    attached,
  };
}

window.photoMunchiesDebugState = debugState;

function faceSplatCount(playerIndex = 0) {
  return splats.filter((item) => item.attachTo === playerIndex && item.effect !== "bomb").length;
}

function drawPeekEyes(playerIndex = 0) {
  const isTracked = playerIndex === 1 ? player2.tracked : (faceTracked || DEBUG_FACE);
  if (!isTracked) return;
  const activeMouth = playerIndex === 1 ? player2.mouth : mouth;
  const mess = clamp((faceSplatCount(playerIndex) - 2) / 7, 0, 1);
  const blinkWave = Math.sin(performance.now() / (mess > 0.55 ? 150 : 230));
  const blink = blinkWave > (mess > 0.55 ? 0.58 : 0.78);
  const left = {
    x: activeMouth.leftEyeX * W,
    y: activeMouth.leftEyeY * H,
  };
  const right = {
    x: activeMouth.rightEyeX * W,
    y: activeMouth.rightEyeY * H,
  };
  const distance = Math.max(96, Math.hypot(right.x - left.x, right.y - left.y));
  const eyeW = clamp(distance * (0.17 + mess * 0.18), 28, 76);
  const cleanEyeH = clamp(distance * 0.095, 15, 25);
  const bigEyeH = clamp(distance * 0.34, 48, 88);
  ctx.save();
  ctx.shadowColor = "#fff6ff";
  ctx.shadowBlur = 14 + mess * 18;
  [
    { ...left, side: -1 },
    { ...right, side: 1 },
  ].forEach(({ x, y, side }) => {
    const flirtOffset = Math.sin(performance.now() / 360 + side) * (1 - mess) * 3;
    const cy = y + flirtOffset;
    const eyeH = blink ? 7 : cleanEyeH + mess * (bigEyeH - cleanEyeH);
    ctx.fillStyle = "#fff6ff";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 7 + mess * 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    if (blink) {
      ctx.moveTo(x - eyeW * 0.98, cy);
      ctx.quadraticCurveTo(x, cy + 8 + mess * 7, x + eyeW * 0.98, cy);
      ctx.stroke();
      drawEyelashes(x, cy, side, true, eyeW, 20, mess);
    } else {
      if (mess < 0.45) {
        ctx.moveTo(x - eyeW, cy);
        ctx.bezierCurveTo(x - eyeW * 0.45, cy - eyeH * 1.28, x + eyeW * 0.45, cy - eyeH * 1.20, x + eyeW, cy - 2);
        ctx.bezierCurveTo(x + eyeW * 0.35, cy + eyeH * 0.52, x - eyeW * 0.40, cy + eyeH * 0.52, x - eyeW, cy);
        ctx.closePath();
      } else {
        ctx.ellipse(x, cy, eyeW, eyeH, side * 0.035, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      if (mess >= 0.45) {
        ctx.strokeStyle = "rgba(255,246,255,0.78)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, cy, eyeW + 7, eyeH + 7, side * 0.035, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,45,142,${0.22 * (1 - mess)})`;
      ctx.beginPath();
      ctx.ellipse(x - side * eyeW * 0.18, cy - eyeH * 0.54, eyeW * 0.72, eyeH * 0.32, side * 0.10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0612";
      ctx.beginPath();
      ctx.arc(x + side * (6 + mess * 6), cy + mess * 5, clamp(9 + mess * 10, 9, 20), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + side * (10 + mess * 7), cy - eyeH * 0.26, 4 + mess * 3, 0, Math.PI * 2);
      ctx.fill();
      drawEyelashes(x, cy, side, false, eyeW, eyeH, mess);
    }
  });
  if (mess > 0.42) {
    const cx = (left.x + right.x) / 2;
    const cy = (left.y + right.y) / 2 + bigEyeH + 22;
    ctx.fillStyle = "#c6ff36";
    ctx.font = "900 29px 'Bangers', system-ui";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 6;
    const label = playerIndex === 1 ? "P2 PEEK!" : "PEEK!";
    ctx.strokeText(label, cx, cy);
    ctx.fillText(label, cx, cy);
  }
  ctx.restore();
}

function drawEyelashes(cx, cy, side, blink, eyeW, eyeH, mess = 0) {
  const t = performance.now() / 240;
  const colors = mess > 0.45 ? ["#ff5f7d", "#c6ff36", "#9b6bff", "#ff9d2e"] : ["#0a0612", "#0a0612", "#ff2d8e", "#0a0612"];
  ctx.save();
  ctx.lineCap = "round";
  const lashCount = mess > 0.45 ? 6 : 5;
  for (let i = 0; i < lashCount; i += 1) {
    const p = lashCount === 1 ? 0.5 : i / (lashCount - 1);
    const baseX = cx - eyeW * 0.66 + p * eyeW * 1.32;
    const baseY = cy - (blink ? 1 : eyeH * (0.78 + Math.sin(t + i) * 0.02));
    const lean = (p - 0.5) * (18 + mess * 10) + side * (5 + mess * 3) + Math.sin(t + i) * (3 + mess * 3);
    const tipX = baseX + lean;
    const tipY = baseY - (24 + mess * 16) - Math.sin(t * 1.6 + i) * (4 + mess * 3);
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 6 + mess * 2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo((baseX + tipX) / 2, baseY - 20, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = mess > 0.45 ? 4 : 2.8;
    if (mess > 0.45) {
      ctx.beginPath();
      ctx.moveTo(tipX - 9, tipY + 5);
      ctx.lineTo(tipX + 9, tipY - 3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(tipX + side * 10, tipY - 5, tipX + side * 18, tipY + 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLives() {
  drawPlayerLives(lives, W - 136, 30, "#ff5f7d");
  if (twoPlayerMode && player2.tracked) drawPlayerLives(player2.lives, W - 136, 88, "#8dd9ff");
}

function drawPlayerLives(activeLives, x, y, color) {
  ctx.save();
  for (let i = 0; i < STARTING_LIVES; i += 1) {
    const cx = x + (i % 5) * 27;
    const cy = y + Math.floor(i / 5) * 24;
    ctx.fillStyle = i < activeLives ? color : "rgba(8,3,15,0.42)";
    ctx.strokeStyle = "#0a0612";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 13);
    ctx.bezierCurveTo(cx - 18, cy + 2, cx - 9, cy - 12, cx, cy - 4);
    ctx.bezierCurveTo(cx + 9, cy - 12, cx + 18, cy + 2, cx, cy + 13);
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

function drawShareScore(totalScore, gameOver = false) {
  const label = gameOver ? "FINAL SCORE" : "SCORE";
  const scoreText = String(Math.round(totalScore));
  ctx.save();
  ctx.translate(W / 2, H - 150);
  ctx.rotate(-0.035);
  ctx.shadowColor = "#ff2d8e";
  ctx.shadowBlur = 28;
  roundRect(-224, -76, 448, 130, 24, "rgba(8,3,15,0.88)");
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff6ff";
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#c6ff36";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "1000 32px 'Bangers', system-ui";
  ctx.fillStyle = "#28e6ff";
  ctx.fillText(label, 0, -36);
  ctx.font = "1000 78px 'Bangers', system-ui";
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#0a0612";
  ctx.strokeText(scoreText, 0, 22);
  ctx.fillStyle = "#c6ff36";
  ctx.fillText(scoreText, 0, 22);
  ctx.restore();
}

function drawGameOverOverlay(playerIndex = 0, age = 0) {
  ctx.save();
  const alpha = age < 0.75 ? 1 : clamp(1 - (age - 0.75) / 0.95, 0, 1);
  ctx.globalAlpha = 0.92 * alpha;
  ctx.fillStyle = "#08030f";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;

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

function safeCanvasShot() {
  try {
    return els.canvas.toDataURL("image/png");
  } catch (error) {
    return "";
  }
}

function captureResultShot(gameOver = false) {
  const elapsed = startedAt ? (performance.now() - startedAt) / 1000 : duration;
  const left = Math.max(0, duration - elapsed);
  const totalScore = twoPlayerMode ? Math.max(score, player2.score) : score;
  draw(elapsed, left, { shareMode: true, totalScore, gameOver });
  const shot = safeCanvasShot();
  draw(elapsed, left);
  return shot;
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
  stopMusic();
  els.resultPanel.classList.toggle("game-over-panel", gameOver);
  const shot = gameOver && preGameOverShot ? preGameOverShot : captureResultShot(false);
  if (shot) {
    els.resultShot.src = shot;
  } else {
    els.resultShot.removeAttribute("src");
  }
  const totalScore = twoPlayerMode ? Math.max(score, player2.score) : score;
  els.rankText.textContent = gameOver ? "GAME OVER" : totalScore >= 2200 ? "大嘴王者" : totalScore >= 1300 ? "水果高手" : "小小大嘴怪";
  if (gameOver) {
    const playerText = twoPlayerMode ? `P${playerIndex + 1} ran out of hearts` : "You ran out of hearts";
    els.finalText.textContent = `${playerText} · Score ${score} · Best ${best}`;
    show(els.resultPanel);
    return;
  }
  playWinSound();
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
  await startAudio();
  await startCamera();
  await initFaceTracking();
  startRound();
});
els.playAgainButton.addEventListener("click", () => {
  startAudio();
  startRound();
});
els.restartButton.addEventListener("click", () => {
  startAudio();
  startRound();
});
els.audioButton.addEventListener("click", () => setAudioEnabled(!audioEnabled));
updateAudioButton();
els.saveButton.addEventListener("click", () => {
  if (!replayUrl) return;
  const link = document.createElement("a");
  link.href = replayUrl;
  link.download = `crazy-big-mouth-replay.${replayExtension}`;
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
