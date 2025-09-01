"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"

// Import GLSL as raw strings via webpack rule
import vertexShader from "./vertexShader.glsl"
import fragmentShader from "./fragmentShader.glsl"

type RGB = [number, number, number]

type CustomParticlesProps = {
  count: number
  colors: [RGB, RGB, RGB, RGB]
  weights: [number, number, number, number]
}

const CustomGeometryParticles = ({ count, colors, weights }: CustomParticlesProps) => {
  const radius = 2
  const points = useRef<THREE.Points>(null!)

  // Position and pillar assignment
  const { particlesPosition, pillarIds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const ids = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const distance = Math.sqrt(Math.random()) * radius
      const theta = THREE.MathUtils.randFloatSpread(360) * (Math.PI / 180)
      const phi = THREE.MathUtils.randFloatSpread(360) * (Math.PI / 180)
      const x = distance * Math.sin(theta) * Math.cos(phi)
      const y = distance * Math.sin(theta) * Math.sin(phi)
      const z = distance * Math.cos(theta)
      positions.set([x, y, z], i * 3)
      // Evenly distribute pillars 0..3
      ids[i] = i % 4
    }
    return { particlesPosition: positions, pillarIds: ids }
  }, [count])

  const uniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uRadius: { value: radius },
    uWeights: { value: new Float32Array(weights) },
    uColors: { value: colors.map((c) => new THREE.Vector3(c[0], c[1], c[2])) },
  }), [])

  // Update uniforms when inputs change
  useEffect(() => {
    if (!points.current) return
    const mat = points.current.material as THREE.ShaderMaterial
    mat.uniforms.uWeights.value = new Float32Array(weights)
    mat.uniforms.uColors.value = colors.map((c) => new THREE.Vector3(c[0], c[1], c[2]))
  }, [colors, weights])

  useFrame((state) => {
    const { clock } = state
    const mat = points.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particlesPosition.length / 3} array={particlesPosition} itemSize={3} />
        <bufferAttribute attach="attributes-aPillarId" count={pillarIds.length} array={pillarIds} itemSize={1} />
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

export function ParticlesScene({ colors, weights, count = 6000 }: { colors: [RGB, RGB, RGB, RGB]; weights: [number, number, number, number]; count?: number }) {
  return (
    <Canvas camera={{ position: [2.0, 2.0, 2.0], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <CustomGeometryParticles count={count} colors={colors} weights={weights} />
    </Canvas>
  )
}

export default ParticlesScene
