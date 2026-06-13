(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const resultOverlay = document.getElementById("resultOverlay");
  const coachPanel = document.getElementById("coachPanel");
  const coachMessage = document.getElementById("coachMessage");
  const keyStatus = document.getElementById("keyStatus");
  const deathCount = document.getElementById("deathCount");
  const resultText = document.getElementById("resultText");

  const VIEW_W = 1280;
  const VIEW_H = 720;
  const WORLD_W = 7600;
  const GRAVITY = 1900;
  const RUN_SPEED = 330;
  const JUMP_SPEED = 760;
  const PLAYER_R = 26;

  const COLORS = {
    ink: "#17324d",
    grass: "#59bd72",
    grassDark: "#258553",
    dirt: "#a96c45",
    dirtLight: "#d99b63",
    coral: "#ff6f5d",
    yellow: "#ffd75e",
    sky: "#82d9ff"
  };

  const platforms = [
    { x: -100, y: 610, w: 580, h: 150, label: "START" },
    { x: 680, y: 485, w: 250, h: 235 },
    { x: 930, y: 610, w: 650, h: 150 },
    { x: 1690, y: 500, w: 320, h: 260 },
    { x: 2010, y: 610, w: 230, h: 150 },
    { x: 2350, y: 610, w: 260, h: 150, bounce: 1040 },
    { x: 2670, y: 570, w: 180, h: 190 },
    { x: 2850, y: 510, w: 180, h: 250 },
    { x: 3030, y: 450, w: 180, h: 310 },
    { x: 3210, y: 390, w: 250, h: 370 },
    { x: 3450, y: 520, w: 205, h: 28, bounce: 860, floating: true },
    { x: 3650, y: 570, w: 420, h: 190 },
    { x: 4050, y: 465, w: 240, h: 295 },
    { x: 4310, y: 575, w: 610, h: 185, slope: true },
    { x: 4920, y: 600, w: 780, h: 160, cave: true },
    { x: 5750, y: 570, w: 420, h: 190 },
    { x: 6250, y: 570, w: 400, h: 190, trap: true },
    { x: 6730, y: 505, w: 700, h: 255, finish: true }
  ];

  const movingPlatforms = [
    { x: 510, y: 590, w: 150, h: 28, minY: 385, maxY: 590, speed: 90, dir: -1 },
    { x: 1585, y: 565, w: 100, h: 24, minY: 455, maxY: 590, speed: 75, dir: -1 },
    { x: 2260, y: 590, w: 80, h: 24, minY: 450, maxY: 610, speed: 110, dir: -1 }
  ];

  const rings = [
    { x: 1040, y: 515, r: 48, power: 760, used: false },
    { x: 1250, y: 450, r: 48, power: 790, used: false },
    { x: 1460, y: 510, r: 48, power: 820, used: false }
  ];

  const hazards = [
    { type: "spikes", x: 1525, y: 586, w: 60, h: 24 },
    { type: "gear", x: 3335, y: 92, r: 42 },
    { type: "gear", x: 3500, y: 135, r: 36 },
    { type: "mouth", x: 3480, y: 645, w: 170, h: 75 },
    { type: "spikes", x: 6380, y: 546, w: 150, h: 24, hidden: true }
  ];

  const checkpoints = [
    { x: 70, y: 560 },
    { x: 1715, y: 450 },
    { x: 2700, y: 520 },
    { x: 3225, y: 340 },
    { x: 3670, y: 520 },
    { x: 4935, y: 550 },
    { x: 5765, y: 520 }
  ];

  const decorations = [
    { type: "sign", x: 110, y: 535, text: "START →" },
    { type: "sign", x: 1760, y: 425, text: "小心尖刺！" },
    { type: "sign", x: 2750, y: 495, text: "向上爬" },
    { type: "sign", x: 3910, y: 495, text: "钥匙在上面" },
    { type: "sign", x: 5980, y: 495, text: "洞里更安全" },
    { type: "fakeArrow", x: 6285, y: 470 },
    { type: "finish", x: 7140, y: 390 }
  ];

  const state = {
    running: false,
    won: false,
    cameraX: 0,
    targetX: null,
    pointerDown: false,
    deaths: 0,
    checkpoint: 0,
    hasKey: false,
    keyCollectedAt: 0,
    autoJumpCooldown: 0,
    lastTime: 0,
    coachVisible: window.innerWidth >= 700,
    caveAlpha: 0,
    particles: []
  };

  const player = {
    x: 105,
    y: 560,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    squash: 1,
    blink: 0
  };

  function resetGame() {
    state.running = true;
    state.won = false;
    state.cameraX = 0;
    state.targetX = null;
    state.deaths = 0;
    state.checkpoint = 0;
    state.hasKey = false;
    state.keyCollectedAt = 0;
    state.autoJumpCooldown = 0;
    state.caveAlpha = 0;
    state.particles.length = 0;
    rings.forEach((ring) => { ring.used = false; });
    movingPlatforms.forEach((platform, index) => {
      platform.y = index === 0 ? 590 : index === 1 ? 565 : 590;
      platform.dir = -1;
    });
    respawn(false);
    syncHud();
    resultOverlay.classList.remove("visible");
    setCoach("点一下右边的地面，小恐龙就会跑过去并自动起跳。");
  }

  function respawn(countDeath = true) {
    if (countDeath) {
      state.deaths += 1;
      burst(player.x, Math.min(player.y, 610), COLORS.coral, 16);
    }
    const point = checkpoints[state.checkpoint];
    player.x = point.x;
    player.y = point.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    state.targetX = null;
    state.cameraX = Math.max(0, point.x - 220);
    syncHud();
    if (countDeath) {
      setCoach(state.deaths >= 3
        ? "别着急。每次只点到下一个安全平台，落稳以后再点。"
        : "差一点！你从最近的安全旗帜重新出发了。");
    }
  }

  function syncHud() {
    keyStatus.textContent = state.hasKey ? "拿到了！" : "还没拿";
    deathCount.textContent = String(state.deaths);
  }

  function setCoach(message) {
    coachMessage.textContent = message;
  }

  function worldPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W + state.cameraX,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H
    };
  }

  function commandMove(event) {
    if (!state.running || state.won) return;
    const point = worldPointer(event);
    state.targetX = Math.max(0, Math.min(WORLD_W, point.x));
    if (player.grounded) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
      player.squash = 0.72;
      state.autoJumpCooldown = 0.35;
      burst(player.x, player.y + PLAYER_R, "#ffffff", 6);
    }
  }

  function update(dt) {
    if (!state.running || state.won) return;

    movingPlatforms.forEach((platform, index) => {
      if (index === 0) {
        const occupied = player.x > platform.x - PLAYER_R &&
          player.x < platform.x + platform.w + PLAYER_R &&
          player.y < platform.y + 20;
        const targetY = occupied ? platform.minY : platform.maxY;
        const distance = targetY - platform.y;
        platform.y += Math.sign(distance) * Math.min(Math.abs(distance), platform.speed * dt);
        return;
      }
      platform.y += platform.speed * platform.dir * dt;
      if (platform.y <= platform.minY || platform.y >= platform.maxY) {
        platform.y = Math.max(platform.minY, Math.min(platform.maxY, platform.y));
        platform.dir *= -1;
      }
    });

    const left = state.targetX !== null && state.targetX < player.x - 12;
    const right = state.targetX !== null && state.targetX > player.x + 12;
    state.autoJumpCooldown = Math.max(0, state.autoJumpCooldown - dt);
    player.vx = left ? -RUN_SPEED : right ? RUN_SPEED : player.vx * 0.78;
    if (left) player.facing = -1;
    if (right) player.facing = 1;
    if (!left && !right && Math.abs(player.vx) < 8) player.vx = 0;

    const oldY = player.y;
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = Math.max(10, Math.min(WORLD_W - 10, player.x));
    player.grounded = false;

    const allPlatforms = platforms.concat(movingPlatforms);
    let landing = null;
    for (const platform of allPlatforms) {
      const top = platform.y;
      const wasAbove = oldY + PLAYER_R <= top + 6;
      const nowBelow = player.y + PLAYER_R >= top;
      const insideX = player.x + PLAYER_R * 0.55 > platform.x &&
        player.x - PLAYER_R * 0.55 < platform.x + platform.w;
      if (player.vy >= 0 && wasAbove && nowBelow && insideX) {
        if (!landing || platform.y < landing.y) landing = platform;
      }
    }

    if (landing) {
      player.y = landing.y - PLAYER_R;
      if (landing.bounce) {
        player.vy = -landing.bounce;
        burst(player.x, landing.y, COLORS.yellow, 14);
        setCoach("弹簧台把你送上去了！向右点，别掉进风洞。");
      } else {
        if (player.vy > 420) player.squash = 0.76;
        player.vy = 0;
        player.grounded = true;
      }
    }

    if (player.grounded && (left || right) && state.autoJumpCooldown <= 0) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
      player.squash = 0.72;
      state.autoJumpCooldown = 0.35;
      burst(player.x, player.y + PLAYER_R, "#ffffff", 5);
    }

    rings.forEach((ring) => {
      const dx = player.x - ring.x;
      const dy = player.y - ring.y;
      if (Math.hypot(dx, dy) < ring.r + PLAYER_R && !ring.used) {
        ring.used = true;
        player.vy = -ring.power;
        player.vx = Math.max(player.vx, 420);
        burst(ring.x, ring.y, COLORS.yellow, 18);
        setTimeout(() => { ring.used = false; }, 650);
      }
    });

    if (player.x > 2060 && player.x < 2380 && player.y > 410) {
      player.vy -= 1150 * dt;
      player.vx += 35 * dt;
      if (Math.random() < 0.16) {
        state.particles.push({
          x: player.x + (Math.random() - 0.5) * 100,
          y: 650,
          vx: (Math.random() - 0.5) * 30,
          vy: -220 - Math.random() * 150,
          life: 0.9,
          color: "#dff8ff",
          r: 3 + Math.random() * 4
        });
      }
    }

    if (!state.hasKey && Math.hypot(player.x - 4145, player.y - 390) < 70) {
      state.hasKey = true;
      state.keyCollectedAt = performance.now();
      burst(4145, 390, COLORS.yellow, 26);
      syncHud();
      setCoach("钥匙拿到了！它会打开终点前的彩虹门。");
    }

    hazards.forEach((hazard) => {
      if (hazard.type === "gear") {
        if (Math.hypot(player.x - hazard.x, player.y - hazard.y) < hazard.r + PLAYER_R * 0.75) {
          respawn();
        }
      } else {
        const hit = player.x + PLAYER_R * 0.6 > hazard.x &&
          player.x - PLAYER_R * 0.6 < hazard.x + hazard.w &&
          player.y + PLAYER_R > hazard.y &&
          player.y - PLAYER_R < hazard.y + hazard.h;
        if (hit) respawn();
      }
    });

    if (player.y > 760) respawn();

    checkpoints.forEach((point, index) => {
      if (index > state.checkpoint && player.x > point.x + 80) {
        state.checkpoint = index;
      }
    });

    if (player.x > 6000 && player.x < 6190 && player.y > 300) {
      player.x = 6665;
      player.y = 410;
      player.vy = -300;
      player.vx = 280;
      state.checkpoint = 5;
      burst(6080, 560, "#c796ff", 22);
      burst(6665, 430, "#c796ff", 22);
      setCoach("传送洞成功！那个大箭头果然是骗人的。");
    }

    if (player.x > 6200 && player.x < 6650 && player.y > 515) {
      const trapPlatform = platforms.find((platform) => platform.trap);
      trapPlatform.y = Math.min(735, trapPlatform.y + 170 * dt);
      setCoach("假箭头是陷阱！试试前面山洞里的紫色传送洞。");
    } else {
      const trapPlatform = platforms.find((platform) => platform.trap);
      trapPlatform.y = Math.max(570, trapPlatform.y - 90 * dt);
    }

    if (player.x > 7150) {
      winGame();
    }

    player.squash += (1 - player.squash) * Math.min(1, dt * 8);
    player.blink += dt;
    updateParticles(dt);
    updateCoachByZone();

    const targetCamera = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W * 0.34));
    state.cameraX += (targetCamera - state.cameraX) * Math.min(1, dt * 4.5);
    state.caveAlpha += (((player.x > 4860 && player.x < 5730) ? 1 : 0) - state.caveAlpha) *
      Math.min(1, dt * 4);
    canvas.dataset.testState = [
      Math.round(player.x),
      Math.round(player.y),
      Math.round(state.cameraX),
      state.checkpoint,
      state.deaths,
      state.hasKey ? 1 : 0,
      state.won ? 1 : 0
    ].join(",");
  }

  function updateCoachByZone() {
    const x = player.x;
    let message = "";
    if (x < 600) message = "先跳上会升降的平台，再点右上方的平台。";
    else if (x < 1600) message = "连续穿过黄色圆环，它们会把你弹得更高。";
    else if (x < 2050) message = "尖刺碰到就会失败。落稳后再跳到下一块平台。";
    else if (x < 2660) message = "洞里有向上的风，下面的黄色弹簧也能把你弹上去。";
    else if (x < 3600) message = "沿楼梯向上。带刺的齿轮和下面的恐龙嘴都不能碰。";
    else if (x < 4300) message = state.hasKey
      ? "钥匙已经拿到，沿右边的路继续。"
      : "左上方藏着一把钥匙。不是必须，但拿到会有惊喜。";
    else if (x < 4900) message = "这里是斜坡，小步点击，别从边缘滑下去。";
    else if (x < 5750) message = "山洞很黑，但一直往右就能看到出口。";
    else if (x < 6200) message = "跳进紫色传送洞是安全路线。";
    else if (x < 6700) message = "大箭头在骗人：这块平台会掉下去！";
    else message = state.hasKey
      ? "钥匙打开了彩虹门，顺着滑梯冲到终点！"
      : "最后一段了！顺着滑梯冲过终点旗。";

    if (coachMessage.dataset.zone !== message) {
      coachMessage.dataset.zone = message;
      setCoach(message);
    }
  }

  function winGame() {
    state.won = true;
    player.vx = 0;
    burst(player.x, player.y, COLORS.yellow, 40);
    resultText.textContent = state.hasKey
      ? `你拿到了金钥匙，只失败了 ${state.deaths} 次，还识破了假箭头！`
      : `你识破了假箭头，只失败了 ${state.deaths} 次。下次试试找金钥匙！`;
    setTimeout(() => resultOverlay.classList.add("visible"), 550);
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.5 + Math.random() * 0.6,
        color,
        r: 3 + Math.random() * 5
      });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 420 * dt;
      particle.life -= dt;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawSky();

    ctx.save();
    ctx.translate(-state.cameraX, 0);
    drawBackground();
    platforms.forEach(drawPlatform);
    movingPlatforms.forEach((platform) => drawPlatform(platform, true));
    drawWind();
    rings.forEach(drawRing);
    drawKey();
    hazards.forEach(drawHazard);
    decorations.forEach(drawDecoration);
    drawCheckpoints();
    drawPortal();
    drawPlayer();
    drawParticles();
    ctx.restore();

    if (state.caveAlpha > 0.01) {
      ctx.fillStyle = `rgba(12, 25, 46, ${state.caveAlpha * 0.48})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    drawProgress();
  }

  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, "#77d6ff");
    gradient.addColorStop(0.7, "#d8f7ff");
    gradient.addColorStop(1, "#fff4c7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = "rgba(255, 246, 167, 0.95)";
    ctx.beginPath();
    ctx.arc(1090, 95, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBackground() {
    const parallax = state.cameraX * 0.22;
    for (let i = -1; i < 9; i += 1) {
      const x = i * 980 + 140 - parallax;
      ctx.fillStyle = i % 2 ? "#9bd99b" : "#89cf91";
      ctx.beginPath();
      ctx.moveTo(x, 620);
      ctx.quadraticCurveTo(x + 230, 230, x + 480, 620);
      ctx.quadraticCurveTo(x + 700, 340, x + 930, 620);
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < 14; i += 1) {
      const x = i * 620 + 120;
      const y = 100 + (i % 3) * 62;
      drawCloud(x, y, 0.75 + (i % 2) * 0.2);
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    [[0, 12, 36], [42, 0, 46], [90, 17, 31]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(-8, 14, 128, 42);
    ctx.restore();
  }

  function drawPlatform(platform, moving = false) {
    ctx.save();
    const radius = 18;
    roundedRect(platform.x, platform.y, platform.w, platform.h, radius);
    ctx.fillStyle = platform.cave ? "#40546b" : moving ? "#f4ae55" : COLORS.dirt;
    ctx.fill();

    roundedRect(platform.x, platform.y, platform.w, Math.min(24, platform.h), radius);
    ctx.fillStyle = platform.bounce ? COLORS.yellow : platform.cave ? "#657a88" : COLORS.grass;
    ctx.fill();

    if (!moving && !platform.cave) {
      ctx.fillStyle = COLORS.dirtLight;
      for (let x = platform.x + 22; x < platform.x + platform.w - 10; x += 48) {
        ctx.beginPath();
        ctx.arc(x, platform.y + 54 + (x % 3) * 16, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (platform.bounce) {
      ctx.strokeStyle = "#d78331";
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let x = platform.x + 22; x < platform.x + platform.w - 20; x += 28) {
        ctx.moveTo(x, platform.y + 45);
        ctx.lineTo(x + 14, platform.y + 68);
        ctx.lineTo(x + 28, platform.y + 45);
      }
      ctx.stroke();
    }

    if (moving) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "900 18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("↑", platform.x + platform.w / 2, platform.y + 20);
    }
    ctx.restore();
  }

  function drawRing(ring) {
    ctx.save();
    ctx.translate(ring.x, ring.y);
    const pulse = 1 + Math.sin(performance.now() / 150 + ring.x) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = ring.used ? "#fff4b0" : COLORS.yellow;
    ctx.lineWidth = 14;
    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff8d6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWind() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.76)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const y = 590 - i * 52;
      const wave = Math.sin(performance.now() / 260 + i) * 18;
      ctx.beginPath();
      ctx.moveTo(2080 + wave, y);
      ctx.bezierCurveTo(2130, y - 35, 2190, y + 18, 2250, y - 24);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHazard(hazard) {
    if (hazard.type === "spikes") {
      ctx.fillStyle = hazard.hidden ? "#ee5565" : "#e94c5b";
      const count = Math.max(2, Math.round(hazard.w / 24));
      const spikeW = hazard.w / count;
      for (let i = 0; i < count; i += 1) {
        ctx.beginPath();
        ctx.moveTo(hazard.x + i * spikeW, hazard.y + hazard.h);
        ctx.lineTo(hazard.x + i * spikeW + spikeW / 2, hazard.y);
        ctx.lineTo(hazard.x + (i + 1) * spikeW, hazard.y + hazard.h);
        ctx.closePath();
        ctx.fill();
      }
    } else if (hazard.type === "gear") {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(performance.now() / 500 * (hazard.x % 2 ? 1 : -1));
      ctx.fillStyle = "#d94d5c";
      ctx.beginPath();
      const teeth = 16;
      for (let i = 0; i < teeth * 2; i += 1) {
        const angle = (i / (teeth * 2)) * Math.PI * 2;
        const r = i % 2 ? hazard.r * 0.72 : hazard.r;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff1cb";
      ctx.beginPath();
      ctx.arc(0, 0, hazard.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (hazard.type === "mouth") {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.fillStyle = "#4c9362";
      ctx.beginPath();
      ctx.ellipse(hazard.w / 2, 28, hazard.w / 2, 55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#7c263d";
      ctx.beginPath();
      ctx.ellipse(hazard.w / 2, 28, hazard.w * 0.38, 34, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#fff7d8";
      for (let i = 0; i < 6; i += 1) {
        const x = 27 + i * 24;
        ctx.beginPath();
        ctx.moveTo(x, 19);
        ctx.lineTo(x + 10, 48);
        ctx.lineTo(x + 20, 19);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawKey() {
    if (state.hasKey) return;
    ctx.save();
    ctx.translate(4145, 390);
    ctx.rotate(Math.sin(performance.now() / 350) * 0.15);
    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.moveTo(17, 10);
    ctx.lineTo(58, 33);
    ctx.lineTo(48, 49);
    ctx.moveTo(43, 25);
    ctx.lineTo(55, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawDecoration(item) {
    if (item.type === "sign") {
      ctx.fillStyle = "#774d34";
      ctx.fillRect(item.x + 44, item.y, 8, 55);
      roundedRect(item.x, item.y - 35, 100, 42, 8);
      ctx.fillStyle = "#fff1b9";
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.font = "900 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(item.text, item.x + 50, item.y - 9);
    } else if (item.type === "fakeArrow") {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = "#ff5d66";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(94, 0);
      ctx.lineTo(94, -30);
      ctx.lineTo(152, 25);
      ctx.lineTo(94, 80);
      ctx.lineTo(94, 50);
      ctx.lineTo(0, 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "900 20px system-ui";
      ctx.fillText("终点！", 50, 33);
      ctx.restore();
    } else if (item.type === "finish") {
      ctx.fillStyle = "#734a31";
      ctx.fillRect(item.x, item.y, 12, 185);
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          ctx.fillStyle = (row + col) % 2 ? "white" : COLORS.ink;
          ctx.fillRect(item.x + 12 + col * 22, item.y + row * 22, 22, 22);
        }
      }
    }
  }

  function drawCheckpoints() {
    checkpoints.slice(1).forEach((point, index) => {
      ctx.strokeStyle = index + 1 <= state.checkpoint ? COLORS.yellow : "rgba(255,255,255,0.45)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y + 30);
      ctx.lineTo(point.x, point.y - 65);
      ctx.stroke();
      ctx.fillStyle = index + 1 <= state.checkpoint ? COLORS.yellow : "rgba(255,255,255,0.62)";
      ctx.beginPath();
      ctx.moveTo(point.x + 2, point.y - 62);
      ctx.lineTo(point.x + 54, point.y - 42);
      ctx.lineTo(point.x + 2, point.y - 20);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawPortal() {
    ctx.save();
    ctx.translate(6090, 530);
    ctx.strokeStyle = "#a779e8";
    ctx.lineWidth = 16;
    ctx.shadowColor = "#c99cff";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(0, 20, 48, 70, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.rotate(performance.now() / 900);
    ctx.beginPath();
    ctx.arc(0, 20, 27, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(player.facing * (2 - player.squash), player.squash);

    ctx.fillStyle = "rgba(23,50,77,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 29, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#55b96f";
    ctx.beginPath();
    ctx.ellipse(-4, 0, 28, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, -15, 25, 21, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3a8f5a";
    ctx.beginPath();
    ctx.moveTo(-28, -6);
    ctx.quadraticCurveTo(-50, -22, -59, 4);
    ctx.quadraticCurveTo(-38, 1, -20, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff2ae";
    [-16, -4, 8].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x - 6, -22);
      ctx.lineTo(x, -38);
      ctx.lineTo(x + 7, -22);
      ctx.fill();
    });

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(24, -20, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(27, -20, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(22, -8, 9, 0.1, 1.4);
    ctx.stroke();

    ctx.fillStyle = "#3d9360";
    ctx.fillRect(-18, 20, 12, 17);
    ctx.fillRect(8, 20, 12, 17);
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawProgress() {
    const x = 410;
    const y = 24;
    const w = 460;
    const progress = Math.max(0, Math.min(1, player.x / 7150));
    roundedRect(x, y, w, 14, 7);
    ctx.fillStyle = "rgba(23,50,77,0.18)";
    ctx.fill();
    if (progress > 0.001) {
      roundedRect(x, y, w * progress, 14, 7);
      ctx.fillStyle = COLORS.yellow;
      ctx.fill();
    }
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function frame(time) {
    const dt = Math.min(0.033, (time - (state.lastTime || time)) / 1000);
    state.lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    canvas.dataset.pointerEvents = String(Number(canvas.dataset.pointerEvents || 0) + 1);
    state.pointerDown = true;
    canvas.setPointerCapture(event.pointerId);
    commandMove(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (state.pointerDown) {
      const point = worldPointer(event);
      state.targetX = point.x;
    }
  });
  canvas.addEventListener("pointerup", () => {
    state.pointerDown = false;
  });

  const keys = new Set();
  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "ArrowLeft") state.targetX = player.x - 500;
    if (event.code === "ArrowRight") state.targetX = player.x + 500;
    if ((event.code === "Space" || event.code === "ArrowUp") && player.grounded) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
    }
  });
  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
    if (!keys.has("ArrowLeft") && !keys.has("ArrowRight")) state.targetX = player.x;
  });

  document.getElementById("startButton").addEventListener("click", () => {
    startOverlay.classList.remove("visible");
    resetGame();
  });
  document.getElementById("restartButton").addEventListener("click", resetGame);
  document.getElementById("playAgainButton").addEventListener("click", resetGame);
  document.getElementById("coachButton").addEventListener("click", () => {
    state.coachVisible = !state.coachVisible;
    coachPanel.classList.toggle("hidden", !state.coachVisible);
    document.getElementById("coachButton").setAttribute("aria-expanded", String(state.coachVisible));
  });

  window.__DINO_DEBUG__ = () => Object.freeze({
    x: Math.round(player.x),
    y: Math.round(player.y),
    vx: Math.round(player.vx),
    vy: Math.round(player.vy),
    cameraX: Math.round(state.cameraX),
    targetX: state.targetX === null ? null : Math.round(state.targetX),
    checkpoint: state.checkpoint,
    deaths: state.deaths,
    hasKey: state.hasKey,
    running: state.running,
    won: state.won
  });

  coachPanel.classList.toggle("hidden", !state.coachVisible);
  document.getElementById("coachButton").setAttribute("aria-expanded", String(state.coachVisible));
  draw();
  requestAnimationFrame(frame);
})();
