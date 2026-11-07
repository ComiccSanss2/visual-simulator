import * as THREE from 'three'

/**
 * État partagé "hors React".
 * Tout ce qui change à 60 fps (scroll, souris, uniforms) vit ici, dans des objets
 * mutables lus dans useFrame — jamais dans un state React, pour éviter les re-rendus.
 */

const FX_KEYS = ['dose', 'breath', 'chroma', 'trail', 'geo', 'kaleido', 'fractal', 'sat', 'scrim']

// Intensité de chaque effet par étape (0 → 1).
// dose    : monde « clinique » (0) → monde « profond » (1). Valeurs volontairement
//           tranchées (≈0.15 ou ≥0.85) : jamais de fond gris moyen sous le texte.
// breath  : respiration / ondulation des surfaces
// chroma  : aberration chromatique
// trail   : traînées (feedback de l'image précédente)
// geo     : constantes de forme de Klüver
// kaleido : repliement kaléidoscopique
// fractal : ensemble de Julia
// sat     : saturation
// scrim   : voile de lisibilité sous le texte des chapitres
export const STAGES = [
  { key: 'seuil',       label: 'Seuil',        fx: [0.03, 0.15, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.0] },
  { key: 'respiration', label: 'Respiration',  fx: [0.14, 1.00, 0.15, 0.00, 0.00, 0.00, 0.00, 0.30, 1.0] },
  { key: 'couleur',     label: 'Couleur',      fx: [0.88, 0.60, 1.00, 0.10, 0.00, 0.00, 0.00, 1.00, 1.0] },
  { key: 'trainees',    label: 'Traînées',     fx: [0.90, 0.50, 0.50, 1.00, 0.10, 0.00, 0.00, 0.80, 1.0] },
  { key: 'geometries',  label: 'Géométries',   fx: [1.00, 0.40, 0.40, 0.40, 1.00, 0.00, 0.00, 0.85, 1.0] },
  { key: 'kaleido',     label: 'Kaléidoscope', fx: [1.00, 0.40, 0.60, 0.50, 0.60, 1.00, 0.00, 0.90, 1.0] },
  { key: 'fractales',   label: 'Fractales',    fx: [1.00, 0.30, 0.40, 0.30, 0.15, 0.30, 1.00, 1.00, 1.0] },
  { key: 'retour',      label: 'Retour',       fx: [0.03, 0.10, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.0] },
]

export const perception = {
  stage: 0,            // flottant 0 → 7, piloté par le scroll
  intensity: 1,        // curseur utilisateur 0 → 1.5
  paused: false,       // mode calme : le temps s'arrête
  mouse: new THREE.Vector2(),        // cible souris (-1 → 1)
  pulse: 0,            // onde (clic, changement d'étape)
  segments: 6,         // miroirs du kaléidoscope (cible)
  velocity: 0,         // vitesse de scroll (Lenis)
  intro: 0,            // 0 → 1 : séquence d'ouverture
  tone: 0,             // 0 = encre sombre, 1 = encre claire (seuil avec hystérésis)
}

// Valeurs courantes, amorties chaque frame vers la cible.
export const fx = Object.fromEntries([...FX_KEYS, 'vel'].map((k) => [k, 0]))

// Uniforms partagés par tous les shaders : une seule source de vérité.
export const U = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uMouse: { value: new THREE.Vector2() },
  uDose: { value: 0 },
  uBreath: { value: 0 },
  uChroma: { value: 0 },
  uTrail: { value: 0 },
  uGeo: { value: 0 },
  uKaleido: { value: 0 },
  uFractal: { value: 0 },
  uSat: { value: 0 },
  uHue: { value: 0 },
  uPulse: { value: 0 },
  uSegments: { value: 6 },
  uLens: { value: 0 },
  uTone: { value: 0 },
  uScrim: { value: new THREE.Vector4(1, 0, 0.3, 0.68) }, // direction xy, début, fin (en UV)
  uScrimAmt: { value: 0 },
  uBloom: { value: 0.3 },
  uThreshold: { value: 0.95 },
  tBg: { value: null }, // texture du fond "cortex", rendue en demi-résolution
}

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Cible des effets pour une position de scroll (plateau au centre de chaque étape). */
export function sampleStage(stage, out = {}) {
  const max = STAGES.length - 1
  const s = Math.min(Math.max(stage, 0), max)
  const i = Math.floor(s)
  const a = STAGES[i].fx
  const b = STAGES[Math.min(i + 1, max)].fx
  const t = smooth(0.3, 0.7, s - i)
  FX_KEYS.forEach((k, n) => {
    out[k] = a[n] + (b[n] - a[n]) * t
  })
  return out
}

export const FX_LIST = FX_KEYS
