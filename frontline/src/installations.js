// Installations out in the open country of the 1 km map: radar stations, fuel depots and artillery batteries.
// Each sits on a levelled concrete pad; H() blends the ground to the pad's height around it.
export const SITES = [];
const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// avoid(x, z) is true where nothing may go (sea, the city, the map's own features); Hraw is the unlevelled ground
export function planSites(arena, avoid, Hraw) { SITES.length = 0; if (arena < 300) return SITES;
  const kinds = ['radar', 'depot', 'artillery', 'depot', 'artillery', 'radar'];
  for (const kind of kinds) for (let k = 0; k < 300; k++) { const a = Math.random() * Math.PI * 2, r = 360 + Math.random() * 100, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > arena - 34 || Math.abs(z) > arena - 34 || avoid(x, z) || SITES.some(s => Math.hypot(s.x - x, s.z - z) < 150)) continue;
    let h = 0; for (const [u, v] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) h += Hraw(x + u, z + v) / 5; SITES.push({ kind, x, z, r: 15, h, yaw: Math.random() * Math.PI * 2 }); break; }
  return SITES; }
export function flatten(x, z, h) { for (const s of SITES) { const d = Math.hypot(x - s.x, z - s.z); if (d < s.r + 18) h += (s.h - h) * (1 - sm(s.r, s.r + 18, d)); } return h; }
