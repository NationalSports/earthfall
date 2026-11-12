# Earthfall and Frontline art delivery

Created 11 November 2026 with the built-in `image_gen` tool for painted artwork and editable SVG for interface graphics. Open [the review gallery](index.html) to browse all 134 distinct assets, inspect transparency, play the four-frame explosion, and check texture repetition. Three additional portrait aliases preserve the game's existing filenames.

## Delivered requests

| Request | Files |
| --- | --- |
| [#29: HUD and portraits](https://github.com/NationalSports/earthfall/issues/29) | Four exact-size mockup PNGs in `docs/art/`; six consistent 480×600 portraits; eleven `hud-*.webp` parts and two separate Orders pips. |
| [#20: cities](https://github.com/NationalSports/earthfall/issues/20) | Three 1024×1024 transparent ground plates with matching street layouts; seven 256×256 building miniatures in `assets/city/`. |
| [#21: defense battle](https://github.com/NationalSports/earthfall/issues/21) | Battlefield, two Coalition squads, three swarm silhouettes, three-gate wall and four-frame explosion strip in `assets/battle/`. |
| [#22: cards and emblems](https://github.com/NationalSports/earthfall/issues/22) | Seven command-card illustrations, nine gold city emblems and five violet trait icons. |
| [#28: HUD and help](https://github.com/NationalSports/earthfall/issues/28) | Twelve action icons, eight resource icons, five additional UI plates, six help illustrations and all nine guide illustrations from the issue comment. |
| [#9: remaining illustrations](https://github.com/NationalSports/earthfall/issues/9) | `emp.webp`, `warhead.webp`, `breakout.webp`, each 1200×800. |
| [Frontline handoff](https://github.com/NationalSports/earthfall/blob/claude/frontline/frontline/HANDOFF.md) | Style sheet, seven environment textures, four prop cutouts, Los Angeles panorama, two weapon views and fourteen UI assets. See `frontline/docs/art/README.md`. |

## Design and integration

The HUD prioritizes one advisor instruction, Orders, the selected city's actions, time controls, resources and loss meters, in that order. The mockups show an illustrative Day 6 state, not a screenshot of the running game. They are one proposed direction for Steve to review before the HUD is rebuilt.

All mockup PNGs are exported to the dimensions in #29. Generation-native dimensions are recorded separately in `raster-manifest.json`; larger mockup exports are resized canvases, not claims of additional native painting detail.

All dynamic labels, numbers, Orders pips and meter fills should be rendered live. The UI plates contain no text. Every native frame uses a **24px slice on all four sides**, corner decoration stays inside that inset, and content should be inset at least **32 source pixels**. Render the rim at roughly 6–8 CSS pixels. `hud-parts.css` demonstrates a 6px rim and keeps a minimum 48px action target. Use `order-pip-on.webp` and `order-pip-off.webp` to show six daily Orders and up to three banked Orders separately.

The original accepted PNG frames, theme stylesheet and FX are preserved. The new WebP parts are supplied for the new design. The original `vanguard.webp`, `cipher.webp` and `engineer.webp` now alias the new `portrait-*` files, so existing code can continue to use those names after a build.

City ground plates use the same underlying street layout. Building bases and cutouts are transparent. Defense sprites face left for Coalition and right for the swarm. The wall gates align approximately with 25%, 50% and 75% of its height. The blast strip is four 256×256 cells, in order: ignition, fireball, ring, fading smoke. Suggested playback is 0.6–1.0 seconds; do not loop it in the game.

The Frontline prop and weapon files are raster artwork and modeling references. They are not 3D models or UV-unwrapped model textures. The latest handoff assigns the low-poly character, enemy and turret geometry to the game developer, superseding the earlier eight-direction sprite proposal.

## Verification

- All 137 exported files decode and match their specified dimensions; required cutouts contain real alpha. See `validation.json`.
- The local gallery decoded 148 image elements with zero failures or page errors in headless Chrome; filtering and background toggle work. No horizontal overflow at 390px. See `browser-validation.json`.
- Reviewed the six portraits, matching city states, miniature silhouettes, sprite direction, separated explosion frames, 28px action icons, and research/salvage at 16px. Revised the city layouts, explosion padding and Coalition uniform colors during QA.
- Ground texture repetition is previewed in the gallery. Opposite edge pixels are not mathematically identical; use the wrap settings in `frontline/docs/art/texture-settings.json`. Facades repeat horizontally and clamp vertically.
- The game build and gameplay were not changed or tested as part of this art delivery. New city, battle, tutorial, UI and Frontline artwork still needs developer wiring and in-game visual review. No request has been closed as accepted.

## Reproducibility

`raster-manifest.json` contains the final prompt set, target sizes, native generation sizes and method. Generation originals remain in the local image-generation library. Every selected final export is saved in this repository. `ui-manifest.json` maps each of the 66 WebPs to its editable SVG under `source/`. `aliases.json` lists the three compatibility copies. `asset-paths.txt` is the complete export list.

The helper scripts use `sharp` and `@resvg/resvg-js` from a separate local art-tools directory, leaving the game's dependency files unchanged. Install those packages under `~/.codex/art-tools/earthfall/` to run `create-ui.cjs`; the supplied exported assets and gallery need no installation. `prepare-review.cjs` rebuilds the gallery, metadata and aliases.
