import { content } from './content.js';

// Builds the HTML "operating system" shown on the laptop screen.
export function mountDesktop() {
  const root = document.getElementById('desktop-template').content.firstElementChild.cloneNode(true);
  const $ = (id) => root.querySelector('#' + id);

  $('os-title').textContent = content.name;
  $('c-name').textContent = content.name;
  $('c-role').textContent = content.role;
  $('c-tagline').textContent = content.tagline;
  $('c-about').innerHTML = content.about.map((p) => `<p>${p}</p>`).join('');
  $('c-projects').innerHTML = content.projects
    .map((p) => `<a class="card" href="${p.link}" target="_blank" rel="noopener"><h3>${p.title}</h3><p>${p.desc}</p>${p.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</a>`)
    .join('');
  $('c-skills').innerHTML = content.skills.map((s) => `<div>${s}</div>`).join('');
  $('c-contact').innerHTML = content.contact
    .map((c) => `<div class="row"><span>${c.label}</span><a href="${c.href}" target="_blank" rel="noopener">${c.value}</a></div>`)
    .join('');
  $('year').textContent = new Date().getFullYear();

  const scroller = $('scroller');
  root.querySelectorAll('.dock button').forEach((b) =>
    b.addEventListener('click', () => {
      const target = root.querySelector('#' + b.dataset.go);
      scroller.scrollTo({ top: target.offsetTop - 10, behavior: 'smooth' });
    })
  );

  const clock = $('clock');
  const tick = () => (clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  tick();
  setInterval(tick, 15000);
  return root;
}

// Browsers hit-test heavily scaled CSS3D content unreliably, so while zoomed we
// forward wheel / drag / click events to the desktop ourselves.
export function attachInput(root, isActive) {
  const scroller = root.querySelector('#scroller');
  const clickable = () => [...root.querySelectorAll('.dock button, a.card, .row a')];
  const hit = (x, y) =>
    clickable().find((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  const inside = (x, y) => {
    const r = root.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  addEventListener('wheel', (e) => {
    if (!isActive() || !inside(e.clientX, e.clientY)) return;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop += e.deltaY;
    scroller.style.scrollBehavior = '';
  }, { passive: true });

  let drag = null;
  addEventListener('pointerdown', (e) => {
    if (isActive() && inside(e.clientX, e.clientY)) drag = { y: e.clientY, moved: 0 };
  });
  addEventListener('pointermove', (e) => {
    if (isActive()) document.body.style.cursor = inside(e.clientX, e.clientY) && hit(e.clientX, e.clientY) ? 'pointer' : '';
    if (!drag) return;
    const dy = e.clientY - drag.y;
    drag.y = e.clientY;
    drag.moved += Math.abs(dy);
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop -= dy;
    scroller.style.scrollBehavior = '';
  });
  addEventListener('pointerup', (e) => {
    const wasDrag = drag && drag.moved > 6;
    drag = null;
    if (!isActive() || wasDrag) return;
    const el = hit(e.clientX, e.clientY);
    if (el) el.click();
  });
}
