# 3D Studio Portfolio

A portfolio you can walk into: a sunlit drafting studio rendered in real time with [three.js](https://threejs.org), shown as an architectural cut-away on drawing paper. Drag to orbit, scroll to zoom, right-drag to pan. Click the laptop (or any sheet in the title block) to sit down and read the portfolio, which is laid out as a drawing set.

```bash
npm install
npm run dev     # local dev server
npm run build   # static build in dist/
npm run preview # serve the built dist/ locally
```

- Edit `src/content.js` to change the name, role, projects, skills and contact links. Set `draft: false` once the copy is real; while it is `true` the sheets carry a red PRELIMINARY stamp.
- Every sheet is deep-linkable: `#cover`, `#about`, `#projects`, `#skills`, `#contact`.
- On screens narrower than 760px the drawing set opens flat and full-screen instead of on the 3D laptop.
- Add `?low` to the URL to drop ambient occlusion and halve the volumetric samples (automatic on touch devices). `?nointro` skips the opening camera move. The intro and the camera glide are skipped when the OS asks for reduced motion.
- Credits for the models and the font: see `CREDITS.md`.

## How it looks realistic
- Low, warm late-afternoon sun through a steel-framed window. The window bars cast their shadow grid across the desk and rug, and the sun is stopped by a shadow-only ceiling, so the cut-away still lights like a closed room.
- Ray-marched sun shafts. Each sample checks the sun ray back through an open pane of the window, so the beams carry the window grid.
- A cool skylight area light, a warm floor-bounce area light and a drafting lamp.
- Once the props have loaded, the room is baked into its own reflection probe for image-based lighting.
- Shadow maps are static and baked once.
- GTAO ambient occlusion, restrained bloom, AgX tone mapping and SMAA.
- Procedural textures, with nothing to download: polished concrete, limewash plaster, birch-ply cladding, jute, technical drawings and a hazy late-day city view.
- CC0 / CC-BY glTF props, with the chair switched to its Peacock Velvet material variant.
