# Frontline art handoff — Round 6

Round 6 adds the requested Osprey-style tiltrotor, helicopter, flying enemies and accepted combat/mission art directions. Human equipment follows the realistic muted teal, worn brass, charcoal and cyan material family. Aliens use aubergine chitin, worn membranes and orange exposed organs; acid sacs remain green.

**Start with [air-combat roles and balance proposals](ROUND-6-AIR-COMBAT.md).** It defines complementary vehicle jobs, enemy tells/counters, an extraction sequence and conservative initial playtest targets. Claude owns all Meshy/modeling, rigging, animation, flight controls, AI, physics, networking and runtime code. This handoff provides art and design proposals only.

## Asset map

All new assets live under `frontline/public/assets/round-6/`.

| Section | Folder | Specific additions |
| --- | --- | --- |
| A | `vehicles/` | Kestrel tiltrotor: front three-quarter, hover side, top, cruise side, open-ramp rear three-quarter, damaged front. Goshawk helicopter: front, side, top, damaged front. Bulwark mech: front, side, rear three-quarter, damaged front. 14 references total. |
| B | `flyers/` | Dartwing, Razorwing, Blight Bomber, Storm Moth and Sky Tyrant, each front three-quarter + side. 10 references. |
| C | `damage/` | Brute breached armor, detached Brute shoulder plate, ruptured Spitter sac state, exposed Warlord core state. 4 references, matched to Round 4 identities. |
| D | `mission/` | Hive entrance, hive wall module, egg cluster, evacuation shelter, refinery pump, civilian T-pose front + side, and a hive-tunnel scene. 8 references. |
| E | `ship/` | Command bridge with Earth war table, armory and deployment bay. 3 environment concepts. |
| F | `movement/` | Forward dive, prone aim, recovery kneel and self-stim. 4 individual full-body key-pose references. |
| G | `weather/` | Transparent rain streaks, blowing dust and acid mist; LA electrical-storm lighting target. 4 images. |
| H | `scenes/` | Contested LA extraction with tiltrotor/helicopter/flyers; Kepler aerial boss encounter with helicopter/mech. 2 cinematic compositions. |
| I | `briefs/`, `ui/` | Eight editable SVG/PNG vehicle/enemy role cards, one editable SVG/PNG flight-status/warning board, and flight-status JSON. |

There are **49 selected generated images** (39 isolated model/pose references, 7 scenes, 3 transparent overlays), **9 editable SVG boards with matching PNG previews**, and **1 UI reference JSON**: **68 asset files total**. Contact sheets and documentation are additional files, listed in the PR.

## Modeling and export notes

- Use isolated gray-background images for Meshy. A front image is the identity authority; side/top/rear/damage states are supplementary references. Generated views can drift in blade counts, wing joints, component positions and perspective. Reconcile these in 3D rather than combining contradictory geometry blindly.
- Kestrel identity: two separate wingtip nacelles, three blades per rotor, high wing, rear ramp, twin tail fins, wheeled gear, one defensive gun. Hover uses vertical rotor shafts/horizontal rotor discs; cruise uses forward-facing horizontal shafts/vertical discs. Model nacelle rotation and blade spin as independent pivots.
- Goshawk identity: one four-bladed main rotor, one small four-bladed tail rotor, tandem cockpit, chin gun, two rocket pods and skids. Keep it visually distinct from the transport.
- Bulwark identity: enclosed cockpit, two articulated legs, left rotary cannon/drum, right twin launcher and exposed rear radiator. No pilot figure is supplied. Weapon handedness is anatomical; resolve screen-left/right ambiguity using the selected front image.
- Aircraft/mech target dimensions use `[width, length/depth, height]` metres; flying-enemy dimensions are wingspan targets. These are design estimates, not measured CAD or flightworthy engineering. [Design metadata](round-6-design-spec.json) includes component-separation notes.
- All isolated references and weather overlays export at 2048×2048 PNG. Scene concepts export at 3840×2160 JPG. Role cards are 1600×1000 SVG/PNG; the flight board is 1800×1100 SVG/PNG. Square padding preserves proportions and transparency; scene crops preserve 16:9.
- **These are resized exports, not a claim of native 2K/4K detail.** [Prompt manifest](round-6-prompts.json) records every source-native size, final dimensions, content scale, upscaling flag and reference provenance. The wide dust source is fitted/padded without stretching. [Asset inventory](round-6-files.csv) records byte counts, dimensions, modes and SHA-256.
- Civilian front/side poses have empty hands for rigging. Movement images are four distinct key poses, not motion clips or a continuous animation sequence. Weather overlays are individual textures, not an 8×8 animation sheet or seamless weather simulation.
- Scene and briefing images are art direction only; do not feed a multi-subject scene or a labeled card into Meshy as a single isolated model.

## Gameplay and UI handoff

Flying enemies are intended to keep aircraft useful but vulnerable, with counters available to infantry. Aircraft ammunition, service time, exposed systems, firing arcs and landing commitments are documented as **untested playtest proposals**, not implemented balance. Enemy attack wind-ups, weak points and recovery windows need animation/audio/AI work. Moth interference should not disable manual flight controls.

The flight-status board supplies example typography, warning shapes, ammo/service/damage information and four states. Its JSON is reference artwork metadata, not an engine configuration. Recreate sample values as live UI and adapt a compact panel to the Round 5 HUD; do not put all four example panels onscreen simultaneously.

The Kestrel is an additional vehicle identity. Round 4's extraction shuttle/pod, Round 5's extraction beacon and Round 5's extraction HUD remain available. Ship interiors and cave scenes are environment concepts requiring modular modeling and collision work. Round 5 supplies intact/damaged buildings; this round does not implement runtime destruction. Online co-op remains a separate engineering milestone.

## QA and scope

[QA contact sheets](qa/round-6/) cover every section, with separate counterplay-card and flight-status sheets. [Validation report](qa/round-6/validation.json) records generation completeness, image decoding/dimensions, transparency, SVG parsing/local resources and inventory checks. Visual review covers object framing, vehicle state distinctions, enemy silhouettes, pose readability and board text fit. A rain-overlay revision removes the original fog plate and preserves actual alpha-zero spaces.

Only asset/documentation files are added. No `frontline/src/`, `build.js`, `index.tpl.html` or `dist/` changes. Export/QA helper scripts remain outside the repository. No game build or runtime behavior is claimed by this art-only PR.
