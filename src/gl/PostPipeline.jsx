import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { U } from '../state/perception.js'
import { cortexVertex, cortexFragment } from '../shaders/cortex.js'
import {
  quadVertex, compositeFragment, brightFragment, blurFragment, displayFragment,
} from '../shaders/post.js'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const BG_SCALE = isTouch ? 0.4 : 0.5 // le shader le plus lourd tourne sur 1/4 des pixels
const BLOOM_SCALE = 0.25

/**
 * Pipeline de rendu (prend la main sur R3F, priorité 1) :
 *  1. cortex          → bgRT      (demi-résolution : le fond est flou par nature)
 *  2. scène 3D        → sceneRT   (le décor lit bgRT ; le noyau le réfracte)
 *  3. composite       → ping-pong (loupe, kaléidoscope, chroma, traînées)
 *  4. bloom           → 1/4 de résolution (extraction + 2 flous séparables)
 *  5. display         → écran     (bloom, voile de lisibilité, grain, sRGB)
 */
export default function PostPipeline() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const targets = useMemo(() => {
    const half = { type: THREE.HalfFloatType, depthBuffer: false }
    const t = {
      bg: new THREE.WebGLRenderTarget(1, 1, half),
      scene: new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: isTouch ? 0 : 4 }),
      a: new THREE.WebGLRenderTarget(1, 1, half),
      b: new THREE.WebGLRenderTarget(1, 1, half),
      bloomA: new THREE.WebGLRenderTarget(1, 1, half),
      bloomB: new THREE.WebGLRenderTarget(1, 1, half),
    }
    U.tBg.value = t.bg.texture
    return t
  }, [])

  const pass = useMemo(() => {
    const mat = (fragmentShader, uniforms, vertexShader = quadVertex) =>
      new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false })

    const cortex = mat(cortexFragment, {
      uTime: U.uTime, uRes: U.uRes, uMouse: U.uMouse, uDose: U.uDose, uBreath: U.uBreath,
      uSat: U.uSat, uGeo: U.uGeo, uFractal: U.uFractal, uHue: U.uHue, uPulse: U.uPulse,
    }, cortexVertex)
    const composite = mat(compositeFragment, {
      tScene: { value: null }, tPrev: { value: null },
      uTime: U.uTime, uRes: U.uRes, uMouse: U.uMouse, uBreath: U.uBreath, uChroma: U.uChroma,
      uTrail: U.uTrail, uKaleido: U.uKaleido, uSegments: U.uSegments, uPulse: U.uPulse, uLens: U.uLens,
    })
    const bright = mat(brightFragment, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: U.uThreshold })
    const blur = mat(blurFragment, { tMap: { value: null }, uDir: { value: new THREE.Vector2() } })
    const display = mat(displayFragment, {
      tMap: { value: null }, tBloom: { value: null }, uBloom: U.uBloom, uTime: U.uTime, uDose: U.uDose,
      uTone: U.uTone, uScrim: U.uScrim, uScrimAmt: U.uScrimAmt,
    })

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite)
    quad.frustumCulled = false
    const scene = new THREE.Scene()
    scene.add(quad)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    return { cortex, composite, bright, blur, display, quad, scene, camera, bloomTexel: new THREE.Vector2() }
  }, [])

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * dpr))
    const h = Math.max(1, Math.floor(size.height * dpr))
    targets.bg.setSize(Math.ceil(w * BG_SCALE), Math.ceil(h * BG_SCALE))
    targets.scene.setSize(w, h)
    targets.a.setSize(w, h)
    targets.b.setSize(w, h)
    const bw = Math.ceil(w * BLOOM_SCALE)
    const bh = Math.ceil(h * BLOOM_SCALE)
    targets.bloomA.setSize(bw, bh)
    targets.bloomB.setSize(bw, bh)
    pass.bright.uniforms.uTexel.value.set(1 / w, 1 / h)
    pass.bloomTexel.set(1 / bw, 1 / bh)
    U.uRes.value.set(w, h)
  }, [size, dpr, targets, pass])

  useEffect(
    () => () => {
      Object.values(targets).forEach((t) => t.dispose())
      ;['cortex', 'composite', 'bright', 'blur', 'display'].forEach((k) => pass[k].dispose())
      pass.quad.geometry.dispose()
    },
    [targets, pass]
  )

  const flip = useRef(false)

  const draw = (material, target) => {
    pass.quad.material = material
    gl.setRenderTarget(target)
    gl.render(pass.scene, pass.camera)
  }

  useFrame(({ scene, camera }) => {
    const read = flip.current ? targets.b : targets.a
    const write = flip.current ? targets.a : targets.b

    // 1. Fond (demi-résolution)
    draw(pass.cortex, targets.bg)

    // 2. Scène 3D
    gl.setRenderTarget(targets.scene)
    gl.render(scene, camera)

    // 3. Composite + feedback
    pass.composite.uniforms.tScene.value = targets.scene.texture
    pass.composite.uniforms.tPrev.value = read.texture
    draw(pass.composite, write)

    // 4. Bloom (1/4 de résolution)
    pass.bright.uniforms.tMap.value = write.texture
    draw(pass.bright, targets.bloomA)
    const t = pass.bloomTexel
    const blurPass = (from, to, x, y) => {
      pass.blur.uniforms.tMap.value = from.texture
      pass.blur.uniforms.uDir.value.set(t.x * x, t.y * y)
      draw(pass.blur, to)
    }
    blurPass(targets.bloomA, targets.bloomB, 1, 0)
    blurPass(targets.bloomB, targets.bloomA, 0, 1)
    blurPass(targets.bloomA, targets.bloomB, 2.2, 0)
    blurPass(targets.bloomB, targets.bloomA, 0, 2.2)

    // 5. Écran
    pass.display.uniforms.tMap.value = write.texture
    pass.display.uniforms.tBloom.value = targets.bloomA.texture
    draw(pass.display, null)

    flip.current = !flip.current
  }, 1)

  return null
}
