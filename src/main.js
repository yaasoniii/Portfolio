import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { buildRoom } from './room.js';
import { mountDesktop, attachInput } from './desktop.js';

const canvas = document.getElementById('gl');
const cssHost = document.getElementById('css3d');
const backBtn = document.getElementById('back');
const params = new URLSearchParams(location.search);
const MAX_DT = Number(params.get('maxdt')) || 0.05; // frame-time clamp (raise only for slow test renderers)
const LOW = params.has('low') || matchMedia('(pointer: coarse)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio, LOW ? 1.25 : 1.75);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.2;

const cssRenderer = new CSS3DRenderer();
cssHost.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070d);
// image-based lighting: a neutral studio-ish room gives metals/glass something to reflect
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.18;

const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 60);
const { laptop, lid, screenSize, update, ready } = buildRoom(scene, renderer);

// --- the laptop screen: an HTML desktop living in 3D space, layered over the WebGL canvas ---
const desktopEl = mountDesktop();
const cssObj = new CSS3DObject(desktopEl);
desktopEl.style.pointerEvents = 'none'; // input is forwarded manually (see attachInput)
cssObj.scale.setScalar(screenSize.w / 1024);
cssObj.position.copy(lid.userData.screenCenter);
cssObj.position.z += 0.0006;
lid.add(cssObj);
attachInput(desktopEl, () => zoomed && t > 0.9);

// --- post-processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, 512, 512);
gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: LOW ? 8 : 16, distanceFallOff: 1 });
gtao.blendIntensity = 1;
if (!LOW) composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.5, 1.35);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const smaa = new SMAAPass();
composer.addPass(smaa);

// --- camera states ---
const overview = { pos: new THREE.Vector3(4.7, 2.9, 5.6), look: new THREE.Vector3(-0.05, 0.9, -0.9) };
if (params.has('cam')) { const v = params.get('cam').split(',').map(Number); overview.pos.set(v[0], v[1], v[2]); overview.look.set(v[3], v[4], v[5]); }
let zoomView = null;
function computeZoomView() {
  lid.updateWorldMatrix(true, false);
  const center = lid.userData.screenCenter.clone().applyMatrix4(lid.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(lid.matrixWorld);
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(screenSize.h / vh, screenSize.w / (vh * camera.aspect)) * 1.03;
  zoomView = { pos: center.clone().addScaledVector(normal, dist), look: center };
}

// --- free look: drag to orbit, wheel / pinch to zoom, right-drag (or two fingers) to pan ---
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 0.9;
controls.maxDistance = 9.5;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.49;     // never dip below the floor
controls.minAzimuthAngle = -0.6;             // stay on the open side of the room
controls.maxAzimuthAngle = 1.0;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.target.copy(overview.look);
const PAN_BOX = { min: new THREE.Vector3(-2.4, 0.25, -2.1), max: new THREE.Vector3(2.4, 2.0, 2.2) };
controls.addEventListener('change', () => controls.target.clamp(PAN_BOX.min, PAN_BOX.max));
canvas.style.touchAction = 'none';

let zoomed = false, t = 0; // t: 0 free-look → 1 sitting at the laptop
const rest = { pos: new THREE.Vector3(), look: new THREE.Vector3() }; // where to return to
const curPos = new THREE.Vector3(), curLook = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(PR);
  composer.setSize(w, h);
  cssRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 52 : 32; // pull back on portrait screens
  camera.updateProjectionMatrix();
  computeZoomView();
}
addEventListener('resize', resize);

function setZoom(z) {
  if (z === zoomed) return;
  zoomed = z;
  document.body.classList.toggle('zoomed', z);
  backBtn.hidden = !z;
  if (z) {
    rest.pos.copy(camera.position);
    rest.look.copy(controls.target);
    controls.enabled = false;
  } else {
    document.body.style.cursor = '';
  }
}
// generous invisible hit-target around the laptop so it's easy to click
const hitProxy = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.36), new THREE.MeshBasicMaterial());
hitProxy.visible = false;
hitProxy.position.set(0, 0.15, -0.03);
laptop.add(hitProxy);
const raycaster = new THREE.Raycaster();
function overLaptop(e) {
  raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  return raycaster.intersectObject(laptop, true).length > 0;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; document.body.classList.add('dragging'); });
addEventListener('pointerup', () => document.body.classList.remove('dragging'));
canvas.addEventListener('pointermove', (e) => {
  if (!zoomed && !down) document.body.classList.toggle('hover-laptop', overLaptop(e));
});
canvas.addEventListener('click', (e) => {
  const wasDrag = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5; // dragging to orbit isn't a click
  down = null;
  if (!zoomed && !wasDrag && overLaptop(e)) setZoom(true);
});
if (params.has('debug')) window.__laptopXY = () => {
  const v = laptop.localToWorld(new THREE.Vector3(0, 0.1, 0)).project(camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
};
backBtn.addEventListener('click', () => setZoom(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setZoom(false); });
camera.position.copy(overview.pos);
controls.update();
rest.pos.copy(overview.pos); rest.look.copy(overview.look);
if (params.has('zoom')) { setZoom(true); t = 1; }

// --- loop ---
let last = performance.now(), elapsed = 0;
const ease = (x) => x * x * (3 - 2 * x);
function frame() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, MAX_DT);
  last = now; elapsed += dt;
  t = THREE.MathUtils.clamp(t + (zoomed ? dt / 1.5 : -dt / 1.2), 0, 1);
  const k = ease(t);

  if (t > 0 || zoomed) {
    // gliding between the free-look view and the laptop screen
    curPos.lerpVectors(rest.pos, zoomView.pos, k);
    curLook.lerpVectors(rest.look, zoomView.look, k);
    camera.position.copy(curPos);
    camera.lookAt(curLook);
    if (t === 0 && !zoomed) {            // arrived back: hand control to the user again
      controls.target.copy(rest.look);
      controls.enabled = true;
      controls.update();
    }
  } else {
    controls.update();
  }

  update(elapsed);
  composer.render();
  cssRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resize();
frame();
ready.catch(console.error).finally(() => document.getElementById('loader').classList.add('done'));
