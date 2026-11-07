import { noise, palette } from './common.js'

/**
 * Fond plein écran : le « cortex ». Rendu dans une texture en DEMI-résolution
 * (4× moins de pixels) puis réutilisé par le décor et par la réfraction du noyau.
 * - fbm à domaine déformé pour les textures organiques
 * - projection log-polaire (rétine → cortex V1) pour les constantes de forme de Klüver
 * - ensemble de Julia pour l'étape fractale
 */
export const cortexVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const cortexFragment = /* glsl */ `
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;
uniform float uDose;
uniform float uBreath;
uniform float uSat;
uniform float uGeo;
uniform float uFractal;
uniform float uHue;
uniform float uPulse;
varying vec2 vUv;

${noise}
${palette}

float stripe(float x, float w) {
  float s = abs(fract(x) - 0.5);
  return 1.0 - smoothstep(0.0, w, s);
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p += uMouse * 0.05 * uDose;
  float t = uTime;
  float r = length(p);

  // Respiration + onde
  p *= 1.0 + uBreath * 0.06 * sin(t * 0.8 - r * 4.0)
           + uPulse * 0.16 * sin(r * 14.0 - t * 5.0) * exp(-r * 2.0);
  r = length(p);

  // Domain warping à 2 niveaux (3 fbm au lieu de 5 : ~2× moins cher)
  vec3 q3 = vec3(p * 1.35, t * 0.045);
  vec2 q = vec2(fbm3(q3), fbm3(q3 + vec3(5.2, 1.3, 2.7)));
  float f = fbm4(vec3(p * 1.35 + 2.6 * q * (0.55 + uBreath * 0.45), t * 0.08));
  float f01 = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  float ql = length(q);

  // Monde clinique : blanc de laboratoire, marbrure nacrée qui se réveille avec la respiration
  vec3 lab = vec3(0.933, 0.941, 0.949);
  lab -= (0.02 + 0.05 * uBreath) * smoothstep(0.35, 0.95, f01);
  lab += (irid(f01 * 0.8 + ql * 0.5 + t * 0.02) - 0.5) * 0.06 * uBreath;

  // Monde profond
  vec3 deep = vec3(0.022, 0.02, 0.055);
  vec3 c1 = irid(f01 * 0.9 + ql * 0.7 + uHue + t * 0.015);
  vec3 vivid = mix(deep, c1, smoothstep(0.22, 0.98, f01 + ql * 0.3));
  float l = dot(vivid, vec3(0.299, 0.587, 0.114));
  vivid = mix(vec3(l), vivid, 0.55 + uSat * 0.9);
  vivid *= 0.5 + 0.5 * uSat;

  // Constantes de forme (coordonnées corticales log-polaires)
  if (uGeo > 0.01) {
    float ang = atan(p.y, p.x) / 3.14159265;
    float lr = log(r + 0.02);
    float zoom = t * 0.25;
    float tunnel  = stripe(lr * 3.0 - zoom, 0.2);
    float spiral  = stripe(lr * 3.0 + ang * 3.0 - zoom, 0.18);
    float lattice = clamp(stripe(lr * 4.0 - zoom, 0.1) + stripe(ang * 8.0 + t * 0.05, 0.1), 0.0, 1.0);
    float cobweb  = clamp(stripe(ang * 12.0, 0.06)
                  + stripe(lr * 2.0 - zoom * 0.5 + 0.15 * sin(ang * 3.14159265 * 12.0), 0.08), 0.0, 1.0);
    float cyc = mod(t * 0.06, 4.0);
    float wT = clamp(1.0 - abs(cyc), 0.0, 1.0) + clamp(1.0 - abs(cyc - 4.0), 0.0, 1.0);
    float wS = clamp(1.0 - abs(cyc - 1.0), 0.0, 1.0);
    float wL = clamp(1.0 - abs(cyc - 2.0), 0.0, 1.0);
    float wC = clamp(1.0 - abs(cyc - 3.0), 0.0, 1.0);
    float geo = (tunnel * wT + spiral * wS + lattice * wL + cobweb * wC) * smoothstep(0.0, 0.1, r);
    vec3 geoCol = irid(lr * 0.3 + ang * 0.5 + t * 0.05 + uHue);
    vivid = mix(vivid, vivid * 0.35 + geoCol * 1.25, geo * uGeo);
  }

  // Ensemble de Julia (calculé seulement quand il est visible)
  if (uFractal > 0.01) {
    vec2 z = (p - vec2(0.38 * min(aspect, 1.6) - 0.3, 0.0)) * 1.7 / (1.0 + 0.35 * sin(t * 0.1)); // décalé vers le noyau
    float a = t * 0.07;
    z = mat2(cos(a), -sin(a), sin(a), cos(a)) * z;
    vec2 c = 0.7885 * vec2(cos(t * 0.11 + 2.6), sin(t * 0.11 + 2.6));
    float it = 0.0;
    for (int i = 0; i < 72; i++) {
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      if (dot(z, z) > 256.0) break;
      it += 1.0;
    }
    float sm = it - log2(max(log2(dot(z, z)), 1e-4)) + 4.0;
    float fr = clamp(sm / 72.0, 0.0, 1.0);
    vec3 fcol = irid(sqrt(fr) * 4.0 + uHue + t * 0.02) * (0.15 + 0.85 * smoothstep(0.0, 0.2, fr));
    fcol = it >= 71.0 ? vivid * 0.35 + irid(f01 + t * 0.03) * 0.15 : fcol;
    vivid = mix(vivid, fcol, uFractal);
  }

  vec3 col = mix(lab, vivid, uDose);
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0); // pipeline linéaire
}
`

/** Décor : simple lecture de la texture du cortex (quasi gratuit en pleine résolution). */
export const backdropFragment = /* glsl */ `
uniform sampler2D tBg;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tBg, vUv);
}
`
