// Bundled on its own into dist/physics.js (Rapier is ~4 MB with its WebAssembly inlined) so the page stays small.
import RAPIER from '@dimforge/rapier3d-compat';
window.RAPIER = RAPIER;
