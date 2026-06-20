const screens = {
  home: document.getElementById("homeScreen"),
  crop: document.getElementById("cropScreen"),
  ready: document.getElementById("readyScreen"),
  game: document.getElementById("gameScreen"),
  result: document.getElementById("resultScreen"),
};

const els = {
  photoInput: document.getElementById("photoInput"),
  choosePhotoButton: document.getElementById("choosePhotoButton"),
  startSetupButton: document.getElementById("startSetupButton"),
  homePreview: document.getElementById("homePreview"),
  cropBackButton: document.getElementById("cropBackButton"),
  cropCanvas: document.getElementById("cropCanvas"),
  zoomOutButton: document.getElementById("zoomOutButton"),
  zoomInButton: document.getElementById("zoomInButton"),
  resetCropButton: document.getElementById("resetCropButton"),
  confirmCropButton: document.getElementById("confirmCropButton"),
  readyPhoto: document.getElementById("readyPhoto"),
  readyTitle: document.getElementById("readyTitle"),
  modeSummary: document.getElementById("modeSummary"),
  playButton: document.getElementById("playButton"),
  gameBackButton: document.getElementById("gameBackButton"),
  gameStep: document.getElementById("gameStep"),
  gameTitle: document.getElementById("gameTitle"),
  gameInstruction: document.getElementById("gameInstruction"),
  gameCanvas: document.getElementById("gameCanvas"),
  timerText: document.getElementById("timerText"),
  resultBurst: document.getElementById("resultBurst"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  nextRoundButton: document.getElementById("nextRoundButton"),
  changePhotoButton: document.getElementById("changePhotoButton"),
  difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
};

const cropCtx = els.cropCanvas.getContext("2d");
const gameCtx = els.gameCanvas.getContext("2d");

const state = {
  screen: "home",
  sourceImage: null,
  sourceUrl: "",
  avatarUrl: "",
  avatarImage: null,
  difficulty: "gentle",
  crop: {
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  },
  round: {
    gameIndex: 0,
    wins: 0,
    active: false,
    startedAt: 0,
    duration: 10000,
    raf: 0,
    pointerId: null,
    dragItem: null,
    items: [],
    targets: [],
    particles: [],
    completed: false,
  },
};

const games = [
  {
    title: "Snack Attack",
    instruction: "Drag snacks into the glowing mouth zone before time runs out.",
    duration: 11000,
    setup: setupSnackAttack,
    update: updateSnackAttack,
    draw: drawSnackAttack,
    pointerDown: snackPointerDown,
    pointerMove: snackPointerMove,
    pointerUp: snackPointerUp,
  },
  {
    title: "Sticker Rescue",
    instruction: "Tap every sticker off the photo.",
    duration: 9500,
    setup: setupStickerRescue,
    update: updateStickerRescue,
    draw: drawStickerRescue,
    pointerDown: stickerPointerDown,
    pointerMove: noop,
    pointerUp: noop,
  },
  {
    title: "Funny Face Fix",
    instruction: "Drag each face part into the matching dotted target.",
    duration: 13000,
    setup: setupFunnyFaceFix,
    update: updateFunnyFaceFix,
    draw: drawFunnyFaceFix,
    pointerDown: fixPointerDown,
    pointerMove: fixPointerMove,
    pointerUp: fixPointerUp,
  },
];

const difficultyConfig = {
  gentle: {
    label: "Gentle",
    timerMultiplier: 1.45,
    summary: "Gentle mode: a little extra time for small hands.",
    failText: "So close. Try again with the same photo.",
  },
  challenge: {
    label: "Challenge",
    timerMultiplier: 1,
    summary: "Challenge mode: faster games for brave fingers.",
    failText: "Almost. Tap play again and beat the timer.",
  },
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  state.screen = name;
}

function loadImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.sourceImage = img;
    state.sourceUrl = url;
    els.homePreview.innerHTML = "";
    const preview = new Image();
    preview.src = url;
    preview.alt = "Selected game photo";
    els.homePreview.appendChild(preview);
    els.startSetupButton.disabled = false;
    resetCrop();
    drawCropper();
  };
  img.src = url;
}

function resetCrop() {
  const canvasSize = els.cropCanvas.width;
  const img = state.sourceImage;
  if (!img) return;

  const coverScale = Math.max(canvasSize / img.width, canvasSize / img.height);
  state.crop.scale = coverScale;
  state.crop.x = (canvasSize - img.width * coverScale) / 2;
  state.crop.y = (canvasSize - img.height * coverScale) / 2;
}

function drawCropper() {
  const canvas = els.cropCanvas;
  const ctx = cropCtx;
  const img = state.sourceImage;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff7df";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (img) {
    ctx.drawImage(
      img,
      state.crop.x,
      state.crop.y,
      img.width * state.crop.scale,
      img.height * state.crop.scale
    );
  }

  const marker = getCropMarker();
  ctx.save();
  ctx.fillStyle = "rgba(28, 37, 51, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  roundRect(ctx, marker.x, marker.y, marker.size, marker.size, 30);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#ffcf5c";
  roundRect(ctx, marker.x, marker.y, marker.size, marker.size, 30);
  ctx.stroke();

  ctx.setLineDash([18, 15]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, marker.size * 0.33, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(28, 37, 51, 0.8)";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Put the face here", canvas.width / 2, marker.y + marker.size + 42);
  ctx.restore();
}

function getCropMarker() {
  const size = Math.round(els.cropCanvas.width * 0.72);
  return {
    x: Math.round((els.cropCanvas.width - size) / 2),
    y: Math.round((els.cropCanvas.height - size) / 2),
    size,
  };
}

function confirmCrop() {
  const marker = getCropMarker();
  const out = document.createElement("canvas");
  out.width = 720;
  out.height = 720;
  const ctx = out.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(
    els.cropCanvas,
    marker.x,
    marker.y,
    marker.size,
    marker.size,
    0,
    0,
    out.width,
    out.height
  );

  state.avatarUrl = out.toDataURL("image/jpeg", 0.9);
  state.avatarImage = new Image();
  state.avatarImage.onload = () => {
    els.readyPhoto.src = state.avatarUrl;
    updateModeSummary();
    showScreen("ready");
  };
  state.avatarImage.src = state.avatarUrl;
}

function startCountdown() {
  let i = 0;
  const beats = ["Ready...", "Set...", "Play!"];
  els.playButton.disabled = true;
  els.playButton.textContent = "Starting";
  els.readyTitle.textContent = beats[0];
  const tick = () => {
    els.readyTitle.textContent = beats[i];
    i += 1;
    if (i < beats.length) {
      window.setTimeout(tick, 650);
    } else {
      window.setTimeout(() => {
        els.playButton.disabled = false;
        els.playButton.textContent = "Play";
        startRound();
      }, 450);
    }
  };
  tick();
}

function startRound() {
  state.round.gameIndex = 0;
  state.round.wins = 0;
  startGame(0);
}

function startGame(index) {
  const game = games[index];
  const difficulty = difficultyConfig[state.difficulty];
  cancelAnimationFrame(state.round.raf);
  state.round = {
    ...state.round,
    gameIndex: index,
    active: true,
    startedAt: performance.now(),
    duration: Math.round(game.duration * difficulty.timerMultiplier),
    pointerId: null,
    dragItem: null,
    items: [],
    targets: [],
    particles: [],
    completed: false,
  };

  els.gameStep.textContent = `Game ${index + 1} / ${games.length}`;
  els.gameTitle.textContent = game.title;
  els.gameInstruction.textContent = game.instruction;
  game.setup();
  showScreen("game");
  loop(performance.now());
}

function loop(now) {
  if (!state.round.active) return;

  const game = games[state.round.gameIndex];
  const elapsed = now - state.round.startedAt;
  const remaining = Math.max(0, state.round.duration - elapsed);
  els.timerText.textContent = Math.ceil(remaining / 1000);

  game.update(now, remaining);
  game.draw(now, remaining);
  updateParticles();
  drawParticles(gameCtx);

  if (remaining <= 0 && !state.round.completed) {
    finishGame(false);
    return;
  }

  state.round.raf = requestAnimationFrame(loop);
}

function finishGame(won) {
  if (state.round.completed) return;
  state.round.completed = true;
  state.round.active = false;
  cancelAnimationFrame(state.round.raf);

  if (!won) {
    showResult(false);
    return;
  }

  state.round.wins += 1;
  burst(360, 420, 18, ["#ffcf5c", "#4fcf96", "#ff5f7d", "#8dd9ff"]);

  const next = state.round.gameIndex + 1;
  if (next < games.length) {
    window.setTimeout(() => startGame(next), 850);
  } else {
    window.setTimeout(() => showResult(true), 850);
  }
}

function showResult(won) {
  const difficulty = difficultyConfig[state.difficulty];
  els.resultBurst.classList.toggle("fail-burst", !won);
  els.resultTitle.textContent = won ? "Success!" : "Try again";
  els.resultText.textContent = won
    ? `You cleared all three tiny games in ${difficulty.label} mode.`
    : difficulty.failText;
  showScreen("result");
}

function setDifficulty(nextDifficulty) {
  if (!difficultyConfig[nextDifficulty]) return;
  state.difficulty = nextDifficulty;
  els.difficultyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.difficulty === nextDifficulty);
  });
  updateModeSummary();
}

function updateModeSummary() {
  if (!els.modeSummary) return;
  els.modeSummary.textContent = difficultyConfig[state.difficulty].summary;
}

function setupSnackAttack() {
  state.round.items = [
    makeSnack(130, 830, "#ffcf5c", "cookie"),
    makeSnack(285, 830, "#ff8b6b", "apple"),
    makeSnack(455, 830, "#8dd9ff", "berry"),
    makeSnack(590, 830, "#4fcf96", "pea"),
  ];
  state.round.targets = [{ x: 360, y: 585, r: 82 }];
}

function makeSnack(x, y, color, label) {
  return { x, y, startX: x, startY: y, r: 38, color, label, eaten: false };
}

function updateSnackAttack() {
  if (state.round.items.every((item) => item.eaten)) finishGame(true);
}

function drawSnackAttack(now) {
  const ctx = gameCtx;
  clearGame("#fff4c5");
  drawAvatarCard(ctx, 105, 70, 510, 610, true);

  const pulse = 1 + Math.sin(now / 180) * 0.06;
  const mouth = state.round.targets[0];
  ctx.save();
  ctx.fillStyle = "rgba(255, 95, 125, 0.25)";
  ctx.strokeStyle = "#ff5f7d";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(mouth.x, mouth.y, mouth.r * 1.1 * pulse, mouth.r * 0.45 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  state.round.items.forEach((item) => {
    if (item.eaten) return;
    drawSnack(ctx, item);
  });
}

function snackPointerDown(pos) {
  const item = findTopItem(pos.x, pos.y, state.round.items.filter((candidate) => !candidate.eaten), 48);
  if (!item) return;
  state.round.dragItem = item;
}

function snackPointerMove(pos) {
  const item = state.round.dragItem;
  if (!item) return;
  item.x = pos.x;
  item.y = pos.y;
}

function snackPointerUp(pos) {
  const item = state.round.dragItem;
  if (!item) return;

  const mouth = state.round.targets[0];
  if (distance(pos.x, pos.y, mouth.x, mouth.y) < mouth.r * 1.1) {
    item.eaten = true;
    burst(mouth.x, mouth.y, 10, [item.color, "#ffffff"]);
  } else {
    item.x = item.startX;
    item.y = item.startY;
  }
  state.round.dragItem = null;
}

function setupStickerRescue() {
  state.round.items = [
    { x: 160, y: 205, r: 40, color: "#ffcf5c", gone: false, text: "ZAP" },
    { x: 545, y: 250, r: 38, color: "#4fcf96", gone: false, text: "WOW" },
    { x: 210, y: 575, r: 42, color: "#8dd9ff", gone: false, text: "POP" },
    { x: 515, y: 610, r: 44, color: "#ff5f7d", gone: false, text: "FUN" },
    { x: 360, y: 430, r: 36, color: "#b99bff", gone: false, text: "BOO" },
  ];
}

function updateStickerRescue() {
  if (state.round.items.every((item) => item.gone)) finishGame(true);
}

function drawStickerRescue(now) {
  const ctx = gameCtx;
  clearGame("#e8f8ff");
  drawAvatarCard(ctx, 84, 118, 552, 640, false);

  state.round.items.forEach((item) => {
    if (item.gone) return;
    const wiggle = Math.sin(now / 120 + item.x) * 0.12;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(wiggle);
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "#1c2533";
    ctx.lineWidth = 5;
    drawStar(ctx, 0, 0, item.r, item.r * 0.62, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1c2533";
    ctx.font = "900 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text, 0, 2);
    ctx.restore();
  });
}

function stickerPointerDown(pos) {
  const item = findTopItem(pos.x, pos.y, state.round.items.filter((candidate) => !candidate.gone), 52);
  if (!item) return;
  item.gone = true;
  burst(item.x, item.y, 12, [item.color, "#ffffff"]);
}

function setupFunnyFaceFix() {
  state.round.targets = [
    { key: "hat", x: 360, y: 205, w: 190, h: 92, done: false },
    { key: "glasses", x: 360, y: 435, w: 210, h: 76, done: false },
    { key: "smile", x: 360, y: 575, w: 155, h: 68, done: false },
  ];
  state.round.items = [
    { key: "hat", x: 125, y: 830, startX: 125, startY: 830, w: 128, h: 68, color: "#ffcf5c", placed: false },
    { key: "glasses", x: 360, y: 830, startX: 360, startY: 830, w: 158, h: 56, color: "#1c2533", placed: false },
    { key: "smile", x: 585, y: 830, startX: 585, startY: 830, w: 122, h: 52, color: "#ff5f7d", placed: false },
  ];
}

function updateFunnyFaceFix() {
  if (state.round.items.every((item) => item.placed)) finishGame(true);
}

function drawFunnyFaceFix() {
  const ctx = gameCtx;
  clearGame("#fff0f5");
  drawAvatarCard(ctx, 92, 80, 536, 650, false);

  state.round.targets.forEach((target) => {
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = target.done ? "#4fcf96" : "rgba(28, 37, 51, 0.42)";
    roundRect(ctx, target.x - target.w / 2, target.y - target.h / 2, target.w, target.h, 24);
    ctx.stroke();
    ctx.restore();
  });

  state.round.items.forEach((item) => drawFacePart(ctx, item));
}

function fixPointerDown(pos) {
  const item = [...state.round.items].reverse().find((candidate) => (
    !candidate.placed &&
    pos.x >= candidate.x - candidate.w / 2 &&
    pos.x <= candidate.x + candidate.w / 2 &&
    pos.y >= candidate.y - candidate.h / 2 &&
    pos.y <= candidate.y + candidate.h / 2
  ));
  if (!item) return;
  state.round.dragItem = item;
}

function fixPointerMove(pos) {
  const item = state.round.dragItem;
  if (!item) return;
  item.x = pos.x;
  item.y = pos.y;
}

function fixPointerUp() {
  const item = state.round.dragItem;
  if (!item) return;

  const target = state.round.targets.find((candidate) => candidate.key === item.key);
  if (target && Math.abs(item.x - target.x) < target.w * 0.48 && Math.abs(item.y - target.y) < target.h * 0.75) {
    item.x = target.x;
    item.y = target.y;
    item.placed = true;
    target.done = true;
    burst(target.x, target.y, 12, [item.color, "#ffffff"]);
  } else {
    item.x = item.startX;
    item.y = item.startY;
  }
  state.round.dragItem = null;
}

function clearGame(color) {
  const ctx = gameCtx;
  ctx.clearRect(0, 0, els.gameCanvas.width, els.gameCanvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, els.gameCanvas.width, els.gameCanvas.height);
}

function drawAvatarCard(ctx, x, y, w, h, mouthGuides) {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(28, 37, 51, 0.12)";
  ctx.lineWidth = 8;
  roundRect(ctx, x, y, w, h, 36);
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  if (state.avatarImage) {
    ctx.drawImage(state.avatarImage, x, y, w, w);
  }
  ctx.restore();

  if (mouthGuides) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.strokeStyle = "#1c2533";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.82, w * 0.2, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawSnack(ctx, item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.fillStyle = item.color;
  ctx.strokeStyle = "#1c2533";
  ctx.lineWidth = 5;

  if (item.label === "apple") {
    ctx.beginPath();
    ctx.arc(0, 5, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#239664";
    ctx.fillRect(9, -43, 9, 28);
  } else if (item.label === "berry") {
    ctx.beginPath();
    ctx.arc(-13, 5, item.r * 0.58, 0, Math.PI * 2);
    ctx.arc(13, 5, item.r * 0.58, 0, Math.PI * 2);
    ctx.arc(0, -12, item.r * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(28, 37, 51, 0.35)";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.cos(i) * 16, Math.sin(i * 2) * 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFacePart(ctx, item) {
  if (item.placed && state.round.dragItem !== item) {
    ctx.globalAlpha = 0.94;
  }

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#1c2533";
  ctx.fillStyle = item.color;

  if (item.key === "hat") {
    roundRect(ctx, -item.w / 2, -item.h / 2 + 22, item.w, item.h * 0.45, 16);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-42, -item.h / 2 + 22);
    ctx.lineTo(0, -item.h / 2 - 22);
    ctx.lineTo(42, -item.h / 2 + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (item.key === "glasses") {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(-38, 0, 28, 0, Math.PI * 2);
    ctx.arc(38, 0, 28, 0, Math.PI * 2);
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
  } else {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(0, -12, 45, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function getCanvasPos(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function findTopItem(x, y, items, radius) {
  return [...items].reverse().find((item) => distance(x, y, item.x, item.y) <= (item.r || radius));
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function burst(x, y, count, colors) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
    const speed = 3 + Math.random() * 5;
    state.round.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 9,
    });
  }
}

function updateParticles() {
  state.round.particles = state.round.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.18;
    particle.life -= 0.025;
    return particle.life > 0;
  });
}

function drawParticles(ctx) {
  state.round.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawStar(ctx, x, y, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function noop() {}

els.choosePhotoButton.addEventListener("click", () => els.photoInput.click());
els.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
});
els.photoInput.addEventListener("change", (event) => loadImageFromFile(event.target.files[0]));
els.startSetupButton.addEventListener("click", () => {
  if (!state.sourceImage) return;
  showScreen("crop");
  drawCropper();
});
els.cropBackButton.addEventListener("click", () => showScreen("home"));
els.resetCropButton.addEventListener("click", () => {
  resetCrop();
  drawCropper();
});
els.zoomInButton.addEventListener("click", () => {
  state.crop.scale *= 1.12;
  drawCropper();
});
els.zoomOutButton.addEventListener("click", () => {
  state.crop.scale *= 0.88;
  drawCropper();
});
els.confirmCropButton.addEventListener("click", confirmCrop);
els.playButton.addEventListener("click", startCountdown);
els.gameBackButton.addEventListener("click", () => {
  state.round.active = false;
  cancelAnimationFrame(state.round.raf);
  showScreen("ready");
});
els.nextRoundButton.addEventListener("click", () => showScreen("ready"));
els.changePhotoButton.addEventListener("click", () => showScreen("home"));

els.cropCanvas.addEventListener("pointerdown", (event) => {
  els.cropCanvas.setPointerCapture(event.pointerId);
  state.crop.dragging = true;
  state.crop.lastX = event.clientX;
  state.crop.lastY = event.clientY;
});

els.cropCanvas.addEventListener("pointermove", (event) => {
  if (!state.crop.dragging) return;
  const rect = els.cropCanvas.getBoundingClientRect();
  const scaleX = els.cropCanvas.width / rect.width;
  const scaleY = els.cropCanvas.height / rect.height;
  state.crop.x += (event.clientX - state.crop.lastX) * scaleX;
  state.crop.y += (event.clientY - state.crop.lastY) * scaleY;
  state.crop.lastX = event.clientX;
  state.crop.lastY = event.clientY;
  drawCropper();
});

function stopCropDrag() {
  state.crop.dragging = false;
}

els.cropCanvas.addEventListener("pointerup", stopCropDrag);
els.cropCanvas.addEventListener("pointercancel", stopCropDrag);

els.gameCanvas.addEventListener("pointerdown", (event) => {
  if (!state.round.active) return;
  els.gameCanvas.setPointerCapture(event.pointerId);
  state.round.pointerId = event.pointerId;
  games[state.round.gameIndex].pointerDown(getCanvasPos(event, els.gameCanvas));
});

els.gameCanvas.addEventListener("pointermove", (event) => {
  if (!state.round.active || state.round.pointerId !== event.pointerId) return;
  games[state.round.gameIndex].pointerMove(getCanvasPos(event, els.gameCanvas));
});

els.gameCanvas.addEventListener("pointerup", (event) => {
  if (state.round.pointerId !== event.pointerId) return;
  games[state.round.gameIndex].pointerUp(getCanvasPos(event, els.gameCanvas));
  state.round.pointerId = null;
});

els.gameCanvas.addEventListener("pointercancel", () => {
  state.round.dragItem = null;
  state.round.pointerId = null;
});

showScreen("home");
