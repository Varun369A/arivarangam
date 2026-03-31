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
  return Math.max(2200, Math.min(s.length * 65, 5500))
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

// ─── Character designs (unique per AI) ───────────────────────────────────────

interface Design {
  torsoW: number
  torsoH: number
  headR: number
  heightMult: number
  addAccessory: (g: THREE.Group, color: THREE.Color) => void
}

const DESIGNS: Record<string, Design> = {
  claude: {
    torsoW: 0.36, torsoH: 0.52, headR: 0.2, heightMult: 1.0,
    addAccessory: (g, col) => {
      // Crown — five pointed peaks
      const crownMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 })
      for (let i = 0; i < 5; i++) {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), crownMat)
        const ang = (i / 5) * Math.PI * 2
        peak.position.set(Math.cos(ang) * 0.14, 2.06, Math.sin(ang) * 0.14)
        g.add(peak)
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 24), crownMat)
      band.position.set(0, 1.97, 0)
      g.add(band)
    },
  },
  perplexity: {
    torsoW: 0.3, torsoH: 0.54, headR: 0.19, heightMult: 1.05,
    addAccessory: (g) => {
      // Glasses
      const mat = new THREE.MeshStandardMaterial({ color: '#aaaaaa', metalness: 0.9, roughness: 0.1 })
      const lensGeo = new THREE.BoxGeometry(0.1, 0.055, 0.012)
      const lL = new THREE.Mesh(lensGeo, mat); lL.position.set(-0.09, 1.72, 0.2); g.add(lL)
      const lR = new THREE.Mesh(lensGeo, mat); lR.position.set(0.09, 1.72, 0.2); g.add(lR)
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), mat)
      bridge.position.set(0, 1.72, 0.2); g.add(bridge)
      const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.01), mat)
      lArm.position.set(-0.19, 1.72, 0.1); lArm.rotation.y = 0.4; g.add(lArm)
      const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.01), mat)
      rArm.position.set(0.19, 1.72, 0.1); rArm.rotation.y = -0.4; g.add(rArm)
    },
  },
  chatgpt: {
    torsoW: 0.38, torsoH: 0.5, headR: 0.2, heightMult: 1.0,
    addAccessory: (g, col) => {
      // Tie
      const tieMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 })
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), tieMat)
      knot.position.set(0, 1.38, 0.12); g.add(knot)
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.03), tieMat)
      tie.position.set(0, 1.2, 0.12); g.add(tie)
    },
  },
  gemini: {
    torsoW: 0.31, torsoH: 0.51, headR: 0.19, heightMult: 0.96,
    addAccessory: (g, col) => {
      // Crystal gem above head
      const gemMat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.85, metalness: 0.3, roughness: 0.1,
      })
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), gemMat)
      gem.position.set(0, 2.1, 0); g.add(gem)
      // Glow ring under gem
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), gemMat)
      ring.position.set(0, 2.0, 0); g.add(ring)
    },
  },
  sarvam: {
    torsoW: 0.32, torsoH: 0.52, headR: 0.19, heightMult: 1.02,
    addAccessory: (g, col) => {
      // Bindi dot on forehead
      const bindiMat = new THREE.MeshStandardMaterial({ color: '#FF4444', emissive: new THREE.Color('#FF2222'), emissiveIntensity: 1.5 })
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), bindiMat)
      bindi.position.set(0, 1.82, 0.195); g.add(bindi)
      // Head scarf / dupatta hint
      const scarfMat = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.5, emissive: col, emissiveIntensity: 0.3 })
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 20, Math.PI), scarfMat)
      scarf.position.set(0, 1.88, 0); scarf.rotation.x = 0.4; g.add(scarf)
    },
  },
}

// ─── Build one character ───────────────────────────────────────────────────────

function buildRig(char: CharacterConfig, isActive: boolean): Omit<Rig, 'labelEl' | 'speechEl'> {
  const d = DESIGNS[char.id] ?? DESIGNS.claude
  const col = new THREE.Color(char.color)
  const h = d.heightMult

  const main = () => new THREE.MeshStandardMaterial({
    color: col, roughness: 0.28, metalness: 0.12,
    emissive: col, emissiveIntensity: isActive ? 0.25 : 0.1,
  })
  const dark = () => new THREE.MeshStandardMaterial({ color: '#060A14', roughness: 0.3 })
  const skin = () => new THREE.MeshStandardMaterial({ color: char.skinColor, roughness: 0.5 })
  const eyeW = () => new THREE.MeshStandardMaterial({ color: 'white', emissive: new THREE.Color('white'), emissiveIntensity: 0.6 })
  const shine = () => new THREE.MeshStandardMaterial({ color: 'white', emissive: new THREE.Color('white'), emissiveIntensity: 3 })

  const group = new THREE.Group()
  group.position.set(char.homePosition[0], char.homePosition[1], char.homePosition[2])

  // ── Head group ────────────────────────────────────────────────────────────
  const headGroup = new THREE.Group()

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(d.headR, 24, 24), skin())
  headMesh.position.set(0, 1.72 * h, 0)
  headMesh.castShadow = true
  headGroup.add(headMesh)

  // Hair cap (half sphere on top of head)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(d.headR + 0.01, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    main()
  )
  hairCap.position.set(0, 1.72 * h, 0)
  headGroup.add(hairCap)

  // Eyes
  const eyeY = 1.73 * h
  const eyePositions: [number, number, number][] = [[-0.085, eyeY, d.headR * 0.88], [0.085, eyeY, d.headR * 0.88]]
  eyePositions.forEach(([x, y, z]) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), eyeW()); e.position.set(x, y, z); headGroup.add(e)
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), dark()); p.position.set(x, y, z + 0.03); headGroup.add(p)
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.009, 4, 4), shine()); s.position.set(x - 0.01, y + 0.01, z + 0.052); headGroup.add(s)
  })

  // Eyebrows
  const browMat = main()
  ;[[-0.085, 1.755 * h, d.headR * 0.85], [0.085, 1.755 * h, d.headR * 0.85]].forEach(([x, y, z]) => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.016, 0.012), browMat)
    brow.position.set(x, y, z); headGroup.add(brow)
  })

  // Animated mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 6, 12, Math.PI), dark())
  mouth.position.set(0, 1.685 * h, d.headR * 0.9)
  mouth.rotation.set(0.2, 0, 0)
  headGroup.add(mouth)

  group.add(headGroup)

  // Accessories (character-specific) — attached to group so world positions work
  d.addAccessory(group, col)

  // ── Neck ─────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 10), skin())
  neck.position.set(0, 1.56 * h, 0)
  group.add(neck)

  // ── Torso ─────────────────────────────────────────────────────────────────
  const torsoShape = new THREE.BoxGeometry(d.torsoW, d.torsoH, 0.2)
  const torso = new THREE.Mesh(torsoShape, main())
  torso.position.set(0, 1.22 * h, 0)
  torso.castShadow = true
  group.add(torso)

  // Shoulder buttons / collar
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
  const collar = new THREE.Mesh(new THREE.TorusGeometry(d.torsoW * 0.38, 0.018, 6, 16), collarMat)
  collar.rotation.x = Math.PI / 2; collar.position.set(0, 1.46 * h, 0); group.add(collar)

  // ── Hips ──────────────────────────────────────────────────────────────────
  const hips = new THREE.Mesh(new THREE.BoxGeometry(d.torsoW * 0.8, 0.14, 0.18), dark())
  hips.position.set(0, 0.93 * h, 0)
  group.add(hips)

  // ── Arms ──────────────────────────────────────────────────────────────────
  const armRad = 0.058; const armLen = 0.32
  const rightArm = new THREE.Group()
  rightArm.position.set(-(d.torsoW / 2 + 0.06), 1.35 * h, 0)
  const raUpper = new THREE.Mesh(new THREE.CapsuleGeometry(armRad, armLen, 6, 10), main()); raUpper.castShadow = true
  const raElbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), main()); raElbow.position.set(0, -(armLen / 2 + 0.06), 0)
  const raFore = new THREE.Mesh(new THREE.CapsuleGeometry(armRad * 0.9, 0.26, 6, 10), skin()); raFore.position.set(0, -(armLen / 2 + 0.22), 0)
  const raHand = new THREE.Mesh(new THREE.SphereGeometry(0.063, 8, 8), skin()); raHand.position.set(0, -(armLen / 2 + 0.38), 0)
  rightArm.add(raUpper, raElbow, raFore, raHand)
  group.add(rightArm)

  const leftArm = new THREE.Group()
  leftArm.position.set(d.torsoW / 2 + 0.06, 1.35 * h, 0)
  const laUpper = new THREE.Mesh(new THREE.CapsuleGeometry(armRad, armLen, 6, 10), main()); laUpper.castShadow = true
  const laElbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), main()); laElbow.position.set(0, -(armLen / 2 + 0.06), 0)
  const laFore = new THREE.Mesh(new THREE.CapsuleGeometry(armRad * 0.9, 0.26, 6, 10), skin()); laFore.position.set(0, -(armLen / 2 + 0.22), 0)
  const laHand = new THREE.Mesh(new THREE.SphereGeometry(0.063, 8, 8), skin()); laHand.position.set(0, -(armLen / 2 + 0.38), 0)
  leftArm.add(laUpper, laElbow, laFore, laHand)
  group.add(leftArm)

  // ── Legs ──────────────────────────────────────────────────────────────────
  const legRad = 0.07; const thighLen = 0.34; const shinLen = 0.3
  const rightLeg = new THREE.Group()
  rightLeg.position.set(-0.1, 0.86 * h, 0)
  const rlThigh = new THREE.Mesh(new THREE.CapsuleGeometry(legRad, thighLen, 6, 10), main()); rlThigh.castShadow = true
  const rlKnee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), main()); rlKnee.position.set(0, -(thighLen / 2 + 0.07), 0)
  const rlShin = new THREE.Mesh(new THREE.CapsuleGeometry(legRad * 0.88, shinLen, 6, 10), dark()); rlShin.position.set(0, -(thighLen / 2 + 0.3), 0)
  const rlShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), dark()); rlShoe.position.set(0, -(thighLen / 2 + shinLen + 0.05), 0.04)
  rightLeg.add(rlThigh, rlKnee, rlShin, rlShoe)
  group.add(rightLeg)

  const leftLeg = new THREE.Group()
  leftLeg.position.set(0.1, 0.86 * h, 0)
  const llThigh = new THREE.Mesh(new THREE.CapsuleGeometry(legRad, thighLen, 6, 10), main()); llThigh.castShadow = true
  const llKnee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), main()); llKnee.position.set(0, -(thighLen / 2 + 0.07), 0)
  const llShin = new THREE.Mesh(new THREE.CapsuleGeometry(legRad * 0.88, shinLen, 6, 10), dark()); llShin.position.set(0, -(thighLen / 2 + 0.3), 0)
  const llShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), dark()); llShoe.position.set(0, -(thighLen / 2 + shinLen + 0.05), 0.04)
  leftLeg.add(llThigh, llKnee, llShin, llShoe)
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
  const design = DESIGNS[char.id] ?? DESIGNS.claude

  // ── Movement ──────────────────────────────────────────────────────────────
  const target = state.targetPosition
    ? new THREE.Vector3(state.targetPosition[0], state.targetPosition[1], state.targetPosition[2])
    : new THREE.Vector3(hx, hy, hz)

  if (state.action === 'walking') {
    rig.currentPos.lerp(target, d * 2.2)
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

  const hm = design.heightMult

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
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -1.15, d * 5)
    ra.rotation.y = Math.sin(t * 7) * 0.4
    ra.rotation.x = 0
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
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
}

export function ArenaCanvas({ characterStates }: ArenaCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(characterStates)

  useEffect(() => { stateRef.current = characterStates }, [characterStates])

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
    scene.add(new THREE.AmbientLight('#1a1060', 0.15))

    const sun = new THREE.DirectionalLight('#fffaf0', 1.2)
    sun.position.set(3, 10, 6); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 35
    ;(sun.shadow.camera as THREE.OrthographicCamera).left = -14
    ;(sun.shadow.camera as THREE.OrthographicCamera).right = 14
    ;(sun.shadow.camera as THREE.OrthographicCamera).top = 14
    ;(sun.shadow.camera as THREE.OrthographicCamera).bottom = -14
    scene.add(sun)

    scene.add(Object.assign(new THREE.DirectionalLight('#4040CC', 0.45), { position: new THREE.Vector3(-8, 4, -3) }))
    scene.add(Object.assign(new THREE.DirectionalLight('#6030A0', 0.3), { position: new THREE.Vector3(0, 3, -10) }))

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
      CHARACTER_ORDER.forEach((id) => {
        const rig = rigs[id]; const char = CHARACTERS[id]; const state = states[id] ?? def
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
        bubblePos.set(0, 2.5, 0).applyMatrix4(rig.group.matrixWorld).project(camera)
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
