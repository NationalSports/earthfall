# Earthfall: Frontline — handoff

Working title for the shooter that goes with Earthfall. This file is the starting brief for a **new repository**. It is written so a fresh Claude session and ChatGPT can both pick it up cold.

Owner: Steve (beginner coder; wants short, plain-language updates).
Code: Claude. Art: ChatGPT. Steve merges pull requests himself.

---

## 1. What it is

A first- or third-person **tower-defense shooter**. You stand on the ground in one of Earthfall's cities while the swarm invades it. You place defenses, then fight alongside them with a real gun.

It is the "battle you can play" that the strategy game has been missing. Earthfall decides *where* the war is fought; Frontline is *how one battle feels*.

One sentence for the pitch: **hold the city, wave by wave, with turrets you placed and a weapon your research unlocked.**

## 2. How it connects to Earthfall

Earthfall stays a turn-based strategy game on a world map. Frontline is launched from it and reports back.

**Launch points in Earthfall**

| Earthfall moment | Frontline mode |
|---|---|
| A declared attack lands on your stronghold | **Defense**: hold for N waves |
| You attack an enemy territory | **Assault**: push to the hive and destroy it (later milestone) |
| An orbital drop hits your rear | **Drop defense**: enemies arrive from the sky, no front line |

**The contract between the two games**

Earthfall hands Frontline a small setup object and gets a small result back. Earthfall's existing optional lane battle already works this way, so the plumbing exists.

```js
// Earthfall -> Frontline
{
  city: "london",            // which arena to load
  mode: "defense",           // defense | assault | drop
  attackers: 9,              // swarm strength -> wave budget
  defenders: 5,              // your troops -> allied soldiers on the field
  armor: 1,                  // your tanks -> allied vehicles
  fort: 2, battery: 1, radar: 1,   // built in the base -> free starting defenses
  research: ["railgun", "exo"],    // unlocked upgrades -> weapons and gear
  leader: { rank: "warlord", trait: "butcher" } // boss wave, if one is attacking
}

// Frontline -> Earthfall
{ won: true, defendersLeft: 3, armorLeft: 1, attackersKilled: 9 }
```

Every battle must also be skippable ("Auto-resolve"), because a strategy turn can contain several fights.

Until the link is built, Frontline runs standalone with a menu that lets you pick a city and a setup.

## 3. Core loop of one battle

1. **Prepare (about 45 seconds).** Walk the arena. Spend a build budget on turrets, walls and mines at marked build pads. What you built in Earthfall is already standing.
2. **Wave.** The swarm comes down fixed lanes toward the objective (the city core). Turrets fire on their own. You shoot, move between lanes, and repair.
3. **Between waves.** Scrap dropped by the swarm buys more defenses or ammo.
4. **End.** Core survives the last wave: you hold the city. Core destroyed: the city falls.

A battle should take **4 to 8 minutes**.

## 4. Design decisions already made by Steve

- It is a **real shooter**, not a top-down auto-battler.
- It is **tower defense / invasion**: defenses matter as much as aim.
- **Research is a big deal for weapons.** Earthfall's Lab is where new guns and turrets come from.
- It should feel **semi-open-world as you move between fronts**.
- **New repo**, separate from `NationalSports/earthfall`.
- **ChatGPT makes the graphics.**

## 5. Recommended answers to the open design questions

These are Claude's recommendations. Steve has not confirmed them.

**First or third person?** Start third-person, over the shoulder. It makes placing turrets and reading lanes much easier, it shows off ChatGPT's character art, and it plays better with a touch screen later. A first-person aim-down-sights view can be a toggle.

**"Semi open world."** Do not build one continuous world. Treat the Earthfall map as the open world: each of the 10 strongholds is its own hand-built arena (about 150 m across) with its own look, and you travel between fronts from the map. Inside an arena you roam freely across two or three lanes, side routes and high ground. That gives the feeling of moving between fronts at a fraction of the cost.

**Research to weapons.** Reuse Earthfall's existing Lab items so the two games share one tech tree:

| Earthfall research | In Frontline |
|---|---|
| (start) | Rifle, basic gun turret, barricade |
| Elite Training | Faster reload, sprint, second weapon slot |
| Exo Armor | More health, melee slam |
| Railgun Batteries | Railgun turret and a hand-held rail rifle |
| Strategic Bombers | Call in an airstrike once per battle |
| Hardened Garrisons | Tougher walls, allied soldiers hold longer |
| Deep Scan | Minimap shows the whole wave before it arrives |
| Ghost Suits | Short cloak to reposition or repair unseen |
| Disruptor | Slow field that weakens the swarm in one lane |
| Warhead | Not usable in a battle (it is a map weapon) |

**Enemies.** Start with three: a fast swarmling (rushes the core), a spitter (shoots turrets from range), a brute (soaks damage, breaks walls). Leaders from Earthfall arrive as boss waves, and their trait changes the fight (a Butcher's wave hits harder, a Breeder's wave is larger).

## 6. Technology

- **Browser game**, same as Earthfall, so it runs from a link on Mac, iPad and phone.
- **three.js** for 3D. Use the current release and a normal build tool (Vite); Earthfall's single-file r128 setup is not suitable for a shooter.
- **Controls:** desktop first, with W A S D, mouse aim and pointer lock. Touch (twin-stick with auto-fire assist) is a later milestone.
- **Physics:** start with simple capsule-versus-box collision written by hand. Add a physics library only if needed.
- **Hosting:** GitHub Pages or Netlify from the new repo.
- **Performance target:** 60 frames a second on a recent laptop, 30 on an iPad. Budget about 150 enemies on screen, drawn with instancing.

**The 3D art question (needs a decision before real art starts).** ChatGPT produces images, not 3D models. Three workable routes:

1. **Billboard sprites** in a 3D world, the way early shooters and many stylised indie games do it. ChatGPT paints each enemy and turret from 8 angles. Fastest, and it keeps Earthfall's painted-miniature look.
2. **Free low-poly model packs** (CC0 libraries such as Kenney or Quaternius) for geometry, with ChatGPT painting textures, skyboxes, UI and concept art.
3. **Image-to-3D tools** to turn ChatGPT's concept art into models. Results vary and need cleanup.

Recommendation: route 1 for enemies and props, simple hand-built geometry for the arena, and revisit after the first playable.

## 7. Repository layout and who owns what

```
/src            Claude   game code
/public/assets  ChatGPT  images, sprites, textures, audio
/docs/art       ChatGPT  concept sheets, style notes
/docs           Claude   design notes, this handoff
/tools          Claude   build and test scripts
README.md       Claude
```

Same working rules as the Earthfall repo:

- Claude posts art requests as GitHub issues labelled `art-request`, each with exact file names, sizes and a checklist.
- ChatGPT only changes `public/assets/` and `docs/art/`.
- Everything goes through branches and pull requests. Nobody pushes to `main`. Steve merges.

## 8. Milestones

Each one ends with something Steve can play from a link.

1. **Greybox arena.** One flat test arena with boxes. Move, aim, shoot a rifle. One enemy type walks a lane to the core. Three waves. Win and lose screens.
2. **Tower defense.** Prepare phase, build pads, gun turret, barricade, scrap economy, repair. Three enemy types.
3. **First real city.** One stronghold arena (suggest Los Angeles) with ChatGPT's art, sound, a proper HUD and a boss wave.
4. **Research weapons.** The unlock table in section 5, driven by a setup object.
5. **Link to Earthfall.** "Fight this battle" button on Earthfall's defend screen, result returned to the map. Auto-resolve stays.
6. **More fronts.** Arenas for the other strongholds, assault mode, drop defense, touch controls.

Milestones 1 and 2 need no art from ChatGPT, so code and art can start in parallel.

## 9. First art requests for ChatGPT

To be filed as issues once the repo exists. Match Earthfall's painted-miniature style.

1. **Style sheet**: one page showing a soldier, a swarmling, a turret and a street corner together, to lock scale and palette.
2. **Player soldier**: third-person character, 8 directions, idle, run and fire poses.
3. **Three enemies** (swarmling, spitter, brute): 8 directions each, walk, attack and death frames.
4. **Defenses**: gun turret, barricade, mine, railgun turret; intact and damaged.
5. **Los Angeles arena kit**: ground textures, building facades, rubble, cover pieces, a skybox, and the city core objective.
6. **HUD**: health, ammo, wave counter, build menu icons, crosshair, minimap frame.
7. **Weapon art**: rifle and rail rifle, seen from the player's view.

## 10. Questions for Steve

1. Third-person first (recommended), or first-person?
2. Painted billboard sprites (recommended), or 3D models?
3. Repository name and whether it is private. Suggested: `NationalSports/earthfall-frontline`, private.
4. Desktop first with touch later (recommended), or must the first playable work on a phone?
5. Which city should be the first arena?

## 11. What exists today in Earthfall that this builds on

- Repo `NationalSports/earthfall`, playable from a single HTML file. Turn-based: one day per turn, End day, then the swarm moves.
- 42 territories, 10 strongholds that act as bases (Industry, Barracks, Fortress, Radar, Missile Battery, Command Post), a Lab at Los Angeles, three resources (metal, fuel, research).
- Enemy leaders (Overlord, Warlords, Commanders) with traits and Warlord powers; orbital drops at each threat level; a research-unlocked Warhead.
- An optional lane-defense minigame (`src/battle.js`) that already takes a setup object and returns survivors. Frontline replaces it.
- Design notes in `docs/DESIGN.md` in that repo.

## 12. Added by Steve after the first draft

- **Camera:** third-person. **Platform:** desktop first. **First arena:** Los Angeles.
- **Location:** lives in the `frontline/` folder of `NationalSports/earthfall`, not a separate repository.
- **Models:** built in three.js code from simple shapes (clean low-poly figures). Claude builds the soldier, enemies and turrets; ChatGPT paints textures, skybox, HUD and concept art, and may add model files.
- **Multiplayer variant (later):** Steve wants a **Halo-style multiplayer shooter**: players against players in arenas, set **on other worlds as well as in Earth's cities**. Not designed yet. Open questions: team sizes and modes (slayer, capture the flag, objective), whether a co-op mode against the swarm is also wanted, and how many other worlds. It needs a small game server, which the single-player build does not, so it is a separate milestone after the Earthfall link.

## 13. Direction: how it should play and look

Steve's reference points, as inspiration for feel and tone. All characters, armour, weapons, enemies and names must be **original designs**; nothing is to be copied from those games.

**Plays like a squad horde shooter with orbital support** (his reference: Helldivers).
- Third-person, over the shoulder, against an overwhelming swarm that comes from a wide arc over open ground, not down lanes.
- **Call-ins from orbit** are the signature mechanic: mark a spot, a beacon goes up, and support lands a moment later. Strikes hurt you too if you stand in them. First two are built: orbital strike (key 1) and turret drop (key 2).
- Call-ins come from Earthfall: Missile Battery gives the orbital strike, Strategic Bombers an airstrike run, Barracks a reinforcement squad, Industry a supply drop, and the Warhead stays a map weapon.
- You arrive by drop pod and extract at the end. Your Earthfall troop count is your pool of reinforcements (respawns).
- Objectives beyond holding the core, for assault missions: destroy hives, escort a convoy, hold a relay.
- Built for co-op from the start (up to four), even though the first builds are single-player.

**Looks like clean, heroic science fiction** (his reference: Halo).
- Smooth armoured soldiers with a visor and bold colour panels, readable silhouettes, bright saturated colour against big open skies.
- Human kit is chunky, practical and teal-and-gold to match Earthfall. The swarm is purple, organic and glossy, with glowing weak points.
- Sweeping alien and off-world vistas for the other-worlds arenas.

The Halo-style multiplayer in section 12 is a separate mode: players against players in arenas.

## LA modular buildings (kit-city)
- Source: Quaternius "Downtown City MegaKit" (CC0). `tools/buildkit.mjs <glTF dir> <out.glb> <Module,Module,...>` merges the chosen modules, simplifies them and compresses to `public/assets/models/kit-city.glb`.
- `src/kitcity.js` assembles buildings from 2 m wall bays (shopfront ground floor, window floors, corner columns, cornice, roof tiles, AC units) in four styles: brick, pale, arch, metal. Some lots use the kit's three ready-made buildings.
- Each district zone in `props.js` has `kit: [styles, share, readyShare]`. Modules are drawn as instances in 120 m cells; cells beyond 230 m (150 m on phones) are hidden.

## Extra soldier moves (Universal Animation Library)
- Source: Quaternius "Universal Animation Library" (CC0). `tools/buildual.mjs <UAL1_Standard.glb> public/assets/models/ual.glb` keeps the skeleton and 15 clips, no mesh (about 200 KB).
- `src/anim.js` retargets them at load onto the soldier's Mixamo skeleton (world-space turn from the library's T-pose, hips scaled to the soldier's height).
- In play: idle stance, sprint, dive roll, jump, flinch on hits, rifle-butt swing, and a second death (half of soldiers). Fallen allies and troopers now lie where they fell for a few seconds instead of vanishing.

## Movement and recorded sound
- Sprint (Shift, or push the touch stick past its rim) widens the view a little. Dive (F) now hops, slides about 7 m, halves damage while in the air and lands with dust. Crouch (C, touch "Crouch") is slower, aims steadier and takes a little less damage. Squad "back to the wall" moved from C to H.
- Squadmates and troopers dive clear of grenades, orbital strikes, hive charges and charging brutes (`threat()` and `aiDive()` in game.js).
- Recorded CC0 Kenney sounds (Sci-Fi Sounds, Impact Sounds) live in `public/assets/sfx/*.mp3` and ship as `dist/sfx.js`. They are layered over the synthesized ones: footsteps per world, explosions, slime hits, armour pings, lasers, jump pack, landing, and the Goshawk's engine loop.

## Mission types
- Expedition (`assault`), Rescue (`rescue`), Hunt (`hunt`) and Retrieve (`retrieve`) share the open map: start at the landing zone, patrols, breaches, the relay side objective, hives to burn for scrap, and the shuttle at the end (`PVE` in game.js; `hiveOp()` is true only for Expedition).
- Rescue: three groups of four survivors under orange flares. Get near a group and it follows you; bugs hunt them. The shuttle waits for six at the landing zone; fewer than six alive fails the mission.
- Hunt: a Warlord with brute guards. Its last-seen area is marked until you are within 45 m. Killing it calls the shuttle.
- Retrieve: a crashed dropship with a black box. Hold E to pick it up (no sprint or jump pack while carrying); going down drops it. Picking it up calls the shuttle and a breach.
- Code: `setupMission`, `stepMission`, `canBoard`, `missionLine` in game.js. Survivors use the soldier with the 'civ' tint, no rifle, and the library's plain walk/jog (`unarmed` in poseBody).

## Haptics, controller, weapon wheel, fire modes, loadout
- `src/haptics.js`: `buzz(kind, k)` rumbles a controller (dual-rumble, plus right-trigger rumble where Chrome supports it), vibrates Android phones, and `tick()` gives the iPhone switch haptic on button taps. Strength is "Haptics" in the tuning panel.
- `src/gamepad.js`: standard-mapping controllers press the same keys/mouse buttons (layout in the file header). A or Start begins the mission on the briefing screen.
- Hold Q (controller Y, touch: hold Swap) for the weapon wheel; hold R (X, touch: hold Reload) for fire mode: Rifle Auto/Burst/Single, Machine gun Auto/Burst.
- Loadout on the briefing screen: primary, secondary, support (saved in localStorage `frontline-loadout`; `SETUP.loadout`). Railgun research still adds the rail rifle.

## Big map and tactical map
- Open missions (Expedition, Rescue, Hunt, Retrieve) use a 1 km map (`ARENA` 500, `BIG`); Defense and Skirmish keep 500 m. The city stays in the middle; a wild ring around it (LA "Outskirts", Kepler "Wilds", Ceres "Badlands") uses value-noise hills (`src/noise.js`), and the off-world mountain rims move to the new edge (`setEdge` in outer.js).
- Mission sites, far hives and the relay scale outward; 8 more patrols roam the ring. Trees beyond 280 m (170 m on phones) are hidden; navmesh cells are 0.8 m on the big map.
- Points of interest (`setupPOIs`/`stepPOIs`): 3 side nests (two hives each, not needed for Expedition), 4 outposts (walk to the supply crate: ammo, grenade, +40 health, scrap), 3 wrecked convoys (scrap and a research pick), 4 research caches. Each is a "?" on the map until someone gets within 45 m.
- Tactical map (`src/mapview.js`): Tab, touch "Map", controller Back. Terrain is painted once per mission; layers show you, squad, survivors, enemies seen in the last 8 s, nests, POIs, objectives, strikes and the landing zone. Click sets a waypoint (also on the compass), right-click clears, wheel zooms, drag pans. The side panel lists the objective and side objectives.
- The city now grows into the ring too: extra roads (`RING` in props.js) with an Industrial East and North Suburbs in LA (kit buildings), and sparse colony blocks along new tracks on Kepler and Ceres. Kit buildings switch to a plain block with shader-drawn windows beyond 130 m (80 m on phones) and vanish past 420 m (260 m); grass, rocks and bushes on the big map are split into 70 m cells and drawn within 110 m.
- Art for the tactical map is briefed in `frontline/docs/MAP_ART_BRIEF.md`.
- Open country: on the big map the city ends at about 330 m. Beyond it the ground is ridges and valleys (`ridge`/`wild` in noise.js; Ceres gets terraced mesas), and six installations sit on levelled pads (`src/installations.js` plans them and `flatten()` levels the ground; `buildSites()` in game.js builds them). Hold E at the console: a radar station reveals every point of interest and shows the swarm on the map for a minute; a fuel depot is rigged and blows after 10 s; an artillery battery fires four shells at your waypoint or the nearest nest (shells crack hives) and reloads after 90 s.
- Tactical map art from chat's PR #47 (`frontline/assets/map/`) is wired in: elevation ramps colour the terrain, aerial detail tiles are multiplied over it (one tile = 140 m, anchored to the ground), the grain and bezel sit on top, the panel uses `map-panel.jpg`, and the white icons are tinted per use. It ships as `dist/art-map.js`; the PR's `qa/`, `source/` and mockup files are not bundled.

## Air combat
- Kestrel VTOL jet (open missions): parked on a pad beside the landing zone. E boards and lands or ejects. Space lifts, Shift sinks, W/S throttle (it hovers below 18 m/s), mouse steers, left mouse fires the cannon, G drops bombs (a yellow ring shows where they land). It climbs gently to about 30 m after take-off to clear rooftops. Hitting a building or the ground fast destroys it; it comes back on the pad after 90 s. Code: `makeJet`, `jetStep`, `jetFire`, `jetBomb`, `jetDown`, `respawnCraft` in game.js.
- Gunship call-in on key 8: arrives in about 3 s, circles the marked spot at 32 m for 30 s, fires its cannon at bugs and homing rockets at brutes, hives and the Strider (`callGunship`, `stepGunships`).
- Goshawk (the helicopter): a squadmate climbs in as door gunner when you board and fires on bugs near the aircraft (`boardGunner`, `doorGun`, `dropGunner`). Rockets lock onto the biggest target near the crosshair ("LOCK" on the HUD) and steer to it. A lost Goshawk comes back after 90 s.
- Strider: a 26 m walker that patrols the open country on the big map (`spawnStrider`, `stepStrider`, `striderHit`, `striderDown`). 520 health; bullets do a quarter damage; rockets, bombs, artillery and the gunship hurt it properly. It lobs acid volleys within 95 m and stomps anything under it. Killing it gives 120 scrap and an upgrade choice. It is a side objective on the tactical map.
- Strider model: the "Stilt" walker from AnyMachine (github.com/apekshik/anymachine, MIT licence), compressed by `tools/buildstrider.mjs` into `public/assets/models/strider.glb` (5.5 MB) and shipped as `dist/model-strider.js`. It is a skinned model, so copies must use `SkeletonUtils.clone` (`S.make()` in glb.js); a plain `.clone()` leaves it following invisible bones.

## Phase 2 (later): Unreal
- Once missions, weapons and enemies feel right in the browser, rebuild in Unreal Engine for desktop (download/Steam instead of a link). The browser game is the prototype: design, maps, mission rules, balance numbers and GLB models carry over; code is rewritten in C++/Blueprints and built on a Windows PC with a good GPU.
- Character motion then: Unreal's Motion Matching, or NVIDIA MotionBricks (github.com/NVlabs/motionbricks; needs an NVIDIA GPU and TensorRT; SOMA skeleton; its sample motions are evaluation-only, models under the NVIDIA Open Model Agreement).

## Realistic ground, sky reflections and water
- Photo-scanned ground (Poly Haven, CC0): `src/terrainpbr.js`. Four texture sets per world (city lots, open ground, second ground / LA beach sand, rock on steep slopes), packed by `tools/buildpbr.py` from Poly Haven's 1k JPGs into `assets/pbr/` (colour with occlusion baked in; normal X/Y + roughness), shipped as `dist/art-pbr.js`. The shader blends them per pixel from a per-vertex `splat` attribute plus noise, mixes two scales so the repeat never shows (far ground uses the large scale only), and maps rock onto cliff faces from the side so it doesn't stretch.
  - LA: dirty concrete, grass ground, gravelly sand, cliff side. Kepler: dirty concrete, burned ground, cracked red ground, dark rock. Ceres: dirty concrete, dry ground, gravelly sand, cliff side.
- LA (dusk and storm) uses the Poly Haven "Industrial Sunset 02" sky photo for reflections, spun so its sun matches the game's (`photoEnvironment`). Night and the other worlds keep the generated sky.
- Fog takes the average horizon colour of the sky photo, so distant hills melt into the sky instead of a flat band.
- LA's sea is a 7 km plane with travelling-wave normals (`waterMaterial`) that reflects the sky.
- Desktop shadows: 4096 map covering ±85 m (phones keep 2048, ±62 m).
- Briefing "Graphics": Smooth (phones draw at 1.25×) or Sharp (screen resolution up to 2.25×), saved in localStorage `frontline-gfx`.
- The textures decode a moment after the mission starts; until then the ground is grey under the loading curtain.

## Flight changes
- Kestrel: fast flight now holds altitude. Space climbs, Shift or C sinks, and the mouse only steers and aims the cannon (aiming down no longer dives the jet). It keeps at least 14 m over the ground and roofs up to 3 s ahead (`roofAt`), so it no longer flies into buildings.
- Goshawk: rotors spin up in about half a second and you can lift as soon as they pass a third of full speed. The touch stick now flies it (it used to only read the keyboard). C also descends.

## Photo-scanned rocks and plants; Blender-built Kestrel
- Rocks and plants from Poly Haven (CC0), one variant per file, built by `tools/buildnature.mjs` from Poly Haven's 1k glTF downloads into `public/assets/models/nat-*.glb`:
  - Rocks: `nat-rock-a` (Rock 07), `nat-rock-b` (Rock 09), `nat-rock-c` (Namaqualand Boulder 04), `nat-cliff` (Rock Face 01), `nat-moon-a/b` (Moon Rock 02/03, Ceres).
  - Plants: `nat-shrub-a/b` (Shrub 02 a/c), `nat-scrub-a/b` (Wild Rooibos Bush a/b), `nat-weed` (Weed Plant 02).
  - They load through the tree loader in glb.js (rocks don't sway; scrub leaves are brightened because the scan is very dark) and are planted per district by `NATURE` in trees.js. Rocks over 1.6 m are solid (`trees.blocks`).
  - With them loaded, `scatter()` skips its old low-poly rocks and LA bush blobs. The thin grass blades remain.
- Kestrel model: built from code in Blender by `tools/blender/kestrel.py`, packed by `tools/packglb.mjs` into `public/assets/models/kestrel.glb` (about 7,500 triangles, 75 KB).
  - To rebuild: `pip install bpy`, then `python3 tools/blender/kestrel.py /tmp/k.glb && node tools/packglb.mjs /tmp/k.glb public/assets/models/kestrel.glb`.
  - It's centred so the nose is at -6.6 m and the nozzle at +6.7 m in game space, with wheels on the ground. `makeJet` swaps it in with `dressStatic`; the engine glow disc now sits on the outer group so it stays visible.
- Blender in the workspace can't read meshopt-compressed GLBs; decompress them first (see `/tmp`-style plain export with gltf-transform) if you need to render one for checking.

## Neon, wet-street reflections, lens rain, Recon Scan
- Neon signs (`src/signs.js`): kit-city buildings record a wide sign over most shopfronts and a tall blade sign on some corners (`kitcity.js` → `signs`, placed by a hash of the position so the layout doesn't change). One canvas atlas of glowing words, one merged mesh for the neon (additive, flickers per sign: steady, buzzing or dying) and one for the dark sign boxes. Brightness by mood: night 1, storm 0.85, dusk 0.55.
- Wet-street reflections (`src/reflect.js`, hooked into `wetSurface` in weather.js): every frame the GLOW layer (layer 5: neon, lamp heads, lamp cones) is drawn from a camera mirrored under the ground into a small texture (40% resolution on desktop, 25% on phones). Wet roads, sidewalks and ground look it up at their screen spot, smeared vertically like light on wet asphalt and strongest in puddles. Put anything that should reflect on `GLOW` with `obj.layers.enable(GLOW)`.
- Wet ground is now much darker (wetSurface), and LA uses the sunset sky photo for reflections only at dusk (it made storm ground look snowy).
- Lamp cones are soft shafts (fade at their edges) and lamplight pools fade out instead of ending in a hard disc.
- Lens rain (`src/lens.js`): a half-resolution water field (sitting beads, sliding runners with tails) and a post pass that bends the scene through it, after the bloom so neon smears through drops. Wets with the mission's rain, faster with camera speed; dries slowly. Written from scratch (the MengTo/Skills repo the idea came from has no licence, so none of its code is used).
- Recon Scan (`src/scan.js`), call-in key 9, 40 s cooldown: a pulse sweeps 190 m in 5.5 s. While it runs the scene's depth is drawn again at half resolution and a post pass lights every surface the front crosses (bright band, dot grid, building edges in cyan). Bugs the front passes get a red marker visible through walls for 12 s.
- Test hooks: `__f.wetLens(seconds)` soaks the lens, `__f.scanTick(seconds)` advances the scan.

## Rooms behind the windows, street dressing, weathered walls
- Interior mapping (`interiorMaterial` in kitcity.js): the dark block inside each kit building is drawn as rooms. For each pixel the view ray is traced into an imaginary room (2 m bays matching the facade, 3 m floors, 3.4 m deep; shops 4.5 m) and the shader paints the back wall, side walls, floor or ceiling it hits. Ground floors are shops with shelves of goods; upper rooms have a sofa or picture on the back wall, some curtains or blinds, and a warm, white, fluorescent or TV-blue light, some on and some off. `interiorMood(mood)` sets how many are lit (night most, day dim). The kit's flat window backdrops (`MI_FakeInterior*`) are dropped so the rooms show through, and the cores are on the GLOW layer so lit windows reflect in wet streets.
- Street dressing (`src/citydress.js`): kit buildings record themselves (`kitcity.blds`) and get striped awnings, lit vending machines (on GLOW), piles of trash bags, window air-conditioners and iron fire escapes on brick/arch buildings of 4+ floors. All hashed from position; merged into six meshes.
- Weathering on kit walls (`weather()` in glb.js): soot and rain streaks and grime under each floor line, from world position.
- Testing note: SwiftShader screenshots at 960×540 often come back partly black now that the frame is heavier; capture at 640×360. `__f.kitCores(n)` lists building cores (position, facing, size) for aiming test cameras at facades.
