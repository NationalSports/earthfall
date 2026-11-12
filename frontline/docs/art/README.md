# Frontline art kit

This kit follows sections 12–13 of the current [Frontline handoff](https://github.com/NationalSports/earthfall/blob/claude/frontline/frontline/HANDOFF.md): third person, desktop first, Los Angeles, code-built low-poly figures, teal-and-gold human equipment, purple organic swarm and bright open skies.

## Files

- `style-sheet.png`: original soldier, swarmling, turret and Los Angeles street together.
- `public/assets/textures/`: asphalt, concrete, dirt, grass and infested ground; art-deco and industrial facades. All 1024×1024.
- `public/assets/props/`: transparent 1024×1024 rubble, cover crate, barrier and city core. These are cutouts and modeling references, not meshes.
- `public/assets/sky/los-angeles-panorama.jpg`: 2048×1024 painted panoramic backdrop. It is not a six-face cube map. Test spherical mapping and the skyline seam in the actual arena before shipping.
- `public/assets/weapons/`: transparent 1536×1024 rifle and rail-rifle views. Forearms intentionally exit the lower frame. These are weapon-view concepts for later implementation.
- `public/assets/ui/`: health plate, ammo plate, wave counter, normal and active build tiles, transparent-center minimap frame, crosshair, four defense icons, strike, supply and repair icons. Keep all values live. Frames use 24px slices and roughly 6–8px rendered borders.

Use `texture-settings.json` for wrapping. The five ground materials are albedo/color only; they are not normal, roughness or displacement maps. The edge measurements in the main delivery's `validation.json` are provided for review. Mirrored repeat is recommended for ground to avoid hard joins; facade images are designed for horizontal repetition, with vertical clamping.

The source geometry for soldiers, enemies, turret variants and defenses remains the developer's work under the latest handoff. Earlier requests for animated eight-direction billboard characters are superseded by that decision. The central art-delivery gallery and prompt manifests are in `docs/art/delivery-2026-11-11/` at the repository root.

## Round 2 — issue #34

The [round 2 gallery and model notes](ROUND-2.md) cover the spitter, brute, Warlord, hive, red Skirmish soldier, eight street props, Kepler/Ceres environment textures and title background. The issue's filenames, paths and dimensions supersede the earlier `ART_BRIEF.md` for this delivery. Full prompts are in [round-2-prompts.json](round-2-prompts.json); export checks and repeat previews are in [qa/round-2/](qa/round-2/).
