import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const base = import.meta.env.BASE_URL + 'models/';

/** Switches meshes to a KHR_materials_variants variant (by name), when the asset ships one. */
async function selectVariant(gltf, name) {
  const variants = gltf.parser.json.extensions?.KHR_materials_variants?.variants ?? [];
  const index = variants.findIndex((v) => v.name === name);
  if (index < 0) return;
  const jobs = [];
  gltf.scene.traverse((o) => {
    const mappings = o.isMesh && o.userData.gltfExtensions?.KHR_materials_variants?.mappings;
    const hit = mappings?.find((m) => m.variants.includes(index));
    if (hit) jobs.push(gltf.parser.getDependency('material', hit.material).then((mat) => { o.material = mat; }));
  });
  await Promise.all(jobs);
}

// At most two downloads/decodes in flight: firing every model at once can starve image decoding
// on slower devices, and the loader then drops textures silently.
let active = 0;
const waiting = [];
async function queued(job) {
  if (active >= 2) await new Promise((r) => waiting.push(r));
  active++;
  try { return await job(); } finally { active--; waiting.shift()?.(); }
}

/** Loads a .glb and returns it scaled to `height` metres, resting on y=0, centred on x/z. */
export async function loadFitted(name, { height, rotY = 0, variant } = {}) {
  const gltf = await queued(() => loader.loadAsync(`${base}${name}.glb`));
  if (variant) await selectVariant(gltf, variant);
  const obj = gltf.scene;
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const k = height / size.y;
  obj.scale.multiplyScalar(k);
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.add(obj);
  g.rotation.y = rotY;
  return g;
}
