import * as THREE from 'three';

// Global variables for WebGL layer
let scene, camera, renderer, discGroup, discMesh;
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

  discGroup = new THREE.Group();
  scene.add(discGroup);

  positionDiscForViewport();

  createDisc();

  addLighting();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('scroll', onScroll);

  animate();
}

function positionDiscForViewport() {
  if (window.innerWidth <= 992) {
    discGroup.position.set(0, 0, 0);
    discGroup.scale.set(0.8, 0.8, 0.8);
  } else {
    discGroup.position.set(3.2, 0, 0);
    discGroup.scale.set(1.0, 1.0, 1.0);
  }
}

// Build the Disc Mesh — arc reactor image mapped onto the disc
function createDisc() {
  const textureLoader = new THREE.TextureLoader();
  const reactorTexture = textureLoader.load('assets/arc.jpg');
  reactorTexture.colorSpace = THREE.SRGBColorSpace;

  const discGeom = new THREE.CylinderGeometry(4.2, 4.2, 0.08, 64);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.3,
    map: reactorTexture
  });

  discMesh = new THREE.Mesh(discGeom, discMat);
  discMesh.rotation.x = Math.PI / 2.2;
  discMesh.castShadow = true;
  discMesh.receiveShadow = true;
  discGroup.add(discMesh);
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

  // Accent Rim Light
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

  if (discMesh) {
    discMesh.rotation.y += spinIncrement;
  }

  currentTiltX += (targetTiltX - currentTiltX) * 0.05;
  currentTiltY += (targetTiltY - currentTiltY) * 0.05;

  if (discGroup) {
    discGroup.rotation.x = currentTiltX;
    discGroup.rotation.y = currentTiltY;
  }

  renderer.render(scene, camera);
}

init();
