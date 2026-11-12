// Mission atmosphere is data, shared by the sky, wet surfaces and precipitation.
export function missionAtmosphere(world, requested = 'auto', mission = '') {
  const valid = ['dusk', 'night', 'storm'];
  let hash = 2166136261;
  for (const c of String(world + ':' + mission)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  const mood = valid.includes(requested) ? requested : hash % 2 ? 'night' : 'storm';
  // Ceres is airless: a storm there is windblown mining dust, never rain or puddles.
  if (world === 'ceres') return { mood, wetness: 0, rain: 0, dust: mood === 'storm' ? 1 : 0.15, wind: [1.8, 0.5], space: true };
  return { mood, wetness: mood === 'storm' ? 1 : mood === 'dusk' ? 0.8 : 0.5,
    rain: mood === 'storm' ? 1 : mood === 'dusk' ? 0.4 : 0,
    dust: 0, wind: world === 'kepler' ? [1.1, -0.5] : [1.6, 0.6], space: false };
}

export function atmosphereLighting(world, atmosphere) {
  if (world === 'ceres') return atmosphere.mood === 'storm' ? { fogD: 0.006, fog: 0x202330, exp: 0.9 } : {};
  const alien = world === 'kepler';
  if (atmosphere.mood === 'night') return {
    elev: 28, azim: 125, turb: 2, ray: 0.12, mie: 0.002,
    sun: alien ? 0xd1baff : 0xb9d6ff, sunI: 0.85,
    hemi: [alien ? 0x78699e : 0x6a86b5, 0x11131d, 1.2],
    fog: alien ? 0x252039 : 0x111d30, fogD: 0.004,
    tint: alien ? [0.97, 0.93, 1.1] : [0.92, 1, 1.08],
    exp: 0.95, env: 0.22, cloud: 0.18, bloom: 0.4, rays: 0.06, night: true
  };
  if (atmosphere.mood === 'storm') return {
    elev: 5, turb: 16, ray: 1.2, mie: 0.025,
    sun: alien ? 0xdfb5ee : 0xffd1aa, sunI: 0.85,
    hemi: [alien ? 0x83739c : 0x7892a9, 0x1b1c22, 1.8],
    fog: alien ? 0x4d405d : 0x3b4754, fogD: 0.007,
    tint: alien ? [1.03, 0.93, 1.08] : [0.93, 0.99, 1.05],
    exp: 0.85, env: 0.65, cloud: 0.88, bloom: 0.25, rays: 0.12, storm: true
  };
  return { hemi: alien ? [0xa897b5, 0x2d2331, 1.15] : [0x8399b5, 0x27252a, 1.15] };
}
