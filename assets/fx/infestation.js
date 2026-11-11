/* Earthfall: painterly infestation shader, WebGL1 / GLSL ES 1.00.
 * Repeating tex = assets/board/infestation.jpg. Painting stays visible. */
window.EARTHFALL_FX = window.EARTHFALL_FX || {};
window.EARTHFALL_FX.infestation = {
  glsl: `
    float efHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float efNoise(vec2 p) {
      vec2 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(efHash(i),efHash(i+vec2(1.0,0.0)),f.x),
                 mix(efHash(i+vec2(0.0,1.0)),efHash(i+vec2(1.0,1.0)),f.x),f.y);
    }
    vec3 efInfest(vec3 base, vec2 uv, float time, float inside, float edge, sampler2D tex) {
      if (inside <= 0.0) return base;
      float m=clamp(inside,0.0,1.0);
      float rim=clamp(edge,0.0,1.0)*m;
      float pulse=0.5+0.5*sin(time*1.2566370614);
      // Square features on the 16:9 map; drift <1% of board per minute.
      vec2 drift=vec2(time*0.00012,time*0.00005);
      vec2 boardUV=uv*vec2(1.7777778,1.0);
      vec3 organic=texture2D(tex,(boardUV+drift)*24.0).rgb;
      float structure=clamp(organic.r*1.4-organic.g*0.5,0.0,1.0);
      // Multiply the painted linear RGB rather than replacing with opaque coral.
      vec3 tint=base*vec3(0.83-0.09*structure,0.68-0.07*structure,0.73-0.07*structure);
      vec3 color=mix(base,tint,m*0.32); // max 32% replacement
      // Domain-warped iso-contours: dark branching fissure, thin lit vein core.
      vec2 q=(boardUV+drift)*24.0;
      float warp=efNoise(q*0.38+vec2(4.6,12.7));
      float field=efNoise(q*0.82+vec2(2.2*warp,-1.8*warp));
      float d=abs(field-0.50);
      float crack=1.0-smoothstep(0.025,0.098,d);
      float vein=1.0-smoothstep(0.0,0.014,d);
      color*=1.0-(0.40+0.11*structure)*crack*m;
      color+=vec3(0.070,0.014,0.008)*vein*m*(0.72+0.28*pulse);
      color+=vec3(0.055,0.013,0.008)*rim*(0.70+0.30*pulse);
      float glint=step(0.9988,efHash(floor(q*0.28)+vec2(19.0,13.0)));
      color+=vec3(0.018,0.006,0.025)*glint*vein*rim;
      return max(color,vec3(0.0));
    }
  `
};
