/* Earthfall infestation visual shader. WebGL1 / GLSL ES 1.00. */
window.EARTHFALL_FX = window.EARTHFALL_FX || {};
window.EARTHFALL_FX.infestation = {
  glsl: `
    float efHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float efNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(efHash(i), efHash(i+vec2(1.0,0.0)),f.x),
                 mix(efHash(i+vec2(0.0,1.0)), efHash(i+vec2(1.0,1.0)),f.x),f.y);
    }
    vec3 efInfest(vec3 base, vec2 uv, float time, float inside, float edge, sampler2D tex) {
      if (inside <= 0.0) return base;
      float m = clamp(inside,0.0,1.0);
      vec2 p = vec2(uv.x*1.7777778,uv.y);
      float phase = time*1.25663706;
      float pulse = 0.5 + 0.5*sin(phase);
      // Movement: 0.00020 board UV per second, or 1.2% per minute.
      vec2 drift = vec2(time*0.00020, time*0.000065);
      vec2 q = p*14.0 + drift*14.0;
      float a = efNoise(q);
      float b = efNoise(q*2.2+vec2(7.1,2.3));
      float veins = 1.0-smoothstep(0.075,0.23,abs(a-b));
      vec3 growth = texture2D(tex, uv*vec2(3.0,3.0)+drift).rgb;
      vec3 coral = vec3(0.62,0.095,0.047);
      vec3 deep = vec3(0.20,0.018,0.025);
      vec3 infection = mix(deep,coral,clamp(0.25+0.48*growth.r+0.20*veins,0.0,1.0));
      infection += vec3(0.075,0.011,0.004)*veins*(0.45+0.55*pulse);
      float rim = clamp(edge,0.0,1.0)*(0.65+0.35*pulse);
      infection += vec3(0.24,0.046,0.016)*rim;
      float rare = step(0.998,efNoise(floor(q*2.0)+vec2(21.0,4.0)));
      infection += vec3(0.07,0.016,0.13)*rare*rim;
      return mix(base,infection,m*0.78);
    }
  `
};
