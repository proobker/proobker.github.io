/* ----------------------------------------------------
   Pointer Tank
   A small top-down tank that wanders after the pointer,
   tracks it with its turret and shells whatever is clicked.
   Purely decorative: the canvas never intercepts input.
---------------------------------------------------- */

const STORAGE_KEY = 'rd-tank';
const HIT_SELECTOR = 'a, button, img, h1, h2, h3, p, li, td, dd, .stat-card, .tag, .github-stat, .arc-reactor, .section-num';

const canvas = document.getElementById('tank-canvas');
const toggleBtn = document.getElementById('tank-btn');
const toggleStatus = document.getElementById('tank-status');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const COLORS = {
  hull: '#3D3A34',
  hullEdge: '#EFE9DC',
  tread: '#1B1916',
  treadMark: '#5A554C',
  turret: '#EFE9DC',
  accent: '#FF4D00',
  ink: '#141210'
};

let ctx = null;
let dpr = 1;
let enabled = true;
let running = false;
let lastTime = 0;

const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.6, seen: false };

const tank = {
  x: -60,
  y: window.innerHeight - 80,
  heading: 0,        // hull direction (radians)
  turret: 0,         // turret direction (radians)
  speed: 0,
  treadPhase: 0,
  recoil: 0,
  reload: 0,
  wander: { x: 0, y: 0, until: 0 }
};

let pendingShot = null;  // { x, y, el } waiting for the turret to line up
const shells = [];
const particles = [];
const flashes = [];

// ---------- Helpers ----------
const rand = (min, max) => min + Math.random() * (max - min);

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(current, target);
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

function soundOn() {
  const muteBtn = document.getElementById('mute-btn');
  return muteBtn && muteBtn.getAttribute('aria-pressed') === 'true';
}

let audioCtx = null;
function playBoom(kind) {
  if (!soundOn()) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const t = audioCtx.currentTime;
  const len = kind === 'fire' ? 0.12 : 0.35;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * len), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = kind === 'fire' ? 1800 : 600;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(kind === 'fire' ? 0.08 : 0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start(t);
}

// ---------- Setup ----------
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function setEnabled(on) {
  enabled = on;
  canvas.style.display = on ? 'block' : 'none';
  if (toggleStatus) toggleStatus.textContent = on ? 'On' : 'Off';
  if (toggleStatus) toggleStatus.classList.toggle('active-status', on);
  if (toggleBtn) toggleBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) { /* storage unavailable */ }

  if (on && !running) {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }
}

// ---------- Simulation ----------
function pickWanderPoint(now) {
  // A loose orbit around the pointer so the tank meanders instead of homing in
  const a = rand(0, Math.PI * 2);
  const r = rand(70, 170);
  tank.wander = { x: Math.cos(a) * r, y: Math.sin(a) * r, until: now + rand(1400, 3200) };
}

function update(dt, now) {
  if (now > tank.wander.until) pickWanderPoint(now);

  const margin = 30;
  const goalX = Math.max(margin, Math.min(window.innerWidth - margin, pointer.x + tank.wander.x));
  const goalY = Math.max(margin, Math.min(window.innerHeight - margin, pointer.y + tank.wander.y));
  const dx = goalX - tank.x;
  const dy = goalY - tank.y;
  const dist = Math.hypot(dx, dy);

  // Hull: turn toward the goal, then drive; slow down when facing away
  const desired = Math.atan2(dy, dx);
  tank.heading = turnToward(tank.heading, desired, 2.6 * dt);
  const facing = Math.max(0, Math.cos(angleDiff(tank.heading, desired)));
  const targetSpeed = dist > 18 ? Math.min(150, dist * 1.4) * facing : 0;
  tank.speed += (targetSpeed - tank.speed) * Math.min(1, 4 * dt);
  tank.x += Math.cos(tank.heading) * tank.speed * dt;
  tank.y += Math.sin(tank.heading) * tank.speed * dt;
  tank.treadPhase = (tank.treadPhase + tank.speed * dt) % 8;

  // Turret: track the pending target, otherwise the pointer
  const aimX = pendingShot ? pendingShot.x : pointer.x;
  const aimY = pendingShot ? pendingShot.y : pointer.y;
  const aim = Math.atan2(aimY - tank.y, aimX - tank.x);
  tank.turret = turnToward(tank.turret, aim, (pendingShot ? 12 : 5) * dt);

  tank.recoil = Math.max(0, tank.recoil - 40 * dt);
  tank.reload = Math.max(0, tank.reload - dt);

  if (pendingShot && tank.reload === 0 && Math.abs(angleDiff(tank.turret, aim)) < 0.06) {
    fire(pendingShot);
    pendingShot = null;
  }

  // Shells
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    const step = 900 * dt;
    const rx = s.tx - s.x;
    const ry = s.ty - s.y;
    const remaining = Math.hypot(rx, ry);
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 6) s.trail.shift();
    if (remaining <= step) {
      explode(s.tx, s.ty, s.el);
      shells.splice(i, 1);
    } else {
      s.x += (rx / remaining) * step;
      s.y += (ry / remaining) * step;
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vx *= 1 - 3 * dt;
    p.vy *= 1 - 3 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].life -= dt;
    if (flashes[i].life <= 0) flashes.splice(i, 1);
  }
}

function barrelTip() {
  const len = 30 - tank.recoil;
  return { x: tank.x + Math.cos(tank.turret) * len, y: tank.y + Math.sin(tank.turret) * len };
}

function fire(target) {
  const tip = barrelTip();
  shells.push({ x: tip.x, y: tip.y, tx: target.x, ty: target.y, el: target.el, trail: [] });
  flashes.push({ x: tip.x, y: tip.y, angle: tank.turret, life: 0.08, kind: 'muzzle' });
  tank.recoil = 7;
  tank.reload = 0.25;
  for (let i = 0; i < 6; i++) {
    const a = tank.turret + rand(-0.5, 0.5);
    const v = rand(40, 120);
    particles.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.5), max: 0.5, size: rand(3, 6), kind: 'smoke' });
  }
  playBoom('fire');
}

function explode(x, y, el) {
  flashes.push({ x, y, life: 0.35, max: 0.35, kind: 'ring' });
  for (let i = 0; i < 22; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(80, 320);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.6), max: 0.6, size: rand(1.5, 3.5), kind: 'spark' });
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(15, 70);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.5, 1), max: 1, size: rand(6, 14), kind: 'smoke' });
  }
  playBoom('hit');

  // Let other layers (the WebGL reactor) react to the impact
  window.dispatchEvent(new CustomEvent('tank:impact', { detail: { x, y } }));

  if (el && el.isConnected) {
    el.classList.remove('tank-hit');
    void el.offsetWidth; // restart the animation
    el.classList.add('tank-hit');
    setTimeout(() => el.classList.remove('tank-hit'), 450);
  }
}

// ---------- Rendering ----------
function drawTank() {
  ctx.save();
  ctx.translate(tank.x, tank.y);

  // Hull + treads
  ctx.save();
  ctx.rotate(tank.heading);
  ctx.fillStyle = COLORS.tread;
  ctx.fillRect(-20, -17, 40, 8);
  ctx.fillRect(-20, 9, 40, 8);
  ctx.fillStyle = COLORS.treadMark;
  for (let x = -20 + (8 - tank.treadPhase); x < 20; x += 8) {
    ctx.fillRect(x, -17, 2, 8);
    ctx.fillRect(x, 9, 2, 8);
  }
  ctx.fillStyle = COLORS.hull;
  ctx.strokeStyle = COLORS.hullEdge;
  ctx.lineWidth = 1.5;
  ctx.fillRect(-17, -10, 34, 20);
  ctx.strokeRect(-17, -10, 34, 20);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(11, -10, 3, 20); // front marker
  ctx.restore();

  // Turret + barrel
  ctx.save();
  ctx.rotate(tank.turret);
  ctx.fillStyle = COLORS.turret;
  ctx.fillRect(4 - tank.recoil, -2.5, 26, 5);
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(26 - tank.recoil, -3.5, 4, 7);
  ctx.fillStyle = COLORS.turret;
  ctx.fillRect(-9, -8, 16, 16);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(-3, -2, 4, 4);
  ctx.restore();

  ctx.restore();
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Smoke under everything
  for (const p of particles) {
    if (p.kind !== 'smoke') continue;
    const k = p.life / p.max;
    ctx.fillStyle = `rgba(150, 140, 125, ${0.35 * k})`;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * (2 - k), p.size * (2 - k));
  }

  drawTank();

  // Shells with short tracer
  for (const s of shells) {
    ctx.strokeStyle = 'rgba(255, 115, 56, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const first = s.trail[0] || s;
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.fillStyle = COLORS.hullEdge;
    ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  }

  // Sparks
  for (const p of particles) {
    if (p.kind !== 'spark') continue;
    const k = p.life / p.max;
    ctx.fillStyle = k > 0.5 ? `rgba(255, 220, 160, ${k})` : `rgba(255, 77, 0, ${k * 1.6})`;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }

  // Muzzle flashes + shockwave rings
  for (const f of flashes) {
    if (f.kind === 'muzzle') {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = 'rgba(255, 200, 120, 0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const k = f.life / f.max;
      ctx.strokeStyle = `rgba(255, 77, 0, ${k})`;
      ctx.lineWidth = 2;
      const r = (1 - k) * 34 + 4;
      ctx.strokeRect(f.x - r, f.y - r, r * 2, r * 2);
    }
  }
}

function frame(now) {
  if (!enabled) { running = false; return; }
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt, now);
  render();
  requestAnimationFrame(frame);
}

// ---------- Input ----------
function hitTargetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const target = el.closest(HIT_SELECTOR);
  if (!target) return null;
  // Don't shake whole sections or other huge blocks
  const r = target.getBoundingClientRect();
  return r.width * r.height < window.innerWidth * window.innerHeight * 0.35 ? target : null;
}

function init() {
  if (!canvas || !finePointer) {
    if (toggleBtn) toggleBtn.hidden = true;
    return;
  }

  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.seen) {
      pointer.seen = true;
      pickWanderPoint(performance.now());
    }
  }, { passive: true });

  document.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0) return;
    if (toggleBtn && toggleBtn.contains(e.target)) return;
    pendingShot = { x: e.clientX, y: e.clientY, el: hitTargetAt(e.clientX, e.clientY) };
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setEnabled(!enabled);
    });
  }

  let saved = '1';
  try { saved = localStorage.getItem(STORAGE_KEY) ?? '1'; } catch (e) { /* storage unavailable */ }
  setEnabled(saved !== '0');
}

init();
