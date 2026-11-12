# Earthfall: Frontline

The third-person horde shooter that goes with Earthfall. `HANDOFF.md` is the full brief; `ART_BRIEF.md` is the art request for ChatGPT.

## What is playable now

- **Two missions.** Defense: hold the city core for five waves. Assault: push out and destroy three hives.
- **Three arenas.** Los Angeles, and two off-world maps (Kepler Ridge, Ceres Station). Open rolling ground; the swarm arrives across a 110 degree arc.
- **Four enemy types.** Swarmlings, spitters (ranged), brutes (smash defenses) and a Warlord boss in the last wave. Hives in the field keep breeding until destroyed.
- **Tower defense.** A prepare phase, scrap from kills, and turrets, walls and mines you place yourself.
- **Call-ins from orbit.** Orbital strike, supply drop, squad drop, and an airstrike run if you bring Bombers research.
- **A squad.** Allied soldiers fight on their own and take three orders: follow, hold a marked spot, return to the wall.
- **Open-world pulls.** Research caches under gold beacons to bring back, and hives to burn out, both away from the wall.
- **Research from Earthfall** changes your kit: rail rifle, more health, faster reload, tougher defenses.
- Minimap, sound, win and lose screens, and a result object handed back to Earthfall.

## How it is drawn

Everything on screen is generated in code; there are no image files yet. `src/gfx.js` holds it:

- three.js r180, bundled with esbuild into one page.
- A physical sky with the sun, and image-based lighting taken from that sky so metal reflects it.
- Post-processing: bloom, filmic tone mapping, colour grade, vignette, grain, and a red pulse when you are hit.
- Procedural textures drawn at start-up: ground, concrete, lit building facades, armour plating, chitin.
- Instanced scenery (rocks, grass tufts, dead trees, crystals, craters) scattered over the hills.
- One pooled particle system for muzzle flash, sparks, fire, smoke and gore, pooled flash lights, and scorch decals.
- A shadow box that follows the player, camera shake and recoil.

## Not built yet

- The button in Earthfall that launches a battle here and takes the result back.
- Multiplayer (needs a game server).
- Touch controls.
- Real art: everything is simple shapes until the files in `ART_BRIEF.md` arrive.

## Build and play

`cd frontline && npm install && node build.js`, then open `frontline/dist/index.html` in a desktop browser.

Controls: W A S D move, mouse aim, click fire, R reload, G grenade, Q swap weapon, Shift sprint, 1 to 7 support and building, Z X C squad orders, Enter starts a wave early.

Code is in `frontline/src/` (Claude). Art goes in `frontline/assets/` and `frontline/docs/art/` (ChatGPT).

## Models

`src/models.js` builds every figure from code, following ChatGPT's style sheet (`frontline/docs/art/style-sheet.png`): teal armour with gold pieces and a cyan visor, a purple swarm with a glowing egg cluster, a gatling turret on a tripod.

- Each model is a small skeleton of named joints. The pieces on a joint are merged into one mesh per material and cached, so a large swarm stays cheap to draw.
- Soldiers walk with bending knees, lean into a run, aim with the whole upper body, and their hands follow the rifle (two-bone reach). The rifle kicks when fired.
- The swarm walks on jointed legs in an alternating gait, rears to strike, and rolls over and sinks when killed.
- `build.js` also picks up the art kit in `frontline/public/assets/` (ground, facade and sky), so those plug in as soon as that folder is on the branch.

## Skirmish

A third mode on the briefing screen: your team (you and three squadmates) against a red team of enemy soldiers run by the game. First to 15 kills wins, both sides respawn at their base, and your health recharges when you are out of fire for four seconds. The red soldiers need a clear line of sight, strafe, keep their distance and fire in bursts.

This is the offline starting point for multiplayer. Each soldier is one entry with a position, facing and health, so a later networked version replaces `trooperThink` (and the squad logic) with players' inputs from a server.

## Movement, arsenal and field research

- **Movement:** Space is a jump pack (hold to fly a short way; it refills on the ground), F dives in the direction you are moving and shrugs off most damage, and sprint uses stamina.
- **Arsenal:** eight weapons in `WEAPONS`, each with its own spread, recoil, sound and reload. You start with the rifle, shotgun and marksman rifle; Q or the mouse wheel cycles. The machine gun, flamethrower, rocket launcher, rail rifle and plasma rifle come from research.
- **Field research:** a recovered cache, a cleared wave, a burned hive, or every fifth kill in Skirmish pauses the battle and offers three upgrades from `PERKS` (a new weapon, damage, reload, jump fuel, turrets, squad, call-ins). Keys 1 to 3 choose.
- **Squad:** the default order is now "fighting on their own" (V). Soldiers take firing positions on the nearest threat, back away from melee, and with nothing to shoot scout toward the next objective. Roles by slot: rifle, heavy, grenadier, marksman. Z, X and C still give follow, hold and wall.

## Districts, sound and the expedition

- **Districts (`src/props.js`):** each world has a layout of roads and a hand-placed set of props. Los Angeles has streets with sidewalks, traffic and street lights, abandoned and burning vehicles, buses, barriers, dumpsters, billboards, power lines, rubble and sandbags. Kepler and Ceres have habitats, tanks, masts, containers, rovers and floodlights. Vehicles and containers block movement and line of sight.
- **Sound (`src/audio.js`):** all synthesized. M toggles the music.
- **Expedition (the Assault mode):** you drop at the south edge and cross the city. Bullets do nothing to hives, so you hold E beside one to plant a charge. Patrols wander and call in breaches that erupt from the ground. When the last hive burns, return to the landing zone, hold it until the shuttle lands, and board.
- **Enemies:** the leaper jumps at you from range. Brutes and the Warlord are armoured: the rifle, shotgun and machine gun do about a third of their damage, while the marksman rifle, rail, rocket, plasma and flame go through.
- **Weapons** each have their own model on the soldier (`setWeapon` in `src/models.js`), with shell casings, muzzle smoke and impact dust.

See `docs/TEARDOWN.md` for what was learned from Saltline and what is still missing.
