import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Dimensions follow a 14" unibody aluminium laptop (31.3 × 22.1 × 1.55 cm).
const W = 0.313, D = 0.221, BASE_H = 0.0155, LID_T = 0.0046;

export function buildLaptop() {
  const group = new THREE.Group();
  const alu = new THREE.MeshPhysicalMaterial({ color: 0x9a9da5, metalness: 1, roughness: 0.34, clearcoat: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.55 });
  const set = (m) => { m.castShadow = m.receiveShadow = true; return m; };

  // chassis
  const base = set(new THREE.Mesh(new RoundedBoxGeometry(W, BASE_H, D, 4, 0.0035), alu));
  base.position.y = BASE_H / 2;
  group.add(base);

  // keyboard well
  const well = new THREE.Mesh(new THREE.PlaneGeometry(0.288, 0.108), new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.8 }));
  well.rotation.x = -Math.PI / 2; well.position.set(0, BASE_H + 0.0003, -0.05); well.receiveShadow = true;
  group.add(well);

  // keys (instanced)
  const rows = [
    { z: -0.0905, h: 0.6, w: Array(14).fill(1) },
    { z: -0.0715, h: 1, w: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5] },
    { z: -0.0525, h: 1, w: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { z: -0.0335, h: 1, w: [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7] },
    { z: -0.0145, h: 1, w: [2.2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.0] },
    { z: 0.0045, h: 1, w: [1.1, 1.1, 1.1, 1.1, 5.6, 1.1, 1.1, 1.1] },
  ];
  const pitch = 0.0188, keyGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
  const keys = rows.flatMap((r) => { let x = 0; const total = r.w.reduce((a, b) => a + b, 0); const out = [];
    for (const w of r.w) { out.push({ x: (x + w / 2 - total / 2) * pitch, z: r.z, w, h: r.h }); x += w; } return out; });
  const inst = new THREE.InstancedMesh(keyGeo, new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5 }), keys.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  keys.forEach((k, i) => {
    s.set(k.w * pitch - 0.0022, 0.0034, 0.0165 * k.h); p.set(k.x, BASE_H + 0.0014, k.z);
    inst.setMatrixAt(i, m.compose(p, q, s));
  });
  inst.castShadow = inst.receiveShadow = true;
  group.add(inst);

  // trackpad
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.125, 0.0008, 0.082, 2, 0.0004),
    new THREE.MeshPhysicalMaterial({ color: 0xa5a8b0, metalness: 1, roughness: 0.2 }));
  pad.position.set(0, BASE_H + 0.0003, 0.073); pad.receiveShadow = true;
  group.add(pad);

  // hinge barrel
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.262, 16), black);
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, BASE_H + 0.0006, -D / 2 + 0.002);
  group.add(hinge);

  // lid, pivoting about the hinge
  const lid = new THREE.Group();
  lid.position.set(0, BASE_H + 0.001, -D / 2 + 0.0035);
  lid.rotation.x = -0.28;
  group.add(lid);
  const shell = set(new THREE.Mesh(new RoundedBoxGeometry(W, D, LID_T, 4, 0.0022), alu));
  shell.position.set(0, D / 2, LID_T / 2);
  lid.add(shell);

  const front = LID_T + 0.0002;
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.011, D - 0.011),
    new THREE.MeshPhysicalMaterial({ color: 0x020204, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 }));
  bezel.position.set(0, D / 2, front);
  lid.add(bezel);

  const screenSize = { w: 0.296, h: 0.185 };
  const screenCenter = new THREE.Vector3(0, D / 2 + 0.002, front + 0.0004);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(screenSize.w, screenSize.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.9, 2.6), toneMapped: false }));
  glow.position.copy(screenCenter);
  lid.add(glow);
  lid.userData = { screenCenter, screenSize, glow };

  // webcam dot + back logo plate
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.0012, 12), new THREE.MeshBasicMaterial({ color: 0x1a2a1a }));
  cam.position.set(0, D - 0.0045, front + 0.0006); lid.add(cam);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 32), new THREE.MeshPhysicalMaterial({ color: 0xcfd2d8, metalness: 1, roughness: 0.12 }));
  logo.rotation.y = Math.PI; logo.position.set(0, D / 2, -0.0002); lid.add(logo);

  // light spilling from the display onto the keyboard / desk
  const spill = new THREE.RectAreaLight(0x9db4ff, 1.6, screenSize.w, screenSize.h);
  spill.position.set(0, D / 2, front + 0.004);
  spill.rotation.y = Math.PI;
  lid.add(spill);

  return { group, lid, screenSize, screenCenter };
}
