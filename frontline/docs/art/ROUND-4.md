# Frontline Round 4 — realistic art handoff

All Round 4 assets live in `frontline/public/assets/round-4/`. This delivery is art only. Runtime integration, Meshy reconstruction, topology, rigging, shaders and gameplay remain with Claude. Earlier assets are retained.

The visual target is muted oxidized teal armor, worn brass hardware, charcoal ballistic fabric and cyan optics. Swarm creatures use weathered aubergine keratin, dark joint membranes and orange weak points; the spitter has exposed acid-green sacs. The repository's earlier soldier sheet supplied the established faction vocabulary; the new written material brief governs this realistic pass.

## A — reconstruction inputs

`models/`: 26 separate **2048×2048 RGB PNGs**, one full subject per file, neutral grey studio backdrop, empty scene, even lighting and no cast floor shadows. Thirteen subjects each have `-front-3q.png` and `-side.png`: swarmling, leaper, spitter, brute, warlord, hive, enemy-trooper, heavy, grenadier, marksman, sentry-turret, drop-pod and extraction-shuttle.

All four humanoids use empty-handed T-poses. In side elevation the near arm points toward the camera, as required by the same T-pose; it is intentionally foreshortened. Start Meshy with the three-quarter view; use the side as a supporting profile. These are identity-matched generated views, not measured CAD projections. Small hidden-surface differences need reconciliation during mesh cleanup.

Scale targets: swarmling and leaper dog-sized; spitter similar length with a swollen dorsal silhouette; brute bull-sized, low and wide; warlord towering boss; hive approximately 6 m. The image framing does not encode common meters-per-pixel. Equipment scale should be established against the squad during modeling.

`weapons/`: eight individual **2048×2048 RGB PNGs**, one weapon alone, left-facing side profile: rifle, shotgun, marksman-rifle, machine-gun, flamethrower, rocket-launcher, rail-rifle and plasma-gun. Non-square source renders are fitted inside a square grey canvas without stretching.

## B — effect atlases

`effects/`: eleven **2048×2048 RGBA PNGs**, each an **8×8** grid of **256×256** cells. Read frames left-to-right, then top-to-bottom. The artwork is mechanically repacked with a **32 px fully transparent gutter on every cell edge**; the visible image occupies the inner 192×192 region. Use the full 256×256 cell UVs. Standard straight alpha is retained.

Included: explosion-fireball, smoke-plume, muzzle-flash-01 through -04, acid-splash, alien-blood-splat, dust-impact, sparks and jet-pack-flame. The four muzzle variants are warm rifle star, broad shotgun cone, cyan plasma pulse and pale-blue rail pulse.

The atlases describe evolution of an effect, with late frames allowed to become empty. Playback timing belongs to the integration. A starting point is 24–60 fps depending on desired duration; short muzzle flashes should sample an appropriate subset rather than playing all 64 frames slowly. The jet flame is a sustained flicker sequence; blend its endpoints when looping. [Sampled frames](qa/round-4/B-sampled-frames.jpg) expose padding and progression.

## C — surface materials

`surfaces/`: **48 JPEGs, all 2048×2048**, quality 96, 4:4:4 chroma. Each material has `name.jpg`, `name-normal.jpg` and `name-rough.jpg`. Six facades additionally have `name-glow.jpg`.

Ground materials: wet-asphalt, cracked-concrete, sidewalk, rubble, hive-creep, kepler-crystal-ground, ceres-regolith and metal-deck-plate.

Los Angeles facades: facade-la-art-deco, facade-la-stucco, facade-la-brick, facade-la-modern-glass, facade-la-concrete and facade-la-storefront.

Base color and glow use sRGB; normals and roughness are data textures and must be sampled without sRGB conversion. Normal maps are authored for tangent-space OpenGL +Y. Roughness is grayscale, black smooth and white rough. Glow maps isolate selected warm windows against black; multiply emission intensity in the material. They are not baked night lighting.

These are artist-generated material maps referenced to the albedo, not calibrated scans or geometry-baked normals. Use modest normal strength initially and inspect window and relief alignment under actual scene lighting. Repeat and seam measurements are provided in QA, alongside a 2×2 view of every base material.

## D — spherical skies

`skies/`: **4096×2048 RGB JPEGs**, 2:1 equirectangular projection, horizontal repeat and vertical clamp. Included: la-dusk, la-night-storm, kepler-alien-dusk and ceres-starfield. These are LDR color skies; use the scene's lighting separately. [Wrap-centered and spherical samples](qa/round-4/D-wrap-and-sphere.jpg) show the wrap longitude. The lower hemisphere is backdrop artwork, intended to sit behind level terrain.

## E — decals

`decals/`: five **1024×1024 RGBA PNGs**: scorch-marks, bullet-holes, cracks, blood-pools and tyre-marks. All use true alpha and transparent margins; no ground slab is included. Project onto receiving surfaces with a small depth bias and modulate opacity as appropriate.

## F — mission selection UI

`ui/`: **23 PNGs with matching editable SVG sources**. The map, all region outlines/masks, territory outlines and briefing frame share a **2048×1152** canvas. Eight objective icons are **128×128** transparent line art in the established HUD family.

The Earth map uses repository-owned `assets/board/land-mask.png` geometry and `anchors.json`, with the existing nearest-anchor territory convention. Regions use the established IDs **NA, SA, EU, AF, AS, OC**. Each has a separate transparent `region-id.png` outline and a white `region-id-fill.png` selection mask. Stack these at identical bounds over `earth-territory-base.png`; `territory-outlines.png` adds mission-area divisions. The base carries no baked mission state, text or ownership.

`mission-briefing-frame.png` has a truly transparent center. Nine-slice inset: **56 px on all sides** at native resolution. Keep briefing copy, difficulty and objectives live. Objective icons: eliminate, defend, extract, destroy-hive, recover, escort, activate and scan.

## Provenance and QA

Raster artwork was created with the **built-in ImageGen tool**; UI vectors were authored directly and rasterized with resvg. [Prompt manifest](round-4-prompts.json) retains the selected prompt set, reference relationships and native source paths. No CLI/API image fallback was used. Native raster sources are generally 1254×1254 or 1774×887; requested delivery dimensions are Lanczos exports, including upscaling where necessary. [File inventory](round-4-files.csv) records native and exported dimensions, byte sizes and SHA-256 hashes.

Contact sheets for every section are in [qa/round-4/](qa/round-4/): **A-contact.jpg through F-contact.jpg**. Additional previews cover effect frames, 2×2 surface repeats, spherical sky wrapping and composited region layers. `validation.json` records exported image properties; `checks.json` records atlas gutters, material companions, seam measurements and UI alignment. Automated checks do not substitute for Meshy output or in-engine material/playback review.

Only images, editable SVG artwork, documentation and art metadata are included in the PR. Offline generation/export utilities stay outside the repository. Shipped SVGs and final images are self-contained.
