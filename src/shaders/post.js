import { palette } from './common.js'

export const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * Composite (ping-pong) : loupe sous la souris → respiration → kaléidoscope
 * → aberration chromatique → traînées (frame précédente réinjectée).
 */
export const compositeFragment = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tPrev;
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;
uniform float uBreath;
uniform float uChroma;
uniform float uTrail;
uniform float uKaleido;
uniform float uSegments;
uniform float uPulse;
uniform float uLens;
varying vec2 vUv;

${palette}

vec2 mirror(vec2 uv) {
  return 1.0 - abs(mod(uv, 2.0) - 1.0);
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);

  // Loupe tourbillonnante qui suit la souris
  vec2 mc = uMouse * 0.5 * vec2(aspect, 1.0);
  vec2 d = c - mc;
  float lens = exp(-dot(d, d) * 14.0) * uLens;
  float sw = lens * 1.4;
  d = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * d * (1.0 - lens * 0.3);
  c = mc + d;

  float r = length(c);
  c *= 1.0 + uBreath * 0.022 * sin(uTime * 1.1 - r * 6.0)
           + uPulse * 0.035 * sin(r * 18.0 - uTime * 7.0) * exp(-r * 3.0);

  if (uKaleido > 0.001) {
    float a = atan(c.y, c.x) + uTime * 0.06 + uMouse.y * 0.6;
    float seg = 6.28318 / max(uSegments, 2.0);
    float ka = abs(mod(a, seg) - seg * 0.5);
    vec2 kc = vec2(cos(ka), sin(ka)) * length(c) * (1.0 + 0.15 * sin(uTime * 0.3));
    c = mix(c, kc, uKaleido);
  }

  vec2 suv = mirror(c / vec2(aspect, 1.0) + 0.5);

  vec2 dir = (suv - 0.5) * uChroma * 0.02 + d * lens * 0.04;
  vec3 col;
  col.r = texture2D(tScene, mirror(suv + dir)).r;
  col.g = texture2D(tScene, suv).g;
  col.b = texture2D(tScene, mirror(suv - dir)).b;

  if (uTrail > 0.001) {
    vec2 pc = vUv - 0.5;
    float ra = 0.004 * uTrail;
    pc = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * pc * (1.0 - 0.006 * uTrail);
    vec3 prev = max(hueShift(texture2D(tPrev, pc + 0.5).rgb, 0.05 * uTrail), 0.0);
    col = mix(col, max(col, prev * 0.965), uTrail * 0.9);
  }

  gl_FragColor = vec4(col, 1.0);
}
`

/** Bloom 1/2 : extraction des hautes lumières + réduction 4× (filtre 4 taps). */
export const brightFragment = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture2D(tMap, vUv + uTexel * vec2( 1.0, -1.0)).rgb
         + texture2D(tMap, vUv + uTexel * vec2(-1.0,  1.0)).rgb
         + texture2D(tMap, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.45, l), 1.0);
}
`

/** Bloom 2/2 : flou gaussien séparable 9 taps (5 lectures grâce au filtrage linéaire). */
export const blurFragment = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * 0.2270270270;
  c += texture2D(tMap, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tMap, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tMap, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(tMap, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}
`

/**
 * Sortie écran : bloom + voile de lisibilité + vignette + grain + sRGB.
 * Le voile est calculé DANS l'image : il assombrit (ou éclaircit) la zone du texte,
 * quelle que soit la couleur des effets en dessous.
 */
export const displayFragment = /* glsl */ `
uniform sampler2D tMap;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uTime;
uniform float uDose;
uniform float uTone;
uniform vec4  uScrim;
uniform float uScrimAmt;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 col = texture2D(tMap, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;

  // uScrim = (direction xy, début, fin) : dégradé latéral (desktop) ou bas (mobile)
  float sl = dot(vUv, uScrim.xy);
  float s = (1.0 - smoothstep(uScrim.z, uScrim.w, sl));
  s *= s * (3.0 - 2.0 * s);
  vec3 paper = mix(vec3(0.86, 0.875, 0.89), vec3(0.0012, 0.001, 0.0035), uTone);
  col = mix(col, paper, s * uScrimAmt * mix(0.72, 0.94, uTone));

  float v = smoothstep(1.2, 0.3, length(vUv - 0.5));
  col *= mix(1.0, v, 0.18 + uDose * 0.5);
  col = col / (1.0 + col * 0.12 * uDose); // compression douce des hautes lumières
  gl_FragColor = vec4(max(col, 0.0), 1.0);
  #include <colorspace_fragment>
  // Grain de pellicule, appliqué après la conversion sRGB (uniforme dans les noirs)
  float g = hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5;
  gl_FragColor.rgb += g * (0.018 + uDose * 0.012);
}
`
