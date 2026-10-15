import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { buildLaptop } from './laptop.js';
import { loadFitted } from './models.js';
import {
  woodTextures, plasterBump, limewashMap, concreteTextures, birchPlyWall, plyEdge, juteRug,
  daySky, drawingTexture, spineTextures, SPINE_COLORS, groundShadow, dimLabel,
} from './textures.js';

// All dimensions are in metres. The room is shown as an architectural cut-away: wall tops and
// slab edges are the section cut, rendered as solid graphite poché.
const ROOM = { x0: -2.6, x1: 2.6, z0: -2.2, z1: 2.4, h: 2.7, t: 0.12 };
const WIN = { x: 0.35, w: 2.1, y0: 0.82, y1: 2.38, cols: 4, rows: 4, bar: 0.022 };
const DESK_Y = 0.74;
/** Direction towards the sun: late-afternoon light from behind and left of the window, steep enough
 * that the window patch falls across the drafting desk and the chair. */
export const SUN_DIR = new THREE.Vector3(-0.36, 0.6, -0.72).normalize();

// deterministic pseudo-random so the room looks identical every visit
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + rnd() * (b - a);

function rbox(parent, [w, h, d], mat, [x, y, z], r = 0.008, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, [w, h, d], mat, [x, y, z]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(parent, [rt, rb, h], mat, [x, y, z], seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });

export function buildRoom(scene, renderer, { low = false } = {}) {
  RectAreaLightUniformsLib.init();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const room = new THREE.Group();
  scene.add(room);
  const fx = new THREE.Scene(); // additive volumetrics, composited after AO so they never darken it

  // ================= materials =================
  const cut = std(0x23262b, { roughness: 0.95 });                      // section poché
  const steel = std(0x1d1f22, { metalness: 0.25, roughness: 0.48 });   // black powder-coat
  const floorTex = concreteTextures();
  floorTex.map.anisotropy = floorTex.roughnessMap.anisotropy = aniso;
  const floorMat = new THREE.MeshPhysicalMaterial({ map: floorTex.map, roughnessMap: floorTex.roughnessMap, roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.22 });

  const plaster = plasterBump();
  plaster.repeat.set(3, 2);
  const lime = limewashMap();
  lime.repeat.set(2, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: lime, roughness: 0.94, bumpMap: plaster, bumpScale: 0.3 });

  const birchTex = woodTextures({ planks: 1, tones: [0xdcc5a0, 0xd4bc95, 0xe0caa6], rings: 5, jointsPerTile: 1, gap: 0 });
  for (const t of Object.values(birchTex)) t.anisotropy = aniso;
  const birch = new THREE.MeshPhysicalMaterial({ map: birchTex.map, roughnessMap: birchTex.roughnessMap, bumpMap: birchTex.bumpMap, bumpScale: 0.35, roughness: 0.62, clearcoat: 0.2, clearcoatRoughness: 0.45 });
  const edge = std(0xffffff, { map: plyEdge(), roughness: 0.75 });
  const paper = std(0xf1eee7, { roughness: 0.92 });

  // ================= lights =================
  scene.add(new THREE.HemisphereLight(0xcbd9f0, 0x8f7f6a, 0.42));

  const sun = new THREE.DirectionalLight(0xffc88e, 4.6);
  const sunTarget = new THREE.Vector3(0.4, 0, -0.4);
  sun.position.copy(sunTarget).addScaledVector(SUN_DIR, 12);
  sun.target.position.copy(sunTarget);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(low ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -3.8, right: 3.8, top: 3.6, bottom: -3.6, near: 6, far: 20 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
  // The cut-away has no ceiling to look through, but the sun must still be stopped by one. It is only
  // made visible while the (static) shadow maps are baked; see bakeShadows in main.js.
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM.x1 - ROOM.x0 + 0.6, 0.1, ROOM.z1 - ROOM.z0 + 0.6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  ceiling.position.set((ROOM.x0 + ROOM.x1) / 2, ROOM.h + 0.05, (ROOM.z0 + ROOM.z1) / 2 - 0.2);
  ceiling.castShadow = true;
  ceiling.visible = false;
  scene.add(ceiling);

  // soft skylight entering through the glazing
  const sky = new THREE.RectAreaLight(0xc4d6ff, 3.4, WIN.w, WIN.y1 - WIN.y0);
  sky.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, ROOM.z0 + 0.02);
  sky.lookAt(WIN.x, (WIN.y0 + WIN.y1) / 2, 1);
  scene.add(sky);

  // warm bounce off the sunlit floor patch
  const bounce = new THREE.RectAreaLight(0xffc996, 0.9, 1.4, 1.0);
  bounce.position.set(0.6, 0.02, -0.9);
  bounce.lookAt(0.6, 2, -0.9);
  scene.add(bounce);

  // drafting lamp (switched on: it's the warm accent at the desk)
  const lampSpot = new THREE.SpotLight(0xffc58a, 4.5, 0, 0.6, 0.85, 2);
  lampSpot.castShadow = true;
  lampSpot.shadow.mapSize.setScalar(512); lampSpot.shadow.bias = -0.0006; lampSpot.shadow.radius = 4;
  scene.add(lampSpot, lampSpot.target);

  // ================= shell =================
  const { x0, x1, z0, z1, h, t } = ROOM;
  // slab: polished concrete top, cut edges
  const slabW = x1 - x0 + t, slabD = z1 - z0 + t;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.12, slabD), [cut, cut, floorMat, cut, cut, cut]);
  slab.position.set((x0 + x1) / 2 - t / 2, -0.06, (z0 + z1) / 2 - t / 2);
  slab.receiveShadow = slab.castShadow = true;
  room.add(slab);

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  const wall = (w, hh, d, x, y, z, faces) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), faces);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; room.add(m); return m;
  };
  const bz = z0 - t / 2;
  const wx0 = x0 - t, wx1 = x1;
  const wl = WIN.x - WIN.w / 2, wr = WIN.x + WIN.w / 2;
  const W_ = wallMat;
  wall(wl - wx0, h, t, (wx0 + wl) / 2, h / 2, bz, [W_, W_, cut, W_, W_, W_]);
  wall(wx1 - wr, h, t, (wr + wx1) / 2, h / 2, bz, [cut, W_, cut, W_, W_, W_]);
  wall(WIN.w, WIN.y0, t, WIN.x, WIN.y0 / 2, bz, [W_, W_, W_, W_, W_, W_]);
  wall(WIN.w, h - WIN.y1, t, WIN.x, (WIN.y1 + h) / 2, bz, [W_, W_, cut, W_, W_, W_]);

  // left wall: birch-ply cladding inside, cut on top and at its open end
  const leftLen = z1 - z0 + t;
  const ply = birchPlyWall(leftLen, h);
  ply.map.anisotropy = aniso;
  const plyMat = new THREE.MeshStandardMaterial({ map: ply.map, bumpMap: ply.bumpMap, bumpScale: 0.6, roughness: 0.7 });
  wall(t, h, leftLen, x0 - t / 2, h / 2, (z0 - t + z1) / 2, [plyMat, W_, cut, W_, cut, W_]);

  // shadow-gap skirting
  box(room, [wx1 - x0, 0.012, 0.01], cut, [(x0 + wx1) / 2, 0.006, z0 + 0.005]);
  box(room, [0.01, 0.012, z1 - z0], cut, [x0 + 0.005, 0.006, (z0 + z1) / 2]);

  // ================= steel window =================
  const fz = z0 - t * 0.62;
  const fd = 0.05, fw = 0.045;
  box(room, [WIN.w, fw, fd], steel, [WIN.x, WIN.y1 - fw / 2, fz]);
  box(room, [WIN.w, fw, fd], steel, [WIN.x, WIN.y0 + fw / 2, fz]);
  box(room, [fw, WIN.y1 - WIN.y0, fd], steel, [wl + fw / 2, (WIN.y0 + WIN.y1) / 2, fz]);
  box(room, [fw, WIN.y1 - WIN.y0, fd], steel, [wr - fw / 2, (WIN.y0 + WIN.y1) / 2, fz]);
  for (let i = 1; i < WIN.cols; i++) box(room, [WIN.bar, WIN.y1 - WIN.y0, 0.035], steel, [wl + (WIN.w * i) / WIN.cols, (WIN.y0 + WIN.y1) / 2, fz]);
  for (let j = 1; j < WIN.rows; j++) box(room, [WIN.w, WIN.bar, 0.035], steel, [WIN.x, WIN.y0 + ((WIN.y1 - WIN.y0) * j) / WIN.rows, fz]);
  // glazing: a faint reflective sheet, never a shadow caster
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.y1 - WIN.y0),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false }));
  glass.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, fz + 0.004);
  room.add(glass);
  // deep inner sill
  rbox(room, [WIN.w + 0.06, 0.03, t * 0.62 + 0.05], std(0xcfcac1, { roughness: 0.55 }), [WIN.x, WIN.y0 - 0.015, z0 - t * 0.31 + 0.025], 0.004);

  // the view: panorama sampled by view direction, sitting inside the wall so it only shows through the opening
  const view = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.y1 - WIN.y0), new THREE.ShaderMaterial({
    uniforms: { tSky: { value: daySky() }, gain: { value: 2.1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform sampler2D tSky; uniform float gain; varying vec3 vW;
      void main(){
        vec3 d = normalize(vW - cameraPosition);
        float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1., 1.));
        vec2 uv = vec2(0.5 + az / 1.6, clamp((el + 0.5) / 1.1, 0., 1.));
        gl_FragColor = vec4(texture2D(tSky, uv).rgb * gain, 1.);
      }`,
  }));
  view.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, z0 - t + 0.004);
  room.add(view);

  // sheer linen panel pulled to the left of the window, on a slim steel rod
  const linen = new THREE.MeshPhysicalMaterial({ color: 0xebe5da, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xfff6e8), sheenRoughness: 0.7, side: THREE.DoubleSide });
  {
    const w = 0.55, g = new THREE.PlaneGeometry(w, 2.42, 60, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin((x / w) * Math.PI * 8) * 0.028 * (0.75 + 0.25 * (1 - (y + 1.21) / 2.42)));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, linen);
    m.position.set(wl - 0.24, 1.3, z0 + 0.09); m.castShadow = m.receiveShadow = true; room.add(m);
  }
  const rod = cyl(room, [0.008, 0.008, WIN.w + 0.9], steel, [WIN.x - 0.3, 2.53, z0 + 0.1], 12); rod.rotation.z = Math.PI / 2;

  // ================= rug =================
  const jute = juteRug();
  jute.bumpMap.repeat.set(26, 18); jute.bumpMap.anisotropy = aniso; jute.map.anisotropy = aniso;
  const rugMesh = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.01, 1.55, 2, 0.004),
    new THREE.MeshPhysicalMaterial({ map: jute.map, bumpMap: jute.bumpMap, bumpScale: 2, roughness: 1, sheen: 0.4, sheenColor: new THREE.Color(0x8a7553), sheenRoughness: 0.9 }));
  rugMesh.position.set(0.35, 0.005, -0.82); rugMesh.receiveShadow = true;
  room.add(rugMesh);

  // ================= drafting desk: ply top on steel trestles =================
  const dz = z0 + 0.48, DX = 0.35, DW = 1.8, DD = 0.8;
  const top = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.03, DD), [edge, edge, birch, birch, edge, edge]);
  top.position.set(DX, DESK_Y - 0.015, dz); top.castShadow = top.receiveShadow = true; room.add(top);
  for (const sx of [-1, 1]) {
    const tx = DX + sx * 0.72;
    for (const sz of [-1, 1]) {
      const L = Math.hypot(DESK_Y - 0.03, 0.24);
      const leg = box(room, [0.032, L, 0.032], steel, [tx, (DESK_Y - 0.03) / 2, dz + sz * 0.2]);
      leg.rotation.x = sz * Math.atan2(0.24, DESK_Y - 0.03);
    }
    box(room, [0.03, 0.03, 0.62], steel, [tx, DESK_Y - 0.045, dz]);
    box(room, [0.024, 0.024, 0.52], steel, [tx, 0.26, dz]);
  }
  box(room, [1.44, 0.024, 0.024], steel, [DX, 0.26, dz]);

  // ================= laptop =================
  const { group: laptop, lid, screenSize } = buildLaptop();
  laptop.position.set(0.32, DESK_Y + 0.002, dz + 0.06);
  room.add(laptop);

  // drawing set spread on the desk, acrylic set square, scale rule, pencil
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.594, 0.42), std(0xffffff, { map: drawingTexture('plan'), roughness: 0.9 }));
  sheet.rotation.set(-Math.PI / 2, 0, 0.09); sheet.position.set(-0.18, DESK_Y + 0.0012, dz + 0.08); sheet.receiveShadow = true; room.add(sheet);
  const sheet2 = sheet.clone(); sheet2.material = std(0xffffff, { map: drawingTexture('elevation'), roughness: 0.9 });
  sheet2.rotation.z = -0.05; sheet2.position.set(-0.24, DESK_Y + 0.0006, dz + 0.02); room.add(sheet2);
  {
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.22, 0), new THREE.Vector2(0, 0.16)]);
    tri.holes.push(new THREE.Path([new THREE.Vector2(0.035, 0.03), new THREE.Vector2(0.135, 0.03), new THREE.Vector2(0.035, 0.1)]));
    const sq = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.003, bevelEnabled: false }),
      new THREE.MeshPhysicalMaterial({ color: 0xd6eef2, roughness: 0.06, transmission: 1, thickness: 0.003, ior: 1.49 }));
    sq.rotation.set(-Math.PI / 2, 0, 0.5); sq.position.set(-0.36, DESK_Y + 0.0016, dz + 0.22); sq.castShadow = true; room.add(sq);
  }
  const rule = cyl(room, [0.011, 0.011, 0.3, 3], std(0xe7e4dd, { roughness: 0.45, metalness: 0.2 }), [-0.02, DESK_Y + 0.0072, dz + 0.3], 3);
  rule.rotation.set(0, 0.22, Math.PI / 2);
  const pencil = cyl(room, [0.0036, 0.0036, 0.17], std(0x2b2d31, { roughness: 0.4 }), [0.06, DESK_Y + 0.004, dz + 0.24], 6);
  pencil.rotation.set(0, -0.7, Math.PI / 2);
  const notebook = rbox(room, [0.15, 0.014, 0.21], std(0x2a2d33, { roughness: 0.8 }), [0.78, DESK_Y + 0.007, dz + 0.16], 0.003);
  notebook.rotation.y = 0.28;
  // rolled drawings lying at the right end of the desk
  for (let i = 0; i < 3; i++) {
    const r = 0.022 + i * 0.006;
    const roll = cyl(room, [r, r, 0.62 - i * 0.08], i === 1 ? std(0x2f5580, { roughness: 0.85 }) : paper, [0.98, DESK_Y + r, dz - 0.24 + i * 0.075], 20);
    roll.rotation.set(0, 0.06 * (i - 1), Math.PI / 2);
  }

  // ================= drafting lamp =================
  const lamp = new THREE.Group(); lamp.position.set(-0.45, DESK_Y, dz - 0.25); room.add(lamp);
  const lampMat = std(0x1d1f22, { metalness: 0.5, roughness: 0.38 });
  cyl(lamp, [0.07, 0.075, 0.018], lampMat, [0, 0.009, 0]);
  const arm1 = cyl(lamp, [0.006, 0.006, 0.36], lampMat, [0.045, 0.19, 0]); arm1.rotation.z = -0.28;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), lampMat); joint.position.set(0.09, 0.365, 0); lamp.add(joint);
  const arm2 = cyl(lamp, [0.006, 0.006, 0.34], lampMat, [0.175, 0.44, 0]); arm2.rotation.z = 1.15;
  const head = new THREE.Group(); head.position.set(0.28, 0.52, 0); head.rotation.z = -0.2; lamp.add(head);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.1, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d1f22, metalness: 0.5, roughness: 0.38, side: THREE.DoubleSide }));
  hood.castShadow = true; head.add(hood);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffb26b, emissiveIntensity: 3 }));
  bulb.position.y = -0.025; head.add(bulb);
  lamp.updateWorldMatrix(true, true);
  lampSpot.position.copy(bulb.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, -0.01, 0));
  lampSpot.target.position.set(0.25, DESK_Y, dz + 0.08);

  // ================= drawing bin =================
  const bin = new THREE.Group(); bin.position.set(-1.0, 0, z0 + 0.3); room.add(bin);
  const binWall = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.44, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d1f22, metalness: 0.25, roughness: 0.5, side: THREE.DoubleSide }));
  binWall.position.y = 0.22; binWall.castShadow = binWall.receiveShadow = true; bin.add(binWall);
  cyl(bin, [0.15, 0.15, 0.01], steel, [0, 0.005, 0], 40);
  [[0.05, 0.03, 0.95, paper], [-0.06, 0.04, 0.82, paper], [0.02, -0.07, 0.88, std(0x2f5580, { roughness: 0.85 })], [-0.04, -0.02, 0.7, std(0xe6e1d6, { roughness: 0.9 })], [0.08, -0.05, 0.76, paper]]
    .forEach(([x, z, len, mat], i) => {
      const r = 0.022 + (i % 3) * 0.006;
      const roll = cyl(bin, [r, r, len], mat, [x, len / 2 + 0.01, z], 20);
      roll.rotation.set(z * 1.6, 0, -x * 1.6);
    });

  // ================= bookshelf (left wall) =================
  const sh = new THREE.Group(); sh.position.set(x0 + 0.17, 0, -0.35); room.add(sh);
  const SW = 1.5, SH = 1.95, SD = 0.32, ST = 0.022;
  const rows = 5, rowH = (SH - 0.1) / rows;
  rbox(sh, [SD, SH, ST], birch, [0, SH / 2, -SW / 2 + ST / 2], 0.003);
  rbox(sh, [SD, SH, ST], birch, [0, SH / 2, SW / 2 - ST / 2], 0.003);
  rbox(sh, [SD, 0.1, SW], steel, [0, 0.05, 0], 0.003);   // plinth
  for (let i = 0; i <= rows; i++) rbox(sh, [SD, ST, SW], birch, [0, 0.1 + i * rowH, 0], 0.003);

  const spines = spineTextures();
  const pagesMat = std(0xe2dccd, { roughness: 1 });
  const bookMats = spines.map((s, i) => [std(0xffffff, { map: s, roughness: 0.62 }), pagesMat, pagesMat, pagesMat, std(SPINE_COLORS[i], { roughness: 0.7 }), std(SPINE_COLORS[i], { roughness: 0.7 })]);
  const white = std(0xf2f0ea, { roughness: 0.6 });
  for (let r = 0; r < rows; r++) {
    const y0 = 0.1 + r * rowH + ST / 2;
    let z = -SW / 2 + ST + 0.02;
    const end = SW / 2 - ST - 0.02 - (r % 2 === 0 ? 0.0 : 0.42);
    while (z < end - 0.04) {
      const th = rr(0.02, 0.05), ht = rr(0.21, rowH - 0.06), dp = rr(0.17, 0.24), k = (rnd() * 10) | 0;
      const lean = rnd() < 0.05;
      const b = new THREE.Mesh(new THREE.BoxGeometry(dp, ht, th), bookMats[k]);
      b.castShadow = b.receiveShadow = true;
      b.position.set(SD / 2 - dp / 2 - 0.012, y0 + ht / 2, z + th / 2);
      if (lean) { b.rotation.x = -0.18; b.position.z += 0.03; }
      sh.add(b);
      z += th + 0.002 + (lean ? 0.05 : 0);
    }
    if (r % 2 === 1) {
      const zc = SW / 2 - 0.22;
      if (r === 1) {
        // white massing model on a ply base
        rbox(sh, [0.2, 0.012, 0.26], birch, [0, y0 + 0.006, zc], 0.002);
        [[0.04, 0.12, 0.08, -0.03, -0.06], [0.07, 0.07, 0.07, 0.03, 0.02], [0.05, 0.18, 0.05, -0.04, 0.07], [0.06, 0.05, 0.1, 0.04, -0.07]]
          .forEach(([w, hh, d, x, zz]) => rbox(sh, [w, hh, d], white, [x, y0 + 0.012 + hh / 2, zc + zz], 0.002));
      } else {
        for (let n = 0; n < 3; n++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.026, 0.17), bookMats[(n * 3 + r) % 10]); b.castShadow = b.receiveShadow = true;
          b.position.set(0, y0 + 0.013 + n * 0.028, zc); b.rotation.y = rr(-0.08, 0.08); sh.add(b);
        }
        const pot = cyl(sh, [0.042, 0.034, 0.065], std(0x9a968f, { roughness: 0.85 }), [0, y0 + 0.084 + 0.0325, zc]);
        for (let n = 0; n < 7; n++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), std(0x5d7a58, { roughness: 0.6 }));
          leaf.scale.set(0.5, 1.3, 0.25); const a = (n / 7) * Math.PI * 2;
          leaf.position.set(Math.cos(a) * 0.025, pot.position.y + 0.06, zc + Math.sin(a) * 0.025);
          leaf.rotation.set(Math.sin(a) * 0.9, a, Math.cos(a) * -0.9); leaf.castShadow = true; sh.add(leaf);
        }
      }
    }
  }

  // ================= plan chest (right of the window) =================
  const pc = new THREE.Group(); pc.position.set(1.95, 0, z0 + 0.38); room.add(pc);
  const PCW = 0.96, PCD = 0.72, PCH = 0.78;
  const pcBody = std(0x2e3238, { metalness: 0.3, roughness: 0.45 });
  rbox(pc, [PCW, PCH - 0.08, PCD], pcBody, [0, 0.08 + (PCH - 0.08) / 2, 0], 0.006);
  rbox(pc, [PCW - 0.06, 0.08, PCD - 0.06], steel, [0, 0.04, 0], 0.004);
  rbox(pc, [PCW + 0.04, 0.03, PCD + 0.03], birch, [0, PCH + 0.015, 0.01], 0.004);
  for (let i = 0; i < 6; i++) {
    const y = 0.13 + i * 0.105;
    rbox(pc, [PCW - 0.04, 0.095, 0.01], pcBody, [0, y, PCD / 2 + 0.004], 0.003);
    rbox(pc, [0.32, 0.012, 0.016], steel, [0, y + 0.02, PCD / 2 + 0.012], 0.004);
  }
  // flat drawings on top
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.002, 0.42), paper);
    s.position.set(-0.1 + i * 0.01, PCH + 0.031 + i * 0.002, 0.02); s.rotation.y = rr(-0.06, 0.06); s.receiveShadow = s.castShadow = true; pc.add(s);
  }

  // ================= drawings on the walls =================
  const frameMat = std(0x1d1f22, { roughness: 0.45 });
  const framed = (w, hh, kind, pos, mat = true) => {
    const g = new THREE.Group(); g.position.set(...pos); room.add(g);
    rbox(g, [w, hh, 0.028], frameMat, [0, 0, 0], 0.003);
    const inset = mat ? 0.06 : 0.02;
    if (mat) rbox(g, [w - 0.03, hh - 0.03, 0.03], std(0xf3f1ec, { roughness: 0.95 }), [0, 0, 0.001], 0.002);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w - inset * 2, hh - inset * 2), std(0xffffff, { map: drawingTexture(kind), roughness: 0.85 }));
    art.position.z = 0.0165; art.receiveShadow = true; g.add(art);
  };
  framed(0.98, 0.7, 'blueprint', [-1.62, 1.62, z0 + 0.014], false);
  framed(0.6, 0.45, 'detail', [1.95, 1.72, z0 + 0.014]);
  // pinned sheets with binder clips on the ply wall
  const clipMat = std(0x111214, { metalness: 0.7, roughness: 0.3 });
  [[1.55, 1.3, 0.62, 0.44, 'detail', 0.01], [1.8, 1.42, 0.5, 0.36, 'elevation', -0.02], [0.95, 1.12, 0.42, 0.3, 'plan', 0.015]]
    .forEach(([y, z, w, hh, kind, rot]) => {
      const g = new THREE.Group(); g.position.set(x0 + 0.003, y, z); g.rotation.set(0, Math.PI / 2, rot); room.add(g);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), std(0xffffff, { map: drawingTexture(kind), roughness: 0.9, side: THREE.DoubleSide }));
      p.receiveShadow = true; g.add(p);
      for (const cx of [-w / 2 + 0.05, w / 2 - 0.05]) rbox(g, [0.03, 0.02, 0.01], clipMat, [cx, hh / 2 - 0.008, 0.005], 0.002);
    });

  // ================= grounding shadow on the paper =================
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 7.4), new THREE.MeshBasicMaterial({ map: groundShadow(), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0.1, -0.121, 0.15);
  room.add(ground);

  // dimension strings drawn on the paper, as on a presentation drawing
  const inkLine = new THREE.MeshBasicMaterial({ color: 0x23262b });
  const dimension = (a, b, off, label) => {
    const g = new THREE.Group(); room.add(g);
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(), dir = d.clone().normalize();
    const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(off);
    const flat = (w, l, p, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), inkLine); m.rotation.set(-Math.PI / 2, 0, rotY); m.position.copy(p); g.add(m); };
    const ang = Math.atan2(-dir.z, dir.x);
    flat(len, 0.012, a.clone().add(b).multiplyScalar(0.5).add(n), ang);                    // dimension line
    for (const p of [a, b]) {
      flat(0.008, Math.abs(off) + 0.12, p.clone().addScaledVector(n, 0.5 + 0.06 / Math.abs(off)), ang); // extension line
      flat(0.16, 0.014, p.clone().add(n), ang + Math.PI / 4);                                         // tick
    }
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.16), new THREE.MeshBasicMaterial({ map: dimLabel(label), transparent: true }));
    t.rotation.set(-Math.PI / 2, 0, ang); t.position.copy(a.clone().add(b).multiplyScalar(0.5).addScaledVector(n, 1 + 0.2 / Math.abs(off)));
    g.add(t);
    g.position.y = -0.119;
  };
  // one dimension string along the front edge (a depth string would sit behind the wall or the title block)
  dimension(new THREE.Vector3(x0 - t, 0, z1), new THREE.Vector3(x1, 0, z1), 0.42, '5 320');

  // ================= sun shafts =================
  // Ray-marched through the room volume. A sample is lit when the ray back towards the sun passes
  // through an open pane of the steel window (bars and walls block it) and misses the desk top.
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    uniforms: {
      uSun: { value: SUN_DIR }, uColor: { value: new THREE.Color(0xffd9ad) }, uStrength: { value: 0.12 },
      uWin: { value: new THREE.Vector4(wl + fw, wr - fw, WIN.y0 + fw, WIN.y1 - fw) }, uWinZ: { value: fz },
      uGrid: { value: new THREE.Vector3(WIN.cols, WIN.rows, WIN.bar * 0.5) }, uWinRect: { value: new THREE.Vector4(wl, WIN.w, WIN.y0, WIN.y1 - WIN.y0) },
      uBoxMin: { value: new THREE.Vector3(x0, 0, z0) }, uBoxMax: { value: new THREE.Vector3(x1, h, z1) },
      uDeskMin: { value: new THREE.Vector3(DX - DW / 2, DESK_Y - 0.03, dz - DD / 2) }, uDeskMax: { value: new THREE.Vector3(DX + DW / 2, DESK_Y, dz + DD / 2) },
      uSteps: { value: low ? 18 : 40 }, uFade: { value: 1 },
    },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 uSun, uColor, uGrid, uBoxMin, uBoxMax, uDeskMin, uDeskMax;
      uniform vec4 uWin, uWinRect; uniform float uWinZ, uStrength, uSteps, uFade;
      varying vec3 vW;
      vec2 hitBox(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax){
        vec3 inv = 1.0 / rd, t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
        vec3 lo = min(t0, t1), hi = max(t0, t1);
        return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
      }
      float lit(vec3 p){
        float s = (uWinZ - p.z) / uSun.z;            // distance back to the window plane along the sun ray
        if (s <= 0.0) return 0.0;
        vec3 q = p + uSun * s;
        if (q.x < uWin.x || q.x > uWin.y || q.y < uWin.z || q.y > uWin.w) return 0.0;
        vec2 cell = vec2((q.x - uWinRect.x) / uWinRect.y * uGrid.x, (q.y - uWinRect.z) / uWinRect.w * uGrid.y);
        vec2 dEdge = abs(fract(cell) - 0.5) * 2.0;     // 1 at a bar, 0 mid-pane
        vec2 barW = 1.0 - uGrid.z * 2.0 * uGrid.xy / uWinRect.yw;
        float open = (1.0 - smoothstep(barW.x - 0.02, barW.x, dEdge.x)) * (1.0 - smoothstep(barW.y - 0.02, barW.y, dEdge.y));
        vec2 dk = hitBox(p, uSun, uDeskMin, uDeskMax);
        if (dk.x < dk.y && dk.y > 0.0 && dk.x < s) return 0.0;
        return open;
      }
      void main(){
        vec3 ro = cameraPosition, rd = normalize(vW - ro);
        vec2 tb = hitBox(ro, rd, uBoxMin, uBoxMax);
        float t0 = max(tb.x, 0.0), t1 = tb.y;
        if (t1 <= t0) discard;
        float n = uSteps, dt = (t1 - t0) / n;
        float j = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        float acc = 0.0;
        for (int i = 0; i < 64; i++) {
          if (float(i) >= n) break;
          vec3 p = ro + rd * (t0 + (float(i) + j) * dt);
          acc += lit(p) * (0.55 + 0.45 * smoothstep(0.0, 1.6, p.y));
        }
        float mu = dot(rd, -uSun);                   // brighter looking into the light
        float phase = 0.5 + 0.5 * pow(max(mu, 0.0), 6.0);
        gl_FragColor = vec4(uColor * acc * dt * uStrength * phase * uFade, 1.0);
      }`,
  });
  const shafts = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), shaftMat);
  shafts.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  shafts.frustumCulled = false;
  fx.add(shafts);

  // dust motes, seeded only inside the sunlit volume so they read as caught in the light
  const N = low ? 120 : 220, dpos = new Float32Array(N * 3), into = SUN_DIR.clone().negate();
  for (let i = 0; i < N; i++) {
    const q = new THREE.Vector3(rr(wl + 0.1, wr - 0.1), rr(WIN.y0 + 0.05, WIN.y1 - 0.05), fz);
    const p = q.addScaledVector(into, rr(0.3, 4.2));
    if (p.y < 0.05 || p.z > z1) { i--; continue; }
    dpos.set([p.x, p.y, p.z], i * 3);
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xfff0d8, size: 0.004, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dg, dustMat);
  fx.add(dust);

  // ================= glTF props (Khronos sample assets, see CREDITS.md) =================
  const ready = Promise.all([
    loadFitted('SheenChair', { height: 0.9, variant: 'Peacock Velvet' }).then((o) => { o.position.set(DX, 0, dz + 0.68); o.rotation.y = Math.PI + 0.14; room.add(o); }),
    loadFitted('DiffuseTransmissionPlant', { height: 1.3 }).then((o) => { o.position.set(-2.12, 0, -1.68); o.rotation.y = 0.6; room.add(o); }),
    loadFitted('SpecularSilkPouf', { height: 0.42 }).then((o) => {
      // re-dye the shot silk to an oat linen that sits with the palette
      o.traverse((m) => { if (m.isMesh) { m.material.color.setRGB(0.42, 0.37, 0.3); m.material.specularColor?.setRGB(0.6, 0.6, 0.6); } });
      o.position.set(-1.3, 0, 1.0); o.rotation.y = 0.5; room.add(o);
    }),
    loadFitted('GlassVaseFlowers', { height: 0.4 }).then((o) => { o.position.set(0.3, PCH + 0.03, -0.05); pc.add(o); }),
    loadFitted('GlassHurricaneCandleHolder', { height: 0.2 }).then((o) => { o.position.set(-0.32, PCH + 0.037, -0.12); pc.add(o); }),
    loadFitted('DiffuseTransmissionTeacup', { height: 0.085 }).then((o) => { o.position.set(0.66, DESK_Y, dz - 0.02); o.rotation.y = 0.6; room.add(o); }),
  ]);

  /**
   * time: seconds; immersion: 0 overview → 1 sitting at the laptop (volumetrics fade as we close in);
   * camDist: orbit distance. Motes only read as dust up close; from afar they are just speckle.
   */
  const update = (time, immersion = 0, camDist = 0) => {
    dust.position.y = Math.sin(time * 0.25) * 0.02;
    dust.position.x = Math.sin(time * 0.11) * 0.015;
    dustMat.opacity = 0.55 * (1 - immersion) * THREE.MathUtils.smoothstep(7 - camDist, 0, 3);
    dust.visible = dustMat.opacity > 0.01;
    shaftMat.uniforms.uFade.value = 1 - immersion;
    shafts.visible = immersion < 0.99;
  };
  return { room, fx, laptop, lid, screenSize, update, ready, shadowOnly: [ceiling] };
}
