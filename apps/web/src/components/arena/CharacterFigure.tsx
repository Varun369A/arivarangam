'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { CharacterConfig } from '@/lib/characters'

// ─── Feature flag ─────────────────────────────────────────────────────────────
// Set to false when real GLB assets are placed in:
//   /public/avatars/{characterId}.glb
//   /public/animations/{idle,walk,talk,wave,think,point,celebrate}.glb
const USE_PLACEHOLDER = true

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
  isActive?: boolean
}

// ─── Viseme map (Ready Player Me morph target names) ─────────────────────────

const PHONEME_VISEME_MAP: Record<string, string> = {
  'p':  'viseme_PP', 'b': 'viseme_PP', 'm': 'viseme_PP',
  'f':  'viseme_FF', 'v': 'viseme_FF',
  't':  'viseme_DD', 'd': 'viseme_DD',
  'k':  'viseme_kk', 'g': 'viseme_kk',
  'ch': 'viseme_CH', 'sh':'viseme_CH', 'j': 'viseme_CH',
  's':  'viseme_SS', 'z': 'viseme_SS',
  'n':  'viseme_nn', 'l': 'viseme_nn',
  'r':  'viseme_RR',
  'a':  'viseme_aa',
  'e':  'viseme_E',
  'i':  'viseme_I',  'y': 'viseme_I',
  'o':  'viseme_O',
  'u':  'viseme_U',  'w': 'viseme_U',
}

function textToVisemeSequence(text: string): Array<{ viseme: string; duration: number }> {
  const seq: Array<{ viseme: string; duration: number }> = []
  const lower = text.toLowerCase()
  let i = 0
  while (i < lower.length) {
    const ch2 = lower.slice(i, i + 2)
    const ch1 = lower[i]
    if (PHONEME_VISEME_MAP[ch2]) {
      seq.push({ viseme: PHONEME_VISEME_MAP[ch2], duration: 120 })
      i += 2
    } else if (PHONEME_VISEME_MAP[ch1]) {
      seq.push({ viseme: PHONEME_VISEME_MAP[ch1], duration: 80 })
      i++
    } else {
      if (ch1 === ' ' || ch1 === ',' || ch1 === '.') {
        seq.push({ viseme: 'rest', duration: 60 })
      }
      i++
    }
  }
  return seq
}

// ─── Animation clip name mapping ──────────────────────────────────────────────

const ACTION_TO_ANIM: Record<CharacterAction, string> = {
  idle:        'idle',
  walking:     'walk',
  talking:     'talk',
  waving:      'wave',
  thinking:    'think',
  pointing:    'point',
  celebrating: 'celebrate',
  listening:   'idle',
  calling:     'wave',
}

// ─── Shared Speech Bubble ─────────────────────────────────────────────────────

function SpeechBubble({ character, speech }: { character: CharacterConfig; speech: string | null }) {
  return (
    <Html
      position={[0, 2.25, 0]}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        {speech && (
          <div style={{
            background: 'rgba(4,4,18,0.94)',
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
            whiteSpace: 'pre-wrap',
          }}>
            {speech}
          </div>
        )}
        <div style={{
          background: 'rgba(4,4,18,0.82)',
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
  )
}

// ─── GLB Character (full digital human — used when USE_PLACEHOLDER = false) ───

function GLBCharacter({ character, state, isActive = false }: Props) {
  const groupRef       = useRef<THREE.Group>(null)
  const mixerRef       = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef     = useRef<Record<string, THREE.AnimationAction>>({})
  const currentAnimRef = useRef<string>('idle')
  const headBoneRef    = useRef<THREE.Bone | null>(null)
  const morphMeshRef   = useRef<THREE.SkinnedMesh | null>(null)
  const visemeQueueRef = useRef<Array<{ viseme: string; duration: number }>>([])
  const visemeTimerRef = useRef(0)
  const blinkTimerRef  = useRef(Math.random() * 4000)
  const currentPos     = useRef(new THREE.Vector3(...character.homePosition))

  // Load avatar GLB — requires /public/avatars/{id}.glb
  const { scene: avatarScene } = useGLTF(`/avatars/${character.id}.glb`)
  const clonedScene = useMemo(() => SkeletonUtils.clone(avatarScene) as THREE.Group, [avatarScene])

  // Load shared animation clips
  const idleGLB      = useGLTF('/animations/idle.glb')
  const walkGLB      = useGLTF('/animations/walk.glb')
  const talkGLB      = useGLTF('/animations/talk.glb')
  const waveGLB      = useGLTF('/animations/wave.glb')
  const thinkGLB     = useGLTF('/animations/think.glb')
  const pointGLB     = useGLTF('/animations/point.glb')
  const celebrateGLB = useGLTF('/animations/celebrate.glb')

  // Setup mixer and actions on first mount
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(clonedScene)
    mixerRef.current = mixer

    const clipDefs: Array<[string, THREE.AnimationClip | undefined]> = [
      ['idle',       idleGLB.animations[0]],
      ['walk',       walkGLB.animations[0]],
      ['talk',       talkGLB.animations[0]],
      ['wave',       waveGLB.animations[0]],
      ['think',      thinkGLB.animations[0]],
      ['point',      pointGLB.animations[0]],
      ['celebrate',  celebrateGLB.animations[0]],
    ]

    for (const [name, clip] of clipDefs) {
      if (!clip) continue
      const action = mixer.clipAction(clip, clonedScene)
      const isLooping = name === 'idle' || name === 'walk' || name === 'talk'
      action.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      action.clampWhenFinished = true
      actionsRef.current[name] = action
    }

    actionsRef.current['idle']?.play()
    currentAnimRef.current = 'idle'

    // Find head bone + face mesh for morph targets
    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        const n = obj.name.toLowerCase()
        if (n === 'head' || n.includes('head')) headBoneRef.current = obj
      }
      if (obj instanceof THREE.SkinnedMesh && obj.morphTargetDictionary) {
        const keys = Object.keys(obj.morphTargetDictionary)
        if (keys.some(k => k.startsWith('viseme_'))) morphMeshRef.current = obj
      }
    })

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clonedScene)
    }
  }, [clonedScene, idleGLB, walkGLB, talkGLB, waveGLB, thinkGLB, pointGLB, celebrateGLB])

  // Crossfade to new animation when action changes
  useEffect(() => {
    const targetAnim = ACTION_TO_ANIM[state.action]
    if (targetAnim === currentAnimRef.current) return
    const prev = actionsRef.current[currentAnimRef.current]
    const next = actionsRef.current[targetAnim]
    if (next) {
      next.reset().play()
      prev?.crossFadeTo(next, 0.3, true)
      currentAnimRef.current = targetAnim
    }
  }, [state.action])

  // Generate viseme sequence when speech text changes
  useEffect(() => {
    if (state.speech) {
      visemeQueueRef.current = textToVisemeSequence(state.speech)
      visemeTimerRef.current = 0
    } else {
      visemeQueueRef.current = []
    }
  }, [state.speech])

  const camera = useThree(s => s.camera)

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return

    // Update animation mixer
    mixerRef.current?.update(delta)

    // ── Positional movement ───────────────────────────────────────────────────
    const target = state.targetPosition
      ? new THREE.Vector3(...state.targetPosition)
      : new THREE.Vector3(...character.homePosition)

    if (state.action === 'walking') {
      currentPos.current.lerp(target, delta * 1.8)
      g.position.copy(currentPos.current)
      const dir = target.clone().sub(currentPos.current)
      if (dir.length() > 0.05) {
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dir.x, dir.z), delta * 6)
      }
    } else {
      currentPos.current.lerp(new THREE.Vector3(...character.homePosition), delta * 1.2)
      g.position.copy(currentPos.current)
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, delta * 4)
    }

    // ── Head look-at (camera tracking) ───────────────────────────────────────
    const headBone = headBoneRef.current
    if (headBone && state.action !== 'walking') {
      const worldPos = new THREE.Vector3()
      headBone.getWorldPosition(worldPos)
      const lookDir = camera.position.clone().sub(worldPos).normalize()
      const targetQ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), lookDir
      )
      const euler = new THREE.Euler().setFromQuaternion(targetQ, 'YXZ')
      euler.y = THREE.MathUtils.clamp(euler.y, -0.52, 0.52)
      euler.x = THREE.MathUtils.clamp(euler.x, -0.26, 0.26)
      headBone.quaternion.slerp(new THREE.Quaternion().setFromEuler(euler), delta * 3)
    }

    // ── Viseme lip sync ───────────────────────────────────────────────────────
    const morphMesh = morphMeshRef.current
    if (morphMesh?.morphTargetInfluences && morphMesh.morphTargetDictionary) {
      const dict = morphMesh.morphTargetDictionary
      const inf  = morphMesh.morphTargetInfluences

      // Decay all viseme influences toward 0
      for (const key of Object.keys(dict)) {
        if (key.startsWith('viseme_') && inf[dict[key]] > 0) {
          inf[dict[key]] = THREE.MathUtils.lerp(inf[dict[key]], 0, delta * 15)
        }
      }

      // Advance viseme queue
      visemeTimerRef.current -= delta * 1000
      if (visemeTimerRef.current <= 0 && visemeQueueRef.current.length > 0) {
        const { viseme, duration } = visemeQueueRef.current.shift()!
        visemeTimerRef.current = duration
        if (viseme !== 'rest' && dict[viseme] !== undefined) {
          inf[dict[viseme]] = 0.8
        }
      }

      // ── Auto blink ───────────────────────────────────────────────────────────
      blinkTimerRef.current -= delta * 1000
      const blinkIdx = dict['eyesClosed']
      if (blinkTimerRef.current <= 0 && blinkIdx !== undefined && inf) {
        blinkTimerRef.current = 2500 + Math.random() * 4000
        inf[blinkIdx] = 1
        setTimeout(() => { if (inf) inf[blinkIdx] = 0 }, 120)
      }

      // ── Expression morph targets ──────────────────────────────────────────
      const smileIdx = dict['mouthSmile']
      const browIdx  = dict['browInnerUp']

      if (smileIdx !== undefined) {
        const target = state.action === 'celebrating' || state.action === 'talking' ? 0.6 : 0.2
        inf[smileIdx] = THREE.MathUtils.lerp(inf[smileIdx], target, delta * 3)
      }
      if (browIdx !== undefined) {
        const target = state.action === 'thinking' || state.action === 'waving' ? 0.5 : 0
        inf[browIdx] = THREE.MathUtils.lerp(inf[browIdx], target, delta * 3)
      }
    }
  })

  return (
    <group ref={groupRef} position={character.homePosition}>
      <primitive object={clonedScene} />
      <SpeechBubble character={character} speech={state.speech} />
    </group>
  )
}

// ─── Placeholder Character (capsule geometry, works without assets) ───────────

function PlaceholderCharacter({ character, state, isActive = false }: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const headGroup   = useRef<THREE.Group>(null)
  const bodyRef     = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftArmRef  = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftLegRef  = useRef<THREE.Group>(null)
  const mouthRef    = useRef<THREE.Mesh>(null)
  const glowRef     = useRef<THREE.PointLight>(null)
  const currentPos  = useRef(new THREE.Vector3(...character.homePosition))
  const baseY       = useRef(character.homePosition[1])

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
      const dir = targetVec.clone().sub(currentPos.current)
      if (dir.length() > 0.05) {
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dir.x, dir.z), delta * 6)
      }
    } else {
      currentPos.current.lerp(new THREE.Vector3(...character.homePosition), delta * 1.2)
      g.position.set(currentPos.current.x, currentPos.current.y + baseY.current, currentPos.current.z)
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, delta * 4)
    }

    // ── Head & body ───────────────────────────────────────────────────────────
    const head = headGroup.current
    const body = bodyRef.current
    if (head && body) {
      if (state.action === 'idle' || state.action === 'listening') {
        g.position.y += Math.sin(t * 1.4 + character.homePosition[0] * 0.5) * 0.025
        body.rotation.z = Math.sin(t * 0.9) * 0.015
        head.rotation.y = Math.sin(t * 0.6) * 0.12
        head.rotation.x = 0
      }
      if (state.action === 'talking') {
        head.rotation.x = Math.sin(t * 5.5) * 0.07
        head.rotation.y = Math.sin(t * 2) * 0.08
        body.rotation.z = Math.sin(t * 2.5) * 0.025
      }
      if (state.action === 'thinking') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0.35, delta * 3)
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.18, delta * 3)
        body.rotation.z = Math.sin(t * 0.5) * 0.01
      }
      if (state.action === 'celebrating') {
        g.position.y += Math.abs(Math.sin(t * 5.5)) * 0.18
        body.rotation.z = Math.sin(t * 5) * 0.12
        head.rotation.z = Math.sin(t * 5 + 1) * 0.15
      }
      if (state.action === 'calling') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, -0.4, delta * 4)
        head.rotation.x = 0
        body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -0.2, delta * 3)
      }
      if (state.action === 'walking') {
        body.rotation.z = Math.sin(t * 8) * 0.04
        g.position.y += Math.abs(Math.sin(t * 8)) * 0.03
      }
      if (state.action === 'pointing') {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, -0.5, delta * 3)
        head.rotation.x = 0
      }
    }

    // ── Simulated lip sync (mouth scale animation) ────────────────────────────
    const mouth = mouthRef.current
    if (mouth) {
      const isSpeaking = state.action === 'talking' || !!state.speech
      const target = isSpeaking ? 0.8 + Math.abs(Math.sin(t * 12)) * 0.8 : 0.5
      mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, target, delta * 18)
    }

    // ── Arms ─────────────────────────────────────────────────────────────────
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
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.7, delta * 4)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.3, delta * 4)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, delta * 3)
      } else if (state.action === 'walking') {
        ra.rotation.x = Math.sin(t * 8) * 0.55
        la.rotation.x = -Math.sin(t * 8) * 0.55
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, delta * 3)
      } else if (state.action === 'thinking') {
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.6, delta * 3)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.4, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, delta * 3)
        la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, delta * 3)
      } else if (state.action === 'talking') {
        ra.rotation.z = -0.18 + Math.sin(t * 3) * 0.12
        ra.rotation.x = Math.sin(t * 2.5) * 0.08
        la.rotation.z = 0.18 + Math.sin(t * 3 + 1) * 0.06
        la.rotation.x = 0
      } else {
        ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, delta * 3)
        ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, 0, delta * 3)
        ra.rotation.y = THREE.MathUtils.lerp(ra.rotation.y, 0, delta * 3)
        la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, delta * 3)
        la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, delta * 3)
      }
    }

    // ── Legs ─────────────────────────────────────────────────────────────────
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
      const base  = isActive ? 2.5 : 1.2
      const pulse = state.action === 'talking' || state.action === 'celebrating' ? 0.8 : 0.3
      glowRef.current.intensity = base + Math.sin(t * 2.5) * pulse
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
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.195, 24, 24]} />
          {charMat}
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.082, 1.665, 0.17]}>
          <sphereGeometry args={[0.044, 12, 12]} />
          {eyeWhiteMat}
        </mesh>
        <mesh position={[0.082, 1.665, 0.17]}>
          <sphereGeometry args={[0.044, 12, 12]} />
          {eyeWhiteMat}
        </mesh>
        <mesh position={[-0.082, 1.665, 0.208]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          {darkMat}
        </mesh>
        <mesh position={[0.082, 1.665, 0.208]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          {darkMat}
        </mesh>
        {/* Eye shine */}
        <mesh position={[-0.074, 1.672, 0.225]}>
          <sphereGeometry args={[0.009, 4, 4]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.09, 1.672, 0.225]}>
          <sphereGeometry args={[0.009, 4, 4]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3} />
        </mesh>

        {/* Animated mouth */}
        <mesh ref={mouthRef} position={[0, 1.615, 0.188]} rotation={[0.15, 0, 0]}>
          <torusGeometry args={[0.055, 0.013, 6, 12, Math.PI]} />
          {darkMat}
        </mesh>
      </group>

      {/* ── Arms ── */}
      <group ref={rightArmRef} position={[-0.285, 1.28, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.058, 0.34, 6, 10]} />
          {charMat}
        </mesh>
        <mesh position={[0, -0.23, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          {charMat}
        </mesh>
      </group>
      <group ref={leftArmRef} position={[0.285, 1.28, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.058, 0.34, 6, 10]} />
          {charMat}
        </mesh>
        <mesh position={[0, -0.23, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          {charMat}
        </mesh>
      </group>

      {/* ── Legs ── */}
      <group ref={rightLegRef} position={[-0.1, 0.71, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.072, 0.4, 6, 10]} />
          {charMat}
        </mesh>
        <mesh position={[0, -0.3, 0.06]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          {darkMat}
        </mesh>
      </group>
      <group ref={leftLegRef} position={[0.1, 0.71, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.072, 0.4, 6, 10]} />
          {charMat}
        </mesh>
        <mesh position={[0, -0.3, 0.06]} castShadow>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          {darkMat}
        </mesh>
      </group>

      {/* ── Character glow ── */}
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

      <SpeechBubble character={character} speech={state.speech} />
    </group>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function CharacterFigure(props: Props) {
  if (USE_PLACEHOLDER) return <PlaceholderCharacter {...props} />
  return <GLBCharacter {...props} />
}
