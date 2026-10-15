# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Recruiters and hiring managers evaluating the site owner for a developer role. They arrive from a CV, LinkedIn or a job application, often on a phone, and skim quickly. Their job: decide within a minute or two whether this person can build polished, technically strong software, then find projects and a way to make contact.

## Product Purpose
A personal portfolio where the site itself is a demonstration of skill: a real-time 3D room built with three.js. The visitor explores the room, sits down at the laptop, and reads about the person, their projects, skills and contact details on the laptop's screen. Success means a recruiter comes away convinced of technical and visual craft, and reaches projects/contact without friction.

## Positioning
The portfolio is itself the proof of work: a hand-built, real-time 3D scene (procedural textures, custom lighting and post-processing, no pre-baked renders) rather than a template page describing skills.

## Operating Context
- Opened from links in applications, CVs and LinkedIn; first impression happens in seconds.
- Mixed devices: desktop browsers and phones (touch orbit/pinch).
- Visitors may not explore deliberately; the path to the content (the laptop) must be obvious.

## Capabilities and Constraints
- Stack: vanilla three.js + Vite, static build (`base: './'`), deployed as static files.
- Must run acceptably on phones (performance tiers, touch controls).
- Keep load weight small: no large new downloads (HDRIs, heavy models); procedural generation preferred.
- Laptop screen is an HTML document rendered via CSS3DRenderer; input is forwarded manually.
- Content lives in `src/content.js`.
- Open: real name, role, project list and links are still to be supplied by the user.

## Evidence on Hand
- No real project content yet; `src/content.js` holds placeholders. Do not invent projects, employers, metrics or testimonials.
- glTF props from Khronos sample assets (see CREDITS.md, attribution required for CC BY items).

## Product Principles
1. The scene is the proof: realism and craft are the argument, so visual quality carries the pitch.
2. Content is one click away: a recruiter must reach projects and contact quickly, on any device.
3. Light on the network, honest on the GPU: degrade gracefully on phones rather than stutter.
4. No fabricated proof: only real work and real links appear.

## Accessibility & Inclusion
Provide a usable path for keyboard users and respect reduced-motion preferences for camera moves.
