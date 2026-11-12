// Run after npm run build. Uses the repository's Playwright dependency and an isolated headless browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.CHROME_BIN || (fs.existsSync(systemChrome) ? systemChrome : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const output = process.env.FRONTLINE_QA || path.resolve(__dirname, '../dist/qa/combat-pass');
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '../dist/index.html')).href);
    await page.waitForFunction(() => !!window.__f);
    const waitForArt = () => page.waitForFunction(() => {
      let ready = true; const check = t => { if (t && t.isTexture && (!t.image || t.image.complete === false)) ready = false; };
      check(window.__f.scene.background); window.__f.scene.traverse(o => { for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) for (const value of Object.values(m)) check(value); }); return ready;
    });
    assert.ok(await page.locator('#setup').evaluate(el => el.getBoundingClientRect().top >= 0), 'briefing top is reachable');
    await page.locator('#start').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#start').isVisible(), 'drop-in button is reachable');
    await page.evaluate(() => { window.__frozen = true; });
    if (!process.env.FRONTLINE_ACTIONS_ONLY) for (const world of ['la', 'kepler', 'ceres']) for (const atmosphere of ['night', 'storm', 'dusk']) {
      const data = await page.evaluate(({ world, atmosphere }) => {
        const f = window.__f; f.begin({ world, atmosphere, mode: 'assault', attackers: 1, defenders: 4 }); const effectsReset = f.combatFx.activeSources === 0;
        for (let i = 0; i < 60; i++) f.step(0.05);
        f.renderOnce();
        let invalidGeometry = 0; f.scene.traverse(o => { const p = o.geometry && o.geometry.attributes.position; if (p && Array.from(p.array).some(v => !Number.isFinite(v))) invalidGeometry++; });
        // Flood-fill the actual collision map. Hives and caches must remain reachable from the landing zone.
        const scale = 2, min = -120, size = 121, seen = new Uint8Array(size * size), queue = [];
        const cell = (x, z) => [Math.round((x - min) / scale), Math.round((z - min) / scale)];
        const free = (x, z) => !f.solids.some(s => x > s.x0 - 0.6 && x < s.x1 + 0.6 && z > s.z0 - 0.6 && z < s.z1 + 0.6);
        const [sx, sz] = cell(f.player.x, f.player.z); seen[sz * size + sx] = 1; queue.push([sx, sz]);
        for (let i = 0; i < queue.length; i++) { const [x, z] = queue[i]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, index = nz * size + nx; if (nx < 0 || nz < 0 || nx >= size || nz >= size || seen[index]) continue; if (free(min + nx * scale, min + nz * scale)) { seen[index] = 1; queue.push([nx, nz]); } } }
        const reachable = (object, radius) => queue.some(([x, z]) => Math.hypot(min + x * scale - object.x, min + z * scale - object.z) < radius);
        return { world, atmosphere, blocks: f.district.blocks.length, props: f.district.placed.length,
          wetness: f.atmosphere.wetness, rain: f.atmosphere.rain, dust: f.atmosphere.dust, invalidGeometry,
          cachesReachable: f.caches.every(c => reachable(c, 2.6)), hivesReachable: f.enemies.filter(e => e.kind === 'hive').every(e => reachable(e, 9.5)),
          effectsReset, hasRain: !!f.scene.getObjectByName('mission-rain'), hasDust: !!f.scene.getObjectByName('mining-dust') };
      }, { world, atmosphere });
      assert.ok(data.blocks >= 10, JSON.stringify(data)); assert.equal(data.invalidGeometry, 0);
      assert.ok(data.cachesReachable && data.hivesReachable, 'mission paths: ' + JSON.stringify(data)); assert.ok(data.effectsReset);
      if (world === 'ceres') { assert.equal(data.wetness, 0); assert.equal(data.hasRain, false); assert.ok(data.hasDust); }
      else if (atmosphere === 'storm') assert.ok(data.hasRain && data.wetness === 1);
      results.push(data); console.log('PASS', world, atmosphere, data.blocks + ' blocks', data.props + ' props');
      if (atmosphere === 'storm') {
        await waitForArt();
        await page.evaluate(() => { const f = window.__f; document.querySelectorAll('.hud').forEach(el => el.style.visibility = 'hidden'); f.view(32, 20, 53, 0, 3, 0); });
        await page.screenshot({ path: path.join(output, world + '-storm.png') });
        await page.evaluate(() => document.querySelectorAll('.hud').forEach(el => el.style.visibility = ''));
      }
    }
    const actions = await page.evaluate(() => {
      const f = window.__f; f.begin({ world: 'la', atmosphere: 'storm', mode: 'defense', attackers: 1, defenders: 4 });
      for (let i = 0; i < 60; i++) f.step(0.05); f.renderOnce();
      const p = f.player; p.ammo[0] = 12; f.reload(); for (let i = 0; i < 10; i++) f.step(0.05); f.renderOnce();
      const reloadVisible = Math.abs(p.mesh.userData.J.gun.rotation.z) > 0.05, ammo = p.ammo[0]; f.shoot(); const reloadBlocksShot = p.ammo[0] === ammo;
      for (let i = 0; i < 40; i++) f.step(0.05); f.renderOnce(); const refill = p.ammo[0] === 30;
      f.hurtPlayer(1); const hitTriggered = p.hit > 0; for (let i = 0; i < 30; i++) f.step(0.05); f.renderOnce(); const hitRecovered = p.hit === 0;
      f.boom(8, 12, 8, 0); for (let i = 0; i < 180; i++) { f.step(1 / 60); f.combatFx.update(1 / 60); f.particles.update(1 / 60); } f.renderOnce();
      return { reloadVisible, reloadBlocksShot, refill, hitTriggered, hitRecovered, lingeringFire: f.combatFx.activeSources > 0, debris: f.combatFx.activeDebris > 0 };
    });
    for (const [name, passed] of Object.entries(actions)) assert.ok(passed, name);
    await page.evaluate(() => { const f = window.__f; document.querySelectorAll('.hud').forEach(el => el.style.visibility = 'hidden'); f.view(0, f.height(0, 25) + 5, 25, 8, f.height(8, 12) + 2, 12); });
    await page.screenshot({ path: path.join(output, 'blast-after-3-seconds.png') });
    await page.evaluate(() => { const f = window.__f; f.begin({ world: 'la', atmosphere: 'dusk', mode: 'defense', attackers: 1, defenders: 4 }); for (let i = 0; i < 60; i++) f.step(0.05); f.combatFx.clear(); f.particles.clear(); });
    await waitForArt();
    await page.evaluate(() => { const f = window.__f; f.renderOnce(); const p = f.player; f.view(p.x - 1.8, p.y + 1.4, p.z - 3, p.x, p.y + 1, p.z); });
    await page.screenshot({ path: path.join(output, 'soldier-materials.png') });
    await page.evaluate(() => { const f = window.__f, car = f.district.placed.find(p => p.name === 'carWreck'); if (!car) throw new Error('wreck variant missing'); f.view(car.x + 4.5, f.height(car.x, car.z) + 2.1, car.z - 3.5, car.x, f.height(car.x, car.z) + 1, car.z); });
    await page.screenshot({ path: path.join(output, 'vehicle-interior.png') });
    assert.deepEqual(errors, [], 'browser/shader errors');
    fs.writeFileSync(path.join(output, process.env.FRONTLINE_ACTIONS_ONLY ? 'actions-validation.json' : 'validation.json'), JSON.stringify({ missions: results, actions, errors }, null, 2) + '\n');
    console.log('PASS reload, hit recovery, lingering blast effects and all shader programs');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
