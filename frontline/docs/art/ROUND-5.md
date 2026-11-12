# Frontline art handoff — Round 5

This round expands Round 4 into a coherent LA mission art target: six building kits, street dressing, objective/support equipment, a layered main menu, and four HUD states. Original Frontline designs retain muted teal, worn brass, charcoal fabric and cyan optics. This is an art handoff for Claude's Meshy and game implementation work.

## Contents

| Section | Deliverables | Asset directory |
| --- | --- | --- |
| A — Buildings | Six kits, each with intact/damaged front three-quarter, straight side and top-down roof references; six editable SVG assembly guides with PNG previews | `../../public/assets/round-5/buildings/` |
| B — Street dressing | 24 isolated references: vehicles, lights, traffic furniture, cover, rooftop services, palm, planter and debris | `../../public/assets/round-5/props/` |
| C — Objective/support | Eight objects, front three-quarter + side: core generator, comms relay, research cache, extraction beacon, terminal, open supply pod, ammo and medical crates | `../../public/assets/round-5/objectives/` |
| D — Quality target | One clean LA street composition, wet surfaces, restrained atmospheric depth, readable central lane | `../../public/assets/round-5/scenes/` |
| E — Main menu | City backplate, transparent squad foreground, transparent smoke, clean composed hero, editable layout + PNG, original emblem SVG + PNG, placement JSON | `../../public/assets/round-5/menu/` |
| F — HUD | Preparation, combat, critical and extraction full-screen SVG/PNG mockups; transparent component atlas SVG/PNG and layout JSON | `../../public/assets/round-5/hud/` |

All generated modeling references are exported as 2048×2048 PNG. Scene, menu composition and HUD previews are 3840×2160. Assembly guides are 1600×1000; the reusable HUD atlas is 2048×1120; the emblem is 256×256. The kit diagrams and UI are native editable SVG artwork. Gray padding preserves proportions for non-square model sources. Scene exports use a centered 16:9 crop when needed.

**Resolution disclosure:** ImageGen returned smaller native images. The 2K/4K delivery dimensions are upscaled exports, not native 2K/4K detail. [Prompt manifest](round-5-prompts.json) records every native size, export size, source filename and reference lineage. [Asset inventory](round-5-files.csv) records dimensions, color mode, byte count and SHA-256 for every asset.

## Claude modeling handoff

1. Start with each `intact-front-3q.png` or selected prop/objective front image in Meshy. Each contains one complete object on gray. Do not feed contact sheets or assembly guides as whole-object inputs.
2. Use side/roof views as secondary modeling guidance. Generated alternate views can drift in window counts, roof service positions, damage, and exact shape. The selected front image is the identity authority. Reconcile contradictions deliberately in 3D.
3. Read [kit specs](round-5-kit-spec.json) for target sizes, floor rise, coordinate convention and assembly notes. Dimensions are proposed design targets, not measured CAD. The selected glass office has six office floors above a lobby; its target is 28 m tall. Assembly grids are schematic subdivisions rather than a claim that every window equals one grid cell.
4. Build modular walls, windows, doors, corners, slabs, roof and parapet pieces from each guide. Whole-building images are references for those pieces; separate modular meshes are not included. Keep intact/damaged variants on the same footprint and pivot. Damage is an authored alternate appearance, not a destruction simulation.
5. Separate masonry, glass, painted teal, worn brass, graphite and cyan emissive material slots. Round 4 facade/surface maps can be reused after UV/scale matching. Do not bake studio gray backgrounds or generated lighting into the final mesh materials.
6. Vehicles and street dressing are unbranded visual concepts. Their animation, collision, LODs, interiors and road placement need implementation. Screens are blank or abstract emissive surfaces; runtime content belongs in code.

## Menu and HUD handoff

The menu artwork is a deployment/home screen concept, not a changed homepage. `main-menu-hero.jpg` is a text-free composite. Keep the city, squad and smoke separate when implementing subtle motion; no animation is included. `composition-spec.json` gives layer positions and the left text-safe area. `main-menu-layout.svg/png` adds sample title/navigation artwork for review. All labels/buttons should be recreated as live UI, not shipped as a flattened interactive screen.

HUD mockups use the same street backdrop for direct comparison. Compass, objective, support, squad, health, ammunition and minimap anchors remain consistent across states. Critical state uses both explicit words and red tint; extraction uses text, an amber countdown and a world marker. Central aiming space remains open. `hud/layout-spec.json` contains reference rectangles, palette, type sizes, live data fields, state examples and component atlas rectangles. The transparent atlas supplies reusable blank frames and status/medical/reticle shapes. Numerical values, timers, progress, player names, map content, markers and input hints are sample artwork data only; Claude owns behavior and accessibility.

## QA

[QA folder](qa/round-5/) includes a contact sheet for each section, additional assembly/menu/component sheets and [machine-readable validation](qa/round-5/validation.json). Reviewed building views for identity, camera direction, full-object framing and damage continuity; props for silhouette/material family; transparent layers on a neutral backing; menu/HUD compositions for text fit, contrast and safe central space. Remaining generated-view drift is disclosed above. Format checks cover all raster decoding, reference counts, dimensions, true alpha, local SVG resources, and file hashes. No game build is needed for this art-only change.

## Scope and next art gaps

This round supplies visual references and editable art. No game source, build scripts, templates, distribution files or 3D models are changed. Round 4 remains the character, weapon, effect, material, sky, decal and mission-map pack.

After Claude integrates this street, the next useful art passes are building interiors/doorways, alleys and rooftop routes, Kepler/Ceres vegetation and terrain clutter, modular alien infestation, destruction stages and debris motion, animation reference poses, weapon/effect timing, and loadout/results screens. These are future gaps, not deliverables claimed in this round. A Helldivers-level result also depends on lighting, animation, particles, materials and performance in the running game; a static reference alone does not establish that quality.
