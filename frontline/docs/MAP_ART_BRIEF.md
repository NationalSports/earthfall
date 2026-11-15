# Tactical map art brief (for ChatGPT)

The tactical map (Tab in game, the Map button on touch) works now, but it is drawn in plain code colours. This brief is the art that makes it look like a Helldivers-style command terminal. Claude wires it in once the files land.

## Look
A dark military command display. Deep blue-black background (#05090f), terrain in muted tones with a faint holographic sheen, thin scanlines, crisp vector icons. Gold (#e8be60) is ours, red (#ff4a6a) is the enemy, purple (#b04adf) is the swarm's nests, green (#60ff90) is extraction. Readable at a glance on a phone. Original designs only: no logos, symbols or icons copied from Helldivers or any other game.

## Where files go
Work on a branch, open a pull request, and only touch `frontline/assets/map/`. The build picks files up **by file name** (the folder does not matter), so names must match exactly. PNGs need real transparency.

## Files

| File | Size | What it is |
|---|---|---|
| `map-ramp-la.png` | 256 x 8 | Colour ramp, left = lowest ground, right = highest. Los Angeles: beach sand, dry grass, scrub, brown hills. Muted, slightly desaturated. |
| `map-ramp-kepler.png` | 256 x 8 | Same, Kepler Ridge: dark violet lowlands to pale lilac crystal highlands. |
| `map-ramp-ceres.png` | 256 x 8 | Same, Ceres Station: charcoal to pale grey regolith. |
| `map-detail-la.jpg` | 512 x 512, tiles seamlessly | Top-down ground texture seen from very high up (fields, scrub, dirt), very low contrast. Multiplied over the terrain. |
| `map-detail-kepler.jpg` | 512 x 512, tiles | Same for Kepler (crystal grit, alien scrub). |
| `map-detail-ceres.jpg` | 512 x 512, tiles | Same for Ceres (regolith, small craters). |
| `map-grain.png` | 1024 x 1024, tiles, transparent | Overlay: fine scanlines plus faint noise, mostly transparent (alpha about 6 to 12%). |
| `map-frame.png` | 2048 x 2048, transparent | Display bezel laid over the square map: corner brackets, tick marks along the edges every 1/10, small readouts like "GRID 01" in the corners. The middle must be fully transparent. |
| `map-panel.jpg` | 600 x 1600 | Background for the mission panel beside the map: dark glass, subtle hex or circuit texture, a thin gold rule near the top. Keep it dark so white text reads. |

### Icons
All 128 x 128 transparent PNGs, **white** glyph with a thin dark outline, centred, with about 12 px of padding. Code tints them, so draw them in white only. Flat, bold and simple enough to read at 24 px.

| File | Meaning |
|---|---|
| `map-icon-player.png` | You: an arrow or chevron pointing up (code rotates it) |
| `map-icon-squad.png` | Squadmate: small helmet or round dot with a ring |
| `map-icon-survivor.png` | Civilian survivor: simple person |
| `map-icon-enemy.png` | Small swarm enemy: claw or bug silhouette |
| `map-icon-brute.png` | Big enemy: heavier bug silhouette |
| `map-icon-warlord.png` | Boss: crowned bug or skull-like crest |
| `map-icon-nest.png` | Hive or nest: organic mound with an opening |
| `map-icon-outpost.png` | Outpost with supplies: small fortified box with a flag |
| `map-icon-wreck.png` | Wrecked convoy: overturned vehicle |
| `map-icon-cache.png` | Research cache: crate with a beacon beam |
| `map-icon-relay.png` | Comms relay: antenna mast with signal arcs |
| `map-icon-lz.png` | Landing zone / extraction: circle with a downward arrow |
| `map-icon-blackbox.png` | Black box: rugged case |
| `map-icon-objective.png` | Main objective: bold diamond with a star or dot |
| `map-icon-waypoint.png` | Player waypoint: pin or flag |
| `map-icon-strike.png` | Incoming strike: target reticle |
| `map-icon-unknown.png` | Unexplored point of interest: a question mark in a diamond |

## Also useful
A 1920 x 1080 mockup of the whole map screen (`frontline/docs/art/map-mockup.jpg`), with the panel on the left and the map on the right, so Claude can match spacing and type sizes.
