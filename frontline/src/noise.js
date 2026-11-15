// Smooth value noise for the wild ring of the big map: rolling, irregular hills instead of repeating sine waves.
const hash = (i, j) => { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
// about -1..1; the first octave is roughly 180 m across
export function fbm(x, z) { let s = 0, a = 1, f = 1 / 180, n = 0; for (let o = 0; o < 4; o++) { s += (vnoise(x * f + o * 17.3, z * f - o * 9.1) * 2 - 1) * a; n += a; a *= 0.5; f *= 2.1; } return s / n; }
// Ridged noise, 0..1: sharp crests where the smooth noise crosses zero, broad valleys in between.
export function ridge(x, z) { const n = fbm(x * 0.85 + 31.7, z * 0.85 - 17.3), r = Math.max(0, 1 - Math.abs(n) * 2.2); return r * r * (3 - 2 * r); }
// Open country beyond the city: ridges, valleys and rolling ground, 0 at the city edge rising to full strength.
export function wild(x, z, amp) { return ridge(x, z) * amp + fbm(x * 1.7 - 5, z * 1.7 + 9) * amp * 0.3 - amp * 0.25; }
