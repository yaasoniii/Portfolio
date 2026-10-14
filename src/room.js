import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });

function box(parent, [w, h, d], color, [x, y, z], o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' && color.isMaterial ? color : mat(color, o));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(parent, [rt, rb, h], color, [x, y, z], seg = 24, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, o));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildRoom(scene) {
  const room = new THREE.Group();
  scene.add(room);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xb9c4ff, 0x4a3a5a, 0.9));
  const sun = new THREE.DirectionalLight(0xcfd9ff, 1.4);
  sun.position.set(-1, 6, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const lampLight = new THREE.PointLight(0xffb36b, 8, 6, 1.6);
  lampLight.position.set(1.15, 1.45, -2.45);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  scene.add(lampLight);

  const screenGlow = new THREE.PointLight(0x7a8cff, 1.2, 3, 2);
  screenGlow.position.set(0, 1.25, -1.9);
  scene.add(screenGlow);

  // ---------- shell: floor + two walls ----------
  const wallMat = mat(0xd9cfe8);
  box(room, [7.4, 0.2, 7.4], 0x9c7a5b, [0, -0.1, 0.5]); // floor (wood)
  box(room, [7.4, 4, 0.2], wallMat, [0, 2, -3.1]); // back wall
  box(room, [0.2, 4, 7.4], mat(0xcfc3e0), [-3.6, 2, 0.5]); // left wall
  box(room, [7.4, 0.14, 0.06], 0xf4efff, [0, 0.07, -2.97]); // baseboards
  box(room, [0.06, 0.14, 7.2], 0xf4efff, [-3.47, 0.07, 0.5]);

  // floor boards
  for (let i = -3; i <= 3; i++) box(room, [0.015, 0.002, 7.2], 0x7d5f45, [i * 0.95, 0.002, 0.5]);

  // rug
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.02, 48), mat(0x6c4bd1));
  rug.position.set(0.3, 0.012, -0.3); rug.receiveShadow = true; room.add(rug);
  const rug2 = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.025, 48), mat(0xf2a65a));
  rug2.position.set(0.3, 0.014, -0.3); rug2.receiveShadow = true; room.add(rug2);

  // ---------- window (back wall, left) ----------
  const winX = -2.0, winY = 2.1;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshBasicMaterial({ color: 0x9ec9ff }));
  sky.position.set(winX, winY, -2.995); room.add(sky);
  box(room, [1.5, 0.08, 0.12], 0xffffff, [winX, winY + 0.79, -2.95]);
  box(room, [1.5, 0.08, 0.12], 0xffffff, [winX, winY - 0.79, -2.95]);
  box(room, [0.08, 1.6, 0.12], 0xffffff, [winX - 0.71, winY, -2.95]);
  box(room, [0.08, 1.6, 0.12], 0xffffff, [winX + 0.71, winY, -2.95]);
  box(room, [0.05, 1.5, 0.1], 0xffffff, [winX, winY, -2.95]);
  box(room, [1.4, 0.05, 0.1], 0xffffff, [winX, winY, -2.95]);

  // ---------- desk ----------
  const wood = mat(0xb98a5e);
  box(room, [2.8, 0.08, 1.0], wood, [0, 0.76, -2.3]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(room, [0.08, 0.76, 0.08], 0x3a3340, [sx * 1.28, 0.38, -2.3 + sz * 0.42]);
  box(room, [0.9, 0.5, 0.9], 0xa77a52, [-0.85, 0.46, -2.3]); // drawer unit
  box(room, [0.84, 0.18, 0.02], 0x8c6340, [-0.85, 0.64, -1.84]);
  box(room, [0.84, 0.18, 0.02], 0x8c6340, [-0.85, 0.4, -1.84]);

  // ---------- laptop ----------
  const laptop = new THREE.Group();
  laptop.position.set(0.15, 0.8, -2.35);
  room.add(laptop);
  const alu = mat(0xb8bcc8, { metalness: 0.7, roughness: 0.35 });
  box(laptop, [0.72, 0.022, 0.5], alu, [0, 0.011, 0]);
  box(laptop, [0.6, 0.002, 0.2], 0x2a2a33, [0, 0.023, -0.05]); // keyboard deck
  box(laptop, [0.2, 0.002, 0.13], 0x9ca0ad, [0, 0.023, 0.17]); // trackpad

  const lid = new THREE.Group();
  lid.position.set(0, 0.022, -0.24);
  lid.rotation.x = -0.32;
  laptop.add(lid);
  box(lid, [0.72, 0.47, 0.02], alu, [0, 0.235, 0.01]);
  box(lid, [0.68, 0.43, 0.004], 0x050508, [0, 0.235, 0.0205]); // bezel
  const screenSize = { w: 0.64, h: 0.4 };
  lid.userData.screenCenter = new THREE.Vector3(0, 0.235, 0.0235);

  // small items on desk
  const lamp = new THREE.Group(); lamp.position.set(1.15, 0.8, -2.5); room.add(lamp);
  cyl(lamp, [0.12, 0.14, 0.03], 0x2d2a36, [0, 0.015, 0]);
  cyl(lamp, [0.015, 0.015, 0.6], 0x2d2a36, [0, 0.33, 0]);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffa24a, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  shade.position.set(0, 0.68, 0); lamp.add(shade);

  cyl(room, [0.06, 0.05, 0.11], 0xf2f2f2, [-0.7, 0.855, -2.5]); // mug
  cyl(room, [0.045, 0.045, 0.005], 0x3b2314, [-0.7, 0.908, -2.5]);
  box(room, [0.28, 0.025, 0.2], 0x2f4fa8, [-0.55, 0.81, -2.55]); // books
  box(room, [0.26, 0.025, 0.19], 0xd9534f, [-0.55, 0.835, -2.55]);
  box(room, [0.1, 0.012, 0.18], 0x222, [0.75, 0.806, -2.1]); // phone
  box(room, [0.3, 0.02, 0.1], 0x2a2a33, [0.15, 0.81, -2.0]); // (keyboard-ish wireless pad)

  // ---------- chair ----------
  const chair = new THREE.Group(); chair.position.set(0.3, 0, -1.35); chair.rotation.y = 0.35; room.add(chair);
  const cloth = mat(0x3e3a52);
  box(chair, [0.55, 0.09, 0.55], cloth, [0, 0.5, 0]);
  box(chair, [0.55, 0.65, 0.08], cloth, [0, 0.9, 0.27]);
  cyl(chair, [0.03, 0.03, 0.45], 0x999, [0, 0.25, 0]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(chair, [0.05, 0.03, 0.34], 0x333, [Math.sin(a) * 0.17, 0.06, Math.cos(a) * 0.17]);
    leg.rotation.y = a;
    cyl(chair, [0.035, 0.035, 0.04], 0x111, [Math.sin(a) * 0.33, 0.03, Math.cos(a) * 0.33]);
  }

  // ---------- bookshelf (left wall) ----------
  const shelf = new THREE.Group(); shelf.position.set(-3.3, 0, -1.2); room.add(shelf);
  const shelfMat = mat(0x6a4a3a);
  box(shelf, [0.4, 2.2, 0.05], shelfMat, [0, 1.1, -0.6]);
  box(shelf, [0.4, 2.2, 0.05], shelfMat, [0, 1.1, 0.6]);
  for (let i = 0; i <= 5; i++) box(shelf, [0.4, 0.04, 1.25], shelfMat, [0, i * 0.43 + 0.02, 0]);
  const palette = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x6c4bd1, 0xf4a261, 0x457b9d, 0xd62828];
  for (let r = 0; r < 5; r++) {
    let z = -0.55;
    while (z < 0.5) {
      const w = 0.04 + Math.random() * 0.05, h = 0.25 + Math.random() * 0.12;
      if (Math.random() < 0.12) { z += 0.12; continue; }
      box(shelf, [0.26, h, w], palette[(Math.random() * palette.length) | 0], [0.0, r * 0.43 + 0.04 + h / 2, z + w / 2]);
      z += w + 0.004;
    }
  }

  // ---------- plant ----------
  const plant = new THREE.Group(); plant.position.set(2.9, 0, -2.5); room.add(plant);
  cyl(plant, [0.28, 0.2, 0.45], 0xc4684a, [0, 0.225, 0]);
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat(0x3f9b5c));
    l.scale.set(0.5, 1.5, 0.15);
    const a = (i / 9) * Math.PI * 2;
    l.position.set(Math.sin(a) * 0.15, 0.85 + (i % 3) * 0.12, Math.cos(a) * 0.15);
    l.rotation.set(Math.cos(a) * 0.5, a, Math.sin(a) * -0.5);
    l.castShadow = true;
    plant.add(l); leaves.push(l);
  }

  // ---------- wall decor ----------
  const frame = (w, h, c, pos, rotY = 0) => {
    const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; room.add(g);
    box(g, [w + 0.06, h + 0.06, 0.04], 0x1e1b26, [0, 0, 0]);
    box(g, [w, h, 0.045], c, [0, 0, 0.002], { roughness: 0.5 });
    return g;
  };
  frame(0.7, 0.9, 0xf2a65a, [-0.9, 1.95, -2.98]);
  frame(0.9, 0.6, 0x6c4bd1, [0.4, 2.1, -2.98]);
  frame(0.5, 0.5, 0x2a9d8f, [1.35, 1.9, -2.98]);
  frame(0.8, 1.0, 0xe76f51, [-3.57, 2.0, 0.2], Math.PI / 2);

  // string lights along the back wall
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  for (let i = 0; i < 16; i++) {
    const x = -3.3 + i * 0.44;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), bulbMat);
    b.position.set(x, 3.25 - Math.sin((i / 15) * Math.PI) * 0.22 * -1 - 0.2 * Math.sin((i / 15) * Math.PI), -2.95);
    room.add(b);
  }

  // beanbag
  const bean = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), mat(0xe76f51));
  bean.scale.y = 0.65; bean.position.set(2.3, 0.35, 0.2); bean.castShadow = bean.receiveShadow = true; room.add(bean);

  // dust motes
  const n = 120, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 6, Math.random() * 3.5, Math.random() * 6 - 3], i * 3);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.02, transparent: true, opacity: 0.6 }));
  room.add(dust);

  scene.userData.update = (t) => {
    leaves.forEach((l, i) => (l.rotation.z += Math.sin(t * 1.2 + i) * 0.0006));
    dust.position.y = Math.sin(t * 0.3) * 0.08;
    dust.rotation.y = t * 0.01;
  };

  return { room, laptop, lid, screenSize };
}
