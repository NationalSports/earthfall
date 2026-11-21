import * as THREE from 'three';

// A bounded precipitation field follows the camera; rings are reused rather than allocated per splash.
export function createWeather(group, H, profile, world) {
  const rain = profile.rain > 0, count = rain ? Math.round(1100 * profile.rain) : profile.dust > 0 ? 600 : 0;
  const drops = [], positions = new Float32Array(count * (rain ? 6 : 3));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = rain
    ? new THREE.LineBasicMaterial({ color: world === 'kepler' ? 0xc9b8e0 : 0xb8cfdf, transparent: true, opacity: 0.25, depthWrite: false })
    : new THREE.PointsMaterial({ color: 0x9b9290, size: 0.13, transparent: true, opacity: 0.3 * profile.dust, depthWrite: false });
  const field = rain ? new THREE.LineSegments(geometry, material) : new THREE.Points(geometry, material);
  field.frustumCulled = false; field.name = rain ? 'mission-rain' : 'mining-dust'; group.add(field);
  for (let i = 0; i < count; i++) drops.push({ x: (Math.random() - 0.5) * 48, z: (Math.random() - 0.5) * 48, y: Math.random() * 24, first: true });
  const rings = [], dummy = new THREE.Object3D(); let ringI = 0;
  const splash = new THREE.InstancedMesh(new THREE.RingGeometry(0.82, 1, 12), new THREE.MeshBasicMaterial({ color: 0xbed9e7, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), 80);
  splash.name = 'rain-splashes'; splash.frustumCulled = false; splash.count = rain ? 80 : 0; group.add(splash);
  for (let i = 0; i < 80; i++) { rings.push({ life: 0 }); dummy.scale.setScalar(0); dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix); }
  let time = 0;
  return {
    dispose() { group.remove(field, splash); geometry.dispose(); material.dispose(); splash.geometry.dispose(); splash.material.dispose(); },
    update(dt, camera) {
      time += dt;
      for (let i = 0; i < count; i++) {
        const p = drops[i];
        if (p.first || Math.abs(p.x - camera.x) > 26 || Math.abs(p.z - camera.z) > 26) {
          p.x = camera.x + (Math.random() - 0.5) * 48; p.z = camera.z + (Math.random() - 0.5) * 48;
          p.y = Math.max(H(p.x, p.z), camera.y - 5) + Math.random() * 24; p.first = false;
        }
        p.x += profile.wind[0] * dt; p.z += profile.wind[1] * dt;
        const floor = H(p.x, p.z) + 0.12;
        p.y -= (rain ? 25 : 0.7) * dt;
        if (p.y < floor) {
          if (rain && Math.random() < 0.3) { const s = rings[ringI++ % rings.length]; s.x = p.x; s.z = p.z; s.y = floor; s.life = 0.5; }
          p.y = Math.max(floor, camera.y) + 14 + Math.random() * 8;
        }
        const j = i * (rain ? 6 : 3); positions[j] = p.x; positions[j + 1] = p.y; positions[j + 2] = p.z;
        if (rain) { positions[j + 3] = p.x - profile.wind[0] * 0.035; positions[j + 4] = p.y + 0.8; positions[j + 5] = p.z - profile.wind[1] * 0.035; }
        else positions[j + 1] += Math.sin(time + i) * 0.3;
      }
      geometry.attributes.position.needsUpdate = true;
      if (rain) { for (let i = 0; i < rings.length; i++) { const s = rings[i]; s.life = Math.max(0, s.life - dt); dummy.position.set(s.x || 0, s.y || 0, s.z || 0); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.setScalar(s.life > 0 ? (0.5 - s.life) * 1.5 : 0); dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix); } splash.instanceMatrix.needsUpdate = true; }
    }
  };
}

// Wetness is a material response: darkened pores, low-roughness puddles and moving rain normals.
// Shared by every wet surface: the mirrored lights texture and its projection (reflect.js fills these in each frame).
export const WET_REFL = { uRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 } };
export function wetSurface(material, wetness, time) {
  if (!wetness) return material;
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey.bind(material); material.customProgramCacheKey = () => previousKey() + 'wet-surface-' + wetness;
  material.onBeforeCompile = shader => {
    previous.call(material, shader); shader.uniforms.uWetTime = time; Object.assign(shader.uniforms, WET_REFL);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWetPosition; varying float vWetSlope; varying vec4 vReflUv; uniform mat4 uReflMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWetPosition = (modelMatrix * vec4(position, 1.0)).xyz; vReflUv = uReflMat * vec4(vWetPosition, 1.0); vWetSlope = abs(normalize(mat3(modelMatrix) * normal).y);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWetPosition; varying float vWetSlope; uniform float uWetTime; float wetPool = 0.0; varying vec4 vReflUv; uniform sampler2D uRefl; uniform float uReflOn;
      float wetHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float wetNoise(vec2 p) { vec2 i = floor(p), f = smoothstep(0.0, 1.0, fract(p)); return mix(mix(wetHash(i), wetHash(i + vec2(1, 0)), f.x), mix(wetHash(i + vec2(0, 1)), wetHash(i + 1.0), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        wetPool = smoothstep(0.48, 0.67, wetNoise(vWetPosition.xz * 0.22)) * smoothstep(0.93, 0.995, vWetSlope) * ${wetness.toFixed(3)};
        diffuseColor.rgb *= mix(1.0, 0.5, min(1.0, wetPool + ${wetness.toFixed(3)} * 0.4)); /* wet ground is much darker than dry */`)
      .replace('#include <metalnessmap_fragment>', 'roughnessFactor = mix(roughnessFactor, 0.075, wetPool);\n#include <metalnessmap_fragment>')
      .replace('#include <opaque_fragment>', `if (uReflOn > 0.0) {
          // the city's lights mirrored in the wet ground, smeared along the view like streaks on asphalt; strongest in puddles
          vec2 ruv = vReflUv.xy / vReflUv.w + normal.xy * 0.025; float sp = 0.004 + 0.028 * roughnessFactor;
          vec3 rc = texture2D(uRefl, ruv).rgb * 0.24 + (texture2D(uRefl, ruv + vec2(0.0, sp)).rgb + texture2D(uRefl, ruv - vec2(0.0, sp)).rgb) * 0.19
            + (texture2D(uRefl, ruv + vec2(0.0, sp * 2.3)).rgb + texture2D(uRefl, ruv - vec2(0.0, sp * 2.3)).rgb) * 0.11 + (texture2D(uRefl, ruv + vec2(0.0, sp * 3.8)).rgb + texture2D(uRefl, ruv - vec2(0.0, sp * 3.8)).rgb) * 0.08;
          outgoingLight += rc * uReflOn * (0.3 * ${wetness.toFixed(3)} + 0.95 * wetPool);
        }
        #include <opaque_fragment>`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 cell = floor(vWetPosition.xz * 1.5), local = fract(vWetPosition.xz * 1.5) - vec2(wetHash(cell), wetHash(cell + 7.0));
        float distanceToRing = length(local), phase = fract(uWetTime * 0.8 + wetHash(cell + 13.0));
        float ripple = sin((distanceToRing - phase * 1.4) * 45.0) * exp(-abs(distanceToRing - phase * 1.4) * 20.0) * (1.0 - phase) * wetPool;
        normal = normalize(normal + (viewMatrix * vec4(local.x, 0.0, local.y, 0.0)).xyz * ripple * 0.09);`);
  };
  return material;
}
