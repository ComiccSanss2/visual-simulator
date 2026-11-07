import { useMemo } from 'react'
import * as THREE from 'three'
import { U } from '../state/perception.js'
import { cortexVertex, backdropFragment } from '../shaders/cortex.js'

/** Décor plein écran : affiche la texture du cortex (calculée en demi-résolution par PostPipeline). */
export default function Backdrop() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { tBg: U.tBg },
        vertexShader: cortexVertex.replace('0.0, 1.0);', '0.9999, 1.0);'),
        fragmentShader: backdropFragment,
        depthWrite: false,
        depthTest: false,
      }),
    []
  )
  return (
    <mesh frustumCulled={false} renderOrder={-1000} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
