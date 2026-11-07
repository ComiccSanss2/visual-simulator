import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import Director from './Director.jsx'
import Backdrop from './Backdrop.jsx'
import OrganicCore from './OrganicCore.jsx'
import Satellites from './Satellites.jsx'
import CameraRig from './CameraRig.jsx'
import PostPipeline from './PostPipeline.jsx'

const DEVICE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1
const clampDpr = (v) => Math.min(Math.max(v, 0.75), Math.min(DEVICE_DPR, 1.5))

export default function Experience() {
  // Résolution adaptative continue : 0.75 → 1.5 selon le framerate mesuré.
  const [dpr, setDpr] = useState(clampDpr(1.25))
  return (
    <Canvas
      flat
      dpr={dpr}
      camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 50 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      aria-hidden="true"
    >
      <PerformanceMonitor
        bounds={() => [50, 58]}
        flipflops={4}
        onChange={({ factor }) => setDpr(clampDpr(Math.round((0.75 + factor * 0.75) * 4) / 4))}
        onFallback={() => setDpr(0.75)}
      />
      <Director />
      <CameraRig />
      <Backdrop />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <OrganicCore />
      <Satellites />
      <Suspense fallback={null}>
        {/* Studio de lumière procédural : aucun fichier HDR à télécharger */}
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, -2]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#9a8cff" position={[-5, 1, -1]} scale={[3, 8, 1]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#5fe3d6" position={[5, -1, -1]} scale={[3, 8, 1]} rotation-y={-Math.PI / 2} />
          <Lightformer form="ring" intensity={1.5} color="#ff7ab3" position={[0, 0, 6]} scale={3} />
        </Environment>
      </Suspense>
      <PostPipeline />
    </Canvas>
  )
}
