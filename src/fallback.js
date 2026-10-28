import { content } from './content.js';
import { mountDesktop, SHEETS } from './desktop.js';
import { mountChrome } from './chrome.js';

// The portfolio without the 3D studio: the same drawing set, flat and full-screen.
const chrome = mountChrome(content);
document.body.classList.add('no-webgl');
document.getElementById('gl').hidden = true;

const host = document.getElementById('sheet-flat');
const set = mountDesktop(content, { onSheet: (id) => history.replaceState(null, '', '#' + id) });
host.append(set.root);
set.setActive(true);
set.setDrawn(true);
host.classList.add('show');
host.setAttribute('aria-hidden', 'false');

const route = (smooth) => {
  const id = location.hash.slice(1);
  if (SHEETS.includes(id)) set.goTo(id, smooth);
};
addEventListener('hashchange', () => route(true));
requestAnimationFrame(() => route(false));

await document.fonts.ready;
await chrome.progress(1);
