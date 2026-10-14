import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { buildLaptop } from './laptop.js';
import { loadFitted } from './models.js';
import { woodTextures, plasterBump, rugTextures, nightSky, posterTexture, spineTextures } from './textures.js';

// All dimensions are in metres.
const ROOM = { x0: -2.6, x1: 2.6, z0: -2.2, z1: 2.4, h: 2.7, t: 0.12 };
const WIN = { x: 0.45, w: 1.3, y0: 0.95, y1: 2.15 };
const DESK_Y = 0.74;

const rand = (a, b) => a + Math.random() * (b - a);
// deterministic pseudo-random so the room looks identical every visit
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rnd() * (b - a);

function rbox(parent, [w, h, d], mat, [x, y, z], r = 0.008, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat);
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

export function buildRoom(scene, renderer) {
  RectAreaLightUniformsLib.init();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const room = new THREE.Group();
  scene.add(room);

  // ================= materials =================
  const floorTex = woodTextures({ planks: 8, tones: [0xa98259, 0x9f7a52, 0xb28a60, 0x987450], rings: 12, jointsPerTile: 1, gap: 0.02 });
  for (const t of Object.values(floorTex)) { t.repeat.set(4.4, 3.9); t.anisotropy = aniso; }
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex.map, roughnessMap: floorTex.roughnessMap, bumpMap: floorTex.bumpMap, bumpScale: 1.2, roughness: 0.85 });

  const plaster = plasterBump();
  plaster.repeat.set(3, 2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc2b6a6, roughness: 0.93, bumpMap: plaster, bumpScale: 0.35 });
  const sageMat = new THREE.MeshStandardMaterial({ color: 0x8f9c88, roughness: 0.93, bumpMap: plaster, bumpScale: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xece8e1, roughness: 0.5 });

  const deskTex = woodTextures({ planks: 1, tones: [0x6a4630, 0x5b3b29, 0x73503a], rings: 7, jointsPerTile: 1, gap: 0 });
  for (const t of Object.values(deskTex)) { t.repeat.set(1, 1); t.anisotropy = aniso; }
  const deskMat = new THREE.MeshPhysicalMaterial({ map: deskTex.map, roughnessMap: deskTex.roughnessMap, bumpMap: deskTex.bumpMap, bumpScale: 0.6, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const oakTex = woodTextures({ planks: 1, tones: [0xb8996f, 0xae9066, 0xc0a279], rings: 8, jointsPerTile: 1, gap: 0 });
  for (const t of Object.values(oakTex)) t.anisotropy = aniso;
  const oakMat = new THREE.MeshStandardMaterial({ map: oakTex.map, roughnessMap: oakTex.roughnessMap, bumpMap: oakTex.bumpMap, bumpScale: 0.5, roughness: 0.75 });
  const blackMetal = std(0x1b1c20, { metalness: 0.9, roughness: 0.4 });
  const brass = std(0xb08d4a, { metalness: 1, roughness: 0.3 });

  // ================= lights =================
  scene.add(new THREE.HemisphereLight(0x7f8fc4, 0x2a1f1a, 0.55));

  // moonlight pouring through the window
  const moon = new THREE.DirectionalLight(0xa6bcff, 2.2);
  moon.position.set(WIN.x - 2.2, 5.2, -9);
  moon.target.position.set(0.2, 0, -0.6);
  scene.add(moon, moon.target);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 2, far: 22 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02; moon.shadow.radius = 4;

  // warm desk lamp (spot) + a soft bounce
  const lampSpot = new THREE.SpotLight(0xffb272, 13, 0, 0.7, 0.9, 2);
  lampSpot.castShadow = true;
  lampSpot.shadow.mapSize.set(1024, 1024); lampSpot.shadow.bias = -0.0006; lampSpot.shadow.radius = 5;
  scene.add(lampSpot, lampSpot.target);
  const lampBounce = new THREE.PointLight(0xff9d57, 0.6, 4.5, 2);
  scene.add(lampBounce);

  // ================= shell =================
  const { x0, x1, z0, z1, h, t } = ROOM;
  const slabW = x1 - x0 + t + 0.2, slabD = z1 - z0 + t + 0.2;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.12, slabD), [floorMat.clone(), floorMat.clone(), floorMat, floorMat.clone(), floorMat.clone(), floorMat.clone()]);
  slab.material[0].map = slab.material[1].map = slab.material[4].map = slab.material[5].map = null;
  [0, 1, 4, 5].forEach((i) => { slab.material[i] = std(0x7a5a3a, { roughness: 0.9 }); });
  slab.position.set((x0 + x1) / 2 - t / 2, -0.06, (z0 + z1) / 2 - t / 2);
  slab.receiveShadow = true; slab.castShadow = true;
  room.add(slab);

  const wall = (w, hh, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), wallMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; room.add(m); };
  const bz = z0 - t / 2;               // back-wall centre z
  const wx0 = x0 - t, wx1 = x1;        // back-wall x span
  const wl = WIN.x - WIN.w / 2, wr = WIN.x + WIN.w / 2;
  wall(wl - wx0, h, t, (wx0 + wl) / 2, h / 2, bz);
  wall(wx1 - wr, h, t, (wr + wx1) / 2, h / 2, bz);
  wall(WIN.w, WIN.y0, t, WIN.x, WIN.y0 / 2, bz);
  wall(WIN.w, h - WIN.y1, t, WIN.x, (WIN.y1 + h) / 2, bz);
  { const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, z1 - z0 + t), sageMat); m.position.set(x0 - t / 2, h / 2, (z0 - t + z1) / 2); m.castShadow = m.receiveShadow = true; room.add(m); }  // left wall

  // baseboards
  rbox(room, [wx1 - x0 - 0.0, 0.1, 0.014], trim, [(x0 + wx1) / 2, 0.05, z0 + 0.007], 0.004);
  rbox(room, [0.014, 0.1, z1 - z0], trim, [x0 + 0.007, 0.05, (z0 + z1) / 2], 0.004);

  // window: frame, mullions, sill, night view
  const fz = bz;
  rbox(room, [WIN.w + 0.08, 0.05, 0.1], trim, [WIN.x, WIN.y1 + 0.005, fz], 0.006);
  rbox(room, [WIN.w + 0.08, 0.05, 0.1], trim, [WIN.x, WIN.y0 - 0.005, fz], 0.006);
  rbox(room, [0.05, WIN.y1 - WIN.y0, 0.1], trim, [wl - 0.005, (WIN.y0 + WIN.y1) / 2, fz], 0.006);
  rbox(room, [0.05, WIN.y1 - WIN.y0, 0.1], trim, [wr + 0.005, (WIN.y0 + WIN.y1) / 2, fz], 0.006);
  rbox(room, [0.035, WIN.y1 - WIN.y0, 0.05], trim, [WIN.x, (WIN.y0 + WIN.y1) / 2, fz], 0.004);
  rbox(room, [WIN.w, 0.035, 0.05], trim, [WIN.x, 1.58, fz], 0.004);
  rbox(room, [WIN.w + 0.2, 0.035, 0.2], trim, [WIN.x, WIN.y0 - 0.02, z0 + 0.04], 0.01);   // sill
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w - 0.02, WIN.y1 - WIN.y0 - 0.02), new THREE.ShaderMaterial({
    uniforms: { tSky: { value: nightSky() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform sampler2D tSky; varying vec3 vW;
      void main(){
        vec3 d = normalize(vW - cameraPosition);
        float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1., 1.));
        vec2 uv = vec2(0.5 + az / 1.6, clamp((el + 0.5) / 1.1, 0., 1.));
        gl_FragColor = vec4(texture2D(tSky, uv).rgb, 1.);
      }`,
  }));
  sky.position.set(WIN.x, (WIN.y0 + WIN.y1) / 2, bz);   // sits inside the wall thickness: only visible through the opening
  room.add(sky);

  // curtains (folded cloth) + rod
  const clothMat = new THREE.MeshPhysicalMaterial({ color: 0xd7cfc2, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xfff3e0), sheenRoughness: 0.6, side: THREE.DoubleSide });
  const curtain = (cx, w) => {
    const g = new THREE.PlaneGeometry(w, 2.4, 60, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x / w * Math.PI * 7) * 0.03 * (0.7 + 0.3 * (1 - (y + 1.2) / 2.4)));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, clothMat);
    m.position.set(cx, 1.28, z0 + 0.09); m.castShadow = m.receiveShadow = true; room.add(m);
  };
  curtain(wl - 0.3, 0.7); curtain(wr + 0.3, 0.7);
  const rod = cyl(room, [0.01, 0.01, 2.6], brass, [WIN.x, 2.5, z0 + 0.11]); rod.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), brass); f.position.set(WIN.x + s * 1.31, 2.5, z0 + 0.11); room.add(f); }

  // ================= rug =================
  const rug = rugTextures();
  rug.bumpMap.repeat.set(24, 17); rug.bumpMap.anisotropy = aniso; rug.map.anisotropy = aniso;
  const rugMesh = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.012, 1.7, 2, 0.005),
    new THREE.MeshPhysicalMaterial({ map: rug.map, bumpMap: rug.bumpMap, bumpScale: 1.6, roughness: 1, sheen: 0.5, sheenColor: new THREE.Color(0x6d6350), sheenRoughness: 0.9 }));
  rugMesh.position.set(0.3, 0.006, -0.25); rugMesh.receiveShadow = true; rugMesh.castShadow = true;
  room.add(rugMesh);

  // ================= desk =================
  const dz = z0 + 0.37;
  rbox(room, [1.6, 0.035, 0.72], deskMat, [0.35, DESK_Y - 0.0175, dz], 0.012);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    rbox(room, [0.04, DESK_Y - 0.035, 0.04], blackMetal, [0.35 + sx * 0.74, (DESK_Y - 0.035) / 2, dz + sz * 0.3], 0.006);
  rbox(room, [1.44, 0.03, 0.03], blackMetal, [0.35, 0.62, dz - 0.3], 0.006);   // back rail
  // drawer unit
  const cab = new THREE.Group(); cab.position.set(0.95, 0, dz + 0.02); room.add(cab);
  rbox(cab, [0.44, 0.56, 0.6], deskMat, [0, 0.31, 0], 0.01);
  for (const y of [0.45, 0.2]) {
    rbox(cab, [0.4, 0.23, 0.012], oakMat, [0, y, 0.305], 0.006);
    rbox(cab, [0.14, 0.012, 0.014], brass, [0, y + 0.06, 0.318], 0.005);
  }

  // desk mat, notebook, pen
  rbox(room, [0.74, 0.004, 0.36], std(0x2b2e36, { roughness: 0.95 }), [0.35, DESK_Y + 0.002, dz + 0.02], 0.002);
  const nb = rbox(room, [0.15, 0.014, 0.21], std(0xe8e2d4, { roughness: 0.85 }), [0.78, DESK_Y + 0.007, dz + 0.1], 0.003); nb.rotation.y = 0.3;
  const pen = cyl(room, [0.004, 0.004, 0.15], std(0x20232b, { metalness: 0.6, roughness: 0.35 }), [0.7, DESK_Y + 0.018, dz + 0.04]); pen.rotation.z = Math.PI / 2; pen.rotation.y = -0.5;

  // ================= laptop =================
  const { group: laptop, lid, screenSize } = buildLaptop();
  laptop.position.set(0.3, DESK_Y + 0.004, dz + 0.0);
  room.add(laptop);

  // ================= desk lamp =================
  const lamp = new THREE.Group(); lamp.position.set(-0.22, DESK_Y, dz - 0.14); room.add(lamp);
  const lampMat = std(0x23252b, { metalness: 0.8, roughness: 0.35 });
  cyl(lamp, [0.075, 0.08, 0.018], lampMat, [0, 0.009, 0]);
  const arm1 = cyl(lamp, [0.006, 0.006, 0.36], lampMat, [0.045, 0.19, 0]); arm1.rotation.z = -0.28;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), lampMat); joint.position.set(0.09, 0.365, 0); lamp.add(joint);
  const arm2 = cyl(lamp, [0.006, 0.006, 0.34], lampMat, [0.175, 0.44, 0]); arm2.rotation.z = 1.15;
  const head = new THREE.Group(); head.position.set(0.28, 0.52, 0); head.rotation.z = -0.2; lamp.add(head);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.1, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x23252b, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
  hood.castShadow = true; head.add(hood);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffb26b, emissiveIntensity: 2.5 }));
  bulb.position.y = -0.025; head.add(bulb);
  lamp.updateWorldMatrix(true, true);
  const bw = bulb.getWorldPosition(new THREE.Vector3());
  lampSpot.position.copy(bw).add(new THREE.Vector3(0, -0.01, 0));
  lampSpot.target.position.set(0.18, DESK_Y, dz + 0.02);
  lampBounce.position.copy(bw).add(new THREE.Vector3(0, 0.1, 0.1));

  // ================= bookshelf (left wall) =================
  const sh = new THREE.Group(); sh.position.set(x0 + 0.17, 0, -0.15); room.add(sh);
  const SW = 1.5, SH = 1.95, SD = 0.32, ST = 0.022;
  const rows = 5, rowH = (SH - 0.1) / rows;
  rbox(sh, [SD, SH, ST], oakMat, [0, SH / 2, -SW / 2 + ST / 2], 0.004);
  rbox(sh, [SD, SH, ST], oakMat, [0, SH / 2, SW / 2 - ST / 2], 0.004);
  rbox(sh, [0.01, SH, SW], oakMat, [-SD / 2 + 0.005, SH / 2, 0], 0.002);     // back panel
  rbox(sh, [SD, 0.1, SW], std(0x2a2623, { roughness: 0.7 }), [0, 0.05, 0], 0.004);  // plinth
  for (let i = 0; i <= rows; i++) rbox(sh, [SD, ST, SW], oakMat, [0, 0.1 + i * rowH, 0], 0.004);

  const spines = spineTextures(10);
  const cover = [0x8c2f39, 0x1f4e5f, 0xd1a054, 0x2f3e46, 0x6b705c, 0xb5838d, 0x3a506b, 0xe07a5f, 0x264653, 0xa68a64];
  const pagesMat = std(0xcfc5b0, { roughness: 1 });
  const bookMats = spines.map((s, i) => [std(0xffffff, { map: s, roughness: 0.6 }), pagesMat, pagesMat, pagesMat, std(cover[i], { roughness: 0.7 }), std(cover[i], { roughness: 0.7 })]);
  for (let r = 0; r < rows; r++) {
    const y0 = 0.1 + r * rowH + ST / 2;
    let z = -SW / 2 + ST + 0.02;
    const end = SW / 2 - ST - 0.02 - (r % 2 === 0 ? 0.0 : 0.4);
    while (z < end - 0.04) {
      const th = rr(0.022, 0.05), ht = rr(0.2, rowH - 0.05), dp = rr(0.16, 0.22), k = (rnd() * 10) | 0;
      const lean = rnd() < 0.06;
      const b = new THREE.Mesh(new THREE.BoxGeometry(dp, ht, th), bookMats[k]);
      b.castShadow = b.receiveShadow = true;
      b.position.set(SD / 2 - dp / 2 - 0.012, y0 + ht / 2, z + th / 2);
      if (lean) { b.rotation.x = -0.18; b.position.z += 0.03; }
      sh.add(b);
      z += th + 0.002 + (lean ? 0.05 : 0);
    }
    // little decor at the end of alternate rows
    if (r % 2 === 1) {
      const zc = SW / 2 - 0.2;
      for (let n = 0; n < 3; n++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.16), bookMats[(n * 3 + r) % 10]); b.castShadow = b.receiveShadow = true;
        b.position.set(0.0, y0 + 0.015 + n * 0.032, zc); b.rotation.y = rr(-0.1, 0.1); sh.add(b); }
      // tiny succulent
      const pot = cyl(sh, [0.04, 0.032, 0.06], std(0xb5694a, { roughness: 0.9 }), [0.0, y0 + 0.096 + 0.03, zc]);
      for (let n = 0; n < 7; n++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), std(0x5f8a5a, { roughness: 0.6 }));
        leaf.scale.set(0.5, 1.3, 0.25); const a = (n / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.025, y0 + 0.17, zc + Math.sin(a) * 0.025);
        leaf.rotation.set(Math.sin(a) * 0.9, a, Math.cos(a) * -0.9); leaf.castShadow = true; sh.add(leaf);
      }
    }
  }

  // ================= console (right) =================
  const cx = 1.6, cy = 0.5;
  const con = new THREE.Group(); room.add(con);
  rbox(con, [0.95, 0.035, 0.38], oakMat, [cx, cy - 0.0175, z0 + 0.2], 0.008);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = cyl(con, [0.014, 0.01, cy - 0.035], blackMetal, [cx + sx * 0.4, (cy - 0.035) / 2, z0 + 0.2 + sz * 0.13]);
    leg.rotation.z = sx * 0.05;
  }

  // ================= frames =================
  const frameMat = std(0x1c1b1d, { roughness: 0.45 });
  const matMat = std(0xf1ede4, { roughness: 0.95 });
  const frame = (w, hh, kind, pos, rotY = 0) => {
    const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; room.add(g);
    rbox(g, [w, hh, 0.03], frameMat, [0, 0, 0], 0.004);
    rbox(g, [w - 0.04, hh - 0.04, 0.032], matMat, [0, 0, 0.001], 0.002);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, hh - 0.14), std(0xffffff, { map: posterTexture(kind), roughness: 0.8 }));
    art.position.z = 0.0175; art.receiveShadow = true; g.add(art);
  };
  const fy = z0 + 0.015;
  frame(0.5, 0.7, 0, [-1.05, 1.55, fy]);
  frame(0.34, 0.44, 1, [-1.62, 1.75, fy]);
  frame(0.56, 0.76, 2, [1.75, 1.6, fy]);
  frame(0.7, 0.5, 1, [x0 + 0.015, 1.7, 1.5], Math.PI / 2);

  // ================= string lights =================
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe3b0, emissive: 0xffc37a, emissiveIntensity: 5 });
  const strand = (xa, xb, sag) => {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(mixN(xa, xb, u), 2.52 - Math.sin(u * Math.PI) * sag, z0 + 0.04)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0018, 4), std(0x111111, { roughness: 0.6 })); room.add(wire);
    for (let i = 1; i < 13; i++) { const p = curve.getPoint(i / 13); const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), bulbMat); b.position.copy(p).add(new THREE.Vector3(0, -0.015, 0)); room.add(b); }
  };
  const mixN = (a, b, t) => a + (b - a) * t;
  strand(x0 + 0.05, WIN.x - 0.3, 0.22); strand(WIN.x + 0.3, x1 - 0.05, 0.2);

  // ================= dust motes =================
  const n = 160, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rand(-1.6, 1.8), rand(0.2, 2.3), rand(-2, 0.5)], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xcfdaff, size: 0.008, transparent: true, opacity: 0.55, depthWrite: false }));
  room.add(dust);

  // ================= glTF props (Khronos sample assets, see CREDITS.md) =================
  const ready = Promise.all([
    loadFitted('SheenChair', { height: 0.9 }).then((o) => { o.position.set(0.35, 0, -1.18); o.rotation.y = Math.PI + 0.12; room.add(o); }),
    loadFitted('DiffuseTransmissionPlant', { height: 1.25 }).then((o) => { o.position.set(2.22, 0, -1.7); room.add(o); }),
    loadFitted('SpecularSilkPouf', { height: 0.42 }).then((o) => { o.position.set(-1.35, 0, 1.0); o.rotation.y = 0.5; room.add(o); }),
    loadFitted('GlassVaseFlowers', { height: 0.4 }).then((o) => { o.position.set(cx - 0.2, cy, z0 + 0.2); con.add(o); }),
    loadFitted('GlassHurricaneCandleHolder', { height: 0.2 }).then((o) => {
      o.position.set(cx + 0.2, cy, z0 + 0.2); con.add(o);
      const flame = new THREE.PointLight(0xffa24d, 0.35, 2.5, 2); flame.position.set(cx + 0.2, cy + 0.1, z0 + 0.2); con.add(flame);
    }),
    loadFitted('DiffuseTransmissionTeacup', { height: 0.085 }).then((o) => { o.position.set(0.62, DESK_Y + 0.004, dz - 0.07); o.rotation.y = 0.6; room.add(o); }),
  ]);

  const update = (time) => { dust.rotation.y = time * 0.012; dust.position.y = Math.sin(time * 0.3) * 0.04; };
  return { room, laptop, lid, screenSize, update, ready };
}
