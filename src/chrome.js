import { isoDate } from './desktop.js';

// The HTML laid over the canvas: loader, title block, the "sit down" callout and the way back.
export function mountChrome(c) {
  const $ = (id) => document.getElementById(id);
  document.title = `${c.name} · ${c.role}`;
  $('tb-name').textContent = c.name;
  $('tb-role').textContent = c.role;
  $('tb-date').textContent = isoDate();

  // --- loader: counts real progress to 100, then lifts ---
  const loader = $('loader'), pct = $('pct'), bar = $('pct-bar');
  let shown = 0, target = 0, raf = 0, resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  const tick = () => {
    shown = Math.min(target, shown + Math.max(0.004, (target - shown) * 0.14));
    pct.textContent = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown})`;
    if (shown >= 1) {
      loader.classList.add('done');
      setTimeout(resolveDone, 350);
      return;
    }
    raf = shown < target ? requestAnimationFrame(tick) : 0;
  };
  const progress = (p) => {
    target = Math.max(target, p);
    if (!raf) raf = requestAnimationFrame(tick);
    return p >= 1 ? done : Promise.resolve();
  };

  // --- "sit down" callout pinned to the laptop ---
  const callout = $('callout');
  let sit = () => {};
  callout.addEventListener('click', () => sit());
  const placeCallout = (x, y, visible) => {
    callout.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    callout.classList.toggle('show', visible);
    callout.classList.toggle('flip', x > innerWidth - 230);
    callout.tabIndex = visible ? 0 : -1;
  };

  // move focus for keyboard users only; after a tap or click a focus ring would just be noise
  let keyboard = false;
  addEventListener('keydown', () => { keyboard = true; }, true);
  addEventListener('pointerdown', () => { keyboard = false; }, true);

  const back = $('back');
  let goBack = () => {};
  back.addEventListener('click', () => goBack());

  return {
    progress,
    placeCallout,
    onSit: (fn) => { sit = fn; },
    onBack: (fn) => { goBack = fn; },
    introDone: () => document.body.classList.add('ready'),
    dismissHelp: () => document.body.classList.add('orbited'),
    setZoomed: (z) => {
      back.hidden = !z;
      if (z && keyboard) requestAnimationFrame(() => back.focus({ preventScroll: true }));
    },
  };
}
