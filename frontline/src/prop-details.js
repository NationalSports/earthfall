// Original vehicle shells have open volumes: seats and frames are visible through clear or broken panes.
import * as THREE from 'three';
import { Kit, rb, bx, cyl, torus } from './models.js';
const PI = Math.PI;

function append(k, source, at = [0, 0, 0], rotation = [0, 0, 0], scale) {
  for (const [material, geometry] of Object.entries(source.bake())) k.add(material, geometry, at, rotation, scale);
}
function pane(k, width, height, at, rotation, broken) {
  if (!broken) { k.add('glass', new THREE.PlaneGeometry(width, height), at, rotation); return; }
  // Individual shards leave a genuinely open center, rather than painting cracks over an opaque box.
  const positions = [-0.5, -0.5, 0, -0.5, 0.5, 0, -0.24, -0.35, 0, 0.5, -0.5, 0, 0.5, 0.4, 0, 0.28, -0.3, 0,
    -0.14, -0.5, 0, 0.18, -0.5, 0, 0.08, -0.2, 0].map((v, i) => v * (i % 3 === 0 ? width : i % 3 === 1 ? height : 1));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(positions.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); k.add('glass', g, at, rotation);
}
function wheels(k, xs, zs, radius) {
  for (const x of xs) for (const z of zs) k.add('tyre', cyl(radius, radius, 0.26, 14), [x, radius, z], [0, 0, PI / 2])
    .add('steel', cyl(radius * 0.52, radius * 0.52, 0.28, 10), [x, radius, z], [0, 0, PI / 2]);
}
function seat(k, x, y, z) {
  k.add('upholstery', rb(0.52, 0.12, 0.55, 0.04), [x, y, z])
    .add('upholstery', rb(0.52, 0.55, 0.12, 0.05), [x, y + 0.28, z + 0.23], [-0.12, 0, 0])
    .add('dark', rb(0.22, 0.13, 0.1, 0.03), [x, y + 0.63, z + 0.27]);
}
function door(k, side, open, broken) {
  const d = new Kit(); d.add('body', rb(0.055, 0.36, 1.38, 0.025), [0, 0, 0.69])
    .add('body', rb(0.05, 0.04, 1.4, 0.015), [0, 0.54, 0.7])
    .add('dark', bx(0.05, 0.55, 0.045), [0, 0.28, 0.02]).add('dark', bx(0.05, 0.55, 0.045), [0, 0.28, 1.38])
    .add('steel', rb(0.03, 0.035, 0.16, 0.01), [side * 0.035, 0.08, 1.12]);
  pane(d, 1.27, 0.43, [0, 0.3, 0.7], [0, PI / 2, 0], broken);
  append(k, d, [side * 0.84, 0.96, -0.91], [0, open ? side * 0.95 : 0, 0]);
}
function cabin(k, broken) {
  k.add('dark', rb(1.56, 0.08, 2.0, 0.04), [0, 0.88, 0.16])
    .add('body', rb(1.66, 0.1, 2.2, 0.04), [0, 1.57, 0.18])
    .add('dark', rb(1.45, 0.12, 0.24, 0.03), [0, 1.07, -0.73]);
  for (const x of [-0.8, 0.8]) for (const z of [-0.92, 0.5, 1.25]) k.add('body', rb(0.055, 0.7, 0.06, 0.018), [x, 1.22, z]);
  for (const x of [-0.4, 0.4]) { seat(k, x, 0.96, -0.25); seat(k, x, 0.96, 0.66); }
  k.add('steel', torus(0.13, 0.018), [-0.4, 1.19, -0.67], [0.3, 0, 0])
    .add('lampB', bx(0.2, 0.045, 0.02), [0.18, 1.14, -0.59]);
  pane(k, 1.49, 0.51, [0, 1.27, -0.94], [0.16, 0, 0], broken);
  pane(k, 1.49, 0.5, [0, 1.27, 1.29], [-0.16, 0, 0], broken);
  for (const side of [-1, 1]) { door(k, side, broken && side > 0, broken);
    pane(k, 0.61, 0.42, [side * 0.82, 1.27, 0.91], [0, PI / 2, 0], broken);
    k.add('body', rb(0.06, 0.3, 0.7, 0.02), [side * 0.84, 0.96, 0.93]); }
}
function car(k, wreck) {
  k.add('body', rb(1.8, 0.48, 4.3, 0.12), [0, 0.61, 0]).add('dark', bx(1.7, 0.12, 3.6), [0, 0.3, 0]);
  cabin(k, wreck); wheels(k, [-0.86, 0.86], [-1.35, 1.35], 0.34);
  k.add('body', rb(1.58, 0.07, 1.1, 0.03), [0, wreck ? 1.03 : 0.87, -1.53], [wreck ? -0.3 : 0, 0, wreck ? 0.12 : 0]);
  if (wreck) { k.add('burnt', rb(1.1, 0.2, 0.75, 0.03), [0, 0.95, -1.45]); for (const x of [-0.42, 0.42]) k.add('steel', cyl(0.07, 0.07, 0.7, 7), [x, 1.07, -1.4], [PI / 2, 0, 0]); }
  for (const z of [-2.1, 2.1]) k.add('dark', rb(1.84, 0.18, 0.22, 0.04), [0, 0.45, z], [0, wreck ? z * 0.025 : 0, wreck ? 0.05 : 0]);
  for (const x of [-0.62, 0.62]) k.add(wreck ? 'dark' : 'head', rb(0.34, 0.12, 0.05, 0.02), [x, 0.72, -2.16]).add('tail', rb(0.34, 0.1, 0.05, 0.02), [x, 0.74, 2.16]);
}
function truck(k, wreck) {
  k.add('body', rb(2, 0.5, 1.9, 0.1), [0, 0.95, -1.85]).add('steel', rb(2.1, 0.16, 5.6, 0.03), [0, 0.72, 0.1]);
  const cab = new Kit(); cabin(cab, wreck); append(k, cab, [0, 0.2, -1.8]);
  k.add('wood', bx(1.94, 0.12, 3.6), [0, 0.95, 1.1]);
  for (const x of [-1.02, 1.02]) k.add('body', rb(0.09, 0.55, 3.6, 0.025), [x, 1.18, 1.1]);
  k.add('body', rb(2.1, 0.5, 0.08, 0.025), [0, 1.2, 2.88], [wreck ? -0.65 : 0, 0, 0]);
  wheels(k, [-0.95, 0.95], [-1.9, 0.9, 2.0], 0.44);
}
function bus(k, wreck) {
  k.add('dark', rb(2.44, 0.18, 10.4, 0.04), [0, 0.75, 0]).add('body', rb(2.5, 0.16, 10.4, 0.06), [0, 2.96, 0]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) { const z = -4.1 + i * 1.35;
      if (!(side > 0 && i === 0)) { k.add('body', bx(0.08, 0.8, 1.32), [side * 1.22, 1.2, z]);
        pane(k, 1.2, 0.92, [side * 1.26, 2.17, z], [0, PI / 2, 0], wreck && i % 3 !== 0); }
      k.add('body', bx(0.08, 1.2, 0.08), [side * 1.22, 2.14, z - 0.65]);
      if (i > 0) { seat(k, side * 0.75, 1.27, z); k.add('steel', cyl(0.018, 0.018, 1.8, 6), [side * 0.4, 1.8, z + 0.28]); }
    }
    k.add('body', bx(0.09, 0.24, 10.3), [side * 1.22, 2.75, 0]);
  }
  const entry = new Kit(); entry.add('body', rb(0.07, 0.9, 1.12, 0.02), [0, 0.6, 0.56]).add('dark', bx(0.06, 0.06, 1.12), [0, 2.05, 0.56]);
  pane(entry, 1.05, 0.9, [0, 1.54, 0.56], [0, PI / 2, 0], wreck);
  append(k, entry, [1.24, 0.6, -4.76], [0, 0.9, 0]);
  k.add('body', rb(2.45, 0.85, 0.1, 0.03), [0, 1.2, -5.15]).add('body', rb(2.45, 1.9, 0.1, 0.03), [0, 1.85, 5.15]);
  pane(k, 2.25, 1.03, [0, 2.15, -5.21], [0, 0, 0], wreck);
  k.add('dark', rb(2.1, 0.16, 0.45, 0.03), [0, 1.5, -4.7]).add('steel', torus(0.19, 0.025), [-0.75, 1.7, -4.55], [0.3, 0, 0]);
  wheels(k, [-1.15, 1.15], [-3.4, 3.2], 0.5);
  for (const x of [-0.9, 0.9]) k.add('head', rb(0.36, 0.16, 0.05, 0.02), [x, 0.95, -5.22]);
}
function container(k, open) {
  k.add('body', bx(0.08, 2.6, 6.06), [-1.22, 1.3, 0]).add('body', bx(0.08, 2.6, 6.06), [1.22, 1.3, 0])
    .add('body', bx(2.44, 0.1, 6.06), [0, 2.55, 0]).add('wood', bx(2.36, 0.12, 5.96), [0, 0.06, 0]).add('body', bx(2.44, 2.6, 0.08), [0, 1.3, -3.03]);
  for (let i = 0; i < 23; i++) for (const x of [-1.26, 1.26]) k.add('body', bx(0.07, 2.4, 0.12), [x, 1.3, -2.86 + i * 0.26]);
  for (const side of [-1, 1]) { const d = new Kit(); d.add('body', rb(1.2, 2.45, 0.07, 0.02), [-side * 0.6, 1.3, 0]);
    for (const x of [0.3, 0.8]) d.add('steel', cyl(0.025, 0.025, 2.25, 6), [-side * x, 1.3, 0.07]);
    append(k, d, [side * 1.2, 0, 3.03], [0, open ? side * 1.9 : 0, 0]); }
  if (open) k.add('wood', rb(1.0, 0.8, 0.9, 0.025), [-0.6, 0.52, -1.8]).add('dark', bx(1.02, 0.06, 0.94), [-0.6, 0.7, -1.8]);
}
function rover(k, wreck) {
  k.add('hull', rb(2, 0.48, 3.4, 0.1), [0, 0.98, 0]).add('hullB', rb(1.9, 0.3, 1.25, 0.05), [0, 1.4, 1.1]);
  const cab = new Kit(); cabin(cab, wreck); append(k, cab, [0, 0.25, -0.35]);
  k.add('steel', cyl(0.025, 0.025, 1.4, 6), [0.7, 2.6, 1.1]).add('lampB', bx(1.2, 0.07, 0.05), [0, 1.2, -1.73]);
  wheels(k, [-1.1, 1.1], [-1.25, 0, 1.25], 0.46);
}

export const detailedProps = {
  car: k => car(k, false), carWreck: k => car(k, true), truck: k => truck(k, false), truckWreck: k => truck(k, true),
  bus: k => bus(k, false), busWreck: k => bus(k, true), container: k => container(k, false), containerOpen: k => container(k, true),
  rover: k => rover(k, false), roverWreck: k => rover(k, true)
};
