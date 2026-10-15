---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: 3D studio portfolio (index.html)

Mode: Experience. Audience: recruiters and hiring managers, often on phones, deciding fast. Job: be convinced of craft, reach projects and contact in one step.
Constraints: vanilla three.js + Vite, small payload (procedural over downloads), phones must run it. Content placeholders stay until the owner supplies real copy.

## Direction contract

THESIS: A photoreal engineer's drafting studio in late daylight, and the work is issued as a drawing set. Refuses the category default: the lo-fi night bedroom with fairy lights and a purple-gradient laptop.

OWN-WORLD: Drawing paper (#eeece6) as the page ground; graphite (#23262b) for section-cut wall tops, linework and type; Prussian blue (#23466e) as the single ink accent; redline (#c8432b) only for revision marks and the active sheet. Materials: polished concrete, birch ply, limewash plaster, black powder-coat steel, vellum. Type: Archivo across widths, expanded heavy for titles, condensed caps for labels, tabular figures for sheet data. Components are drawing-set parts: title block, sheet index, detail callout bubbles, revision table, dimension lines.

STORY: The visitor sees a real, sunlit studio, understands this person builds things carefully, and sits at the laptop (or jumps straight there from the title block) to read the drawing set: cover, about, projects, skills, contact.

FIRST VIEWPORT: Full-bleed WebGL studio cut away like an architectural section on a paper ground: low sun shafts across concrete onto the drafting desk, laptop the sharpest point. Bottom-right: an HTML title block with name, role, sheet A-001, and the sheet index as the primary actions (Sit down / Projects / Contact). No pill hint.

FORM: Drafting Studio, grounded list position 7, seed key 0cafe697. Raises: real loading progress to 100 (from shader portal); the sheet index always marks the current sheet (from step row); every sheet deep-linkable by hash (from orizuru).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the camera arcs down to the laptop and the sheet's border and title block draw on as it lands; reduced motion cuts instead.
