---
name: Portfolio
description: A sunlit drafting studio in real-time 3D; the work is issued as a drawing set.
colors:
  page-ground: "#e4e1db"
  sheet-paper: "#eeece6"
  graphite: "#23262b"
  graphite-soft: "#464a51"
  graphite-faint: "#6a6e75"
  rule: "rgba(35, 38, 43, 0.16)"
  prussian-blue: "#23466e"
  redline: "#c8432b"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "76px"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontVariation: "\"wdth\" 125"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 125"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontVariation: "\"wdth\" 112"
  body-lead:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontVariation: "\"wdth\" 75"
  sheet-number:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
    fontFeature: "\"tnum\" 1"
    fontVariation: "\"wdth\" 75"
rounded:
  none: "0px"
  key: "3px"
  bubble: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "18px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
components:
  button-outline:
    backgroundColor: "{colors.sheet-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-outline-hover:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.sheet-paper}"
  title-block:
    backgroundColor: "{colors.sheet-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.none}"
    width: "340px"
  title-block-index-row:
    textColor: "{colors.graphite}"
    typography: "{typography.title}"
    padding: "12px 18px"
  title-block-index-row-hover:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.sheet-paper}"
  sheet-index-item:
    textColor: "{colors.graphite}"
    padding: "9px 18px"
  sheet-index-item-current:
    textColor: "{colors.redline}"
  detail-bubble:
    backgroundColor: "{colors.sheet-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.bubble}"
    size: "52px"
  preliminary-stamp:
    textColor: "{colors.redline}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
---

# Design System: Portfolio

## Overview

**Creative North Star: "The Issued Drawing Set"**

The site is an engineer's drafting studio in late daylight, cut away like an architectural section and set on a sheet of paper. Every piece of interface is a part of a drawing set: a title block, a sheet index, a detail callout bubble, a revision table, a dimension string. Nothing floats as generic "UI"; it is drawn, ruled and numbered. The portfolio content is issued as sheets (A-001 Cover, A-101 About, A-201 Projects, A-301 Skills, A-401 Contact), and the studio overview itself is sheet A-000 Studio.

The 3D world and the HTML share one material logic. The scene is a photoreal room (polished concrete, limewash plaster, birch ply, black powder-coat steel, vellum drawings) lit by a warm low sun through a steel grid window with a cool sky fill, and its cut wall tops and slab edges are solid graphite poché sitting on the paper ground, with one dimension string drawn on the paper along the front edge. The HTML layer above it uses the same graphite linework on the same paper, so the overlay reads as an annotation of the drawing, not a panel on top of a game.

Density is a drafting sheet's: hairline rules, tabular figures, condensed caps labels, one expanded heavy voice for names and sheet titles. The single colour accent is Prussian blue ink; redline appears only for revision marks, the stamp and "you are here."

**Key Characteristics:**
- One paper ground, graphite linework, Prussian blue as the only ink accent, redline reserved for marks.
- Archivo across its width axis: expanded heavy for titles, condensed caps for labels, tabular figures for sheet data.
- Square-cornered, ruled, outlined components; circles only where drafting uses circles (detail bubbles, markers).
- Depth lives in the 3D scene and its light; the HTML is flat paper.
- Every sheet carries a number, and the index always marks the current sheet.

## Colors

A paper-and-graphite drawing palette with one blue ink and one red pencil.

### Primary
- **Prussian Blue Ink** (prussian-blue): the single ink accent. The role line under the name, project spec tags, hovered project titles and contact links, the glazing line in the key plan, text selection and the focus ring. In the scene it appears only as a blue-print roll and one book spine.

### Secondary
- **Redline** (redline): revision marks only. The PRELIMINARY stamp, the current sheet's number and dot in the sheet index, the "you are here" marker on the key plan, and the dot where the detail callout pins to the laptop. Never decoration, never a button fill.

### Neutral
- **Page Ground** (page-ground): the paper the cut-away model sits on, and the loader and browser theme colour. It is the WebGL paper as it renders after AgX tone mapping (the scene background is set in linear light so it lands here), and the CSS page value matches it so canvas and HTML meet without a seam.
- **Sheet Paper** (sheet-paper): the drawing sheets themselves: the title block, the back button, the laptop drawing set, the phone drawing set, the callout bubble fill. The direction named one paper value; the build adapted it into two, a slightly darker ground under the model and the lighter sheet laid on it, so a sheet reads as a sheet on the table.
- **Graphite** (graphite): section poché in the scene, all linework (sheet borders, title-block frames, outlines, leaders), primary text, and the hover fill of outlined controls.
- **Graphite Soft** (graphite-soft): running prose, ledes and table cells on the sheets.
- **Graphite Faint** (graphite-faint): labels, sheet numbers, zone markers, captions, pending states. It measures roughly 4.3:1 on sheet paper, so it is held to labels and figures and is not a text colour for sentences.
- **Rule** (rule): hairline dividers between rows inside the title block, index, schedule, contact list and project list.

### Named Rules
**The One Ink Rule.** Prussian blue is the only chromatic accent in the interface. A second hue entering the HTML is a new world, not an extension.

**The Redline Rule.** Red marks revisions and position: the stamp, the current sheet, "you are here." If it is not a mark a drafter would make in red pencil, it is not red.

**The Two Papers Rule.** Ground is page-ground, sheets are sheet-paper. Do not collapse them into one value and do not introduce a third.

## Typography

**Display Font:** Archivo (with Helvetica Neue, Arial, sans-serif), self-hosted as one variable file (`public/fonts/archivo-latin.woff2`, width 62–125, weight 100–900), preloaded, `font-display: swap`.
**Body Font:** Archivo, normal width.
**Label/Mono Font:** Archivo condensed (width 75) with tabular figures; there is no separate mono.

**Character:** One family worked across its width axis like a drafter's lettering set: wide and heavy for the name and sheet titles, upright and plain for reading, narrow spaced caps for annotations and sheet data.

### Hierarchy
- **Display** (800, width 125, 76px, line-height 0.92, -0.04em): the name on the cover sheet only. Flat phone set clamps it to 40–64px. The loader's percentage (88px) uses the same voice with tabular figures.
- **Headline** (800, width 125, 40px, line-height 1, -0.03em): sheet titles in each sheet head, over a 2px graphite rule with the sheet number set right. 32px on the phone set. The studio title block's name uses this voice at 24px (20px on phones).
- **Title** (700, width 112, 20px, line-height 1.2): project titles in the detail list. Contact links use 600 at width 112, 22px.
- **Body Lead** (400, 22px, line-height 1.45, graphite): the first paragraph of prose sheets.
- **Body** (400, 15px, line-height 1.55): the sheet base. Prose runs at 18px/1.6 in graphite-soft, capped at 60ch; ledes at 42ch.
- **Label** (600, width 75, 11px, 0.1em, uppercase, graphite-faint): column heads, title-block field names, contact keys, captions, revision table caption. Spec tags use the same voice in Prussian blue.
- **Sheet Number** (600, width 75, 12–13px, 0.06–0.08em, tabular): sheet numbers in the index and sheet heads, title-block data, dates and times.

### Named Rules
**The Width Axis Rule.** Hierarchy is carried by width and weight before size: expanded heavy for titles, normal for reading, condensed for annotation. Do not bring in a second family.

**The Tabular Rule.** Every number that is data (sheet numbers, dates, times, percentages, revision numbers) is set with tabular figures.

## Layout

Two scales. The studio view is full-bleed WebGL with a fixed HTML title block bottom-right (340px wide, 24px from the edges); on screens 640px and narrower it spans the width 12px from the edges, its index becomes a four-up row of 44px-minimum targets under a full-width "Sit at the desk" row, and the sheet/issued/view metadata drops. The detail callout is pinned in screen space to the laptop and flips to the left when it would run off the right edge.

The drawing set is laid out on a fixed 1024 × 640 sheet (rasterised at 2× via CSS zoom on the laptop screen): a 2px drawn border inset 14px, a 1px border at 20px, zone markers 1–5 and A–C in the margin, a scrolling content column and a 232px title-block column on the right. Content pads 36px 40px 40px 44px; sheets stack with 48px below and 24px above each sheet head. Below 760px wide or 480px tall the same set renders flat and full-screen instead: single column, border inset 5px/10px, zone markers hidden, title block reduced to a horizontally scrolling sheet index along the bottom, PRELIMINARY stamp moved onto the cover.

Spacing runs on a loose 4px base with an 18px horizontal gutter inside every title-block cell; vertical rhythm comes from rules between rows rather than gaps between cards.

## Elevation & Depth

All depth belongs to the 3D scene and its light. The scene is lit by a warm directional sun (soft shadow-mapped, stopped by an invisible ceiling), a cool rect-area sky fill through the glazing, a hemisphere fill, a warm bounce off the sunlit floor patch and the drafting lamp as the warm accent at the desk, then passed through ground-truth AO, a restrained bloom (0.12) and AgX tone mapping at 1.15 exposure. A soft radial contact shadow grounds the model on the paper. Ray-marched sun shafts and dust motes are in the build and fade out as the camera sits down; at the desktop overview the shafts do not yet read as distinct beams, so treat them as present, not as a finished effect.

The HTML is flat paper. No component has a drop shadow; separation is by 1.5px graphite outline and hairline rules. The only shadow-like values are legibility halos where HTML sits over the photograph.

### Shadow Vocabulary
- **Paper halo** (`text-shadow: 0 0 2px var(--paper), 0 0 6px var(--paper), 0 0 12px var(--paper)`): the callout label over the 3D scene, so it reads against any part of the room.
- **Marker ring** (`box-shadow: 0 0 0 3px rgba(238, 236, 230, 0.8)`): the paper ring around the red callout dot.

### Named Rules
**The Paper Is Flat Rule.** Nothing printed on paper casts a shadow. Lift a control by inverting it to graphite, not by raising it.

## Shapes

Rectangles with square corners, outlined at 1.5px graphite for anything you can press or that frames a block (title block, back button, Read-the-set button, stamp), 2px for sheet borders and sheet-head rules, 1px or the rule colour for internal divisions. Circles appear only where drafting uses them: detail bubbles (a circle split by a horizontal line, number above, sheet reference below), the callout and you-are-here dots. The stamp is the one rotated element (-2deg). Keyboard caps take a 3px radius as the single soft corner.

## Components

### Buttons
Outlined, square, inverting.
- **Shape:** square corners (0px), 1.5px graphite outline.
- **Primary:** sheet paper or transparent fill, graphite text, 600 weight at 13–14px, padding 12px 18px ("Read the set") or 10px 14px (back to the studio), optional 16px line arrow drawn as inline SVG.
- **Hover / Focus:** fill inverts to graphite with paper text over 0.2s; arrows nudge 3px right; active presses down 1px. Focus is a 2px Prussian blue outline offset 3px.
- **Back:** carries an `Esc` key cap on pointer devices, hidden on touch.

### Title Block (studio view)
The overview's navigation, drawn as a title block: name in the expanded headline voice with the role in Prussian blue; a sheet index whose first full-width row is "Sit at the desk" (A-001) followed by About, Projects, Skills, Contact with their sheet numbers; then sheet (A-000 Studio), issued date and a view hint. Rows invert to graphite on hover. Each row is a hash link, so every sheet is deep-linkable. It fades and slides out (12px) while seated.

### Sheet Index (drawing set)
The title-block column on every sheet: number in condensed tabular caps, title beside it. The current sheet always carries a red number, a 5px red dot and bold title; hover tints the row with graphite at 6%. On phones it becomes a horizontally scrolling strip of 52px-tall buttons.

### Detail List (projects)
Each project is a detail: a 52px bubble (index over sheet reference), a title, a line of description, spec tags in blue condensed caps, and "Open" with an arrow or "Link to come" in faint caps when no link exists. Hover washes the row with a left-to-right blue tint and turns the title blue.

### Schedule and Contact
Skills are a schedule table: condensed caps column heads over a 2px graphite rule, bold row heads, hairline rows. Contact is a ruled list of key / underlined link pairs; the underline starts as the rule colour and darkens with the text to blue on hover.

### Detail Callout (signature)
A red dot pinned to the laptop in screen space, a 1.5px graphite leader at 38 degrees, and a 48px bubble reading "1 / A-001" with the haloed label "Sit at the desk." Hover inverts the bubble and underlines the label.

### Preliminary Stamp
A red outlined, -2deg rotated stamp reading PRELIMINARY / "Placeholder copy, not for issue," shown only while the content is marked as draft, and the revision row then reads "Issued for review." It is a content-state marker for placeholder copy, not a decorative device; it leaves when real copy lands.

### Loader
Real loading progress counted to 100: a condensed caps status line, the percentage in the expanded heavy voice with tabular figures, and a 2px rule that fills in graphite. It fades over 0.7s.

### Motion
One easing (`cubic-bezier(0.16, 1, 0.3, 1)`) for UI. On landing at the laptop the sheet border draws on side by side (0.7s, staggered 0.1s) and the title block brightens from 35%; the camera arcs over the room rather than cutting through it. Reduced motion cuts the camera and drops transitions.

## Do's and Don'ts

### Do:
- **Do** set every surface on page-ground or sheet-paper and draw on it in graphite.
- **Do** number every sheet and mark the current one in redline in the index.
- **Do** separate with 1.5px outlines and hairline rules; invert to graphite for hover and pressed states.
- **Do** use Archivo's width axis for hierarchy: width 125 heavy for titles, width 75 caps for labels, tabular figures for data.
- **Do** build new components from drawing-set parts (title block cells, detail bubbles, schedules, dimension strings, revision rows).
- **Do** keep scene materials to the studio's palette: polished concrete, limewash, birch ply, black powder-coat steel, vellum and paper, under warm sun and cool sky.

### Don't:
- **Don't** add a second accent hue, or use redline for anything that is not a revision mark, stamp or position marker.
- **Don't** put drop shadows on HTML paper; halos are only for legibility over the 3D scene.
- **Don't** round rectangle corners (key caps excepted at 3px); reserve circles for bubbles and markers.
- **Don't** use graphite-faint for running text.
- **Don't** introduce a second typeface or an icon font; icons are thin line SVG drawn in currentColor.
