// Wet-street reflections of the city's lights. Each frame the scene's glowing things (neon signs, lamps; anything on the
// GLOW layer) are drawn once more from a camera mirrored under the ground, into a small texture. Wet surfaces (weather.js)
// look that texture up at their own screen spot, smeared along the view so it streaks like light on wet asphalt.
// Only the lights are drawn, so this costs a fraction of a real mirror.
import * as THREE from 'three';
import { WET_REFL } from './weather.js';
import { GLOW } from './signs.js';

export function createWetReflection(renderer) {
  const rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType, depthBuffer: true });
  const cam = new THREE.PerspectiveCamera(); cam.matrixAutoUpdate = false; cam.matrixWorldAutoUpdate = false; cam.layers.set(GLOW);
  const R = new THREE.Matrix4(), flipX = new THREE.Matrix4().makeScale(-1, 1, 1), bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1), clear = new THREE.Color(), size = new THREE.Vector2();
  WET_REFL.uRefl.value = rt.texture;
  return {
    // planeY: height of the street under the camera; amount: 0 switches the pass off
    update(scene, camera, planeY, amount, scale) {
      WET_REFL.uReflOn.value = amount; if (!amount) return;
      renderer.getDrawingBufferSize(size); const w = Math.max(64, Math.round(size.x * scale)), h = Math.max(64, Math.round(size.y * scale)); if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
      // mirror the camera in the plane y = planeY; flipping X keeps triangles facing the right way
      R.makeScale(1, -1, 1); R.elements[13] = 2 * planeY;
      cam.matrixWorld.multiplyMatrices(R, camera.matrixWorld); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      cam.projectionMatrix.multiplyMatrices(flipX, camera.projectionMatrix); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      WET_REFL.uReflMat.value.multiplyMatrices(bias, cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      const bg = scene.background, auto = renderer.shadowMap.autoUpdate, prev = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(); renderer.getClearColor(clear);
      scene.background = null; renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
      renderer.setRenderTarget(prev); renderer.setClearColor(clear, alpha); renderer.shadowMap.autoUpdate = auto; scene.background = bg;
    },
    dispose() { rt.dispose(); }
  };
}
