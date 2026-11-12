# Frontline regional district art

48 original assets. Textures, skies and concept sheets were made with built-in ImageGen; icons are original vector artwork exported to transparent WebP. [Full file inventory](round-3-files.csv) lists every requested file with pixel dimensions and exact byte size. [Prompts](round-3-prompts.json) record the selected generations and revisions.

## Region kits

All files below are **1024×1024 WebP** in `frontline/public/assets/textures/`. Facades repeat horizontally and clamp vertically; ground repeats in both axes. Color/albedo artwork in the sRGB working space; no separate normal, roughness or emission maps.

| Region | Building fronts | Ground |
| --- | --- | --- |
| Europe | [facade-europe-stone.webp](../../public/assets/textures/facade-europe-stone.webp), [facade-europe-brick.webp](../../public/assets/textures/facade-europe-brick.webp) | [ground-cobble.webp](../../public/assets/textures/ground-cobble.webp) |
| Desert | [facade-desert-sandstone.webp](../../public/assets/textures/facade-desert-sandstone.webp), [facade-desert-plaster.webp](../../public/assets/textures/facade-desert-plaster.webp) | [ground-sand.webp](../../public/assets/textures/ground-sand.webp) |
| East Asia | [facade-asia-tower.webp](../../public/assets/textures/facade-asia-tower.webp), [facade-asia-shop.webp](../../public/assets/textures/facade-asia-shop.webp) | [ground-paver.webp](../../public/assets/textures/ground-paver.webp) |
| Cold north | [facade-north-concrete.webp](../../public/assets/textures/facade-north-concrete.webp), [facade-north-panel.webp](../../public/assets/textures/facade-north-panel.webp) | [ground-snow.webp](../../public/assets/textures/ground-snow.webp) |
| Tropics | [facade-tropic-colour.webp](../../public/assets/textures/facade-tropic-colour.webp), [facade-tropic-block.webp](../../public/assets/textures/facade-tropic-block.webp) | [ground-redearth.webp](../../public/assets/textures/ground-redearth.webp) |

## Mood skies

All are **2048×1024 JPEG** in `frontline/public/assets/sky/`, with the horizon around the vertical center, horizontal repeat and vertical clamp. They are panoramic backdrops, not six-face cube maps.

| File | Mood |
| --- | --- |
| [sky-storm.jpg](../../public/assets/sky/sky-storm.jpg) | Heavy blue-grey overcast, one low warm sun break. |
| [sky-night.jpg](../../public/assets/sky/sky-night.jpg) | Clear navy night, moon, sparse stars, faint city glow. |
| [sky-dusk.jpg](../../public/assets/sky/sky-dusk.jpg) | Deep orange sunset and violet cloud/land masses. |
| [sky-desert.jpg](../../public/assets/sky/sky-desert.jpg) | Hard white-blue midday light and pale desert haze. |

## Model sheets

All are **2048×1152 PNG** in this folder, on navy with gold reference silhouettes. These guide code-built models. Meter annotations are modeling targets; fitted cells and overview silhouettes are not CAD measurements.

| File | Contents |
| --- | --- |
| [concept-leaper.png](concept-leaper.png) | Front/side; crimson-black shell, spring-like long hind legs, short forelimbs, acid-yellow dorsal egg cluster. Resting body target about 1.6 m; crest may extend higher. |
| [concept-shuttle.png](concept-shuttle.png) | Front/side and pod-layout inset; blunt 10 m hull, four downward pods, rear ramp, teal/gold/cyan. Hull length excludes the lowered ramp. |
| [concept-weapons.png](concept-weapons.png) | Eight distinct side profiles: rifle, shotgun, marksman rifle, machine gun, flamethrower, rocket launcher, rail rifle, plasma rifle. Cells fit each silhouette independently. |
| [concept-squad-roles.png](concept-squad-roles.png) | Front/side for rifleman, heavy, grenadier and marksman; common 1.8 m armor family, distinct packs, bandolier, equipment and cloak. |
| [concept-region-props.png](concept-region-props.png) | Three original props per region, front/side pairs: Europe kiosk/bollard/bench; desert stall/cistern/shade planter; East Asia vending unit/display/cycle dock; north cabinet/grit bin/shelter; tropics cart/rain barrel/leaf planter. Cells have independent fitted scales. |

## HUD icons

All are **64×64 WebP**, white 1.75 px line art on true transparency, in `frontline/public/assets/ui/icons/`. Names use category prefixes to distinguish support calls from research upgrades. [Native-size preview](qa/round-3/icons.png); [editable vector source](round-3-icons.svg), a transparent 384×256 sheet with 24 named 64×64 groups.

| Group | Files, each 64×64 |
| --- | --- |
| Weapons (8) | `weapon-rifle.webp`, `weapon-shotgun.webp`, `weapon-marksman-rifle.webp`, `weapon-machine-gun.webp`, `weapon-flamethrower.webp`, `weapon-rocket-launcher.webp`, `weapon-rail-rifle.webp`, `weapon-plasma-rifle.webp` |
| Support (7) | `support-orbital-strike.webp`, `support-turret.webp`, `support-wall.webp`, `support-mine.webp`, `support-supply-drop.webp`, `support-airstrike.webp`, `support-squad-drop.webp` |
| Research (9) | `research-damage.webp`, `research-reload.webp`, `research-jump-fuel.webp`, `research-turrets.webp`, `research-squad-damage.webp`, `research-squad-armour.webp`, `research-call-in-speed.webp`, `research-medic.webp`, `research-grenades.webp` |

## Style and verification

The faction colors and broad modelable forms follow [style-sheet.png](style-sheet.png). As requested during review, this round uses finer grain, subtler bevels and more grounded glass, stone, metal and atmosphere. The leaper's crimson/black/yellow colors and monochrome icons are the requested exceptions to the purple swarm and colored equipment palette. No unresolved style mismatch is known.

Ground repeats were inspected in 2×2 arrangements, facades in horizontal repeats, and skies with the wrap seam centered. The north panel and tropical color pillar joins were repaired with ImageGen on offset copies, then unwrapped for export. The storm panorama received a small vertical export crop to align the horizon. Images were resized with Lanczos; WebPs are lossless, JPEGs quality 95 with 4:4:4 chroma. Sky poles and full spherical rendering remain game-integration checks; no code was changed or runtime integration performed.

Review previews: [Europe](qa/round-3/repeat-europe.jpg), [desert](qa/round-3/repeat-desert.jpg), [East Asia](qa/round-3/repeat-asia.jpg), [north](qa/round-3/repeat-north.jpg), [tropics](qa/round-3/repeat-tropics.jpg). Sky seam previews: [storm](qa/round-3/sky-storm-seam.jpg), [night](qa/round-3/sky-night-seam.jpg), [dusk](qa/round-3/sky-dusk-seam.jpg), [desert](qa/round-3/sky-desert-seam.jpg). [Validation data](qa/round-3/validation.json) records dimensions, decoded edge measurements, alpha/white-pixel checks and hashes.
