'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CHARACTERS, CHARACTER_ORDER } from '@/lib/characters'
import type { CharacterConfig } from '@/lib/characters'
import type { CharacterState } from './CharacterFigure'

// ─── Sentence-by-sentence speech state ───────────────────────────────────────

interface SpeechState {
  raw: string
  sentences: string[]
  idx: number
  until: number
}

function parseSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function sentenceDuration(s: string): number {
  return Math.max(5000, Math.min(s.length * 95, 11000))
}

// ─── Rig type ─────────────────────────────────────────────────────────────────

interface Rig {
  group: THREE.Group
  torso: THREE.Mesh
  headGroup: THREE.Group
  rightArm: THREE.Group
  leftArm: THREE.Group
  rightLeg: THREE.Group
  leftLeg: THREE.Group
  mouth: THREE.Mesh
  glow: THREE.PointLight
  currentPos: THREE.Vector3
  labelEl: HTMLDivElement
  speechEl: HTMLDivElement
}

// ─── Build one character (rounded bot) ───────────────────────────────────────


function buildRig(char: CharacterConfig, isActive: boolean): Omit<Rig, 'labelEl' | 'speechEl'> {
  const col   = new THREE.Color(char.color)
  const group = new THREE.Group()
  group.position.set(char.homePosition[0], char.homePosition[1], char.homePosition[2])

  const headR = 0.30
  const headY = 1.22

  // ── Materials ─────────────────────────────────────────────────────────────
  const mainMat = () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.28, metalness: 0.15, emissive: col, emissiveIntensity: isActive ? 0.28 : 0.12 })
  const bodyMat = () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4,  metalness: 0.2,  emissive: col, emissiveIntensity: 0.06 })
  const darkMat = () => new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5 })
  const eyeW   = () => new THREE.MeshStandardMaterial({ color: 'white', emissive: new THREE.Color('white'), emissiveIntensity: 0.6 })
  const shine  = () => new THREE.MeshStandardMaterial({ color: 'white', emissive: new THREE.Color('white'), emissiveIntensity: 3 })
  // ── Head ──────────────────────────────────────────────────────────────────
  const headGroup = new THREE.Group()
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 24), mainMat())
  headMesh.position.set(0, headY, 0); headMesh.castShadow = true; headGroup.add(headMesh)

  // Eyes (chibi — big, in the lower front of head)
  const eyeX  = headR * 0.38
  const eyeY  = headY - 0.04
  const eyeZ  = headR * 0.86
  const eyeSR = headR * 0.27
  const irisR  = eyeSR * 0.70
  const pupilR = eyeSR * 0.44
  ;[-eyeX, eyeX].forEach(x => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(eyeSR, 14, 14), eyeW()); e.position.set(x, eyeY, eyeZ); headGroup.add(e)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(irisR, 10, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 }))
    iris.position.set(x, eyeY, eyeZ + eyeSR * 0.46); headGroup.add(iris)
    const p = new THREE.Mesh(new THREE.SphereGeometry(pupilR, 8, 8), darkMat()); p.position.set(x, eyeY, eyeZ + eyeSR * 0.66); headGroup.add(p)
    const s = new THREE.Mesh(new THREE.SphereGeometry(eyeSR * 0.22, 4, 4), shine()); s.position.set(x - eyeSR * 0.22, eyeY + eyeSR * 0.26, eyeZ + eyeSR * 0.84); headGroup.add(s)
  })

  // Eyebrows
  ;[-eyeX, eyeX].forEach(x => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.40, 0.022, 0.015), mainMat())
    brow.position.set(x, eyeY + eyeSR + 0.022, headR * 0.82); headGroup.add(brow)
  })

  // Animated mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.22, 0.014, 6, 14, Math.PI), darkMat())
  mouth.position.set(0, eyeY - eyeSR * 1.6, headR * 0.90); mouth.rotation.set(0.2, 0, 0); headGroup.add(mouth)

  // Chibi cheek blush — oval pink patches below eyes
  const blushMat = new THREE.MeshStandardMaterial({
    color: '#FF9EB5', emissive: new THREE.Color('#FF85A0'), emissiveIntensity: 0.5,
    transparent: true, opacity: 0.60, roughness: 0.9,
  })
  ;[-1, 1].forEach(s => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(eyeSR * 0.82, 8, 8), blushMat)
    blush.scale.set(1.0, 0.55, 0.32)
    blush.position.set(s * (eyeX + eyeSR * 0.75), eyeY - eyeSR * 0.9, eyeZ * 0.92)
    headGroup.add(blush)
  })

  group.add(headGroup)

  // ── Per-character top accessory ────────────────────────────────────────────
  const accY = headY + headR
  if (char.id === 'claude') {
    const crownMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.0, roughness: 0.2 })
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.10, 5), crownMat)
      peak.position.set(Math.cos(ang) * 0.14, accY + 0.05, Math.sin(ang) * 0.14); group.add(peak)
    }
  } else if (char.id === 'perplexity') {
    const antMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.3 })
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 8), antMat)
    rod.position.set(0, accY + 0.09, 0); group.add(rod)
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2 }))
    antTip.position.set(0, accY + 0.19, 0); group.add(antTip)
  } else if (char.id === 'chatgpt') {
    const ringMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.2 })
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.020, 6, 16), ringMat)
    topRing.position.set(0, accY + 0.12, 0); group.add(topRing)
  } else if (char.id === 'gemini') {
    const gemMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2, transparent: true, opacity: 0.9, metalness: 0.3, roughness: 0.1 })
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0), gemMat)
    gem.position.set(0, accY + 0.16, 0); group.add(gem)
  } else if (char.id === 'sarvam') {
    const bindiMat2 = new THREE.MeshStandardMaterial({ color: '#FF4444', emissive: new THREE.Color('#FF2222'), emissiveIntensity: 1.5 })
    const bindi2 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), bindiMat2)
    bindi2.position.set(0, headY + 0.06, headR * 0.94); group.add(bindi2)
    const turbanMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.15 })
    const turban = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), turbanMat)
    turban.position.set(0, headY + headR - 0.02, 0); group.add(turban)
  }

  // ── Body / torso ──────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.26, 8, 16), bodyMat())
  torso.position.set(0, 0.74, 0); torso.castShadow = true; group.add(torso)

  // ── Arms ──────────────────────────────────────────────────────────────────
  const armMat = () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.1, emissive: col, emissiveIntensity: 0.05 })
  const rightArm = new THREE.Group(); rightArm.position.set(-0.27, 0.82, 0)
  rightArm.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 10), armMat()))
  group.add(rightArm)

  const leftArm = new THREE.Group(); leftArm.position.set(0.27, 0.82, 0)
  leftArm.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 10), armMat()))
  group.add(leftArm)

  // ── Legs ──────────────────────────────────────────────────────────────────
  const rightLeg = new THREE.Group(); rightLeg.position.set(-0.10, 0.36, 0)
  rightLeg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 10), darkMat()))
  group.add(rightLeg)

  const leftLeg = new THREE.Group(); leftLeg.position.set(0.10, 0.36, 0)
  leftLeg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 10), darkMat()))
  group.add(leftLeg)

  // ── Glow & floor circle ───────────────────────────────────────────────────
  const glow = new THREE.PointLight(char.glowColor, isActive ? 3 : 1.4, 4, 2)
  glow.position.set(0, 0.5, 0)
  group.add(glow)

  const floorCircle = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 40),
    new THREE.MeshStandardMaterial({ color: char.color, transparent: true, opacity: 0.18, emissive: col, emissiveIntensity: 1.2, depthWrite: false }),
  )
  floorCircle.rotation.set(-Math.PI / 2, 0, 0); floorCircle.position.set(0, 0.005, 0); floorCircle.receiveShadow = true
  group.add(floorCircle)

  return {
    group, torso: torso, headGroup,
    rightArm, leftArm, rightLeg, leftLeg,
    mouth, glow,
    currentPos: new THREE.Vector3(char.homePosition[0], char.homePosition[1], char.homePosition[2]),
  }
}

// ─── Per-frame animation ──────────────────────────────────────────────────────

function animateRig(rig: Rig, char: CharacterConfig, state: CharacterState, isActive: boolean, t: number, delta: number) {
  const d = Math.min(delta, 0.05)
  const g = rig.group
  const hx = char.homePosition[0], hy = char.homePosition[1], hz = char.homePosition[2]

  // ── Movement ──────────────────────────────────────────────────────────────
  const target = state.targetPosition
    ? new THREE.Vector3(state.targetPosition[0], state.targetPosition[1], state.targetPosition[2])
    : new THREE.Vector3(hx, hy, hz)

  if (state.action === 'walking') {
    rig.currentPos.lerp(target, d * 0.75)
    g.position.set(rig.currentPos.x, hy, rig.currentPos.z)
    const dir = target.clone().sub(rig.currentPos)
    if (dir.length() > 0.05) {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dir.x, dir.z), d * 8)
    }
  } else {
    rig.currentPos.lerp(new THREE.Vector3(hx, hy, hz), d * 1.2)
    g.position.set(rig.currentPos.x, hy, rig.currentPos.z)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, d * 4)
  }

  // ── Head & torso ──────────────────────────────────────────────────────────
  if (state.action === 'idle' || state.action === 'listening') {
    g.position.y += Math.sin(t * 1.2 + hx * 0.4) * 0.022
    rig.torso.rotation.z = Math.sin(t * 0.8) * 0.012
    rig.headGroup.rotation.y = Math.sin(t * 0.55) * 0.1
    rig.headGroup.rotation.x = 0
  }
  if (state.action === 'talking') {
    rig.headGroup.rotation.x = Math.sin(t * 5) * 0.065
    rig.headGroup.rotation.y = Math.sin(t * 1.8) * 0.07
    rig.torso.rotation.z = Math.sin(t * 2.2) * 0.02
    g.position.y += Math.sin(t * 1.5 + hx) * 0.01
  }
  if (state.action === 'thinking') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, 0.32, d * 3)
    rig.headGroup.rotation.x = THREE.MathUtils.lerp(rig.headGroup.rotation.x, -0.2, d * 3)
    rig.torso.rotation.z = Math.sin(t * 0.4) * 0.01
  }
  if (state.action === 'celebrating') {
    g.position.y += Math.abs(Math.sin(t * 5)) * 0.2
    rig.torso.rotation.z = Math.sin(t * 5) * 0.14
    rig.headGroup.rotation.z = Math.sin(t * 5 + 1) * 0.18
  }
  if (state.action === 'calling') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, -0.45, d * 4)
    rig.headGroup.rotation.x = 0
    rig.torso.rotation.y = THREE.MathUtils.lerp(rig.torso.rotation.y, -0.2, d * 3)
  }
  if (state.action === 'walking') {
    // Human-like walk: hip sway + lean forward
    rig.torso.rotation.z = Math.sin(t * 8) * 0.06
    rig.torso.rotation.x = -0.08  // slight forward lean
    g.position.y += Math.abs(Math.sin(t * 8)) * 0.04
    // Hip counter-rotation
    rig.torso.rotation.y = Math.sin(t * 8) * 0.1
  } else {
    rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, 0, d * 5)
  }
  if (state.action === 'pointing') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, -0.5, d * 3)
    rig.headGroup.rotation.x = 0
  }

  // ── Mouth (lip sync) ──────────────────────────────────────────────────────
  const speaking = state.action === 'talking' || !!state.speech
  const mTarget = speaking ? 0.7 + Math.abs(Math.sin(t * 14)) * 0.9 : 0.4
  rig.mouth.scale.y = THREE.MathUtils.lerp(rig.mouth.scale.y, mTarget, d * 20)
  // Mouth also opens on X (real lip sync feel)
  rig.mouth.scale.x = THREE.MathUtils.lerp(rig.mouth.scale.x, speaking ? 1 + Math.abs(Math.sin(t * 11)) * 0.3 : 1, d * 14)

  // ── Arms (human-like opposite swing) ─────────────────────────────────────
  const ra = rig.rightArm, la = rig.leftArm
  if (state.action === 'waving') {
    // Both arms raised — enthusiastic chibi wave
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -1.55, d * 7)
    ra.rotation.y = Math.sin(t * 8) * 0.6
    ra.rotation.x = Math.sin(t * 6) * 0.15
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 1.3, d * 5)
    la.rotation.y = -Math.sin(t * 8 + 0.5) * 0.35
    la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0.15, d * 4)
    rig.headGroup.rotation.y = Math.sin(t * 4) * 0.2
    rig.headGroup.rotation.z = Math.sin(t * 3.5) * 0.1
    rig.torso.rotation.z = Math.sin(t * 4) * 0.06
    g.position.y += Math.abs(Math.sin(t * 7)) * 0.055
  } else if (state.action === 'celebrating') {
    ra.rotation.z = -Math.PI / 2 + Math.sin(t * 7) * 0.3
    la.rotation.z = Math.PI / 2 + Math.sin(t * 7 + 1) * 0.3
    ra.rotation.x = la.rotation.x = 0
  } else if (state.action === 'pointing') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.7, d * 4)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.3, d * 4)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, d * 3)
  } else if (state.action === 'walking') {
    // Opposite arm swing (right arm forward = left leg forward)
    ra.rotation.x = Math.sin(t * 8) * 0.6      // right arm swings opposite right leg
    la.rotation.x = -Math.sin(t * 8) * 0.6
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.08, d * 4)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.08, d * 4)
  } else if (state.action === 'thinking') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.65, d * 3)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.45, d * 3)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
    la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, d * 3)
  } else if (state.action === 'talking') {
    // Gesturing hands
    ra.rotation.z = -0.2 + Math.sin(t * 3.2) * 0.18
    ra.rotation.x = Math.sin(t * 2.8) * 0.12
    la.rotation.z = 0.2 + Math.sin(t * 3 + 1) * 0.12
    la.rotation.x = -Math.sin(t * 2.5 + 0.5) * 0.1
  } else if (state.action === 'calling') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.8, d * 4)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, 0.3, d * 4)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
  } else {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.1, d * 3)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, 0, d * 3)
    ra.rotation.y = THREE.MathUtils.lerp(ra.rotation.y, 0, d * 3)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.1, d * 3)
    la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, d * 3)
  }

  // ── Legs (human walk cycle) ───────────────────────────────────────────────
  const rl = rig.rightLeg, ll = rig.leftLeg
  if (state.action === 'walking') {
    // Right leg and left arm move together (natural gait)
    rl.rotation.x = -Math.sin(t * 8) * 0.48   // right leg opposite right arm
    ll.rotation.x = Math.sin(t * 8) * 0.48
  } else if (state.action === 'celebrating') {
    rl.rotation.x = Math.sin(t * 5.5) * 0.28
    ll.rotation.x = -Math.sin(t * 5.5) * 0.28
  } else {
    rl.rotation.x = THREE.MathUtils.lerp(rl.rotation.x, 0, d * 5)
    ll.rotation.x = THREE.MathUtils.lerp(ll.rotation.x, 0, d * 5)
  }

  // ── Glow pulse ────────────────────────────────────────────────────────────
  const base = isActive ? 3 : 1.4
  const pulse = state.action === 'talking' || state.action === 'celebrating' ? 1.0 : 0.4
  rig.glow.intensity = base + Math.sin(t * 2.5) * pulse
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ArenaCanvasProps {
  characterStates: Record<string, CharacterState>
  welcomeUser?: string | null
}

export function ArenaCanvas({ characterStates, welcomeUser }: ArenaCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(characterStates)
  const welcomeRef = useRef(welcomeUser ?? null)

  useEffect(() => { stateRef.current = characterStates }, [characterStates])
  useEffect(() => { welcomeRef.current = welcomeUser ?? null }, [welcomeUser])

  useEffect(() => {
    const mount = mountRef.current as HTMLDivElement
    const overlay = overlayRef.current as HTMLDivElement
    if (!mount || !overlay) return

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 600)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    // ── Scene & camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#060610')
    scene.fog = new THREE.Fog('#060610', 22, 42)

    const w0 = mount.clientWidth || 800, h0 = mount.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(46, w0 / h0, 0.1, 100)
    camera.position.set(0, 3.5, 12)
    camera.lookAt(0, 1.2, 0)

    // ── Lights ────────────────────────────────────────────────────────────
    // Warm white ambient so skin tones render correctly
    scene.add(new THREE.AmbientLight('#ffffff', 0.60))

    const sun = new THREE.DirectionalLight('#fffaf0', 1.1)
    sun.position.set(3, 10, 6); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 35
    ;(sun.shadow.camera as THREE.OrthographicCamera).left = -14
    ;(sun.shadow.camera as THREE.OrthographicCamera).right = 14
    ;(sun.shadow.camera as THREE.OrthographicCamera).top = 14
    ;(sun.shadow.camera as THREE.OrthographicCamera).bottom = -14
    scene.add(sun)

    // Front fill — illuminates faces visible from camera
    const frontFill = new THREE.DirectionalLight('#fff8e8', 0.9)
    frontFill.position.set(0, 4, 12)
    scene.add(frontFill)

    const bl = new THREE.DirectionalLight('#4040CC', 0.3)
    bl.position.set(-8, 4, -3)
    scene.add(bl)
    const bl2 = new THREE.DirectionalLight('#6030A0', 0.2)
    bl2.position.set(0, 3, -10)
    scene.add(bl2)

    const spot = new THREE.SpotLight('#FEF3C7', 2.8)
    spot.position.set(0, 9, 1); spot.angle = 0.32; spot.penumbra = 0.65; spot.castShadow = true
    spot.target.position.set(0, 0, 0); scene.add(spot, spot.target)

    // ── Floor ─────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 42),
      new THREE.MeshStandardMaterial({ color: '#06060F', roughness: 0.88, metalness: 0.3 }),
    )
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
    const grid = new THREE.GridHelper(42, 42, '#1a1040', '#0d0826')
    grid.position.y = 0.002; scene.add(grid)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.08, 64),
      new THREE.MeshStandardMaterial({ color: '#D97706', emissive: new THREE.Color('#D97706'), emissiveIntensity: 1.6, transparent: true, opacity: 0.55, depthWrite: false }),
    )
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; scene.add(ring)
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.92, 64),
      new THREE.MeshStandardMaterial({ color: '#D97706', emissive: new THREE.Color('#D97706'), emissiveIntensity: 0.4, transparent: true, opacity: 0.07, depthWrite: false }),
    )
    disk.rotation.x = -Math.PI / 2; disk.position.y = 0.003; scene.add(disk)

    // ── Stars ─────────────────────────────────────────────────────────────
    const sp = new Float32Array(2500 * 3)
    for (let i = 0; i < 2500; i++) {
      const r = 38 * Math.cbrt(Math.random()), θ = Math.random() * Math.PI * 2, φ = Math.acos(2 * Math.random() - 1)
      sp[i * 3] = r * Math.sin(φ) * Math.cos(θ); sp[i * 3 + 1] = r * Math.sin(φ) * Math.sin(θ); sp[i * 3 + 2] = r * Math.cos(φ)
    }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 'white', size: 0.09, transparent: true, opacity: 0.85, sizeAttenuation: true }))
    scene.add(stars)

    // ── Particles ─────────────────────────────────────────────────────────
    const pp = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) { pp[i * 3] = (Math.random() - 0.5) * 28; pp[i * 3 + 1] = Math.random() * 12; pp[i * 3 + 2] = (Math.random() - 0.5) * 28 }
    const partGeo = new THREE.BufferGeometry(); partGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3))
    const particles = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.032, color: '#8B5CF6', transparent: true, opacity: 0.55, sizeAttenuation: true }))
    scene.add(particles)

    // ── Floating orbs ─────────────────────────────────────────────────────
    const orbDefs: { pos: [number, number, number]; color: string }[] = [
      { pos: [-8, 4, -5], color: '#6366f1' }, { pos: [8, 3.5, -4], color: '#8B5CF6' },
      { pos: [0, 6, -8], color: '#0D9488' }, { pos: [-4, 2.5, 4], color: '#D97706' }, { pos: [5, 2, 3], color: '#10B981' },
    ]
    const orbs = orbDefs.map(({ pos, color }) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 2, transparent: true, opacity: 0.7 }))
      mesh.position.set(pos[0], pos[1], pos[2])
      const light = new THREE.PointLight(color, 0.3, 3); light.position.set(pos[0], pos[1], pos[2])
      scene.add(mesh, light); return { mesh, light, baseY: pos[1] }
    })

    // ── Characters ────────────────────────────────────────────────────────
    const rigs: Record<string, Rig> = {}
    const bubblePos = new THREE.Vector3()
    const speechStates = new Map<string, SpeechState>()

    CHARACTER_ORDER.forEach((id) => {
      const char = CHARACTERS[id]
      const base = buildRig(char, id === 'claude')
      scene.add(base.group)

      // Speech bubble DOM
      const labelEl = document.createElement('div')
      labelEl.style.cssText = 'position:absolute;pointer-events:none;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:5px;'

      const speechEl = document.createElement('div')
      speechEl.style.cssText = [
        'background:rgba(4,4,20,0.95)',
        `border:2px solid ${char.color}`,
        'border-radius:16px',
        'padding:8px 14px',
        'max-width:220px',
        'color:#f1f5f9',
        'font-size:13px',
        'line-height:1.5',
        'text-align:center',
        `box-shadow:0 0 24px ${char.color}60,0 4px 24px rgba(0,0,0,0.6)`,
        'font-family:system-ui,sans-serif',
        'white-space:pre-wrap',
        'display:none',
        'transition:opacity 0.3s',
        // speech triangle pointer
        'position:relative',
      ].join(';')

      // Triangle tip at bottom of bubble
      const tip = document.createElement('div')
      tip.style.cssText = `width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid ${char.color};`

      const nameEl = document.createElement('div')
      nameEl.textContent = char.name
      nameEl.style.cssText = [
        'background:rgba(4,4,20,0.85)',
        `border:1.5px solid ${char.color}`,
        'border-radius:20px',
        'padding:3px 13px',
        `color:${char.color}`,
        'font-size:10px',
        'font-weight:800',
        'font-family:monospace',
        'letter-spacing:0.08em',
        `box-shadow:0 0 12px ${char.color}50`,
        'text-transform:uppercase',
      ].join(';')

      labelEl.append(speechEl, tip, nameEl)
      overlay.appendChild(labelEl)
      rigs[id] = { ...base, labelEl, speechEl }
    })

    // ── Animation loop ─────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let prevT = 0, rafId = 0
    const def: CharacterState = { action: 'idle', targetPosition: null, speech: null }
    const prevClaudeSpeech = { value: '' }
    const dismissedUntil = new Map<string, number>()

    function loop() {
      rafId = requestAnimationFrame(loop)
      const t = clock.getElapsedTime()
      const delta = t - prevT; prevT = t

      stars.rotation.y = t * 0.035; stars.rotation.x = Math.sin(t * 0.018) * 0.05
      particles.rotation.y = t * 0.04; particles.rotation.x = Math.sin(t * 0.02) * 0.05
      orbs.forEach(({ mesh, light, baseY }, i) => {
        const y = baseY + Math.sin(t * 1.4 + i * 1.5) * 0.32; mesh.position.y = y; light.position.y = y
      })

      const states = stateRef.current

      // Dismiss detection — scan Claude speech for "thank you [Name] you can go/leave"
      const claudeSpeechNow = (states['claude'] ?? def).speech ?? ''
      if (claudeSpeechNow && claudeSpeechNow !== prevClaudeSpeech.value) {
        prevClaudeSpeech.value = claudeSpeechNow
        if (/thank you|you can go|you can leave|you may leave|go back|that.s all|goodbye|farewell/i.test(claudeSpeechNow)) {
          const lower = claudeSpeechNow.toLowerCase()
          CHARACTER_ORDER.forEach(cid => {
            if (cid !== 'claude' && lower.includes(CHARACTERS[cid].name.toLowerCase())) {
              dismissedUntil.set(cid, Date.now() + 12000)
            }
          })
        }
      }

      CHARACTER_ORDER.forEach((id) => {
        const rig = rigs[id]; const char = CHARACTERS[id]
        let state = states[id] ?? def

        // Welcome override — Claude waves to user on first login
        if (id === 'claude' && welcomeRef.current) {
          state = { action: 'waving', speech: `Welcome, ${welcomeRef.current}! What shall we build today?`, targetPosition: null }
        }

        // Dismiss override — dismissed AIs walk back to off-screen home
        const dismissEnd = dismissedUntil.get(id)
        if (dismissEnd) {
          if (Date.now() < dismissEnd) {
            state = { action: 'walking', targetPosition: char.homePosition as [number, number, number], speech: null }
          } else {
            dismissedUntil.delete(id)
          }
        }

        animateRig(rig, char, state, id === 'claude', t, delta)
      })

      renderer.render(scene, camera)

      // Update bubbles after render (matrixWorld is current)
      const now = Date.now()
      CHARACTER_ORDER.forEach((id) => {
        const rig = rigs[id]; const state = (stateRef.current)[id] ?? def
        const rawSpeech = state.speech

        // Sentence-by-sentence speech system
        let displayText = ''
        if (rawSpeech) {
          let ss = speechStates.get(id)
          if (!ss || ss.raw !== rawSpeech) {
            const sents = parseSentences(rawSpeech)
            const first = sents[0] ?? rawSpeech
            ss = { raw: rawSpeech, sentences: sents.length > 0 ? sents : [rawSpeech], idx: 0, until: now + sentenceDuration(first) }
            speechStates.set(id, ss)
          }
          if (now > ss.until && ss.idx < ss.sentences.length - 1) {
            ss.idx++; ss.until = now + sentenceDuration(ss.sentences[ss.idx])
          }
          displayText = ss.sentences[ss.idx] ?? ''
        } else {
          speechStates.delete(id)
        }

        // Project to screen
        bubblePos.set(0, 1.85, 0).applyMatrix4(rig.group.matrixWorld).project(camera)
        const px = (bubblePos.x + 1) * 0.5 * mount.clientWidth
        const py = (-bubblePos.y + 1) * 0.5 * mount.clientHeight

        if (bubblePos.z < 1) {
          rig.labelEl.style.left = `${px}px`; rig.labelEl.style.top = `${py}px`; rig.labelEl.style.display = 'flex'
        } else {
          rig.labelEl.style.display = 'none'
        }

        if (displayText) { rig.speechEl.textContent = displayText; rig.speechEl.style.display = 'block' }
        else { rig.speechEl.style.display = 'none' }
      })
    }

    loop()

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
    })
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(rafId); ro.disconnect(); renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      CHARACTER_ORDER.forEach((id) => { const el = rigs[id]?.labelEl; if (el && overlay.contains(el)) overlay.removeChild(el) })
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#060610' }} />
      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
    </div>
  )
}

export default ArenaCanvas
