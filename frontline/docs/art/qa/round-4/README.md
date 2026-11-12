# Round 4 art QA

Open `A-contact.jpg` through `F-contact.jpg` for the six requested sections.

| Section | Delivered raster files | Review |
| --- | ---: | --- |
| A | 34 | Thirteen separate subject/view pairs and eight individual weapon profiles. Full silhouettes, grey studio backdrop, realistic materials, humanoid empty-hand T-poses. |
| B | 11 | 8×8 atlases, 256 px cells, 32 px transparent gutters. `B-sampled-frames.jpg` shows eight frames from each atlas. |
| C | 48 | Fourteen base materials, matching normal/roughness artwork, six facade glow maps. `C-repeat-contact.jpg` shows all base materials in 2×2 repeats. |
| D | 4 | 4096×2048 equirectangular skies. `D-wrap-and-sphere.jpg` centers the wrap and samples that longitude on an inside sphere. |
| E | 5 | Transparent 1024 px decals. |
| F | 23 | Aligned map, six regional outlines and selection masks, territory outlines, transparent-center frame and eight objective icons. `F-map-layers.jpg` composites regional outlines. Each PNG has an editable SVG. |

Total: **125 raster assets plus 23 SVG sources**. `validation.json` records dimensions, mode, byte size, native source dimensions and SHA-256 values. `checks.json` records material companions, effect cell alpha occupancy/gutters, UI alignment and decoded seam measurements. Late VFX frames may be transparent as an effect fades.

The selected creature side views were revised to tighten the side elevation. Three effect atlases with pale background haze were revised; the warm muzzle flash and acid splash received compact replacement art. Sky textures were offset by half a turn, repaired with ImageGen at the centered join, then unwrapped. The wet asphalt roughness artwork was corrected to a darker wet response.

Seam deltas are measurements, not physical material calibration. Fine-grained surfaces naturally have nonzero edge differences; inspect the repeat previews for visible structure and lighting jumps. Generated PBR maps are approximate artist-authored companions, not measured scans. Some microscopic feature drift between generated maps and small hidden-surface differences between model views are possible.

All image sizes in the brief are export sizes. Native raster generations were resized with Lanczos as recorded in the inventory. These checks cover the art files; Meshy reconstruction, animation playback, terrain scale, normal strength, texture filtering and final spherical integration remain Claude's integration checks.
