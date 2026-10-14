import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const base = import.meta.env.BASE_URL + 'models/';

/** Loads a .glb and returns it scaled to `height` metres, resting on y=0, centred on x/z. */
export async function loadFitted(name, { height, rotY = 0 }) {
  const gltf = await loader.loadAsync(`${base}${name}.glb`);
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
