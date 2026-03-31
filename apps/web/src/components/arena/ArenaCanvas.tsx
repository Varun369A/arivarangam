'use client'

import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Float, MeshReflectorMaterial } from '@react-three/drei'

import * as THREE from 'three'
import { CharacterFigure, type CharacterState } from './CharacterFigure'
import { CHARACTERS, CHARACTER_ORDER } from '@/lib/characters'

// ─── Arena Floor (reflective) ─────────────────────────────────────────────────

function ArenaFloor() {
  return (
    <group>
      {/* Reflective floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={512}
          mixBlur={0.8}
          mixStrength={20}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050510"
          metalness={0.6}
          mirror={0}
        />
      </mesh>

      {/* Grid overlay */}
      <gridHelper args={[40, 40, '#1a1040', '#0d0826']} position={[0, 0.002, 0]} />

      {/* Center stage glow ring — Claude's spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.9, 1.05, 64]} />
        <meshStandardMaterial
          color="#D97706"
          emissive="#D97706"
          emissiveIntensity={1.5}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial
          color="#D97706"
          emissive="#D97706"
          emissiveIntensity={0.4}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ─── Ambient Particles ────────────────────────────────────────────────────────

const PARTICLE_COUNT = 600
const PARTICLE_POSITIONS = (() => {
  const arr = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    arr[i * 3]     = (Math.random() - 0.5) * 28
    arr[i * 3 + 1] = Math.random() * 12
    arr[i * 3 + 2] = (Math.random() - 0.5) * 28
  }
  return arr
})()

function AmbientParticles() {
  const points = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (points.current) {
      points.current.rotation.y = clock.getElapsedTime() * 0.04
      points.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.02) * 0.05
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={PARTICLE_POSITIONS}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#8B5CF6" transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

// ─── Floating Orbs ────────────────────────────────────────────────────────────

function FloatingOrb({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh position={position}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.7}
        />
      </mesh>
      <pointLight position={position} color={color} intensity={0.3} distance={3} />
    </Float>
  )
}

// ─── Scene Lighting ───────────────────────────────────────────────────────────

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.12} color="#1a1060" />

      <directionalLight
        position={[3, 9, 6]}
        intensity={1.1}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      <directionalLight position={[-8, 4, -3]} intensity={0.4} color="#4040CC" />
      <directionalLight position={[0, 3, -10]} intensity={0.3} color="#6030A0" />

      <spotLight
        position={[0, 8, 1]}
        angle={0.35}
        penumbra={0.6}
        intensity={2.5}
        color="#FEF3C7"
        castShadow
        target-position={[0, 0, 0]}
      />
    </>
  )
}

// ─── Main Arena Canvas ────────────────────────────────────────────────────────

interface ArenaCanvasProps {
  characterStates: Record<string, CharacterState>
}

export function ArenaCanvas({ characterStates }: ArenaCanvasProps) {
  const defaultState: CharacterState = { action: 'idle', targetPosition: null, speech: null }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 3.2, 11], fov: 48 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: '#060610' }}
    >
      <fog attach="fog" args={['#060610', 20, 40]} />

      <SceneLighting />

      <Stars radius={35} depth={25} count={2500} factor={2.2} fade speed={0.4} />

      <FloatingOrb position={[-8, 4, -5]}  color="#6366f1" />
      <FloatingOrb position={[8, 3.5, -4]} color="#8B5CF6" />
      <FloatingOrb position={[0, 6, -8]}   color="#0D9488" />
      <FloatingOrb position={[-4, 2.5, 4]} color="#D97706" />
      <FloatingOrb position={[5, 2, 3]}    color="#10B981" />

      <AmbientParticles />

      {/* Suspense boundary for MeshReflectorMaterial (uses render target) */}
      <Suspense fallback={null}>
        <ArenaFloor />
      </Suspense>

      {CHARACTER_ORDER.map(id => (
        <CharacterFigure
          key={id}
          character={CHARACTERS[id]}
          state={characterStates[id] ?? defaultState}
          isActive={id === 'claude'}
        />
      ))}

    </Canvas>
  )
}
