import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U, perception } from '../state/perception.js'

/** Travelling d'ouverture, parallaxe souris et léger roulis en profondeur. */
export default function CameraRig() {
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const m = U.uMouse.value
    camera.position.x = THREE.MathUtils.damp(camera.position.x, m.x * 0.4, 2.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, m.y * 0.28, 2.5, dt)
    camera.position.z = 6.5 + (1 - perception.intro) * 3.5
    camera.lookAt(0, 0, 0)
    camera.rotation.z += Math.sin(U.uTime.value * 0.2) * 0.035 * U.uDose.value
  })
  return null
}
