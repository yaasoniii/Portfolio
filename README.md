# 3D Room Portfolio

A realistic, interactive 3D room built with [three.js](https://threejs.org). Click the laptop to sit down and scroll through the desktop on its screen.

```bash
npm install
npm run dev     # local dev server
npm run build   # static build in dist/
```

- Edit `src/content.js` to change the text/projects shown on the laptop.
- Add `?low` to the URL to disable ambient occlusion on slower GPUs (it's auto-enabled on touch devices).
- Model credits: see `CREDITS.md`.

## How it looks realistic
PBR materials, image-based lighting, a moonlight directional light shining through a real window opening (so window-shaped light/shadow falls into the room), a warm shadow-casting desk lamp, a screen-spill area light, GTAO ambient occlusion, subtle bloom, AgX tone mapping, procedural wood/rug/plaster textures, and CC0/CC-BY glTF props.
