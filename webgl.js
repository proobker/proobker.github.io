import * as THREE from 'three';

// Global variables for WebGL layer
let scene, camera, renderer, pcbGroup, pcbMesh, pcbHitMesh;
let mouseX = 0, mouseY = 0;
let targetTiltX = 0, targetTiltY = 0;
let currentTiltX = 0, currentTiltY = 0;

let baseRotationSpeed = 0.005;
let currentScrollRotation = 0;
let targetScrollRotation = 0;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

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
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  pcbGroup = new THREE.Group();
  scene.add(pcbGroup);

  positionDiscForViewport();

  createPcbDisc();

  addLighting();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('scroll', onScroll);

  animate();
}

function positionDiscForViewport() {
  if (window.innerWidth <= 992) {
    pcbGroup.position.set(0, 0, 0);
    pcbGroup.scale.set(0.8, 0.8, 0.8);
  } else {
    pcbGroup.position.set(3.2, 0, 0);
    pcbGroup.scale.set(1.0, 1.0, 1.0);
  }
}

// Generate a procedural PCB (circuit board) texture on a canvas
function createPcbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Dark matte board base
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, 1024, 1024);

  // Faint Swiss grid lines etched into the board
  ctx.strokeStyle = 'rgba(244, 244, 242, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Copper traces: bone white routes with right angles (PCB style)
  const drawTrace = (points, width) => {
    ctx.strokeStyle = 'rgba(244, 244, 242, 0.85)';
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
  };

  const traces = [
    [[80, 140], [512, 140], [512, 400]],
    [[80, 300], [280, 300], [280, 460], [420, 460]],
    [[80, 470], [200, 470], [200, 330], [360, 330]],
    [[700, 80], [700, 512], [420, 512]],
    [[660, 260], [760, 260], [760, 700], [560, 700]],
    [[940, 420], [700, 420], [700, 560]],
    [[560, 120], [940, 120]],
    [[200, 700], [200, 850], [512, 850]],
    [[360, 700], [360, 560], [512, 560]],
    [[660, 700], [660, 850], [512, 850]],
    [[80, 660], [300, 660], [300, 700]],
    [[760, 850], [900, 850], [900, 512]]
  ];
  traces.forEach(trace => drawTrace(trace, 6));

  // Via / solder pads
  ctx.fillStyle = 'rgba(244, 244, 242, 0.9)';
  const pad = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  };
  pad(80, 140, 10);
  pad(80, 300, 10);
  pad(940, 120, 10);
  pad(80, 470, 10);
  pad(700, 80, 10);
  pad(760, 260, 10);
  pad(940, 420, 10);
  pad(80, 660, 10);
  pad(200, 700, 10);
  pad(200, 850, 10);
  pad(900, 850, 10);
  pad(660, 700, 10);

  // Central IC chip footprint
  ctx.strokeStyle = 'rgba(244, 244, 242, 0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(392, 392, 240, 240);

  // IC pin rows
  ctx.strokeStyle = 'rgba(244, 244, 242, 0.7)';
  ctx.lineWidth = 5;
  for (let i = 14; i < 26; i++) {
    const pinY = 392 + (i - 14) * (240 / 12);
    ctx.beginPath();
    ctx.moveTo(372, pinY + 6);
    ctx.lineTo(392, pinY + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(632, pinY + 6);
    ctx.lineTo(652, pinY + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(392 + (i - 14) * (240 / 12) + 6, 372);
    ctx.lineTo(392 + (i - 14) * (240 / 12) + 6, 392);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(392 + (i - 14) * (240 / 12) + 6, 632);
    ctx.lineTo(392 + (i - 14) * (240 / 12) + 6, 652);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

// Chip / label texture for the center of the disc
function createChipTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Bone white chip substrate
  ctx.fillStyle = '#F4F4F2';
  ctx.fillRect(0, 0, 512, 512);

  // Swiss cross-hair motif
  ctx.strokeStyle = 'rgba(10, 10, 10, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 0); ctx.lineTo(256, 512);
  ctx.moveTo(0, 256); ctx.lineTo(512, 256);
  ctx.stroke();

  // Outer ring
  ctx.strokeStyle = '#0A0A0A';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 238, 0, Math.PI * 2);
  ctx.stroke();

  // Pin header ticks around the chip rim
  ctx.strokeStyle = '#0A0A0A';
  ctx.lineWidth = 3;
  for (let angle = 0; angle < 360; angle += 12) {
    const rad = angle * Math.PI / 180;
    const x1 = 256 + Math.cos(rad) * 238;
    const y1 = 256 + Math.sin(rad) * 238;
    const x2 = 256 + Math.cos(rad) * 214;
    const y2 = 256 + Math.sin(rad) * 214;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Branding text
  ctx.fillStyle = '#0A0A0A';
  ctx.font = 'bold 64px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RD//LAB', 256, 200);

  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.fillText('KATHMANDU // NEPAL', 256, 260);

  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText('PWR // GND // IO', 256, 340);

  return new THREE.CanvasTexture(canvas);
}

// Build the PCB Disc Mesh
function createPcbDisc() {
  // 1. Board bump texture — concentric spin grooves as a subtle bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 1024;
  const bumpCtx = bumpCanvas.getContext('2d');
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 1024, 1024);
  bumpCtx.strokeStyle = '#ffffff';
  for (let r = 200; r < 500; r += 3) {
    bumpCtx.lineWidth = 0.5 + Math.random() * 0.8;
    bumpCtx.beginPath();
    bumpCtx.arc(512, 512, r, 0, Math.PI * 2);
    bumpCtx.stroke();
  }
  bumpCtx.strokeStyle = '#000000';
  for (let r = 260; r < 470; r += 50) {
    bumpCtx.lineWidth = 2.5;
    bumpCtx.beginPath();
    bumpCtx.arc(512, 512, r, 0, Math.PI * 2);
    bumpCtx.stroke();
  }
  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);

  // 2. Board map
  const boardTexture = createPcbTexture();

  // 3. Disc geometry
  const discGeom = new THREE.CylinderGeometry(4.2, 4.2, 0.08, 64);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0c,
    roughness: 0.26,
    metalness: 0.7,
    map: boardTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.006,
    roughnessMap: bumpTexture
  });

  pcbMesh = new THREE.Mesh(discGeom, discMat);
  pcbMesh.rotation.x = Math.PI / 2.2;
  pcbMesh.castShadow = true;
  pcbMesh.receiveShadow = true;
  pcbGroup.add(pcbMesh);

  // 4. Center chip label (slightly raised to prevent Z-fighting)
  const chipTexture = createChipTexture();
  const chipGeom = new THREE.CylinderGeometry(1.6, 1.6, 0.085, 32);
  const chipMat = new THREE.MeshBasicMaterial({ map: chipTexture });

  pcbHitMesh = new THREE.Mesh(chipGeom, chipMat);
  pcbHitMesh.rotation.x = Math.PI / 2.2;
  pcbGroup.add(pcbHitMesh);
}

function addLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-6, 8, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  // Accent Rim Light (color synced from CSS --accent)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
  rimLight.position.set(6, -6, -4);
  scene.add(rimLight);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  positionDiscForViewport();
}

function onMouseMove(event) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  targetTiltX = mouseY * 0.18;
  targetTiltY = mouseX * 0.18;
}

function onScroll() {
  const currentScrollY = window.scrollY;
  const delta = Math.abs(currentScrollY - lastScrollY);
  scrollVelocity = delta * 0.003;
  lastScrollY = currentScrollY;
}

function animate() {
  requestAnimationFrame(animate);

  scrollVelocity += (0 - scrollVelocity) * 0.08;
  const spinIncrement = baseRotationSpeed + scrollVelocity;

  if (pcbMesh && pcbHitMesh) {
    pcbMesh.rotation.y += spinIncrement;
    pcbHitMesh.rotation.y += spinIncrement;
  }

  currentTiltX += (targetTiltX - currentTiltX) * 0.05;
  currentTiltY += (targetTiltY - currentTiltY) * 0.05;

  if (pcbGroup) {
    pcbGroup.rotation.x = currentTiltX;
    pcbGroup.rotation.y = currentTiltY;
  }

  renderer.render(scene, camera);
}

init();