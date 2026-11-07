import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { U, perception } from '../state/perception.js'
import { organicVertex, organicFragment } from '../shaders/organic.js'

// Centré au début et à la fin ; à droite (desktop) ou en haut (mobile) pendant le récit.
function layoutFor(stage, aspect) {
  const inStory = THREE.MathUtils.smoothstep(stage, 0.3, 0.9) * (1 - THREE.MathUtils.smoothstep(stage, 6.2, 6.8))
  if (aspect < 0.9) return { x: 0, y: -0.05 + inStory * 0.85, s: 0.62 }
  return { x: inStory * 1.55, y: -0.05 + inStory * 0.05, s: 0.82 + inStory * 0.06 }
}

export default function OrganicCore() {
  const ref = useRef()
  const viewport = useThree((s) => s.viewport)

  // Géométrie INDEXÉE : ~6× moins de sommets à déformer qu'une icosphère brute.
  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1.05, 48)
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    return mergeVertices(g)
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: U.uTime, uDose: U.uDose, uBreath: U.uBreath, uPulse: U.uPulse,
          uHue: U.uHue, tBg: U.tBg, uRes: U.uRes,
        },
        vertexShader: organicVertex,
        fragmentShader: organicFragment,
      }),
    []
  )

  useFrame((_, delta) => {
    const m = ref.current
    if (!m) return
    const dt = Math.min(delta, 1 / 20)
    const speed = perception.paused ? 0 : 1
    m.rotation.y += dt * (0.12 + U.uDose.value * 0.25) * speed
    m.rotation.x += dt * 0.05 * speed
    const l = layoutFor(perception.stage, viewport.aspect)
    m.position.x = THREE.MathUtils.damp(m.position.x, l.x, 3, dt)
    m.position.y = THREE.MathUtils.damp(m.position.y, l.y, 3, dt)
    const s = l.s * perception.intro * (1 + U.uPulse.value * 0.06)
    m.scale.setScalar(Math.max(THREE.MathUtils.damp(m.scale.x, s, 5, dt), 0.0001))
  })

  return <mesh ref={ref} geometry={geometry} material={material} />
}
