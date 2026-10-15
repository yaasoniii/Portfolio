import * as THREE from 'three';

// ---------- tiny value-noise toolkit (no assets needed) ----------
function hash(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function tex(c, { srgb = false, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

/**
 * Procedural hardwood: returns colour, roughness and bump maps.
 * Planks run along U. `planks` boards across V; `tones` are base colours.
 */
export function woodTextures({ size = 1024, planks = 8, tones = [0xb48a5a, 0xa67c50, 0xc09566], rings = 14, gap = 0.035, jointsPerTile = 2 } = {}) {
  const col = canvas(size, size), rou = canvas(size, size), bmp = canvas(size, size);
  const cc = col.getContext('2d'), rc = rou.getContext('2d'), bc = bmp.getContext('2d');
  const ci = cc.createImageData(size, size), ri = rc.createImageData(size, size), bi = bc.createImageData(size, size);
  const T = tones.map(hex);
  for (let y = 0; y < size; y++) {
    const v = y / size, row = Math.floor(v * planks), lv = v * planks - row;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const seg = Math.floor(u * jointsPerTile + hash(row, 7) * jointsPerTile);
      const segEdge = (u * jointsPerTile + hash(row, 7) * jointsPerTile) % 1;
      const key = hash(row * 31 + seg, 3);
      const base = T[Math.floor(key * T.length) % T.length];
      const warp = fbm(u * 3 + seg * 9.1 + row * 2.7, lv * 1.2 + row * 5.3, 3);
      const ring = 0.5 + 0.5 * Math.sin((lv * rings + warp * 9 + key * 20) * Math.PI);
      const fine = fbm(u * 60 + seg * 5, lv * 160 + row * 40, 2);
      const g = 0.86 + 0.14 * ring + 0.12 * (fine - 0.5) + 0.07 * (key - 0.5);
      let gapMask = 1;
      if (lv < gap || lv > 1 - gap) gapMask = 0.55;
      if (segEdge < gap * 0.35 * planks / 2) gapMask = Math.min(gapMask, 0.6);
      const i = (y * size + x) * 4;
      ci.data[i] = Math.min(255, base[0] * g * gapMask);
      ci.data[i + 1] = Math.min(255, base[1] * g * gapMask);
      ci.data[i + 2] = Math.min(255, base[2] * g * gapMask);
      ci.data[i + 3] = 255;
      const r = Math.min(255, (0.55 + 0.25 * fine + 0.1 * ring) * 255 * (gapMask < 1 ? 1.2 : 1));
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = r; ri.data[i + 3] = 255;
      const h = (0.6 + 0.25 * ring + 0.15 * fine) * (gapMask < 1 ? 0.05 : 1) * 255;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = h; bi.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); rc.putImageData(ri, 0, 0); bc.putImageData(bi, 0, 0);
  return { map: tex(col, { srgb: true }), roughnessMap: tex(rou), bumpMap: tex(bmp) };
}

/** Subtle plaster / painted-wall bump. */
export function plasterBump(size = 512) {
  const c = canvas(size, size), ctx = c.getContext('2d'), im = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tile-able: blend noise with wrapped copy
    const n = fbm(x / 24, y / 24, 4) * 0.6 + hash(x, y) * 0.4;
    const i = (y * size + x) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = n * 255; im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return tex(c);
}

/** Polished concrete / microcement: one large non-repeating colour + roughness map covering the whole floor. */
export function concreteTextures(W = 1024, H = 904) {
  const col = canvas(W, H), rou = canvas(W, H);
  const cc = col.getContext('2d'), rc = rou.getContext('2d');
  const ci = cc.createImageData(W, H), ri = rc.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cloud = fbm(x / 210, y / 210, 5);             // broad trowel clouding
    const mid = fbm(x / 38 + 40, y / 38 + 11, 3);       // mid-scale mottling
    const grain = hash(x, y);
    const agg = hash(x * 7 + 3, y * 13 + 5);
    const fleck = agg > 0.994 ? -0.2 : agg < 0.004 ? 0.12 : 0; // dark and pale aggregate flecks
    const g = 0.86 + 0.16 * (cloud - 0.5) + 0.07 * (mid - 0.5) + 0.035 * (grain - 0.5) + fleck;
    const i = (y * W + x) * 4;
    ci.data[i] = 142 * g; ci.data[i + 1] = 138 * g; ci.data[i + 2] = 131 * g; ci.data[i + 3] = 255;
    // polished, but worn patches and sealer variation break up the reflections
    const r = 0.22 + 0.3 * fbm(x / 120 + 7, y / 120 + 3, 4) + 0.06 * (grain - 0.5);
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = Math.min(255, r * 255); ri.data[i + 3] = 255;
  }
  cc.putImageData(ci, 0, 0); rc.putImageData(ri, 0, 0);
  return { map: tex(col, { srgb: true, repeat: false }), roughnessMap: tex(rou, { repeat: false }) };
}

/** Limewash plaster: soft cloudy tonal variation (colour); pair with plasterBump for relief. */
export function limewashMap(size = 512, base = [222, 216, 205]) {
  const c = canvas(size, size), ctx = c.getContext('2d'), im = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = fbm(x / 90, y / 90, 5) - 0.5, s = fbm(x / 14 + 9, y / 14, 2) - 0.5;
    const brush = fbm(x / 40 + n * 3, y / 160, 3) - 0.5;
    const g = 1 + n * 0.16 + brush * 0.06 + s * 0.03;
    const i = (y * size + x) * 4;
    im.data[i] = base[0] * g; im.data[i + 1] = base[1] * g; im.data[i + 2] = base[2] * g; im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return tex(c, { srgb: true });
}

/**
 * Birch-ply wall cladding: vertical sheets with shadow-gap seams and screw heads.
 * `wM`/`hM` are the wall size in metres; the texture maps 1:1 onto it.
 */
export function birchPlyWall(wM, hM, sheetW = 1.22) {
  const PX = 200, W = Math.round(wM * PX), H = Math.round(hM * PX);
  const col = canvas(W, H), bmp = canvas(W, H);
  const cc = col.getContext('2d'), bc = bmp.getContext('2d');
  const ci = cc.createImageData(W, H), bi = bc.createImageData(W, H);
  const sheetPx = sheetW * PX, rowPx = 2.44 * PX;
  const screws = [[20, 20], [sheetPx - 20, 20], [20, rowPx / 2], [sheetPx - 20, rowPx / 2], [20, rowPx - 20], [sheetPx - 20, rowPx - 20]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / sheetPx), lx = x - sx * sheetPx, ly = y % rowPx;
    const k = hash(sx, 91);
    const grain = fbm(x / 9 + sx * 31, y / 160 + sx * 7, 3);           // long straight birch grain
    const fleck = fbm(x / 3, y / 40, 2);
    const g = 0.93 + 0.06 * (k - 0.5) + 0.07 * (grain - 0.5) + 0.03 * (fleck - 0.5);
    const seam = lx < 3 || lx > sheetPx - 3 || ly < 3;
    const screw = !seam && screws.some(([px, py]) => (lx - px) ** 2 + (ly - py) ** 2 < 8);
    const i = (y * W + x) * 4;
    const m = seam ? 0.32 : screw ? 0.55 : 1;
    ci.data[i] = 226 * g * m; ci.data[i + 1] = 205 * g * m; ci.data[i + 2] = 170 * g * m; ci.data[i + 3] = 255;
    const b = seam ? 0 : screw ? 90 : 200 + 30 * grain;
    bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = b; bi.data[i + 3] = 255;
  }
  cc.putImageData(ci, 0, 0); bc.putImageData(bi, 0, 0);
  return { map: tex(col, { srgb: true, repeat: false }), bumpMap: tex(bmp, { repeat: false }) };
}

/** Plywood edge: the alternating veneer layers you see on a cut sheet. */
export function plyEdge() {
  const c = canvas(64, 64), g = c.getContext('2d');
  for (let y = 0; y < 64; y++) {
    g.fillStyle = Math.floor(y / (64 / 9)) % 2 ? '#c9ab7e' : '#e0c9a2';
    g.fillRect(0, y, 64, 1);
  }
  return tex(c, { srgb: true });
}

/** Jute flatweave rug: colour map with a woven border, plus a tiling basket-weave bump. */
export function juteRug() {
  const W = 1024, H = 768;
  const c = canvas(W, H), ctx = c.getContext('2d'), im = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, W - 1 - x, y, H - 1 - y);
    const band = d < 40 ? 0.74 : d < 46 ? 0.6 : 1;
    const cord = 0.5 + 0.5 * Math.sin((x + y * 0.5) / 2.2);
    const n = 0.9 + 0.12 * fbm(x / 5, y / 5, 3) + 0.06 * cord + 0.05 * (hash(x, y) - 0.5);
    const i = (y * W + x) * 4;
    im.data[i] = 186 * n * band; im.data[i + 1] = 160 * n * band; im.data[i + 2] = 118 * n * band; im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const S = 128, b = canvas(S, S), bctx = b.getContext('2d'), bi = bctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cell = ((x >> 4) + (y >> 4)) & 1;
    const u = ((cell ? x : y) % 16) / 16, v = ((cell ? y : x) % 4) / 4;
    const h = Math.sin(u * Math.PI) * 0.6 + Math.sin(v * Math.PI) * 0.4;
    const i = (y * S + x) * 4;
    bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = (0.25 + 0.65 * h + 0.1 * hash(x, y)) * 255; bi.data[i + 3] = 255;
  }
  bctx.putImageData(bi, 0, 0);
  return { map: tex(c, { srgb: true, repeat: false }), bumpMap: tex(b) };
}

/**
 * Late-afternoon sky over a hazy city, painted as a panorama sampled by view direction (see room.js),
 * so it parallaxes like something infinitely far away. v = (elevation + 0.5) / 1.1, u = 0.5 + azimuth / 1.6.
 */
export function daySky() {
  const W = 2048, H = 1024, c = canvas(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#9cbbe0'); grad.addColorStop(0.4, '#c5d6e8'); grad.addColorStop(0.62, '#f1e6d2'); grad.addColorStop(0.8, '#fbe3bd'); grad.addColorStop(1, '#fde0b2');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // the sun sits up and to the left, out of frame: its glow floods that side of the sky
  const glow = g.createRadialGradient(W * 0.05, H * 0.3, 10, W * 0.05, H * 0.3, W * 0.7);
  glow.addColorStop(0, 'rgba(255,236,200,1)'); glow.addColorStop(0.4, 'rgba(255,226,180,0.55)'); glow.addColorStop(1, 'rgba(255,226,180,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.22; g.fillStyle = '#ffffff';   // faint cirrus
  for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(hash(i, 1) * W, H * (0.1 + hash(i, 2) * 0.3), 160 + hash(i, 3) * 260, 6 + hash(i, 4) * 10, -0.05, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // facades in three hazy layers; nearer layers are warmer and catch the low sun on their left faces
  [['#d9d6d2', 170, 130, 0.25], ['#c4bdb4', 230, 160, 0.45], ['#ab9f92', 290, 190, 0.7]].forEach(([body, base, varH, lit], L) => {
    let x = -20, n = 0;
    while (x < W) {
      const w = 70 + hash(n, L * 7) * 160, h = base + hash(n, L * 7 + 1) * varH;
      g.fillStyle = body; g.fillRect(x, H - h, w, h);
      g.fillStyle = `rgba(255,228,190,${lit})`; g.fillRect(x, H - h, Math.max(4, w * 0.22), h);
      if (L === 2) for (let wy = H - h + 16; wy < H - 10; wy += 24) for (let wx = x + w * 0.3; wx < x + w - 12; wx += 18)
        if (hash(wx | 0, wy) < 0.5) { g.fillStyle = 'rgba(120,110,100,0.18)'; g.fillRect(wx, wy, 9, 12); }
      x += w + hash(n, L * 7 + 2) * 12; n++;
    }
    g.fillStyle = 'rgba(253,232,200,0.28)'; g.fillRect(0, 0, W, H); // atmospheric haze between layers
  });
  return tex(c, { srgb: true, repeat: false });
}

// ---------- technical drawing sheets ----------
function sheetFrame(g, w, h, ink, paper) {
  g.fillStyle = paper; g.fillRect(0, 0, w, h);
  g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
  g.lineWidth = 1.2; g.strokeRect(26, 26, w - 52, h - 52);
  const tw = w * 0.36, th = h * 0.12;   // title block, bottom right
  g.strokeRect(w - 26 - tw, h - 26 - th, tw, th);
  g.beginPath(); g.moveTo(w - 26 - tw, h - 26 - th / 2); g.lineTo(w - 26, h - 26 - th / 2);
  g.moveTo(w - 26 - tw * 0.35, h - 26 - th); g.lineTo(w - 26 - tw * 0.35, h - 26); g.stroke();
  g.fillStyle = ink;
  for (let i = 0; i < 3; i++) g.fillRect(w - 20 - tw + 8, h - 26 - th + 10 + i * 9, tw * 0.4 - i * 12, 3);
}
function dimLine(g, x1, y1, x2, y2, off) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = (-dy / L) * off, ny = (dx / L) * off;
  g.beginPath();
  g.moveTo(x1, y1); g.lineTo(x1 + nx * 1.2, y1 + ny * 1.2); g.moveTo(x2, y2); g.lineTo(x2 + nx * 1.2, y2 + ny * 1.2);
  g.moveTo(x1 + nx, y1 + ny); g.lineTo(x2 + nx, y2 + ny); g.stroke();
  for (const [x, y] of [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny]]) { g.beginPath(); g.moveTo(x - 5, y + 5); g.lineTo(x + 5, y - 5); g.stroke(); }
}

/**
 * Technical drawing sheet. kind: 'plan' | 'detail' | 'elevation' | 'blueprint'.
 * Paper sheets are graphite on white; 'blueprint' is white line on Prussian blue.
 */
export function drawingTexture(kind, w = 700, h = 500) {
  const c = canvas(w, h), g = c.getContext('2d');
  const blue = kind === 'blueprint';
  const ink = blue ? 'rgba(232,240,250,0.92)' : '#2a2d33';
  sheetFrame(g, w, h, ink, blue ? '#1f3f66' : '#f3f1ec');
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
  if (kind === 'plan' || blue) {
    // floor plan: thick cut walls, door swings, dimension strings, grid bubbles
    const ox = 70, oy = 80;
    g.lineWidth = 9;
    g.strokeRect(ox, oy, 360, 250);
    g.beginPath(); g.moveTo(ox + 200, oy); g.lineTo(ox + 200, oy + 150); g.moveTo(ox, oy + 150); g.lineTo(ox + 120, oy + 150); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(ox + 120, oy + 150, 50, 0, Math.PI / 2); g.stroke();
    g.beginPath(); g.arc(ox + 200, oy + 150, 44, Math.PI / 2, Math.PI); g.stroke();
    g.lineWidth = 1;
    dimLine(g, ox, oy + 250, ox + 360, oy + 250, 26);
    dimLine(g, ox + 360, oy, ox + 360, oy + 250, -26);
    for (let i = 0; i < 4; i++) {
      const x = ox + i * 120; g.beginPath(); g.arc(x, oy - 34, 10, 0, 7); g.stroke();
      g.setLineDash([6, 4]); g.beginPath(); g.moveTo(x, oy - 24); g.lineTo(x, oy + 260); g.stroke(); g.setLineDash([]);
    }
    g.strokeRect(ox + 230, oy + 20, 110, 50); g.strokeRect(ox + 20, oy + 180, 70, 50);
    if (blue) {
      g.beginPath(); g.arc(ox + 500, oy + 120, 70, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(ox + 500, oy + 40); g.lineTo(ox + 500, oy + 200); g.moveTo(ox + 420, oy + 120); g.lineTo(ox + 580, oy + 120); g.stroke();
      g.font = 'bold 22px sans-serif'; g.fillText('N', ox + 493, oy + 30);
    }
  } else if (kind === 'detail') {
    // machined flange: centre lines, bolt circle, hatched section
    const cx = w * 0.33, cy = h * 0.45;
    g.lineWidth = 2.4; g.beginPath(); g.arc(cx, cy, 120, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, 46, 0, 7); g.stroke();
    g.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; g.beginPath(); g.arc(cx + Math.cos(a) * 84, cy + Math.sin(a) * 84, 11, 0, 7); g.stroke(); }
    g.lineWidth = 0.8; g.setLineDash([18, 4, 3, 4]);
    g.beginPath(); g.moveTo(cx - 150, cy); g.lineTo(cx + 150, cy); g.moveTo(cx, cy - 150); g.lineTo(cx, cy + 150); g.stroke();
    g.beginPath(); g.arc(cx, cy, 84, 0, 7); g.stroke(); g.setLineDash([]);
    const sx = w * 0.62, sw = 150, sh = 240, sy = cy - sh / 2;
    g.lineWidth = 2.2; g.strokeRect(sx, sy, 30, sh); g.strokeRect(sx + 30, sy + 74, sw - 30, sh - 148);
    g.save(); g.beginPath(); g.rect(sx, sy, 30, sh); g.rect(sx + 30, sy + 74, sw - 30, sh - 148); g.clip();
    g.lineWidth = 0.8; for (let k = -300; k < 300; k += 9) { g.beginPath(); g.moveTo(sx + k, sy); g.lineTo(sx + k + 260, sy + 260); g.stroke(); }
    g.restore(); g.lineWidth = 1; dimLine(g, sx, sy + sh, sx + sw, sy + sh, 24);
  } else {
    // building elevation: storeys, window rhythm, ground line, level markers
    const gx = 60, gy = h * 0.78;
    g.lineWidth = 3; g.beginPath(); g.moveTo(30, gy); g.lineTo(w - 30, gy); g.stroke();
    g.lineWidth = 1.6; g.strokeRect(gx + 20, gy - 300, 380, 300);
    for (let f = 0; f < 4; f++) for (let b = 0; b < 6; b++) g.strokeRect(gx + 40 + b * 60, gy - 280 + f * 72, 38, 50);
    g.lineWidth = 0.8;
    for (let f = 0; f <= 4; f++) {
      const y = gy - f * 72 - (f ? 8 : 0);
      g.setLineDash([10, 5]); g.beginPath(); g.moveTo(gx + 420, y); g.lineTo(gx + 470, y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.moveTo(gx + 470, y); g.lineTo(gx + 480, y - 10); g.lineTo(gx + 490, y); g.closePath(); g.stroke();
    }
  }
  return tex(c, { srgb: true, repeat: false });
}

/** Book spine textures in a restrained studio palette. */
export const SPINE_COLORS = [0x2b2f36, 0x3d4a5c, 0xd9d3c7, 0x8a8174, 0x23466e, 0x5c5248, 0xb9b0a2, 0x1d1f22, 0x6e7b72, 0xa3402c];
export function spineTextures() {
  return SPINE_COLORS.map((col, i) => {
    const c = canvas(64, 256), g = c.getContext('2d');
    g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(0,0,0,${hash(i, y) * 0.07})`; g.fillRect(0, y, 64, 1); }
    g.fillStyle = col >> 16 > 0xa0 ? '#2b2f36' : i % 3 ? '#e8e2d6' : '#c9a75d';
    g.fillRect(0, 20, 64, 2); g.fillRect(0, 234, 64, 2);
    g.fillRect(16, 70 + (i % 3) * 22, 32, 4); g.fillRect(22, 82 + (i % 3) * 22, 20, 2);
    return tex(c, { srgb: true, repeat: false });
  });
}

/** Soft radial contact shadow that grounds the cut-away model on the paper. */
export function groundShadow() {
  const S = 256, c = canvas(S, S), g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(60,52,40,0.35)'); r.addColorStop(1, 'rgba(60,52,40,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  return tex(c, { srgb: true, repeat: false });
}

/** A dimension figure ("5 200") drawn for laying flat on the paper beside the model. */
export function dimLabel(text) {
  const c = canvas(256, 64), g = c.getContext('2d');
  g.fillStyle = '#23262b'; g.font = '600 40px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  return tex(c, { srgb: true, repeat: false });
}
