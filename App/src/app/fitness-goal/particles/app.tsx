"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import * as THREE from "three"

// Import GLSL as raw strings via webpack rule
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"

type RGB = [number, number, number]

type CustomParticlesProps = {
  count: number
  seed: number
}

const CustomGeometryParticles = ({ count, seed }: CustomParticlesProps) => {
  const radius = 2
  const points = useRef<THREE.Points>(null!)
  const { gl, scene, camera } = useThree()
  const lastUseFrameTs = useRef<number>(performance.now())
  // Expose material globally to allow parent to update uniforms without re-rendering Canvas
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Position and pillar assignment (seeded deterministic)
  const { particlesPosition, pillarIds } = useMemo(() => {
    function mulberry32(a: number) {
      return function() {
        let t = (a += 0x6D2B79F5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }
    const rng = mulberry32(seed || 1)
    const positions = new Float32Array(count * 3)
    const ids = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(rng()) * radius
      const theta = (rng() * 2.0 - 1.0) * Math.PI
      const phi = rng() * 2.0 * Math.PI
      const x = r * Math.sin(theta) * Math.cos(phi)
      const y = r * Math.sin(theta) * Math.sin(phi)
      const z = r * Math.cos(theta)
      positions.set([x, y, z], i * 3)
      ids[i] = i % 4
    }
    return { particlesPosition: positions, pillarIds: ids }
  }, [count, seed])

  const uniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uRadius: { value: radius },
    uWeights: { value: new Float32Array([0, 0, 0, 0]) },
    uColors: { value: [new THREE.Vector3(0.245, 0.62, 0.043), new THREE.Vector3(0.231, 0.51, 0.965), new THREE.Vector3(0.545, 0.36, 0.965), new THREE.Vector3(0.984, 0.572, 0.235)] },
  }), [])

  // Capture material reference once
  useEffect(() => {
    if (!points.current) return
    materialRef.current = points.current.material as THREE.ShaderMaterial
    ;(globalThis as unknown as { __fitspoParticlesMaterial?: THREE.ShaderMaterial }).__fitspoParticlesMaterial = materialRef.current
  }, [])

  // Keep a manual time accumulator; we won't rely on r3f clock when frameloop is 'never'
  const manualTime = useRef<number>(0)
  useFrame(() => {
    // No-op when frameloop is 'never'; manual loop below drives rendering
    lastUseFrameTs.current = performance.now()
  })

  // Manual render loop that runs independent of rAF
  useEffect(() => {
    let mounted = true
    let last = performance.now()
    const iv = window.setInterval(() => {
      if (!mounted) return
      const now = performance.now()
      try {
        const mat = points.current.material as THREE.ShaderMaterial
        const dt = (now - last) / 1000
        manualTime.current += dt
        mat.uniforms.uTime.value = manualTime.current
        last = now
        gl.render(scene, camera)
      } catch { /* noop */ }
    }, 16)
    return () => { mounted = false; window.clearInterval(iv) }
  }, [gl, scene, camera])

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particlesPosition, 3]} />
        <bufferAttribute attach="attributes-aPillarId" args={[pillarIds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        transparent
      />
    </points>
  )
}

export function ParticlesScene({ colors, weights, count = 6000, seed = 1 }: { colors: [RGB, RGB, RGB, RGB]; weights: [number, number, number, number]; count?: number; seed?: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const portalRef = useRef<HTMLDivElement | null>(null)
  // Update shader uniforms when props change without re-rendering Canvas
  useEffect(() => {
    try {
      const mat = (globalThis as unknown as { __fitspoParticlesMaterial?: THREE.ShaderMaterial }).__fitspoParticlesMaterial
      if (!mat) return
      mat.uniforms.uWeights.value = new Float32Array(weights)
      mat.uniforms.uColors.value = colors.map((c) => new THREE.Vector3(c[0], c[1], c[2]))
    } catch { /* ignore */ }
  }, [colors, weights])
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!portalRef.current) {
      const el = document.createElement('div')
      el.style.position = 'fixed'
      el.style.pointerEvents = 'none'
      el.style.zIndex = '0'
      portalRef.current = el
      document.body.appendChild(el)
    }
    const updateRect = () => {
      const host = hostRef.current
      const el = portalRef.current
      if (!host || !el) return
      const r = host.getBoundingClientRect()
      el.style.left = r.left + 'px'
      el.style.top = r.top + 'px'
      el.style.width = r.width + 'px'
      el.style.height = r.height + 'px'
    }
    updateRect()
    const ro = new ResizeObserver(updateRect)
    if (hostRef.current) ro.observe(hostRef.current)
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      try { ro.disconnect() } catch { /* ignore disconnect errors */ }
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
      const el = portalRef.current
      if (el && el.parentNode) el.parentNode.removeChild(el)
      portalRef.current = null
    }
  }, [])

  const canvas = (
      <Canvas
        camera={{ position: [2.0, 2.0, 2.0], fov: 50 }}
        frameloop="always"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          try {
            const canvas = gl.domElement
            canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault() }, false)
            canvas.addEventListener('webglcontextrestored', () => {
              try { gl.resetState() } catch { /* ignore */ }
            }, false)
          } catch { /* ignore */ }
        }}
      >
        <ambientLight intensity={0.5} />
        <CustomGeometryParticles count={count} seed={seed} />
      </Canvas>
  )

  return (
    <div ref={hostRef} className="absolute inset-0">
      {portalRef.current ? createPortal(canvas, portalRef.current) : null}
    </div>
  )
}

export default ParticlesScene
