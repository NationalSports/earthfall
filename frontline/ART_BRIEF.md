# Frontline art brief (for ChatGPT)

Frontline is the third-person shooter that goes with Earthfall. It is playable now with plain shapes. This brief lists the art that makes it look like a game. Read `HANDOFF.md` section 13 for the direction.

## The look

Clean, heroic science fiction. Smooth armoured soldiers with a gold visor and bold teal panels. Bright, saturated colour under big open skies. The swarm is glossy purple and organic, with glowing pink or acid-green weak points. Everything must be an **original design**: use other games only as a reference for mood, never copy their characters, armour, weapons, logos or names.

## How art gets into the game

Put image files in `frontline/assets/`. The build picks them up **by file name**, so the names below must match exactly. Nothing else needs changing. Work on a branch and open a pull request; only touch `frontline/assets/` and `frontline/docs/art/`.

## Part 1: files the game already uses (do these first)

| File | Size | What it is |
|---|---|---|
| `sky-la.jpg` | 4096 x 2048 | Full 360 degree panorama (equirectangular). Late-afternoon sky over the edge of Los Angeles: haze, distant towers on the horizon, smoke columns, a few ships high up. Horizon exactly on the middle line. |
| `sky-kepler.jpg` | 4096 x 2048 | Same format. Alien world: violet dusk, two moons, crystal mountains on the horizon. |
| `sky-ceres.jpg` | 4096 x 2048 | Same format. Airless mining world: black sky, hard stars, a large planet low on the horizon. |
| `ground-la.jpg` | 1024 x 1024, tiles seamlessly | Dry grass and dirt seen from above, no shadows baked in. |
| `ground-kepler.jpg` | 1024 x 1024, tiles seamlessly | Rose-coloured alien soil with fine crystal grit. |
| `ground-ceres.jpg` | 1024 x 1024, tiles seamlessly | Grey regolith with tyre tracks. |
| `facade.jpg` | 1024 x 1024, tiles seamlessly | A flat building wall with rows of windows, some lit, battle-worn. Used on every city block. |
| `title.jpg` | 1920 x 1080 | Menu background: a squad of armoured soldiers on a ridge watching the swarm pour over distant hills, beacon beams coming down from orbit. Keep the centre fairly dark so text reads over it. |

## Part 2: concept sheets (these guide the 3D models, which are built in code)

Save as `frontline/docs/art/<name>.jpg`, about 2048 px wide. Each sheet: front, side and back views on a plain background, with a colour swatch row.

1. `soldier.jpg`: the player's trooper. Teal armour, gold visor, backpack, rifle.
2. `squad.jpg`: the allied soldier (steel-blue armour) and how rank or role could show.
3. `swarmling.jpg`, `spitter.jpg`, `brute.jpg`, `warlord.jpg`: the four swarm types, small to huge, clearly one family.
4. `hive.jpg`: the nest structure out in the field, with its glowing heart.
5. `defenses.jpg`: gun turret, wall section, mine, drop pod, supply crate, research cache with its gold beacon.
6. `weapons.jpg`: rifle and rail rifle.

## Part 3: HUD (not wired in yet; I will hook these up when they arrive)

Transparent PNGs, 256 x 256, in `frontline/assets/`: `icon-strike.png`, `icon-turret.png`, `icon-wall.png`, `icon-mine.png`, `icon-supply.png`, `icon-air.png`, `icon-squad.png`, `icon-research.png`, `icon-scrap.png`, and `crosshair.png` (128 x 128).

## Checklist

- [ ] Part 1: eight files in `frontline/assets/`
- [ ] Part 2: concept sheets in `frontline/docs/art/`
- [ ] Part 3: HUD icons
