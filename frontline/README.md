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

## Not built yet

- The button in Earthfall that launches a battle here and takes the result back.
- Multiplayer (needs a game server).
- Touch controls.
- Real art: everything is simple shapes until the files in `ART_BRIEF.md` arrive.

## Build and play

`node frontline/build.js` (needs `three@0.128` at the repo root), then open `frontline/dist/index.html` in a desktop browser.

Controls: W A S D move, mouse aim, click fire, R reload, G grenade, Q swap weapon, Shift sprint, 1 to 7 support and building, Z X C squad orders, Enter starts a wave early.

Code is in `frontline/src/` (Claude). Art goes in `frontline/assets/` and `frontline/docs/art/` (ChatGPT).
