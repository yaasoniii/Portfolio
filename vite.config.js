import { content } from './src/content.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// Bake the name and role from content.js into the page title and share tags at build time,
// so link previews and search results don't just say "Portfolio".
const contentMeta = {
  name: 'content-meta',
  transformIndexHtml: (html) =>
    html.replaceAll('%PORTFOLIO_TITLE%', esc(`${content.name} · ${content.role}`)),
};

export default { base: './', plugins: [contentMeta] };
