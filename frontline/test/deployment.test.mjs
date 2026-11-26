import test from 'node:test';
import assert from 'node:assert/strict';
import { boomFraction, clearLanding } from '../src/deployment.js';

const bus = { x0: -1, x1: 1, z0: 2, z1: 5, h: 3 };
test('camera stops before cover, and clears its roof from above', () => {
  const terrain = () => 2;
  const t = boomFraction(0, 3.5, 0, 0, 1, 4, [bus], terrain);
  assert.ok(t > 0.35 && t < 0.5);
  assert.equal(boomFraction(0, 7, 0, 0, 1, 4, [bus], terrain), 1);
  assert.equal(boomFraction(3, 3.5, 0, 0, 1, 4, [bus], terrain), 1);
});
test('landing avoids occupied space and preserves clear drop points', () => {
  assert.deepEqual(clearLanding(7, 36, [bus]), { x: 7, z: 36 });
  const spot = clearLanding(0, 3, [bus]);
  assert.ok(spot.x < -2.2 || spot.x > 2.2 || spot.z < 0.8 || spot.z > 6.2);
});
