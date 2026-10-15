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
import { mountDesktop, attachInput, screenTexture, SHEETS } from './desktop.js';
import { mountChrome } from './chrome.js';
import { content } from './content.js';

const canvas = document.getElementById('gl');
const cssHost = document.getElementById('css3d');
const params = new URLSearchParams(location.search);
const MAX_DT = Number(params.get('maxdt')) || 0.05; // frame-time clamp (raise only for slow test renderers)
const LOW = params.has('low') || matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const chrome = mountChrome(content);
chrome.progress(0.04);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio, LOW ? 1.25 : 1.75);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.15;

const cssRenderer = new CSS3DRenderer();
cssHost.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
// drawing-paper ground (linear value chosen so it lands on the page's --paper after AgX)
scene.background = new THREE.Color().setRGB(2.2, 2.0, 1.55);
// a neutral studio environment until the room has been baked into its own reflection probe
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;

const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 60);

// let the loader paint before the (synchronous) procedural texture work starts
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const { fx, laptop, lid, screenSize, update, ready, shadowOnly } = buildRoom(scene, renderer, { low: LOW });
// nothing in the studio moves, so shadow maps are rendered once (and again when the props arrive)
renderer.shadowMap.autoUpdate = false;
function bakeShadows() {
  shadowOnly.forEach((m) => { m.visible = true; });
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  shadowOnly.forEach((m) => { m.visible = false; });
}
chrome.progress(0.35);

// --- the laptop screen: an HTML drawing set living in 3D space, layered over the WebGL canvas ---
const onSheet = (id) => { if (zoomed) history.replaceState(null, '', '#' + id); };
const desktop = mountDesktop(content, { onSheet });
// small screens read the same set flat and full-screen: the 3D screen would be too small to read
const flatHost = document.getElementById('sheet-flat');
const flat = mountDesktop(content, { onSheet });
flatHost.append(flat.root);
const isFlat = () => innerWidth < 760 || innerHeight < 480;
const sheets = () => (isFlat() ? flat : desktop);
const desktopEl = desktop.root;
// laid out at 1024 × 640 but rasterised at 2× (CSS zoom), so the seated view stays crisp
const screenEl = document.createElement('div');
screenEl.className = 'screen';
screenEl.append(desktopEl);
const cssObj = new CSS3DObject(screenEl);
screenEl.style.pointerEvents = 'none'; // input is forwarded manually (see attachInput)
cssObj.scale.setScalar(screenSize.w / 2048);
cssObj.position.copy(lid.userData.screenCenter);
cssObj.position.z += 0.0006;
lid.add(cssObj);
attachInput(desktopEl, () => zoomed && t > 0.9);
screenTexture(content).then((tex) => { lid.userData.glow.material.map = tex; lid.userData.glow.material.needsUpdate = true; });

// --- post-processing: scene → sun shafts / dust → AO → bloom → tone map → SMAA ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const fxPass = new RenderPass(fx, camera);
fxPass.clear = false;
composer.addPass(fxPass);
const gtao = new GTAOPass(scene, camera, 512, 512);
gtao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 16, distanceFallOff: 1 });
gtao.blendIntensity = 0.85;
if (!LOW) composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.12, 0.45, 2.4);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(new SMAAPass());

// --- camera states ---
const overview = { pos: new THREE.Vector3(6.25, 4.1, 8.4), look: new THREE.Vector3(0.15, 0.7, -0.1) };
if (params.has('cam')) { const v = params.get('cam').split(',').map(Number); overview.pos.set(v[0], v[1], v[2]); overview.look.set(v[3], v[4], v[5]); }
overview.base = overview.pos.clone();
overview.baseLook = overview.look.clone();
// phones: a steeper, more frontal view gives the cut-away a taller silhouette for a portrait frame
const PORTRAIT = { dir: new THREE.Vector3(0.55, 1.05, 1.0).normalize(), look: new THREE.Vector3(0.2, 0.45, -0.05), halfWidth: 2.6 };
// keep the whole cut-away in frame on narrow screens: pull back until it is as wide as on a 16:10 desktop
function fitOverview() {
  const half = (fov, aspect) => Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
  if (camera.aspect < 1 && isFlat()) {
    // fill the width and let the open sides crop slightly rather than float in empty paper
    overview.look.copy(PORTRAIT.look);
    overview.pos.copy(PORTRAIT.dir).multiplyScalar(PORTRAIT.halfWidth / Math.tan(half(camera.fov, camera.aspect))).add(overview.look);
  } else {
    // (the model spans ~75% of a desktop frame; on narrower screens let it fill closer to the edges)
    const mult = Math.max(1, (0.98 * Math.tan(half(32, 1.6))) / Math.tan(half(camera.fov, camera.aspect)));
    overview.look.copy(overview.baseLook);
    overview.pos.copy(overview.base).sub(overview.look).multiplyScalar(mult).add(overview.look);
  }
  controls.maxDistance = Math.max(14, overview.pos.distanceTo(overview.look) * 1.15);
}
let zoomView = null;
function computeZoomView() {
  lid.updateWorldMatrix(true, false);
  const center = lid.userData.screenCenter.clone().applyMatrix4(lid.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(lid.matrixWorld);
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(screenSize.h / vh, screenSize.w / (vh * camera.aspect)) * 1.1;
  zoomView = { pos: center.clone().addScaledVector(normal, dist), look: center };
}

// --- free look: drag to orbit, wheel / pinch to zoom, right-drag (or two fingers) to pan ---
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.minDistance = 0.9;
controls.maxDistance = 14;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI * 0.49;     // never dip below the floor
controls.minAzimuthAngle = -0.6;             // stay on the open side of the room
controls.maxAzimuthAngle = 1.0;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.target.copy(overview.look);
const PAN_BOX = { min: new THREE.Vector3(-2.4, 0.25, -2.1), max: new THREE.Vector3(2.4, 2.0, 2.2) };
controls.addEventListener('change', () => controls.target.clamp(PAN_BOX.min, PAN_BOX.max));
let interacted = false;
controls.addEventListener('start', () => { interacted = true; chrome.dismissHelp(); });
canvas.style.touchAction = 'none';
controls.enabled = false; // until the intro move lands

let zoomed = false, t = 0;          // t: 0 free-look → 1 sitting at the laptop
let landed = false;                 // has the current zoom finished (for the sheet draw-on)
const rest = { pos: new THREE.Vector3(), look: new THREE.Vector3() }; // where to return to
const curPos = new THREE.Vector3(), curLook = new THREE.Vector3(), ctrl = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(PR);
  composer.setSize(w, h);
  cssRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 40 : 32; // a little wider on portrait screens
  // on phones the title block owns the bottom of the screen: centre the model in the space above it
  if (isFlat() && w / h < 1) camera.setViewOffset(w, h, 0, h * 0.1, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  computeZoomView();
  fitOverview();
  if (intro.k < 1) intro.from.copy(overview.pos).sub(overview.look).multiplyScalar(1.28).add(overview.look).add(new THREE.Vector3(0, 0.5, 0));
  else if (!interacted && !zoomed && t === 0) { camera.position.copy(overview.pos); controls.target.copy(overview.look); controls.update(); }
  if (!interacted && !zoomed) { rest.pos.copy(overview.pos); rest.look.copy(overview.look); }
}
addEventListener('resize', resize);

function setZoom(z) {
  if (z === zoomed) return;
  zoomed = z;
  document.body.classList.toggle('zoomed', z);
  chrome.setZoomed(z);
  if (z) {
    rest.pos.copy(camera.position);
    rest.look.copy(controls.target);
    controls.enabled = false;
    if (reducedMotion.matches) t = 1;
  } else {
    landed = false;
    for (const d of [desktop, flat]) { d.setDrawn(false); d.setActive(false); }
    document.body.style.cursor = '';
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    if (reducedMotion.matches) t = 0;
  }
}

// deep links: #about, #projects… sit you down at that sheet; an empty hash returns to the studio
function route() {
  const id = location.hash.slice(1);
  if (SHEETS.includes(id)) { desktop.goTo(id, zoomed && landed); flat.goTo(id, zoomed && landed); setZoom(true); }
  else if (zoomed) setZoom(false);
}
addEventListener('hashchange', route);

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
const sitDown = () => { location.hash = sheets().current(); };
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; document.body.classList.add('dragging'); });
addEventListener('pointerup', () => document.body.classList.remove('dragging'));
canvas.addEventListener('pointermove', (e) => {
  if (!zoomed && !down && controls.enabled) document.body.classList.toggle('hover-laptop', overLaptop(e));
});
canvas.addEventListener('click', (e) => {
  const wasDrag = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5; // dragging to orbit isn't a click
  down = null;
  if (!zoomed && !wasDrag && controls.enabled && overLaptop(e)) sitDown();
});
chrome.onSit(sitDown);
chrome.onBack(() => setZoom(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed) setZoom(false); });
if (params.has('debug')) window.__laptopXY = () => {
  const v = laptop.localToWorld(new THREE.Vector3(0, 0.1, 0)).project(camera);
  return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
};

// --- intro: a short dolly in from a wider establishing shot once everything is ready ---
const intro = { k: reducedMotion.matches || params.has('nointro') ? 1 : 0, from: new THREE.Vector3(), started: false };
intro.from.copy(overview.pos).sub(overview.look).multiplyScalar(1.28).add(overview.look).add(new THREE.Vector3(0, 0.5, 0));
camera.position.copy(intro.k ? overview.pos : intro.from);
camera.lookAt(overview.look);
rest.pos.copy(overview.pos); rest.look.copy(overview.look);

// --- loop ---
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const laptopAnchor = new THREE.Vector3(), anchorLocal = new THREE.Vector3(0, 0.2, -0.08);
let last = performance.now(), elapsed = 0;
function frame() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, MAX_DT);
  last = now; elapsed += dt;

  if (intro.k < 1) {
    if (intro.started) intro.k = Math.min(1, intro.k + dt / 2.4);
    camera.position.lerpVectors(intro.from, overview.pos, easeOutExpo(intro.k));
    camera.lookAt(overview.look);
    if (intro.k === 1) { controls.update(); controls.enabled = true; chrome.introDone(); if (location.hash) route(); }
  } else {
    t = THREE.MathUtils.clamp(t + (zoomed ? dt / 1.6 : -dt / 1.2), 0, 1);
    const k = easeInOut(t);
    if (t > 0 || zoomed) {
      // arc over the room on a quadratic Bézier rather than cutting straight through the chair
      ctrl.lerpVectors(rest.pos, zoomView.pos, 0.5);
      ctrl.y += 0.22 * rest.pos.distanceTo(zoomView.pos);
      curPos.set(0, 0, 0)
        .addScaledVector(rest.pos, (1 - k) * (1 - k))
        .addScaledVector(ctrl, 2 * (1 - k) * k)
        .addScaledVector(zoomView.pos, k * k);
      curLook.lerpVectors(rest.look, zoomView.look, Math.min(1, k * 1.15));
      camera.position.copy(curPos);
      camera.lookAt(curLook);
      if (zoomed && t === 1 && !landed) {
        landed = true;
        const d = sheets();
        d.setActive(true); d.setDrawn(true);
        if (!isFlat()) d.root.querySelector('.scroller').focus({ preventScroll: true });
      }
      if (t === 0 && !zoomed) {            // arrived back: hand control to the user again
        controls.target.copy(rest.look);
        controls.enabled = true;
        controls.update();
      }
    } else {
      controls.update();
    }
  }

  // the live HTML screen only exists up close; from afar the painted cover sheet stands in
  const flatMode = isFlat();
  const screenK = flatMode ? 0 : THREE.MathUtils.smoothstep(t, 0.7, 0.95);
  screenEl.style.opacity = screenK;
  cssHost.style.visibility = screenK > 0 ? 'visible' : 'hidden';
  const flatShown = flatMode && zoomed && t > 0.8;
  if (flatHost.classList.contains('show') !== flatShown) {
    flatHost.classList.toggle('show', flatShown);
    flatHost.setAttribute('aria-hidden', String(!flatShown));
  }

  // keep the "sit down" callout pinned to the laptop
  laptopAnchor.copy(anchorLocal);
  laptop.localToWorld(laptopAnchor).project(camera);
  chrome.placeCallout((laptopAnchor.x + 1) / 2 * innerWidth, (1 - laptopAnchor.y) / 2 * innerHeight, laptopAnchor.z < 1 && t === 0 && controls.enabled);

  update(elapsed, THREE.MathUtils.smoothstep(t, 0, 0.6), camera.position.distanceTo(controls.target));
  // nothing to see behind the loader or the flat set: leave the GPU and main thread to the loading work
  if (revealed && !(flatShown && t === 1)) composer.render();
  if (screenK > 0) cssRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let revealed = false;
resize();
frame();

// --- loading: props, then shaders (compiled off the main thread where supported), then a one-time
// bake of the static shadow maps and of the finished room into its own reflection probe ---
ready
  .catch(console.error)
  .then(async () => {
    chrome.progress(0.6);
    await renderer.compileAsync(scene, camera).catch(() => {});
    await renderer.compileAsync(fx, camera).catch(() => {});
    chrome.progress(0.85);
    bakeShadows();
    const probe = pmrem.fromScene(scene, 0.02, 0.05, 30, { size: LOW ? 128 : 256, position: new THREE.Vector3(0.4, 1.2, -0.3) });
    scene.environment = probe.texture;
    scene.environmentIntensity = 0.95;
  })
  .catch(console.error)
  .finally(async () => {
    await document.fonts.ready;
    revealed = true;
    await chrome.progress(1);
    intro.started = true;
    if (intro.k === 1) { controls.update(); controls.enabled = true; chrome.introDone(); if (location.hash) route(); }
  });
