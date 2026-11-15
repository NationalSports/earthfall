# What Saltline does, and what Frontline takes from it

Notes from reading a public recovered copy of Saltline (a browser shooter built with Claude). These are techniques only. No Saltline code is used in Frontline: the public copies carry no license from the author for the game itself.

## Where its quality comes from

Saltline is about 45,000 lines of game code on three.js r180. The split shows where the polish is:

| Area | Lines | What it does |
| --- | --- | --- |
| Props and buildings built in code | about 11,000 | Hundreds of hand-described objects: containers, cranes, ships, cargo, vehicles |
| Sound | about 5,200 | Every sound synthesized into buffers; a separate adaptive music system |
| Materials and textures | about 2,800 | Procedural textures plus shaders that add rust, chips, scratches and grime from world position |
| Post-processing | about 1,300 | Ambient occlusion, light shafts, lens flare, bloom with lens dirt, eye adaptation, filmic curve, split toning, sharpening, grain |
| Weapons | about 3,700 | Detailed first-person weapon models with a full animation rig |
| Effects and particles | about 3,900 | Pooled particles, decals, tracers, impacts |
| Ground | about 1,700 | Wet asphalt with puddles, rain rings, cracks, painted markings, and a water surface |

Three lessons:

1. **Density over size.** It is one small harbour, packed. Nothing is empty lawn.
2. **Detail from position, not from texture files.** Surface shaders compute wear and wetness from where a pixel is in the world, so nothing blurs up close.
3. **Atmosphere does half the work.** Low sun, haze, light shafts, wet reflective ground and a strong colour grade.

## What Frontline now does the same way

- Props are described in code once and merged per material (`src/props.js`), so a district is about twenty draw calls.
- Roads use a shader that paints asphalt, cracks, lane lines and puddles from world position.
- The final pass adds light shafts, a lens ghost, sharpening, split toning, grain and vignette (`src/gfx.js`).
- All sound is synthesized: layered shots, explosions with debris, swarm voices, wind, reverb, positional panning and music that follows the fight (`src/audio.js`).
- Models are jointed skeletons with merged, cached geometry (`src/models.js`), including one model per weapon.

## Still short of Saltline

- **Volume.** Frontline is roughly 1,500 lines of game code. Saltline has thirty times that in props, materials and sound alone.
- **Ambient occlusion and reflections.** Wet material response and sky reflections are present; screen-space reflections and ambient occlusion remain unimplemented.
- **Surface wear.** Position-based grime and rust now cover armour, props and buildings; bespoke damage decals remain future work.
- **Animation.** Soldiers now reload, react to hits and aim with weapon-specific hand attachments. These remain procedural cycles; authored clips, full magazine swaps and dedicated melee animation remain future work.
