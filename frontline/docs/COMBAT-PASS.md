# Combat presentation pass

This pass uses the supplied soldier image as a material and lighting reference: muted teal plating, worn brass, charcoal fabric joints, small cyan lights and a dark storm sky. The runtime models remain original procedural geometry; this is not a photorealistic recreation of the image.

## Changes

- Vehicles: car, truck, bus and rover shells now expose seats, floors, dashboards and frames through transparent glazing. Wrecks lose sections of glass, open a door and expose damaged parts. Open shipping containers show their floor and cargo. Collision remains a simple footprint: vehicles are cover, not enterable or drivable.
- Atmosphere: the briefing offers Auto, Night, Storm and Dusk. Auto deterministically chooses night or storm from world, city, mission mode and seed. The same profile drives lighting, sky, fog, ground wetness, precipitation and blast drift. Los Angeles and Kepler have rain, pooled splash rings and animated low-roughness puddles. Ceres stays dry and uses mining dust. Wet reflections come from the environment map, not screen-space reflections; precipitation does not yet test building roofs.
- Soldiers: player, squad and red team have reload and hit-reaction envelopes. Reloads release the support hand, reach to the belt, return to the receiver and regrip. Weapon-specific hand and muzzle attachments cover all eight weapons. World-target aiming compensates for torso motion. Squad roles retain their weapon and magazine through the fight; red-team magazines also reload. This is procedural animation, without detachable magazine swaps or authored clips.
- Off-world districts: intersecting research tracks and pale modular buildings on Kepler; deck streets, ribbed mining buildings and machinery on Ceres. Generated block collision preserves routes to the landing zone, research caches and hives. These are distinct settlement layouts, not a new generator for every Earthfall city.
- Explosions: the immediate flash is followed by ground fire, wind-drifting opaque smoke and rotating debris that bounces and settles. Normal-blended smoke has a separate draw from additive sparks/fire; flame sprites taper and flicker instead of using the round smoke sprite. A maximum of 16 blast sources, 144 debris chunks and four fire lights prevents repeated blasts from growing these pools without bound. Ceres blasts use shorter propellant fire and dust.

## Integration

`FRONTLINE_SETUP.atmosphere` accepts `auto`, `night`, `storm` or `dusk`; the optional `seed` varies Auto's choice. Existing callers can omit both. Mood sky images plug in as `sky-night` or `sky-storm` when available; otherwise the procedural sky supplies the mood. `src/atmosphere.js` owns the shared profile, `src/weather.js` precipitation and wet materials, `src/combat-fx.js` blast aftermath, and `src/prop-details.js` vehicle geometry.

The committed `dist/index.html` is rebuilt from source and contains the existing art kit. Open it directly in a desktop browser.

## Verification

From `frontline/`:

```sh
npm ci
npm test
npm run build
npm run test:browser
```

The browser test uses Playwright from the root repository's dev dependencies (`npm ci` at the repository root when needed). Install its Chromium with `npx playwright install chromium`, or set `CHROME_BIN` to an installed Chromium/Chrome executable. On macOS the test also detects the normal Google Chrome installation.

The five Node tests cover eight-weapon aiming and hand reach across target heights, finite reload transforms and hit recovery, deterministic atmosphere rules, blast lifetime/pool limits/clearing, and vehicle interior/glass geometry. The browser test checks all nine world/mood combinations, actual collision-map routes to objectives, finite geometry, mission resets, airless precipitation rules, reload ammo timing, hit recovery, lingering blast effects, and browser/shader errors. It writes screenshots and a JSON report to ignored `dist/qa/combat-pass/` (override with `FRONTLINE_QA`). Headless Chrome uses software rendering; this does not establish a GPU frame-rate budget. Set `FRONTLINE_ACTIONS_ONLY=1` to rerun the action checks and close-up captures without the nine-world/mood matrix.

[Runtime review captures](art/combat-pass/README.md) show the wreck interior, blast aftermath and soldier materials.
