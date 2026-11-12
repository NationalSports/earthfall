import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeSoldier, poseSoldier, setWeapon, weaponGrip, weaponMuzzle, Kit } from '../src/models.js';
import { detailedProps } from '../src/prop-details.js';
import { missionAtmosphere, atmosphereLighting } from '../src/atmosphere.js';
import { createCombatEffects } from '../src/combat-fx.js';

const material = new THREE.MeshStandardMaterial();
const M = Object.fromEntries(['armor', 'armorD', 'gold', 'under', 'gun', 'visor', 'strip', 'bugGlow', 'plasma', 'skin'].map(k => [k, material]));

test('all eight weapons aim at world targets while both hands reach their attachments', () => {
  const model = makeSoldier(M); new THREE.Scene().add(model); model.position.set(5, 2, -4); model.rotation.y = 0.7;
  for (let weapon = 0; weapon < 8; weapon++) {
    setWeapon(model, M, weapon);
    for (const height of [0, 2, 6, 12]) {
      const target = model.localToWorld(new THREE.Vector3(0, height, -25));
      poseSoldier(model, { aimTarget: target, walk: 1.2, move: 0.6, hit: 0.4, t: 1 }); model.updateMatrixWorld(true);
      const gun = model.userData.J.gun, rotation = gun.getWorldQuaternion(new THREE.Quaternion());
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rotation);
      const aim = target.clone().sub(gun.getWorldPosition(new THREE.Vector3())).normalize();
      assert.ok(forward.angleTo(aim) < 0.00001, `weapon ${weapon} aim at ${height}`);
      for (const side of ['L', 'R']) {
        const hand = model.userData.J['fore' + side].localToWorld(new THREE.Vector3(0, -0.35, 0));
        assert.ok(hand.distanceTo(weaponGrip(model, side)) < 0.035, `weapon ${weapon} ${side} grip at ${height}: ${hand.distanceTo(weaponGrip(model, side))}`);
      }
      assert.ok(weaponMuzzle(model).toArray().every(Number.isFinite));
    }
  }
});

test('reload releases the support hand and returns cleanly; hit reactions recover', () => {
  const model = makeSoldier(M), joints = model.userData.J;
  poseSoldier(model, {}); const idle = joints.foreL.quaternion.clone(), gun = joints.gun.quaternion.clone();
  poseSoldier(model, { reload: 0.45 });
  assert.ok(joints.foreL.quaternion.angleTo(idle) > 0.1); assert.ok(joints.gun.quaternion.angleTo(gun) > 0.2);
  for (const progress of [0.01, 0.3, 0.65, 0.99, 1]) {
    poseSoldier(model, { reload: progress }); model.updateMatrixWorld(true);
    for (const joint of Object.values(joints)) assert.ok(joint.matrixWorld.elements.every(Number.isFinite));
  }
  poseSoldier(model, {}); assert.ok(joints.foreL.quaternion.angleTo(idle) < 0.00001);
  poseSoldier(model, { hit: 0.5 }); assert.ok(Math.abs(joints.torso.rotation.z) > 0.05);
  poseSoldier(model, { hit: 0 }); assert.equal(joints.torso.rotation.z, 0);
});

test('mission moods are deterministic, support overrides and never put water on Ceres', () => {
  assert.deepEqual(missionAtmosphere('la', 'auto', 'assault'), missionAtmosphere('la', 'auto', 'assault'));
  for (const world of ['la', 'kepler', 'ceres']) for (const mood of ['night', 'storm', 'dusk']) {
    const p = missionAtmosphere(world, mood); assert.equal(p.mood, mood);
    if (world === 'ceres') { assert.equal(p.rain, 0); assert.equal(p.wetness, 0); }
    else if (mood === 'storm') { assert.equal(p.rain, 1); assert.equal(p.wetness, 1); }
    assert.ok(atmosphereLighting(world, p));
  }
});

test('explosions leave fire and smoke after the flash, pool debris, and fully clear', () => {
  const emissions = [], particles = { emit(x, y, z, options) { emissions.push(options); } };
  const scene = new THREE.Scene(), effects = createCombatEffects(scene, () => 0, particles);
  effects.burst(0, 0, 8, missionAtmosphere('la', 'storm'));
  for (let i = 0; i < 180; i++) effects.update(1 / 60);
  assert.equal(effects.activeSources, 1); assert.ok(effects.activeDebris > 0);
  assert.ok(emissions.some(e => e.smoke)); assert.ok(emissions.some(e => !e.smoke));
  for (let i = 0; i < 30; i++) effects.burst(i, i, 9);
  assert.equal(effects.activeSources, 16); assert.ok(effects.activeDebris <= 144);
  for (let i = 0; i < 1200; i++) effects.update(1 / 60);
  assert.equal(effects.activeSources, 0); assert.equal(effects.activeDebris, 0);
  effects.burst(0, 0, 8); effects.clear(); assert.equal(effects.activeSources, 0); assert.equal(effects.activeDebris, 0);
});

function geometry(name) { const k = new Kit(); detailedProps[name](k); return k.bake(); }
function area(g) {
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); let total = 0;
  for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); total += b.sub(a).cross(c.sub(a)).length() * 0.5; }
  return total;
}
test('vehicle variants have real interiors and broken panes contain less glass', () => {
  for (const name of Object.keys(detailedProps)) {
    const parts = geometry(name);
    for (const g of Object.values(parts)) {
      assert.ok(g.attributes.position.count > 0); assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));
      assert.ok(g.attributes.normal && g.attributes.uv);
    }
    if (!name.startsWith('container')) assert.ok(parts.upholstery, `${name} seats`);
  }
  for (const name of ['car', 'truck', 'bus', 'rover']) assert.ok(area(geometry(name + 'Wreck').glass) < area(geometry(name).glass) * 0.65, name);
  assert.ok(geometry('containerOpen').wood, 'visible container floor and cargo');
});
