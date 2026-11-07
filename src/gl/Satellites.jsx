import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U, perception } from '../state/perception.js'

const KNOTS = [
  { p: 2, q: 3, radius: 2.3, speed: 0.22, offset: 0.0, scale: 0.42 },
  { p: 3, q: 5, radius: 2.8, speed: -0.16, offset: 2.1, scale: 0.34 },
  { p: 2, q: 5, radius: 2.0, speed: 0.19, offset: 4.2, scale: 0.28 },
]

function Knot({ p, q, radius, speed, offset, scale, material }) {
  const ref = useRef()
  useFrame((state, delta) => {
    const m = ref.current
    const t = U.uTime.value
    const dt = Math.min(delta, 1 / 20) * (perception.paused ? 0 : 1)
    const a = t * speed + offset
    const spread = 0.75 + U.uDose.value * 0.35
    m.position.set(Math.cos(a) * radius * spread, Math.sin(a * 0.7) * radius * 0.45, Math.sin(a) * radius * 0.6 - 0.6)
    m.rotation.x += dt * 0.5
    m.rotation.y += dt * 0.7
    m.scale.setScalar(Math.max(scale * (0.75 + U.uDose.value * 0.4) * perception.intro, 0.0001))
  })
  return (
    <mesh ref={ref} material={material}>
      <torusKnotGeometry args={[0.6, 0.18, 160, 20, p, q]} />
    </mesh>
  )
}

function Crystals({ count = 70 }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const dir = new THREE.Vector3().randomDirection()
        return {
          dir,
          dist: 3.2 + Math.random() * 2.4,
          spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.2),
          size: 0.04 + Math.random() * 0.09,
          phase: Math.random() * Math.PI * 2,
        }
      }),
    [count]
  )

  useFrame(() => {
    const t = U.uTime.value
    const dose = U.uDose.value
    seeds.forEach((s, i) => {
      const breathe = 1 + Math.sin(t * 0.9 + s.phase) * 0.06 * (0.3 + dose)
      dummy.position.copy(s.dir).multiplyScalar(s.dist * breathe)
      dummy.rotation.set(t * s.spin.x, t * s.spin.y, t * s.spin.z)
      dummy.scale.setScalar(s.size * (0.4 + dose * 0.9) * perception.intro)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.rotation.y = t * 0.04
    ref.current.rotation.z = t * 0.015
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.12} flatShading />
    </instancedMesh>
  )
}

export default function Satellites() {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4f4f6',
        metalness: 0.85,
        roughness: 0.14,
        iridescence: 1,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [120, 640],
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    []
  )
  return (
    <group>
      {KNOTS.map((k, i) => (
        <Knot key={i} {...k} material={material} />
      ))}
      <Crystals />
    </group>
  )
}
