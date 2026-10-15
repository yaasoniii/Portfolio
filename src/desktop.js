import * as THREE from 'three';

// The portfolio, issued as a drawing set: one sheet per section, a title block that navigates.
export const SHEETS = ['cover', 'about', 'projects', 'skills', 'contact'];
const META = { cover: ['A-001', 'Cover'], about: ['A-101', 'About'], projects: ['A-201', 'Projects'], skills: ['A-301', 'Skills'], contact: ['A-401', 'Contact'] };

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const ARROW = '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
export const isoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Key plan of the studio (1 m = 100 units), with the desk marked as where you are. */
const KEY_PLAN = `
<svg class="plan" viewBox="-40 -40 600 560" role="img" aria-label="Key plan of the studio, with the desk marked as your position">
  <g class="plan-open"><path d="M520 0V460H0"/></g>
  <path class="plan-wall" d="M-12 -12H190M400 -12H532M-12 -12V472"/>
  <path class="plan-glass" d="M190 -16H400M190 -8H400"/>
  <rect class="plan-item" x="205" y="8" width="180" height="80"/>
  <rect class="plan-item" x="2" y="110" width="32" height="150"/>
  <rect class="plan-item" x="407" y="2" width="96" height="72"/>
  <rect class="plan-rug" x="185" y="60" width="220" height="155"/>
  <circle class="plan-item" cx="480" cy="125" r="24"/>
  <circle class="plan-item" cx="130" cy="320" r="24"/>
  <circle class="plan-here-ring" cx="292" cy="112" r="30"/>
  <circle class="plan-here" cx="292" cy="112" r="7"/>
  <path class="plan-dim" d="M0 500H520M0 492V508M520 492V508"/>
  <text class="plan-label" x="260" y="494" text-anchor="middle">5 200</text>
  <path class="plan-sun" d="M60 -30 112 22M112 22l-14 -2M112 22l-2 -14"/>
</svg>`;

function markup(c) {
  const projects = c.projects.map((p, i) => {
    const open = p.link ? `<a class="detail-link" href="${esc(p.link)}" target="_blank" rel="noopener">` : '<div class="detail-link is-pending">';
    const close = p.link ? '</a>' : '</div>';
    return `<li class="detail">${open}
      <span class="bubble" aria-hidden="true"><b>${i + 1}</b><i>A-201</i></span>
      <span class="detail-body"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><span class="spec">${p.tags.map(esc).join(' / ')}</span></span>
      <span class="go">${p.link ? `Open${ARROW}` : 'Link to come'}</span>${close}</li>`;
  }).join('');
  const skills = c.skills.map((s) => `<tr><th scope="row">${esc(s.area)}</th><td>${esc(s.items)}</td></tr>`).join('');
  const contact = c.contact.map((r) => `<li><span class="k">${esc(r.label)}</span><a href="${esc(r.href)}" target="_blank" rel="noopener">${esc(r.value)}${ARROW}</a></li>`).join('');
  const head = (id) => `<header class="sheet-head"><h2>${META[id][1]}</h2><span class="sheet-no">${META[id][0]}</span></header>`;
  return `
  <div class="frame" aria-hidden="true"><i class="ft"></i><i class="fr"></i><i class="fb"></i><i class="fl"></i></div>
  <div class="zones-x" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
  <div class="zones-y" aria-hidden="true"><span>A</span><span>B</span><span>C</span></div>
  <div class="scroller" tabindex="0" aria-label="Portfolio sheets">
    <section class="sheet cover" data-id="cover">
      ${c.draft ? '<p class="cover-stamp"><b>Preliminary</b><span>Placeholder copy, not for issue</span></p>' : ''}
      <h1>${esc(c.name)}</h1>
      <p class="role">${esc(c.role)}</p>
      <p class="lede">${esc(c.tagline)}</p>
      <figure class="keyplan">${KEY_PLAN}<figcaption>Key plan: the studio you are sitting in</figcaption></figure>
      <button class="next" data-go="about">Read the set${ARROW}</button>
    </section>
    <section class="sheet" data-id="about">${head('about')}<div class="prose">${c.about.map((p) => `<p>${esc(p)}</p>`).join('')}</div></section>
    <section class="sheet" data-id="projects">${head('projects')}<ol class="details">${projects}</ol></section>
    <section class="sheet" data-id="skills">${head('skills')}
      <table class="schedule"><thead><tr><th scope="col">Area</th><th scope="col">Tools</th></tr></thead><tbody>${skills}</tbody></table></section>
    <section class="sheet" data-id="contact">${head('contact')}<ul class="contact">${contact}</ul></section>
  </div>
  <aside class="tb">
    <div class="tb-name"><b>${esc(c.name)}</b><span>${esc(c.role)}</span></div>
    <nav class="tb-sheets" aria-label="Sheets">${SHEETS.map((id) => `<button data-go="${id}"><span class="no">${META[id][0]}</span><span class="tt">${META[id][1]}</span></button>`).join('')}</nav>
    ${c.draft ? '<p class="tb-stamp"><b>Preliminary</b><span>Placeholder copy, not for issue</span></p>' : ''}
    <table class="tb-rev"><caption>Revisions</caption>
      <thead><tr><th scope="col">Rev</th><th scope="col">Date</th><th scope="col">Description</th></tr></thead>
      <tbody><tr><td>01</td><td class="d-date"></td><td>${c.draft ? 'Issued for review' : 'Issued'}</td></tr></tbody></table>
    <dl class="tb-data">
      <div><dt>Drawn by</dt><dd>${esc(c.name)}</dd></div>
      <div><dt>Scale</dt><dd>NTS</dd></div>
      <div><dt>Local time</dt><dd class="d-time"></dd></div>
    </dl>
  </aside>`;
}

/** Builds one drawing-set instance. Used twice: on the laptop screen (CSS3D) and flat for small screens. */
export function mountDesktop(c, { onSheet } = {}) {
  const root = document.createElement('div');
  root.className = 'os';
  root.innerHTML = markup(c);
  root.inert = true;
  const scroller = root.querySelector('.scroller');
  const sections = SHEETS.map((id) => root.querySelector(`.sheet[data-id="${id}"]`));
  const buttons = [...root.querySelectorAll('.tb-sheets [data-go]')];
  let current = 'cover';

  const goTo = (id, smooth = true) => {
    const s = sections[SHEETS.indexOf(id)];
    if (!s) return;
    const pad = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
    scroller.scrollTo({ top: Math.max(0, s.offsetTop - pad + 8), behavior: smooth ? 'smooth' : 'instant' });
    mark(id);
  };
  const mark = (id) => {
    if (id === current) return;
    current = id;
    root.dataset.sheet = id;
    buttons.forEach((b) => b.toggleAttribute('aria-current', b.dataset.go === id));
    onSheet?.(id);
  };
  buttons[0].setAttribute('aria-current', 'true');
  root.dataset.sheet = current;
  root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => goTo(b.dataset.go)));
  scroller.addEventListener('scroll', () => {
    const y = scroller.scrollTop + scroller.clientHeight * 0.35;
    let id = SHEETS[0];
    sections.forEach((s, i) => { if (s.offsetTop <= y) id = SHEETS[i]; });
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) id = SHEETS[SHEETS.length - 1];
    mark(id);
  }, { passive: true });

  root.querySelector('.d-date').textContent = isoDate();
  const time = root.querySelector('.d-time');
  const tick = () => (time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  tick();
  setInterval(tick, 15000);

  return {
    root,
    goTo,
    current: () => current,
    setActive: (on) => { root.inert = !on; },
    setDrawn: (on) => root.classList.toggle('drawn', on),
  };
}

/** The cover sheet painted to a texture: what the screen shows from across the room. */
export async function screenTexture(c) {
  await Promise.all([document.fonts.load('800 72px Archivo'), document.fonts.load('500 20px Archivo')]).catch(() => {});
  const W = 1024, H = 640, cv = document.createElement('canvas');
  cv.width = W * 2; cv.height = H * 2;
  const g = cv.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#eeece6'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#23262b'; g.lineWidth = 2; g.strokeRect(14, 14, W - 28, H - 28);
  g.lineWidth = 1; g.strokeRect(20, 20, W - 40, H - 40);
  const tbx = W - 20 - 232;
  g.beginPath(); g.moveTo(tbx, 20); g.lineTo(tbx, H - 20); g.stroke();
  for (const y of [120, 330, 520]) { g.beginPath(); g.moveTo(tbx, y); g.lineTo(W - 20, y); g.stroke(); }
  g.fillStyle = '#23262b';
  g.fontStretch = 'expanded';
  g.font = '800 70px Archivo, sans-serif';
  g.fillText(c.name, 60, 250, tbx - 100);
  g.fontStretch = 'normal';
  g.font = '500 24px Archivo, sans-serif'; g.fillStyle = '#23466e';
  g.fillText(c.role, 62, 292);
  g.fillStyle = '#4a4e55'; g.font = '400 17px Archivo, sans-serif';
  g.fillText(c.tagline, 62, 336, tbx - 110);
  g.fillStyle = '#23262b'; g.font = '700 15px Archivo, sans-serif'; g.fillText(c.name, tbx + 18, 64, 200);
  g.font = '400 13px Archivo, sans-serif'; g.fillText(c.role, tbx + 18, 86, 200);
  SHEETS.forEach((id, i) => {
    g.fillStyle = i === 0 ? '#c8432b' : '#6b6f76'; g.font = '600 12px Archivo, sans-serif'; g.fillText(META[id][0], tbx + 18, 160 + i * 34);
    g.fillStyle = '#23262b'; g.font = '500 14px Archivo, sans-serif'; g.fillText(META[id][1], tbx + 84, 160 + i * 34);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Browsers hit-test heavily scaled CSS3D content unreliably, so while zoomed we
// forward wheel / drag / click events to the screen ourselves.
export function attachInput(root, isActive) {
  const scroller = root.querySelector('.scroller');
  const clickable = () => [...root.querySelectorAll('[data-go], a.detail-link, .contact a')];
  const hit = (x, y) =>
    clickable().find((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  const inside = (x, y) => {
    const r = root.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  let hovered = null;
  const hover = (el) => {
    if (el === hovered) return;
    hovered?.classList.remove('is-hover');
    el?.classList.add('is-hover');
    hovered = el;
  };

  addEventListener('wheel', (e) => {
    if (!isActive() || !inside(e.clientX, e.clientY)) return;
    scroller.scrollBy({ top: e.deltaY, behavior: 'instant' });
  }, { passive: true });

  let drag = null;
  addEventListener('pointerdown', (e) => {
    if (isActive() && inside(e.clientX, e.clientY)) drag = { y: e.clientY, moved: 0 };
  });
  addEventListener('pointermove', (e) => {
    if (isActive()) {
      const el = inside(e.clientX, e.clientY) ? hit(e.clientX, e.clientY) : null;
      hover(el);
      document.body.style.cursor = el ? 'pointer' : '';
    }
    if (!drag) return;
    const dy = e.clientY - drag.y;
    drag.y = e.clientY;
    drag.moved += Math.abs(dy);
    scroller.scrollBy({ top: -dy, behavior: 'instant' });
  });
  addEventListener('pointerup', (e) => {
    const wasDrag = drag && drag.moved > 6;
    drag = null;
    if (!isActive() || wasDrag) return;
    const el = hit(e.clientX, e.clientY);
    if (el) el.click();
  });
}
