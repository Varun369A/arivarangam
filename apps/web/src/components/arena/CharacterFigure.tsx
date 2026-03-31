'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { CharacterConfig } from '@/lib/characters'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharacterAction =
  | 'idle'
  | 'walking'
  | 'talking'
  | 'waving'
  | 'thinking'
  | 'pointing'
  | 'celebrating'
  | 'listening'
  | 'calling'

export interface CharacterState {
  action: CharacterAction
  targetPosition: [number, number, number] | null
  speech: string | null
}

interface Props {
  character: CharacterConfig
  state: CharacterState
  isActive?: boolean   // Claude is "active" (brighter, front-and-center)
}

// ─── Character Figure ─────────────────────────────────────────────────────────

export function CharacterFigure({ character, state, isActive = false }: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const headGroup   = useRef<THREE.Group>(null)
  const bodyRef     = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftArmRef  = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftLegRef  = useRef<THREE.Group>(null)
  const glowRef     = useRef<THREE.PointLight>(null)

  // Current world position (used for walking lerp)
  const currentPos = useRef(new THREE.Vector3(...character.homePosition))
  const baseY      = useRef(character.homePosition[1])

  // Reset position when character returns home
  useEffect(() => {
    currentPos.current.set(...character.homePosition)
  }, [character.homePosition])

  useFrame(({ clock }, delta) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.getElapsedTime()

    // ── Movement ──────────────────────────────────────────────────────────────
    const targetVec = state.targetPosition
      ? new THREE.Vector3(...state.targetPosition)
      : new THREE.Vector3(...character.homePosition)

    if (state.action === 'walking') {
      currentPos.current.lerp(targetVec, delta * 1.8)
      g.position.set(currentPos.current.x, currentPos.current.y + baseY.current, currentPos.current.z)
      // Face walking direction
      const dir = targetVec.clone().sub(currentPos.current)
      if (dir.length() > 0.05) {
        const targetAngle = Math.atan2(dir.x, dir.z)
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetAngle, delta * 6)
      }
    } else {
      // Snap back to home when not walking
      currentPos.current.lerp(new THREE.Vector3(...character.homePosition), delta * 1.2)
      g.position.set(currentPos.current.x, currentPos.current.y + baseY.current, currentPos.current.z)
      // Face forward (toward camera)
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, delta * 4)
    }

    // ── Head & body animations ────────────────────────────────────────────────
    const head = headGroup.current
    const body = bodyRef.current

    if (head && body) {
      // Idle: gentle breathing bob + slight sway
      if (state.action === 'idle' || state.action === 'listening') {
        g.position.y += Math.sin(t * 1.4 + character.homePosition[0] * 0.5) * 0.025
        body.rotation.z = Math.sin(t * 0.9) * 0.015
        head.rotation.y = Math.sin(t * 0.6) * 0.12
        head.rotation.x = 0
      }

      // Talking: head nods, body leans slightly
      if (state.action === 'talking') {
        head.rotation.x = Math.sin(t * 5.5) * 0.07
        head.rotation.y = Math.sin(t * 2) * 0.08
        body.rotation.z = Math.sin(t * 2.5) * 0.025
      }

      // Thinking: head tilted up-right, body still
      if (state.action === 'thinking') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0.35, delta * 3)
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.18, delta * 3)
        body.rotation.z = Math.sin(t * 0.5) * 0.01
      }

      // Celebrating: jump + body bounce
      if (state.action === 'celebrating') {
        g.position.y += Math.abs(Math.sin(t * 5.5)) * 0.18
        body.rotation.z = Math.sin(t * 5) * 0.12
        head.rotation.z = Math.sin(t * 5 + 1) * 0.15
      }

      // Calling another character: body turns slightly
      if (state.action === 'calling') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, -0.4, delta * 4)
        head.rotation.x = 0
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.2, delta * 3)
      }

      // Walking: slight body bob
      if (state.action === 'walking') {
        body.rotation.z = Math.sin(t * 8) * 0.04
        g.position.y += Math.abs(Math.sin(t * 8)) * 0.03
      }

      // Pointing: face the build panel
      if (state.action === 'pointing') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, -0.5, delta * 3)
        head.rotation.x = 0
      }
    }

    // ── Arm animations ────────────────────────────────────────────────────────
    const ra = rightArmRef.current
    const la = leftArmRef.current

    if (ra && la) {
      if (state.action === 'waving') {
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -1.1, delta * 5)
        ra.rotation.y = Math.sin(t * 7) * 0.35
        ra.rotation.x = 0
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, delta * 3)
      } else if (state.action === 'celebrating') {
        ra.rotation.z = -Math.PI / 2 + Math.sin(t * 7) * 0.25
        la.rotation.z =  Math.PI / 2 + Math.sin(t * 7 + 1) * 0.25
        ra.rotation.x = 0
        la.rotation.x = 0
      } else if (state.action === 'pointing') {
        // Point right arm toward the floating build panel
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.7, delta * 4)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.3, delta * 4)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, delta * 3)
      } else if (state.action === 'walking') {
        ra.rotation.x = Math.sin(t * 8) * 0.55
        la.rotation.x = -Math.sin(t * 8) * 0.55
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, delta * 3)
      } else if (state.action === 'thinking') {
        // Right hand near chin
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.6, delta * 3)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.4, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, delta * 3)
        la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, delta * 3)
      } else if (state.action === 'talking') {
        // Subtle gesture while talking
        ra.rotation.z = -0.18 + Math.sin(t * 3) * 0.12
        ra.rotation.x = Math.sin(t * 2.5) * 0.08
        la.rotation.z = 0.18 + Math.sin(t * 3 + 1) * 0.06
        la.rotation.x = 0
      } else {
        // Neutral — arms at sides
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, delta * 3)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, 0, delta * 3)
        ra.rotation.y = THREE.MathUtils.lerp(ra.rotation.y, 0, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, delta * 3)
        la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, delta * 3)
      }
    }

    // ── Leg animations ────────────────────────────────────────────────────────
    const rl = rightLegRef.current
    const ll = leftLegRef.current

    if (rl && ll) {
      if (state.action === 'walking') {
        rl.rotation.x = -Math.sin(t * 8) * 0.42
        ll.rotation.x =  Math.sin(t * 8) * 0.42
      } else if (state.action === 'celebrating') {
        rl.rotation.x = Math.sin(t * 5.5) * 0.25
        ll.rotation.x = -Math.sin(t * 5.5) * 0.25
      } else {
        rl.rotation.x = THREE.MathUtils.lerp(rl.rotation.x, 0, delta * 4)
        ll.rotation.x = THREE.MathUtils.lerp(ll.rotation.x, 0, delta * 4)
      }
    }

    // ── Glow pulse ────────────────────────────────────────────────────────────
    if (glowRef.current) {
      const baseIntensity = isActive ? 2.5 : 1.2
      const pulseAmount = state.action === 'talking' || state.action === 'celebrating' ? 0.8 : 0.3
      glowRef.current.intensity = baseIntensity + Math.sin(t * 2.5) * pulseAmount
    }
  })

  const charMat = (
    <meshStandardMaterial
      color={character.color}
      roughness={0.25}
      metalness={0.15}
      emissive={character.color}
      emissiveIntensity={isActive ? 0.2 : 0.08}
    />
  )
  const darkMat = <meshStandardMaterial color="#060A14" roughness={0.3} />
  const eyeWhiteMat = (
    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
  )

  return (
    <group ref={groupRef} position={character.homePosition}>

      {/* ── Body ── */}
      <mesh ref={bodyRef} position={[0, 1.08, 0]} castShadow>
        <capsuleGeometry args={[0.155, 0.5, 10, 20]} />
        {charMat}
      </mesh>

      {/* ── Head group ── */}
      <group ref={headGroup} position={[0, 0, 0]}>
        {/* Head sphere */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.195, 24, 24]} />
          {charMat}
        </mesh>

        {/* Left eye white */}
        <mesh position={[-0.082, 1.665, 0.17]}>
          <sphereGeometry args={[0.044, 12, 12]} />
          {eyeWhiteMat}
        </mesh>
        {/* Right eye white */}
        <mesh position={[0.082, 1.665, 0.17]}>
          <sphereGeometry args={[0.044, 12, 12]} />
          {eyeWhiteMat}
        </mesh>
        {/* Left pupil */}
        <mesh position={[-0.082, 1.665, 0.208]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          {darkMat}
        </mesh>
        {/* Right pupil */}
        <mesh position={[0.082, 1.665, 0.208]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          {darkMat}
        </mesh>
        {/* Eye shine specks */}
        <mesh position={[-0.074, 1.672, 0.225]}>
          <sphereGeometry args={[0.009, 4, 4]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.09, 1.672, 0.225]}>
          <sphereGeometry args={[0.009, 4, 4]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3} />
        </mesh>
        {/* Smile */}
        <mesh position={[0, 1.615, 0.188]} rotation={[0.15, 0, 0]}>
          <torusGeometry args={[0.055, 0.01, 6, 12, Math.PI]} />
          {darkMat}
        </mesh>
      </group>

      {/* ── Right arm ── */}
      <group ref={rightArmRef} position={[-0.285, 1.28, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.058, 0.34, 6, 10]} />
          {charMat}
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.23, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          {charMat}
        </mesh>
      </group>

      {/* ── Left arm ── */}
      <group ref={leftArmRef} position={[0.285, 1.28, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.058, 0.34, 6, 10]} />
          {charMat}
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.23, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          {charMat}
        </mesh>
      </group>

      {/* ── Right leg ── */}
      <group ref={rightLegRef} position={[-0.1, 0.71, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.072, 0.4, 6, 10]} />
          {charMat}
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.3, 0.06]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          {darkMat}
        </mesh>
      </group>

      {/* ── Left leg ── */}
      <group ref={leftLegRef} position={[0.1, 0.71, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.072, 0.4, 6, 10]} />
          {charMat}
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.3, 0.06]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          {darkMat}
        </mesh>
      </group>

      {/* ── Character glow light ── */}
      <pointLight
        ref={glowRef}
        position={[0, 0.5, 0]}
        color={character.glowColor}
        intensity={isActive ? 2.5 : 1.2}
        distance={3}
        decay={2}
      />

      {/* ── Floor circle glow ── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.55, 40]} />
        <meshStandardMaterial
          color={character.color}
          transparent
          opacity={0.22}
          emissive={character.color}
          emissiveIntensity={1.2}
          depthWrite={false}
        />
      </mesh>

      {/* ── Name tag + speech bubble (HTML overlay) ── */}
      <Html
        position={[0, 2.25, 0]}
        center
        distanceFactor={10}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          {/* Speech bubble */}
          {state.speech && (
            <div style={{
              background: 'rgba(4, 4, 18, 0.94)',
              border: `1.5px solid ${character.color}`,
              borderRadius: '14px',
              padding: '7px 13px',
              maxWidth: '210px',
              color: '#f1f5f9',
              fontSize: '12px',
              lineHeight: '1.45',
              textAlign: 'center',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 0 20px ${character.color}50, 0 4px 20px rgba(0,0,0,0.5)`,
              fontFamily: 'system-ui, sans-serif',
              animation: 'fadeInBubble 0.3s ease',
              whiteSpace: 'pre-wrap',
            }}>
              {state.speech}
            </div>
          )}
          {/* Name badge */}
          <div style={{
            background: `rgba(4, 4, 18, 0.82)`,
            border: `1px solid ${character.color}`,
            borderRadius: '20px',
            padding: '2px 12px',
            color: character.color,
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
            boxShadow: `0 0 10px ${character.color}40`,
            textTransform: 'uppercase',
          }}>
            {character.name}
          </div>
        </div>
      </Html>
    </group>
  )
}
