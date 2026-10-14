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

/** Woven wool rug: colour map with border + a tiling weave bump. */
export function rugTextures() {
  const W = 1024, H = 720;
  const c = canvas(W, H), ctx = c.getContext('2d');
  const im = ctx.createImageData(W, H);
  const cream = hex(0xa89678), teal = hex(0x3f5f5f), rust = hex(0xb4623c);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = Math.min(x, W - 1 - x), dy = Math.min(y, H - 1 - y), d = Math.min(dx, dy);
    let base = cream;
    if (d < 34) base = teal;
    else if (d >= 48 && d < 56) base = rust;
    else if (d >= 70 && d < 74) base = teal;
    const diamond = (Math.abs(((x + y) % 64) - 32) + Math.abs(((x - y + 4096) % 64) - 32)) < 14 && d > 90;
    if (diamond) base = hex(0xcdbfa6);
    const n = 0.88 + 0.2 * fbm(x / 6, y / 6, 3) + 0.08 * (hash(x, y) - 0.5);
    const i = (y * W + x) * 4;
    im.data[i] = base[0] * n; im.data[i + 1] = base[1] * n; im.data[i + 2] = base[2] * n; im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);

  const S = 128, b = canvas(S, S), bctx = b.getContext('2d'), bi = bctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const warp = 0.5 + 0.5 * Math.sin(x / S * Math.PI * 2 * 16);
    const weft = 0.5 + 0.5 * Math.sin(y / S * Math.PI * 2 * 16);
    const v = ((x / 4 | 0) + (y / 4 | 0)) % 2 ? warp : weft;
    const i = (y * S + x) * 4;
    bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = (0.4 + 0.5 * v + 0.1 * hash(x, y)) * 255; bi.data[i + 3] = 255;
  }
  bctx.putImageData(bi, 0, 0);
  return { map: tex(c, { srgb: true, repeat: false }), bumpMap: tex(b) };
}

/**
 * Night sky + city skyline painted as a panorama. Sampled by view direction (see room.js) so it behaves
 * like something infinitely far away: it parallaxes correctly from any angle and only exists inside the window.
 * Vertical axis: v = (elevation + 0.5) / 1.1 (radians); horizontal: u = 0.5 + azimuth / 1.6.
 */
export function nightSky() {
  const W = 2048, H = 1024, c = canvas(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#04060f'); grad.addColorStop(0.45, '#10193a'); grad.addColorStop(0.65, '#2b2a55'); grad.addColorStop(0.8, '#5a4467'); grad.addColorStop(1, '#8a5a60');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * W, y = Math.random() * H * 0.5, r = Math.random() * 1.5 + 0.4;
    g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // moon + halo
  const mx = W * 0.36, my = H * 0.46;
  const halo = g.createRadialGradient(mx, my, 10, mx, my, 240);
  halo.addColorStop(0, 'rgba(200,215,255,0.6)'); halo.addColorStop(1, 'rgba(200,215,255,0)');
  g.fillStyle = halo; g.fillRect(mx - 260, my - 260, 520, 520);
  g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(mx, my, 50, 0, 7); g.fill();
  g.fillStyle = 'rgba(150,165,200,0.35)';
  for (const [dx, dy, r] of [[-14, -8, 11], [11, 15, 9], [15, -15, 7]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, 7); g.fill(); }
  // skyline (two layers; chunky lit windows so they read at window scale)
  for (let layer = 0; layer < 2; layer++) {
    const body = layer ? '#0e1024' : '#1f2142';
    let x = -20;
    while (x < W) {
      const w = 80 + Math.random() * 140, h = (layer ? 190 : 250) + Math.random() * (layer ? 160 : 170);
      g.fillStyle = body; g.fillRect(x, H - h, w, h);
      for (let wy = H - h + 18; wy < H - 14; wy += 32) for (let wx = x + 12; wx < x + w - 20; wx += 26)
        if (Math.random() < (layer ? 0.38 : 0.2)) { g.fillStyle = Math.random() < 0.75 ? '#ffd88a' : '#a5d4ff'; g.fillRect(wx, wy, 11, 15); }
      x += w + Math.random() * 16;
    }
  }
  return tex(c, { srgb: true, repeat: false });
}

/** Abstract poster art for picture frames. */
export function posterTexture(kind, w = 512, h = 700) {
  const c = canvas(w, h), g = c.getContext('2d');
  if (kind === 0) {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#f1d9b5'); bg.addColorStop(1, '#e9b48f');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9653b'; g.beginPath(); g.arc(w / 2, h * 0.38, w * 0.22, 0, 7); g.fill();
    for (const [col, y, a] of [['#7a8f6a', 0.62, 0.1], ['#4f6b5b', 0.72, 0.14], ['#2c4a45', 0.84, 0.18]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * y - Math.abs(Math.sin(x / 90 + y * 9)) * h * a);
      g.lineTo(w, h); g.fill();
    }
  } else if (kind === 1) {
    g.fillStyle = '#e8e1d4'; g.fillRect(0, 0, w, h);
    const cols = ['#2f4858', '#33658a', '#f6ae2d', '#f26419', '#86bbd8'];
    for (let i = 0; i < 7; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.9;
      g.beginPath(); g.arc(80 + (i * 83) % (w - 120), 120 + ((i * 131) % (h - 240)), 40 + (i * 23) % 70, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
  } else {
    g.fillStyle = '#16213a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); for (let x = 0; x <= w; x += 6) g.lineTo(x, h * (0.25 + i * 0.07) + Math.sin(x / 40 + i) * 22); g.stroke(); }
    g.fillStyle = '#f4c95d'; g.beginPath(); g.arc(w * 0.7, h * 0.18, 34, 0, 7); g.fill();
  }
  return tex(c, { srgb: true, repeat: false });
}

/** Book spine textures. */
export function spineTextures(n = 10) {
  const out = [];
  const palette = [0x8c2f39, 0x1f4e5f, 0xd1a054, 0x2f3e46, 0x6b705c, 0xb5838d, 0x3a506b, 0xe07a5f, 0x264653, 0xa68a64];
  for (let i = 0; i < n; i++) {
    const c = canvas(64, 256), g = c.getContext('2d');
    const base = '#' + palette[i % palette.length].toString(16).padStart(6, '0');
    g.fillStyle = base; g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(0,0,0,${hash(i, y) * 0.07})`; g.fillRect(0, y, 64, 1); }
    g.fillStyle = i % 2 ? '#f1e7d0' : '#d9c28a';
    g.fillRect(0, 22, 64, 4); g.fillRect(0, 232, 64, 4);
    g.fillRect(14, 70 + (i % 3) * 20, 36, 5); g.fillRect(20, 84 + (i % 3) * 20, 24, 3);
    out.push(tex(c, { srgb: true, repeat: false }));
  }
  return out;
}
