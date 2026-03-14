(function () {
  'use strict';

  const POSITIONS = ['tl', 'tr', 'bl', 'br'];
  const GAME_A_SOURCES = ['tl', 'tr', 'bl'];
  const GAME_B_SOURCES = ['tl', 'tr', 'bl', 'br'];

  // LCD color palette
  const BG   = '#c8c8b4';   // LCD screen background
  const FG   = '#1a1a0a';   // LCD dark pixel
  const MID  = '#7a8a60';   // LCD mid-tone (wing details, dashes)

  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  const gameOverlay    = document.getElementById('gameOverlay');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScoreEl   = document.getElementById('finalScore');
  const restartBtn     = document.getElementById('restartBtn');

  let state = makeState(false, 'a');

  function makeState(running, mode) {
    return {
      running,
      mode,
      wolfPos: 'bl',
      score: 0,
      penalties: 0,
      eggs: [],
      eggInterval: 3000,
      lastEggTime: 0,
      speed: 1,
      lastSpeedUp: 0,
      annulled200: false,
      annulled500: false,
    };
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────

  function getLayout() {
    const w = canvas.width;
    const h = canvas.height;
    return {
      tl: { cx: w * 0.14, cy: h * 0.12, catchX: w * 0.28, catchY: h * 0.32, flipH: false },
      tr: { cx: w * 0.86, cy: h * 0.12, catchX: w * 0.72, catchY: h * 0.32, flipH: true  },
      bl: { cx: w * 0.14, cy: h * 0.88, catchX: w * 0.28, catchY: h * 0.68, flipH: false },
      br: { cx: w * 0.86, cy: h * 0.88, catchX: w * 0.72, catchY: h * 0.68, flipH: true  },
    };
  }

  // ─── Draw: Wolf ───────────────────────────────────────────────────────────────
  // Wolf faces RIGHT by default; flipH mirrors it left.
  // cx/cy = centre of wolf torso.
  // Wolf drawn in running pose (leaning forward), facing RIGHT by default.
  // Resembles the iconic «Ну, погоди!» LCD wolf: big pointy ears, long snout,
  // bent running legs, basket extended forward.
  function drawWolf(cx, cy, s, flipH) {
    ctx.save();
    ctx.translate(cx, cy);
    if (flipH) ctx.scale(-1, 1);
    // lean forward
    ctx.rotate(0.18);

    ctx.fillStyle   = FG;
    ctx.strokeStyle = FG;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    // ── Tail — sweeping up-back ───────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.1);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 1.1, -s * 0.9, -s * 0.75, -s * 1.1);
    ctx.lineWidth = s * 0.22;
    ctx.strokeStyle = FG;
    ctx.stroke();
    // fluffy tip
    ctx.beginPath();
    ctx.arc(-s * 0.75, -s * 1.12, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // ── Back leg (straight, pushing off) ─────────────────────────
    ctx.strokeStyle = FG;
    ctx.lineWidth   = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, s * 0.32);
    ctx.lineTo(-s * 0.38, s * 0.72);
    ctx.lineTo(-s * 0.52, s * 0.95);
    ctx.stroke();
    // back paw
    ctx.beginPath();
    ctx.ellipse(-s * 0.56, s * 0.98, s * 0.2, s * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // ── Body — oval tilted forward ────────────────────────────────
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.42, s * 0.62, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Back arm swinging behind ──────────────────────────────────
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.65, s * 0.1, -s * 0.58, s * 0.42);
    ctx.stroke();

    // ── Front leg (bent, reaching forward) ───────────────────────
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.32);
    ctx.lineTo(s * 0.42, s * 0.65);
    ctx.lineTo(s * 0.62, s * 0.82);
    ctx.stroke();
    // front paw
    ctx.beginPath();
    ctx.ellipse(s * 0.67, s * 0.84, s * 0.2, s * 0.1, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Neck ──────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.ellipse(s * 0.22, -s * 0.58, s * 0.22, s * 0.26, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── Head ──────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(s * 0.3, -s * 0.9, s * 0.33, 0, Math.PI * 2);
    ctx.fill();

    // ── Ear back (left) — tall triangle ──────────────────────────
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 1.1);
    ctx.lineTo(-s * 0.08, -s * 1.58);
    ctx.lineTo(s * 0.22, -s * 1.28);
    ctx.closePath();
    ctx.fill();

    // ── Ear front (right) — tall triangle ────────────────────────
    ctx.beginPath();
    ctx.moveTo(s * 0.36, -s * 1.14);
    ctx.lineTo(s * 0.46, -s * 1.62);
    ctx.lineTo(s * 0.62, -s * 1.24);
    ctx.closePath();
    ctx.fill();

    // ── Long snout pointing right ─────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(s * 0.46, -s * 0.82);
    ctx.bezierCurveTo(s * 0.7, -s * 0.78, s * 0.95, -s * 0.72, s * 1.05, -s * 0.64);
    ctx.bezierCurveTo(s * 0.95, -s * 0.58, s * 0.7, -s * 0.58, s * 0.46, -s * 0.72);
    ctx.closePath();
    ctx.fill();
    // nose tip
    ctx.beginPath();
    ctx.arc(s * 1.04, -s * 0.64, s * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // ── Eye cutout ────────────────────────────────────────────────
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(s * 0.42, -s * 0.98, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // pupil
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.arc(s * 0.44, -s * 0.99, s * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // ── Front arm holding basket ──────────────────────────────────
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.36, -s * 0.18);
    ctx.quadraticCurveTo(s * 0.72, s * 0.05, s * 0.88, s * 0.28);
    ctx.stroke();

    // ── Basket (round bag) ────────────────────────────────────────
    ctx.fillStyle = FG;
    // bag body
    ctx.beginPath();
    ctx.arc(s * 1.05, s * 0.42, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // bag highlight
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(s * 0.97, s * 0.33, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // bag neck
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.ellipse(s * 1.0, s * 0.15, s * 0.1, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ─── Draw: Chicken ────────────────────────────────────────────────────────────
  // Chicken faces RIGHT by default; flipH mirrors it.
  // cx/cy = centre of body. Bottom chickens are flipped vertically via ctx outside.
  function drawChicken(cx, cy, s, flipH, flipV) {
    ctx.save();
    ctx.translate(cx, cy);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);

    ctx.fillStyle   = FG;
    ctx.strokeStyle = FG;
    ctx.lineCap     = 'round';

    // Tail feathers
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, -s * 0.08);
    ctx.lineTo(-s * 0.82, -s * 0.52);
    ctx.lineTo(-s * 0.65, -s * 0.04);
    ctx.lineTo(-s * 0.88, s * 0.12);
    ctx.lineTo(-s * 0.62, s * 0.14);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing (slightly lighter)
    ctx.fillStyle = MID;
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, -s * 0.06, s * 0.3, s * 0.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FG;

    // Neck
    ctx.beginPath();
    ctx.ellipse(s * 0.3, -s * 0.28, s * 0.17, s * 0.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(s * 0.44, -s * 0.52, s * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Comb (3 bumps)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(s * 0.32 + i * s * 0.12, -s * 0.82, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Beak
    ctx.beginPath();
    ctx.moveTo(s * 0.70, -s * 0.52);
    ctx.lineTo(s * 0.96, -s * 0.46);
    ctx.lineTo(s * 0.70, -s * 0.42);
    ctx.closePath();
    ctx.fill();

    // Eye (cutout + pupil)
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(s * 0.52, -s * 0.57, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.arc(s * 0.54, -s * 0.58, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Legs/claws (perching)
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.4);
    ctx.lineTo(-s * 0.1, s * 0.62);
    ctx.moveTo(s * 0.15, s * 0.4);
    ctx.lineTo(s * 0.15, s * 0.62);
    ctx.stroke();

    ctx.restore();
  }

  // ─── Draw: Egg ────────────────────────────────────────────────────────────────
  function drawEgg(x, y) {
    const r = Math.min(canvas.width, canvas.height) * 0.035;
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.65, r, 0, 0, Math.PI * 2);
    ctx.fill();
    // subtle highlight
    ctx.fillStyle = MID;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.18, y - r * 0.32, r * 0.22, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Draw: Penalty chick icon ─────────────────────────────────────────────────
  function drawPenaltyChick(x, y, s) {
    ctx.fillStyle = FG;
    // body
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.arc(x + s * 1.1, y - s * 0.5, s * 0.65, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.beginPath();
    ctx.moveTo(x + s * 1.7, y - s * 0.5);
    ctx.lineTo(x + s * 2.0, y - s * 0.38);
    ctx.lineTo(x + s * 1.7, y - s * 0.25);
    ctx.closePath();
    ctx.fill();
    // eye cutout
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(x + s * 1.22, y - s * 0.6, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FG;
    ctx.beginPath();
    ctx.arc(x + s * 1.24, y - s * 0.6, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Draw: Chute (dashed diagonal) ───────────────────────────────────────────
  function drawChute(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = MID;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Main draw ────────────────────────────────────────────────────────────────
  function draw() {
    if (!canvas.width || !canvas.height) return;
    const w = canvas.width;
    const h = canvas.height;
    const S = Math.min(w, h); // base unit

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const layout = getLayout();

    // Chutes
    for (const p of Object.values(layout)) {
      drawChute(p.cx, p.cy, p.catchX, p.catchY);
    }

    // Chickens + perches
    const cs = S * 0.075;
    for (const [key, p] of Object.entries(layout)) {
      const isTop = key[1] === 'l' ? true : key[0] === 't';
      const top   = key.startsWith('t');
      const right = key.endsWith('r');

      // Perch bar
      ctx.strokeStyle = FG;
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      const perchY = p.cy + (top ? cs * 0.62 : -cs * 0.62);
      ctx.moveTo(p.cx - cs * 0.9, perchY);
      ctx.lineTo(p.cx + cs * 0.9, perchY);
      ctx.stroke();

      drawChicken(p.cx, p.cy, cs, right, !top);
    }

    // Wolf at catch position
    const wp  = layout[state.wolfPos];
    const ws  = S * 0.09;
    drawWolf(wp.catchX, wp.catchY, ws, wp.flipH);

    // Eggs
    for (const egg of state.eggs) {
      drawEgg(egg.x, egg.y);
    }

    // Score (top right of canvas)
    ctx.fillStyle  = FG;
    ctx.font       = `bold ${Math.round(S * 0.06)}px 'Courier New', monospace`;
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(state.score, w - S * 0.03, S * 0.025);

    // Penalty chick icons (top left)
    const ps = S * 0.035;
    for (let i = 0; i < state.penalties; i++) {
      drawPenaltyChick(S * 0.04 + i * ps * 2.5, S * 0.04, ps);
    }
  }

  // ─── Game logic ───────────────────────────────────────────────────────────────

  function spawnEgg() {
    const sources = state.mode === 'a' ? GAME_A_SOURCES : GAME_B_SOURCES;
    const source  = sources[Math.floor(Math.random() * sources.length)];
    const layout  = getLayout();
    const p       = layout[source];
    state.eggs.push({
      source,
      x: p.cx, y: p.cy,
      startX: p.cx, startY: p.cy,
      destX:  p.catchX, destY: p.catchY,
      progress: 0,
      speed: 0.0014 * state.speed,
    });
  }

  function updateEggs(dt) {
    const layout      = getLayout();
    const catchRadius = Math.min(canvas.width, canvas.height) * 0.2;

    for (let i = state.eggs.length - 1; i >= 0; i--) {
      const egg = state.eggs[i];
      egg.progress = Math.min(egg.progress + egg.speed * dt, 1);
      egg.x = egg.startX + (egg.destX - egg.startX) * egg.progress;
      egg.y = egg.startY + (egg.destY - egg.startY) * egg.progress;

      if (egg.progress >= 1) {
        const wp   = layout[state.wolfPos];
        const dist = Math.hypot(egg.destX - wp.catchX, egg.destY - wp.catchY);
        // Wolf is at this catch point only if wolfPos matches the egg's source
        if (state.wolfPos === egg.source) {
          state.score += 10;
          playSound('catch');
        } else {
          state.penalties++;
          playSound('break');
          if (state.penalties >= 3) {
            state.eggs.splice(i, 1);
            endGame();
            return;
          }
        }
        state.eggs.splice(i, 1);
      }
    }
  }

  function checkPenaltyAnnullment() {
    if (state.score >= 500 && !state.annulled500 && state.penalties > 0) {
      state.penalties  = 0;
      state.annulled500 = true;
      playSound('bonus');
    } else if (state.score >= 200 && !state.annulled200 && state.penalties > 0) {
      state.penalties  = 0;
      state.annulled200 = true;
      playSound('bonus');
    }
  }

  // ─── Sound ───────────────────────────────────────────────────────────────────
  let audioCtx = null;

  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      if (type === 'catch') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.06);
      } else if (type === 'break') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);
      } else if (type === 'bonus') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.06);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
      } else if (type === 'move') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      }
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (_) {}
  }

  // ─── Game loop ────────────────────────────────────────────────────────────────
  let lastTime = 0;

  function gameLoop(timestamp) {
    if (!state.running) return;
    const dt = Math.min(timestamp - lastTime, 80);
    lastTime  = timestamp;

    // Speed up every 5s
    if (timestamp - state.lastSpeedUp > 5000) {
      state.speed     = Math.min(state.speed + 0.1, 2.5);
      state.lastSpeedUp = timestamp;
    }

    // Spawn egg
    if (timestamp - state.lastEggTime > state.eggInterval / state.speed) {
      spawnEgg();
      state.lastEggTime = timestamp;
    }

    updateEggs(dt);
    checkPenaltyAnnullment();

    // Update HTML HUD
    document.querySelector('.game-hud .score').textContent    = state.score;
    document.querySelector('.game-hud .penalties').textContent = '🐣'.repeat(state.penalties);

    draw();
    requestAnimationFrame(gameLoop);
  }

  function startGame(mode) {
    state = makeState(true, mode);
    state.lastEggTime  = performance.now();
    state.lastSpeedUp  = performance.now();
    gameOverlay.hidden    = true;
    gameOverScreen.hidden = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function endGame() {
    state.running = false;
    finalScoreEl.textContent = state.score;
    gameOverScreen.hidden    = false;
  }

  // ─── Input ────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.btn-mode[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => startGame(btn.dataset.mode));
  });

  restartBtn.addEventListener('click', () => {
    gameOverScreen.hidden = true;
    gameOverlay.hidden    = false;
  });

  document.querySelectorAll('.btn-move').forEach((btn) => {
    const handler = (e) => {
      e.preventDefault();
      if (!state.running) return;
      const target = btn.dataset.target;
      if (POSITIONS.includes(target)) {
        state.wolfPos = target;
        playSound('move');
      }
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler, { passive: false });
  });

  // Keyboard support
  const keyMap = { ArrowLeft: 'bl', ArrowRight: 'br', KeyA: 'tl', KeyD: 'tr', KeyQ: 'tl', KeyE: 'tr' };
  window.addEventListener('keydown', (e) => {
    if (!state.running) return;
    const pos = keyMap[e.code];
    if (pos) { state.wolfPos = pos; playSound('move'); }
  });

  // ─── Resize ───────────────────────────────────────────────────────────────────
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    draw();
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
  resizeCanvas();
  draw();
})();
