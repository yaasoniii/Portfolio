// three.js needs WebGL 2. Without it the studio can't render, so open the drawing set flat
// instead of leaving the visitor on a loader that never finishes.
const webgl2 = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
})();

if (webgl2) import('./main.js');
else import('./fallback.js');
