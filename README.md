# Earthfall

A browser strategy game. Risk-style territory control crossed with Pandemic-style spread, on a painted world board with 42 city territories.

You command the Earth Defense Coalition against an invasion that grows every day, breaks out into neighboring territories, and is run by a chain of command you can hunt: one Overlord, three Warlords, and their Commanders.

## Play

Open `dist/index.html` in a browser. It is one self-contained page with all art embedded. It needs an internet connection only for the 3D library (three.js r128 from cdnjs) and two Google Fonts.

## Build

```bash
npm install     # only needed for the offline test page
node build.js   # writes dist/index.html
```

The build has no bundler. It concatenates the source files and embeds the art as data URIs.

## Layout

| Path | What it holds |
| --- | --- |
| `src/logic.js` | All game rules: territories, links, world clock, enemy behavior, dice, operations, resources. No browser code, so it runs in Node. |
| `src/view3d.js` | The 3D board: painted map texture, ownership tint, borders, miniatures, camera, picking. |
| `src/ui.js` | Top bar, side panel, dialogs, input, save and load. |
| `src/style.css` | The whole stylesheet. A replacement theme must keep every class name. |
| `src/frames.css` | Applies the painted dialog frame, panel frame and button rims from `assets/ui/`. The build adds it after the theme. |
| `src/index.tpl.html` | Page shell the build fills in. |
| `assets/board/` | `map-world.jpg` (board painting), `land-mask.png` (land vs sea), `anchors.json` (pixel position of each city on the 1920 x 1080 painting), and the original PNG. |
| `assets/pieces/` | Transparent miniatures, 256 x 256 WebP, base at the bottom edge. |
| `assets/cards/` | Illustrations and portraits used as thumbnails in the interface. |
| `tools/simulate.js` | Plays automated campaigns on each difficulty to check balance. |
| `docs/` | Map template and the interface sample page for restyling. |

## How the board works

The painting is only the background. The game draws ownership tint, borders, selection, pieces, and labels over it, so the painting must contain no text, borders, or pieces.

Each territory is the land nearest its city anchor. To move a city, edit its pixel position in `assets/board/anchors.json` and rebuild. To swap the painting, replace `map-world.jpg` and `land-mask.png` together, then check the anchors still sit on the right land.

## Adding art

- **Piece:** add `name.webp` to `assets/pieces/`, then reference `name` in `buildTokens` in `src/view3d.js`.
- **Card art:** add `name.webp` to `assets/cards/`. It becomes the CSS class `art-name`.

## Balance check

```bash
node tools/simulate.js
```

A simple attacking bot plays 30 campaigns per difficulty and prints how each ended. The bot does not use covert operations, long-range weapons, or the warhead, so a person has more options than it does.

## Status

Stage 1: the strategic map game. Planned next: a rotating globe view, overhead tactical boards for attack and defense, a smarter enemy, and multiplayer.

"Earthfall" is a working title; a published game already uses the name.

## HUD asset checks

`npm run check:assets` validates the 11 HUD PNGs, including dimensions, chunk checksums and decompressed payloads. The build performs the same validation before embedding those files once as CSS variables.

`npm run check:browser` checks the game at 1280, 820, 390 and 780 pixels wide, including a forced WebGL1 run. It exercises city zoom, board/globe effects, panel tabs, Orders and timing, and checks image decoding, seamless enamel edges, transparent card centers, button sizes and overflow. Run `npm run build` first. On macOS it uses installed Google Chrome; elsewhere install Playwright Chromium or set `CHROME_BIN`. Screenshots go to ignored `dist/qa/`, or `REVIEW_SCREENSHOTS` when set.

The three repaired HUD assets have editable SVG sources in `assets/ui/source/`. `npm run art:export` renders them to production PNG dimensions. Nine-slice insets are documented in `theme/theme.css`, with layout rules in `src/frames.css`. Review captures are under `docs/art/qa/hud-repair/`.
