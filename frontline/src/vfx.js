// Frontline particle effects on three.quarks: one batched renderer, one pooled particle system per look, fired by
// spawning a burst at a position. Fireballs and smoke use the painted 8x8 sheets (fx-*.webp) played over each
// particle's life; sparks and droplets stretch along their velocity; dust rings lie flat on the ground.
import * as THREE from 'three';
import { BatchedRenderer, ParticleSystem, RenderMode, ConstantValue, IntervalValue, ConstantColor, ColorRange, Gradient, PiecewiseBezier, Bezier, ColorOverLife, SizeOverLife, FrameOverLife, RotationOverLife, ApplyForce, SpeedOverLife, Noise, SphereEmitter, ConeEmitter, PointEmitter, Vector3 as QV3, Vector4 as QV4 } from 'three.quarks';

export function createVfx(scene, tex) {
  const batch = new BatchedRenderer(); batch.name = 'vfx'; scene.add(batch);
  const sheet = name => { const t = tex('fx-' + name); if (t) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; } return t; };
  const soft = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ring = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 30, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mat = (map, add) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, color: 0xffffff });
  const grad = (cols, alphas) => new Gradient(cols.map(([r, g, b, t]) => [new QV3(r, g, b), t]), alphas);
  const curve = (a, b, c, d) => new PiecewiseBezier([[new Bezier(a, b, c, d), 0]]);
  const V4 = (r, g, b, a) => new QV4(r, g, b, a);
  const sys = {}, make = (name, o) => { if (!o.material.map) return; const ps = new ParticleSystem(Object.assign({ looping: true, duration: 1, worldSpace: true, emissionOverTime: new ConstantValue(0), shape: new PointEmitter(), startRotation: new IntervalValue(0, 6.283) }, o)); ps.emitter.name = 'vfx-' + name; scene.add(ps.emitter); batch.addSystem(ps); sys[name] = ps; };
  const EXPL = sheet('explosion'), SMOKE = sheet('smoke'), DUST = sheet('dust'), ACID = sheet('acid'), BLOOD = sheet('blood');

  // Fireball: the painted explosion sheet on many overlapping billboards, white-hot to orange to soot.
  make('fire', { material: mat(EXPL, true), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(0.55, 0.9), startSpeed: new IntervalValue(1.5, 5), startSize: new IntervalValue(2.2, 3.6), startColor: new ConstantColor(V4(1, 1, 1, 1)), shape: new SphereEmitter({ radius: 0.6, thickness: 1 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.55, 1.05, 1.25, 1.35)), new ColorOverLife(grad([[1, 0.95, 0.85, 0], [1, 0.62, 0.25, 0.4], [0.55, 0.2, 0.06, 1]], [[1, 0], [1, 0.55], [0, 1]])), new SpeedOverLife(curve(1, 0.5, 0.2, 0.05)), new RotationOverLife(new IntervalValue(-0.8, 0.8))] });
  // Soot that rolls up out of the blast and leans with the wind.
  make('smoke', { material: mat(SMOKE, false), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(2.6, 4.2), startSpeed: new IntervalValue(0.6, 2.4), startSize: new IntervalValue(2.4, 4), startColor: new ColorRange(V4(0.26, 0.24, 0.22, 0.85), V4(0.42, 0.39, 0.35, 0.75)), shape: new SphereEmitter({ radius: 1, thickness: 1 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.6, 1.4, 2, 2.4)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[0, 0], [1, 0.12], [0.75, 0.55], [0, 1]])), new ApplyForce(new QV3(0.25, 1, 0.1), new ConstantValue(2.1)), new SpeedOverLife(curve(1, 0.55, 0.35, 0.25)), new Noise(new ConstantValue(0.35), new ConstantValue(0.6)), new RotationOverLife(new IntervalValue(-0.35, 0.35))] });
  // Embers: bright streaks thrown out that arc down and cool.
  make('embers', { material: mat(soft, true), renderMode: RenderMode.StretchedBillBoard, rendererEmitterSettings: { speedFactor: 0.06, lengthFactor: 0 }, startLife: new IntervalValue(0.5, 1.4), startSpeed: new IntervalValue(9, 22), startSize: new IntervalValue(0.12, 0.26), startColor: new ColorRange(V4(1, 0.85, 0.45, 1), V4(1, 0.5, 0.15, 1)), shape: new SphereEmitter({ radius: 0.4, thickness: 1 }),
    behaviors: [new ApplyForce(new QV3(0, -1, 0), new ConstantValue(14)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 0.6, 0.3, 1]], [[1, 0], [1, 0.6], [0, 1]])), new SpeedOverLife(curve(1, 0.85, 0.7, 0.6))] });
  // The ground ring of dust a blast or a landing kicks out.
  make('dustring', { material: mat(DUST, false), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(0.9, 1.6), startSpeed: new IntervalValue(6, 12), startSize: new IntervalValue(1.6, 2.8), startColor: new ColorRange(V4(0.6, 0.54, 0.46, 0.95), V4(0.48, 0.44, 0.38, 0.85)), shape: new ConeEmitter({ radius: 0.6, angle: 1.48, thickness: 0 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.6, 1.4, 1.9, 2.2)), new SpeedOverLife(curve(1, 0.35, 0.12, 0.05)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[1, 0], [0.7, 0.4], [0, 1]]))] });
  // A pale shock ring that flashes across the ground.
  make('shock', { material: mat(ring, true), renderMode: RenderMode.HorizontalBillBoard, startLife: new ConstantValue(0.32), startSpeed: new ConstantValue(0), startSize: new ConstantValue(1), startColor: new ConstantColor(V4(1, 0.85, 0.65, 0.4)), startRotation: new ConstantValue(0),
    behaviors: [new SizeOverLife(curve(0.3, 1.6, 2.3, 2.6)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[1, 0], [0.4, 0.5], [0, 1]]))] });
  // Spent-round sparks off metal and stone.
  make('sparks', { material: mat(soft, true), renderMode: RenderMode.StretchedBillBoard, rendererEmitterSettings: { speedFactor: 0.045, lengthFactor: 0 }, startLife: new IntervalValue(0.15, 0.4), startSpeed: new IntervalValue(6, 14), startSize: new IntervalValue(0.05, 0.1), startColor: new ColorRange(V4(1, 0.95, 0.7, 1), V4(1, 0.7, 0.3, 1)), shape: new ConeEmitter({ radius: 0.05, angle: 0.9, thickness: 1 }),
    behaviors: [new ApplyForce(new QV3(0, -1, 0), new ConstantValue(16))] });
  // Bug ichor: heavy droplets and a wet mist.
  make('goo', { material: mat(soft, false), renderMode: RenderMode.StretchedBillBoard, rendererEmitterSettings: { speedFactor: 0.05, lengthFactor: 0 }, startLife: new IntervalValue(0.4, 0.8), startSpeed: new IntervalValue(3, 8), startSize: new IntervalValue(0.12, 0.26), startColor: new ColorRange(V4(0.42, 0.62, 0.08, 1), V4(0.28, 0.45, 0.05, 1)), shape: new SphereEmitter({ radius: 0.3, thickness: 1 }),
    behaviors: [new ApplyForce(new QV3(0, -1, 0), new ConstantValue(15))] });
  make('mist', { material: mat(ACID || BLOOD, false), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(0.35, 0.6), startSpeed: new IntervalValue(0.6, 2), startSize: new IntervalValue(0.9, 1.6), startColor: new ColorRange(V4(0.55, 0.8, 0.2, 0.75), V4(0.35, 0.6, 0.12, 0.6)), shape: new SphereEmitter({ radius: 0.3, thickness: 1 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.7, 1.2, 1.5, 1.7)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[1, 0], [0.8, 0.3], [0, 1]]))] });
  // A drifting puff: gun smoke, rocket trails, rotor wash, dust kicked by feet.
  make('puff', { material: mat(SMOKE, false), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(0.8, 1.6), startSpeed: new IntervalValue(0.2, 0.9), startSize: new IntervalValue(0.6, 1.1), startColor: new ColorRange(V4(0.62, 0.6, 0.57, 0.95), V4(0.5, 0.48, 0.46, 0.85)), shape: new SphereEmitter({ radius: 0.15, thickness: 1 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.6, 1.3, 1.9, 2.3)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[0, 0], [1, 0.1], [0, 1]])), new ApplyForce(new QV3(0, 1, 0), new ConstantValue(0.5))] });
  make('wash', { material: mat(DUST, false), uTileCount: 8, vTileCount: 8, startLife: new IntervalValue(0.7, 1.3), startSpeed: new IntervalValue(9, 15), startSize: new IntervalValue(1.4, 2.6), startColor: new ColorRange(V4(0.62, 0.55, 0.45, 0.95), V4(0.5, 0.45, 0.38, 0.85)), shape: new ConeEmitter({ radius: 3, angle: 1.5, thickness: 0.2 }),
    behaviors: [new FrameOverLife(curve(0, 21, 42, 63)), new SizeOverLife(curve(0.5, 1.2, 1.8, 2.2)), new SpeedOverLife(curve(1, 0.4, 0.15, 0.05)), new ColorOverLife(grad([[1, 1, 1, 0], [1, 1, 1, 1]], [[0, 0], [1, 0.15], [0, 1]]))] });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3();
  let amount = 1;
  // Fire n particles of a look at a point; scale stretches size and speed together, d (a direction) aims cone looks.
  function fire(name, x, y, z, n, scale, d) { const ps = sys[name]; if (!ps) return; n = Math.round(n * amount); if (n < 1) return; dir.set(0, 1, 0); if (d) dir.set(d.x, d.y, d.z).normalize(); q.setFromUnitVectors(zAxis, dir); m4.compose(p3.set(x, y, z), q, s3.setScalar(scale || 1)); ps.normalMatrix.getNormalMatrix(m4); ps.spawn(n, ps.emissionState, m4); }

  return {
    // An explosion of radius r metres at ground height y.
    blast(x, y, z, r, acid) { const k = Math.max(0.6, r / 4); if (acid) { fire('mist', x, y + r * 0.4, z, 10 + r * 3, k * 1.6); fire('goo', x, y + 0.5, z, 20 + r * 4, k); fire('dustring', x, y + 0.3, z, 12, k * 0.8); return; }
      fire('fire', x, y + r * 0.35, z, 10 + r * 4, k); fire('smoke', x, y + r * 0.5, z, 10 + r * 3, k); fire('embers', x, y + 0.6, z, 14 + r * 5, Math.min(1.4, k)); fire('dustring', x, y + 0.3, z, 14 + r * 2, k); if (r >= 3) fire('shock', x, y + 0.25, z, 1, r * 1.1); },
    impact(x, y, z, hard) { if (hard) fire('sparks', x, y, z, 5, 1); fire('puff', x, y, z, 1, 0.6); },
    gore(x, y, z, big) { fire('goo', x, y, z, big ? 16 : 6, big ? 1.3 : 0.8); fire('mist', x, y, z, big ? 4 : 1, big ? 1.4 : 0.8); },
    gunSmoke(x, y, z, k) { fire('puff', x, y, z, 1, 0.5 * (k || 1)); },
    trail(x, y, z, k) { fire('puff', x, y, z, 1, (k || 0.8) * 1.6); },
    wash(x, y, z, k) { fire('wash', x, y, z, 2, k); },
    systems: sys, set amount(v) { amount = v; }, get amount() { return amount; },
    update(dt) { batch.update(Math.min(dt, 0.05)); } };
}
