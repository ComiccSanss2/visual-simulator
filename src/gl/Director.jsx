import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fx, perception, sampleStage, U, FX_LIST } from '../state/perception.js'

const target = {}
const root = typeof document !== 'undefined' ? document.documentElement : null
const damp = THREE.MathUtils.damp

/**
 * Chef d'orchestre : scroll → cibles d'effets → amortissement → uniforms.
 * Le DOM n'est touché que lorsque l'encre bascule (classe .is-deep), jamais à chaque frame.
 */
export default function Director() {
  const aspect = useThree((s) => s.viewport.aspect)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    sampleStage(perception.stage, target)

    const k = perception.intensity
    for (const key of FX_LIST) {
      let goal = target[key]
      if (key === 'dose') goal *= Math.min(k, 1)
      else if (key !== 'scrim') goal *= k
      if (perception.paused && key === 'trail') goal = 0
      fx[key] = damp(fx[key], goal, 3.2, dt)
    }
    fx.vel = damp(fx.vel, Math.min(Math.abs(perception.velocity) / 45, 1), 5, dt)

    if (!perception.paused) U.uTime.value += dt * (0.7 + fx.dose * 0.5)
    U.uDose.value = fx.dose
    U.uBreath.value = fx.breath + fx.vel * 0.4
    U.uChroma.value = fx.chroma + fx.vel * 0.9 * Math.min(k, 1)
    U.uTrail.value = Math.min(fx.trail, 0.95)
    U.uGeo.value = fx.geo
    U.uKaleido.value = fx.kaleido
    U.uFractal.value = fx.fractal < 0.01 ? 0 : fx.fractal
    U.uSat.value = fx.sat
    U.uHue.value = perception.stage * 0.11
    U.uLens.value = (0.18 + fx.dose * 0.55) * Math.min(k, 1) * perception.intro
    U.uMouse.value.lerp(perception.mouse, 1 - Math.exp(-5 * dt))
    U.uSegments.value = damp(U.uSegments.value, Math.round(perception.segments), 6, dt)
    perception.pulse = damp(perception.pulse, 0, 1.6, dt)
    U.uPulse.value = perception.pulse

    // Bloom : seulement les reflets en mode clair, généreux en mode profond
    U.uThreshold.value = 0.95 - fx.dose * 0.45
    U.uBloom.value = (0.35 + fx.dose * 0.6) * Math.min(k, 1.2)

    // Encre binaire avec hystérésis : jamais de gris sur gris
    const wantDeep = perception.tone ? fx.dose > 0.35 : fx.dose > 0.5
    if (wantDeep !== !!perception.tone) {
      perception.tone = wantDeep ? 1 : 0
      root?.classList.toggle('is-deep', wantDeep)
    }
    U.uTone.value = damp(U.uTone.value, perception.tone, 4, dt)

    // Voile de lisibilité : colonne de gauche (desktop) ou bas d'écran (mobile)
    if (aspect < 0.9) U.uScrim.value.set(0, 1, 0.1, 0.55)
    else U.uScrim.value.set(1, 0, 0.3, 0.68)
    U.uScrimAmt.value = fx.scrim
  })
  return null
}
