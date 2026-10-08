import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Global variables for WebGL layer
let scene, camera, renderer, discGroup, hitGroup, reactor, fan, dotRing, coreGlow, coreLight, halo, plate;
let coreMat, coreRingMat, accentStripMat;

const basePosition = new THREE.Vector3();
const pointerNdc = new THREE.Vector2(0, 0);
let pointerActive = false;

// Spring-driven tilt so the reactor feels heavy
const tilt = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
const parallax = { x: 0, y: 0 };
let hover = 0;

const baseRotationSpeed = 0.006;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;
let spinBoost = 0;
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const CORE_COLOR = new THREE.Color(0x00E5FF);
const OVERLOAD_COLOR = new THREE.Color(0xFF4D00);

// Impact animation state
let impact = null; // { t, dirX, dirY }
const effects = []; // expanding rings
let sparks = null;

function init() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.z = 12;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Soft studio reflections so the metal reads as metal
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // discGroup: placement + mouse tilt; hitGroup: impact knockback
  discGroup = new THREE.Group();
  scene.add(discGroup);
  hitGroup = new THREE.Group();
  discGroup.add(hitGroup);

  positionDiscForViewport();
  createReactor();
  createSparks();
  addLighting();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', () => { pointerActive = false; });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('tank:impact', onTankImpact);

  animate();
}

function positionDiscForViewport() {
  if (window.innerWidth <= 992) {
    basePosition.set(0, 0, 0);
    discGroup.scale.set(0.8, 0.8, 0.8);
  } else if (window.innerWidth <= 1280) {
    basePosition.set(2.2, 0, 0);
    discGroup.scale.set(1.0, 1.0, 1.0);
  } else {
    basePosition.set(3.5, 0, 0);
    discGroup.scale.set(0.88, 0.88, 0.88);
  }
  discGroup.position.copy(basePosition);
}

// ---------- Materials ----------
const housingMat = new THREE.MeshStandardMaterial({ color: 0x15181D, metalness: 0.85, roughness: 0.42 });
const armorMat = new THREE.MeshStandardMaterial({ color: 0x3A4048, metalness: 0.9, roughness: 0.32 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x8C949E, metalness: 1.0, roughness: 0.28 });
const darkRimMat = new THREE.MeshStandardMaterial({ color: 0x2A3038, metalness: 0.9, roughness: 0.35 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0xC9D0D8, metalness: 0.95, roughness: 0.22, side: THREE.DoubleSide });
const boltMat = new THREE.MeshStandardMaterial({ color: 0x5D6672, metalness: 1.0, roughness: 0.35 });

function ring(radius, tube, mat, z = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 24, 160), mat);
  mesh.position.z = z;
  return mesh;
}

// Flat annulus segment (used for armor plates and accent strips)
function arcSegment(rIn, rOut, start, end, depth, mat) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, start, end, false);
  shape.absarc(0, 0, rIn, end, start, true);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 32
  });
  return new THREE.Mesh(geom, mat);
}

// Radial gradient texture used for additive glows
function glowTexture(inner, mid) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.18, mid);
  g.addColorStop(0.45, mid.replace(/[\d.]+\)$/, '0.22)'));
  g.addColorStop(1, mid.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Build the reactor in the XY plane, facing the camera (+Z)
function createReactor() {
  reactor = new THREE.Group();
  // Slight three-quarter angle so the depth is visible
  reactor.rotation.set(0.12, -0.38, 0);
  hitGroup.add(reactor);

  // Faint halo behind the housing
  halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(120,240,255,0.5)', 'rgba(0,229,255,0.25)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35
  }));
  halo.scale.set(13, 13, 1);
  halo.position.z = -0.8;
  reactor.add(halo);

  // Housing: back plate + stepped rims
  plate = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.35, 128), housingMat);
  plate.rotation.x = Math.PI / 2;
  plate.position.z = -0.25;
  reactor.add(plate);

  reactor.add(ring(4.38, 0.08, rimMat, -0.05));
  reactor.add(ring(3.9, 0.05, darkRimMat, 0.02));
  reactor.add(ring(2.95, 0.16, darkRimMat, 0.05));
  reactor.add(ring(2.78, 0.03, rimMat, 0.12));

  // Armor plates with accent strips between rim and indicator ring
  accentStripMat = new THREE.MeshStandardMaterial({ color: 0x1A0A04, emissive: 0xFF4D00, emissiveIntensity: 0.25 });
  const PLATES = 8;
  const gap = 0.07;
  for (let i = 0; i < PLATES; i++) {
    const a0 = (i / PLATES) * Math.PI * 2 + gap;
    const a1 = ((i + 1) / PLATES) * Math.PI * 2 - gap;
    const armor = arcSegment(3.98, 4.3, a0, a1, 0.16, armorMat);
    armor.position.z = -0.08;
    reactor.add(armor);

    const mid = (a0 + a1) / 2;
    const strip = arcSegment(4.08, 4.16, mid - 0.18, mid + 0.18, 0.04, accentStripMat);
    strip.position.z = 0.1;
    reactor.add(strip);
  }

  // Bolts around the outer rim
  const boltGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeom, boltMat);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 3.55, Math.sin(a) * 3.55, 0.02);
    reactor.add(bolt);
  }

  // Stator: fixed fins just outside the fan
  const FINS = 48;
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.22, 0.08), darkRimMat, FINS);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < FINS; i++) {
    const a = (i / FINS) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2);
    m.compose(new THREE.Vector3(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0.02), q, new THREE.Vector3(1, 1, 1));
    fins.setMatrixAt(i, m);
  }
  reactor.add(fins);

  // Fan: one rotor of pitched blades
  fan = new THREE.Group();
  fan.position.z = 0.05;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.11, 1.2);
  bladeShape.lineTo(0.11, 1.2);
  bladeShape.lineTo(0.34, 2.68);
  bladeShape.lineTo(-0.34, 2.68);
  bladeShape.closePath();
  const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2
  });
  const BLADES = 18;
  for (let i = 0; i < BLADES; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / BLADES) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.rotation.y = 0.55; // blade pitch
    pivot.add(blade);
    fan.add(pivot);
  }
  reactor.add(fan);

  // Hub with cap bolts
  reactor.add(ring(1.12, 0.12, rimMat, 0.08));
  const hubFace = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 96), housingMat);
  hubFace.rotation.x = Math.PI / 2;
  hubFace.position.z = 0.02;
  reactor.add(hubFace);
  const capBoltGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const bolt = new THREE.Mesh(capBoltGeom, boltMat);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.1);
    reactor.add(bolt);
  }

  // Core: emissive disc + ring + additive glow + real light on the blades
  coreMat = new THREE.MeshStandardMaterial({ color: 0xEFFFFF, emissive: 0xBFFBFF, emissiveIntensity: 2.2 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 64), coreMat);
  core.rotation.x = Math.PI / 2;
  core.position.z = 0.14;
  reactor.add(core);

  coreRingMat = new THREE.MeshStandardMaterial({ color: CORE_COLOR, emissive: CORE_COLOR.clone(), emissiveIntensity: 1.6 });
  reactor.add(ring(0.7, 0.035, coreRingMat, 0.14));

  coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(235,255,255,1)', 'rgba(120,240,255,0.85)'),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  }));
  coreGlow.scale.set(3.4, 3.4, 1);
  coreGlow.position.z = 0.3;
  reactor.add(coreGlow);

  coreLight = new THREE.PointLight(CORE_COLOR.clone(), 18, 6, 1.6);
  coreLight.position.z = 0.9;
  reactor.add(coreLight);

  // Dotted indicator ring
  const DOTS = 90;
  const dotPositions = new Float32Array(DOTS * 3);
  for (let i = 0; i < DOTS; i++) {
    const a = (i / DOTS) * Math.PI * 2;
    dotPositions[i * 3] = Math.cos(a) * 3.38;
    dotPositions[i * 3 + 1] = Math.sin(a) * 3.38;
    dotPositions[i * 3 + 2] = 0.06;
  }
  const dotGeom = new THREE.BufferGeometry();
  dotGeom.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
  dotRing = new THREE.Points(dotGeom, new THREE.PointsMaterial({
    color: CORE_COLOR, size: 0.045, transparent: true, opacity: 0.7
  }));
  reactor.add(dotRing);
}

// Reusable spark burst for impacts
function createSparks() {
  const COUNT = 70;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  const mat = new THREE.PointsMaterial({
    color: 0xFFB070, size: 0.09, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  sparks = new THREE.Points(geom, mat);
  sparks.userData.velocities = new Float32Array(COUNT * 3);
  sparks.userData.life = 0;
  sparks.frustumCulled = false;
  reactor.add(sparks);
}

function addLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const keyLight = new THREE.DirectionalLight(0xFFF1E0, 2.0);
  keyLight.position.set(-6, 8, 8);
  scene.add(keyLight);

  // Warm rim light picks up the site's orange accent on the edges
  const rimLight = new THREE.DirectionalLight(0xFF6A2B, 1.4);
  rimLight.position.set(7, -5, -2);
  scene.add(rimLight);
}

// ---------- Interaction ----------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  positionDiscForViewport();
}

function onPointerMove(event) {
  pointerNdc.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  pointerActive = true;
}

function onScroll() {
  const currentScrollY = window.scrollY;
  const delta = Math.abs(currentScrollY - lastScrollY);
  scrollVelocity = Math.min(scrollVelocity + delta * 0.0015, 0.08);
  lastScrollY = currentScrollY;
}

function raycastReactor(ndc) {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(plate, false);
  return hits.length ? hits[0] : null;
}

function onTankImpact(event) {
  // Ignore hits while the reactor is dimmed behind other sections
  if (document.body.classList.contains('past-hero')) return;

  const ndc = new THREE.Vector2(
    (event.detail.x / window.innerWidth) * 2 - 1,
    -(event.detail.y / window.innerHeight) * 2 + 1
  );
  const hit = raycastReactor(ndc);
  if (!hit) return;

  const local = reactor.worldToLocal(hit.point.clone());
  local.z = 0.35;
  const r = Math.hypot(local.x, local.y) || 1;

  // Knockback tilts away from the impact side
  impact = { t: 0, dirX: local.x / r, dirY: local.y / r, strength: 0.6 + 0.4 * Math.min(1, r / 4) };
  spinBoost = 0.35;

  spawnRing(local, 0xFF6A2B, 0.15, 2.2, 0.55);
  spawnRing(new THREE.Vector3(0, 0, 0.32), 0x00E5FF, 0.8, 5.2, 0.9);
  burstSparks(local);
}

function spawnRing(position, color, from, to, duration) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1, 64),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 1, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  mesh.position.copy(position);
  mesh.scale.setScalar(from);
  reactor.add(mesh);
  effects.push({ mesh, from, to, duration, t: 0 });
}

function burstSparks(origin) {
  const pos = sparks.geometry.attributes.position.array;
  const vel = sparks.userData.velocities;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = origin.x;
    pos[i + 1] = origin.y;
    pos[i + 2] = origin.z;
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 6;
    vel[i] = Math.cos(a) * s;
    vel[i + 1] = Math.sin(a) * s;
    vel[i + 2] = 1 + Math.random() * 4;
  }
  sparks.geometry.attributes.position.needsUpdate = true;
  sparks.userData.life = 1;
}

// ---------- Frame loop ----------
function updateImpact(dt) {
  let flash = 0;
  if (impact) {
    impact.t += dt;
    const t = impact.t;
    // Damped spring: sharp kick then a few wobbles
    const wobble = Math.exp(-5 * t) * Math.cos(16 * t) * impact.strength;
    hitGroup.position.z = -0.9 * wobble;
    hitGroup.rotation.y = 0.35 * wobble * impact.dirX;
    hitGroup.rotation.x = -0.35 * wobble * impact.dirY;
    // Small high-frequency shake on top
    const shake = Math.exp(-9 * t) * 0.08;
    hitGroup.position.x = (Math.random() - 0.5) * shake;
    hitGroup.position.y = (Math.random() - 0.5) * shake;

    flash = Math.exp(-3.5 * t);
    if (t > 1.6) {
      impact = null;
      hitGroup.position.set(0, 0, 0);
      hitGroup.rotation.set(0, 0, 0);
    }
  }

  // Core overload: flare up and shift toward orange, then settle back to cyan
  coreMat.emissiveIntensity = 2.2 + flash * 7 + hover * 0.8;
  coreRingMat.emissive.copy(CORE_COLOR).lerp(OVERLOAD_COLOR, flash);
  coreLight.color.copy(CORE_COLOR).lerp(OVERLOAD_COLOR, flash * 0.9);
  accentStripMat.emissiveIntensity = 0.25 + hover * 1.4 + flash * 4;
  return flash;
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t += dt;
    const k = Math.min(e.t / e.duration, 1);
    const ease = 1 - Math.pow(1 - k, 3);
    e.mesh.scale.setScalar(e.from + (e.to - e.from) * ease);
    e.mesh.material.opacity = 1 - k;
    if (k >= 1) {
      reactor.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      effects.splice(i, 1);
    }
  }

  if (sparks.userData.life > 0) {
    sparks.userData.life = Math.max(0, sparks.userData.life - dt * 1.4);
    const pos = sparks.geometry.attributes.position.array;
    const vel = sparks.userData.velocities;
    for (let i = 0; i < pos.length; i += 3) {
      vel[i] *= 1 - 2.5 * dt;
      vel[i + 1] *= 1 - 2.5 * dt;
      vel[i + 2] -= 6 * dt;
      pos[i] += vel[i] * dt;
      pos[i + 1] += vel[i + 1] * dt;
      pos[i + 2] = Math.max(0.1, pos[i + 2] + vel[i + 2] * dt);
    }
    sparks.geometry.attributes.position.needsUpdate = true;
    sparks.material.opacity = sparks.userData.life;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Hover: is the pointer over the reactor? (only while it is fully visible)
  const visible = !document.body.classList.contains('past-hero');
  const isOver = visible && pointerActive && raycastReactor(pointerNdc) !== null;
  hover += ((isOver ? 1 : 0) - hover) * Math.min(1, 6 * dt);

  // Tilt toward the pointer with a spring; stronger when hovered
  const reach = 0.22 + hover * 0.18;
  tilt.tx = -pointerNdc.y * reach;
  tilt.ty = pointerNdc.x * reach;
  tilt.vx += (tilt.tx - tilt.x) * 40 * dt;
  tilt.vy += (tilt.ty - tilt.y) * 40 * dt;
  tilt.vx *= 1 - Math.min(1, 7 * dt);
  tilt.vy *= 1 - Math.min(1, 7 * dt);
  tilt.x += tilt.vx * dt;
  tilt.y += tilt.vy * dt;
  discGroup.rotation.x = tilt.x;
  discGroup.rotation.y = tilt.y;

  // Light parallax drift toward the pointer
  parallax.x += (pointerNdc.x * 0.2 - parallax.x) * Math.min(1, 3 * dt);
  parallax.y += (pointerNdc.y * 0.18 - parallax.y) * Math.min(1, 3 * dt);
  discGroup.position.set(basePosition.x + parallax.x, basePosition.y + parallax.y, basePosition.z);

  // Spin: base + scroll + hover + impact surge
  scrollVelocity += (0 - scrollVelocity) * 0.05;
  spinBoost += (0 - spinBoost) * Math.min(1, 1.6 * dt);
  fan.rotation.z -= (baseRotationSpeed + scrollVelocity) * (1 + hover * 1.8) + spinBoost;
  dotRing.rotation.z -= baseRotationSpeed * (0.15 + hover * 0.4);

  const flash = updateImpact(dt);
  updateEffects(dt);

  // Core breathing, brighter on hover, flares on impact
  const pulse = 1 + Math.sin(t * 2.1) * 0.06;
  const glow = pulse * (1 + hover * 0.25 + flash * 0.9);
  coreGlow.scale.set(3.4 * glow, 3.4 * glow, 1);
  coreLight.intensity = 18 * pulse * (1 + hover * 0.6 + flash * 3);
  halo.material.opacity = 0.35 + hover * 0.15 + flash * 0.2;

  renderer.render(scene, camera);
}

init();
