import { noise, palette } from './common.js'

/**
 * Noyau en "verre liquide" :
 * - vertex : sphère déplacée par bruit, normales recalculées (méthode des tangentes)
 * - fragment : réfraction du fond (texture du cortex) avec dispersion RGB,
 *   film mince irisé sur les bords, double spéculaire (clé + contre-jour).
 */
export const organicVertex = /* glsl */ `
uniform float uTime;
uniform float uDose;
uniform float uBreath;
uniform float uPulse;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

${noise}

float disp(vec3 p) {
  float n  = snoise(p * 1.1 + vec3(0.0, 0.0, uTime * 0.22));
  float n2 = snoise(p * 3.0 - vec3(uTime * 0.3)) * 0.28;
  float amp = 0.09 + uDose * 0.24 + uBreath * 0.09 * (0.5 + 0.5 * sin(uTime * 0.8));
  return (n + n2) * amp + uPulse * 0.1 * sin(length(p) * 9.0 - uTime * 6.0);
}

vec3 displaced(vec3 p) {
  return p + normalize(p) * disp(p);
}

void main() {
  vec3 n = normalize(position);
  vec3 helper = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tA = normalize(cross(n, helper));
  vec3 tB = cross(n, tA);
  float rad = length(position);
  float e = 0.015;

  float d0 = disp(position);
  vec3 p0 = position + n * d0;
  vec3 pa = displaced(normalize(position + tA * e) * rad);
  vec3 pb = displaced(normalize(position + tB * e) * rad);
  vec3 dn = normalize(cross(pa - p0, pb - p0));
  if (dot(dn, n) < 0.0) dn = -dn;

  vDisp = d0;
  vNormal = normalize(normalMatrix * dn);
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

export const organicFragment = /* glsl */ `
uniform sampler2D tBg;
uniform vec2  uRes;
uniform float uTime;
uniform float uDose;
uniform float uHue;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

${palette}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 2.4);

  // Réfraction + dispersion chromatique
  vec2 suv = gl_FragCoord.xy / uRes;
  vec2 off = N.xy * (0.07 + 0.11 * uDose);
  vec3 refr;
  refr.r = texture2D(tBg, suv - off).r;
  refr.g = texture2D(tBg, suv - off * 1.18).g;
  refr.b = texture2D(tBg, suv - off * 1.36).b;

  vec3 film = pow(irid(fres * 1.3 + vDisp * 1.8 + uHue + uTime * 0.03), vec3(2.2));

  vec3 L1 = normalize(vec3(0.5, 0.9, 0.7));
  vec3 L2 = normalize(vec3(-0.8, -0.3, -0.4));
  float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 64.0);
  float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 18.0);
  float diff = max(dot(N, L1), 0.0) * 0.5 + 0.5;

  // Monde clinique : verre nacré, silhouette nette (bord légèrement assombri)
  vec3 pearl = vec3(0.62, 0.64, 0.69) * diff;
  vec3 lightGlass = mix(refr * 0.95, pearl, 0.32) * (1.0 - 0.32 * smoothstep(0.35, 1.0, fres))
                  + film * fres * 0.7 + spec1 * 1.1 + spec2 * 0.12;
  // Monde profond : lentille lumineuse, film irisé intense (alimente le bloom)
  vec3 deepGlass = refr * 1.05 + film * (0.1 + fres * 1.8) + spec1 * 1.8 + spec2 * film * 0.6;

  gl_FragColor = vec4(max(mix(lightGlass, deepGlass, uDose), 0.0), 1.0);
}
`
