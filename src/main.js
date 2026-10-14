import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { buildRoom } from './room.js';
import { mountDesktop, attachInput } from './desktop.js';

const canvas = document.getElementById('gl');
const cssHost = document.getElementById('css3d');
const hint = document.getElementById('hint');
const backBtn = document.getElementById('back');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const cssRenderer = new CSS3DRenderer();
cssHost.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
const { laptop, lid, screenSize } = buildRoom(scene);

// --- the laptop screen: an HTML desktop living in 3D space ---
const SCREEN_PX = { w: 1024, h: 640 };
const desktopEl = mountDesktop();
const cssObj = new CSS3DObject(desktopEl);
desktopEl.style.pointerEvents = 'none';
attachInput(desktopEl, () => zoomed && t > 0.9);
cssObj.scale.setScalar(screenSize.w / SCREEN_PX.w);
cssObj.position.copy(lid.userData.screenCenter);
lid.add(cssObj);

// transparent "hole" in the WebGL layer so the CSS layer shows through the screen
const hole = new THREE.Mesh(
  new THREE.PlaneGeometry(screenSize.w, screenSize.h),
  new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide })
);
hole.position.copy(lid.userData.screenCenter);
lid.add(hole);

// --- camera states ---
const overview = { pos: new THREE.Vector3(4.4, 3.3, 4.2), look: new THREE.Vector3(0.1, 1.05, -1.9) };
let zoomView = null;
function computeZoomView() {
  lid.updateWorldMatrix(true, false);
  const center = lid.userData.screenCenter.clone().applyMatrix4(lid.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(lid.matrixWorld);
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(screenSize.h / vh, screenSize.w / (vh * camera.aspect)) * 1.04;
  zoomView = { pos: center.clone().addScaledVector(normal, dist), look: center };
}

let zoomed = false, t = 0; // t: 0 overview → 1 zoomed
const mouse = new THREE.Vector2();
const curPos = new THREE.Vector3(), curLook = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  cssRenderer.setSize(w, h);
  camera.aspect = w / h;
  // pull back on narrow/portrait screens so the room still fits
  camera.fov = w / h < 1 ? 55 : 35;
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
// scrolling / pinching in the room also "leans in" towards the laptop
canvas.addEventListener('wheel', (e) => { if (!zoomed && e.deltaY < 0) setZoom(true); }, { passive: true });
backBtn.addEventListener('click', () => setZoom(false));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setZoom(false); });
setZoom(false);

// --- loop ---
const clock = { last: performance.now(), elapsedTime: 0 };
const ease = (x) => x * x * (3 - 2 * x);
function frame() {
  const now = performance.now(); const dt = Math.min((now - clock.last) / 1000, 0.05); clock.last = now; clock.elapsedTime += dt;
  t = THREE.MathUtils.clamp(t + (zoomed ? dt / 1.4 : -dt / 1.1), 0, 1);
  const k = ease(t);

  const wobble = 1 - k;
  const base = overview.pos.clone();
  base.x += mouse.x * 0.9 * wobble;
  base.y += -mouse.y * 0.5 * wobble;
  curPos.lerpVectors(base, zoomView.pos, k);
  curLook.lerpVectors(overview.look, zoomView.look, k);
  camera.position.copy(curPos);
  camera.lookAt(curLook);

  // lamp flicker-free gentle bob for the plant etc.
  scene.userData.update?.(clock.elapsedTime);

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
resize();
camera.position.copy(overview.pos);
frame();
document.getElementById('loader').classList.add('done');
setTimeout(() => hint.style.opacity = '', 0);
