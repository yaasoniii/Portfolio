import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
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

let zoomed = false, t = 0; // t: 0 overview → 1 zoomed
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
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
  zoomed = z;
  document.body.classList.toggle('zoomed', z);
  backBtn.hidden = !z;
  if (!z) document.body.style.cursor = '';
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
canvas.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  document.body.classList.toggle('hover-laptop', !zoomed && overLaptop(e));
});
canvas.addEventListener('click', (e) => { if (!zoomed && overLaptop(e)) setZoom(true); });
canvas.addEventListener('wheel', (e) => { if (!zoomed && e.deltaY < 0) setZoom(true); }, { passive: true });
backBtn.addEventListener('click', () => setZoom(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setZoom(false); });
setZoom(params.has('zoom'));
if (params.has('zoom')) t = 1;

// --- loop ---
let last = performance.now(), elapsed = 0;
const ease = (x) => x * x * (3 - 2 * x);
const base = new THREE.Vector3();
function frame() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05);
  last = now; elapsed += dt;
  t = THREE.MathUtils.clamp(t + (zoomed ? dt / 1.5 : -dt / 1.2), 0, 1);
  const k = ease(t), free = 1 - k;

  mouseS.lerp(mouse, 1 - Math.exp(-dt * 4));
  base.copy(overview.pos);
  base.x += mouseS.x * 0.7 * free;
  base.y += -mouseS.y * 0.35 * free;
  curPos.lerpVectors(base, zoomView.pos, k);
  curLook.lerpVectors(overview.look, zoomView.look, k);
  camera.position.copy(curPos);
  camera.lookAt(curLook);

  update(elapsed);
  composer.render();
  cssRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resize();
camera.position.copy(overview.pos);
frame();
ready.catch(console.error).finally(() => document.getElementById('loader').classList.add('done'));
