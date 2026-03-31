'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CHARACTERS, CHARACTER_ORDER } from '@/lib/characters'
import type { CharacterConfig } from '@/lib/characters'
import type { CharacterState } from './CharacterFigure'

// ─── Rig ─────────────────────────────────────────────────────────────────────

interface Rig {
  group: THREE.Group
  body: THREE.Mesh
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

// ─── Build character geometry ─────────────────────────────────────────────────

function buildRig(char: CharacterConfig, isActive: boolean): Omit<Rig, 'labelEl' | 'speechEl'> {
  const col = new THREE.Color(char.color)

  const main = () =>
    new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.25,
      metalness: 0.15,
      emissive: col,
      emissiveIntensity: isActive ? 0.2 : 0.08,
    })
  const dark = () => new THREE.MeshStandardMaterial({ color: '#060A14', roughness: 0.3 })
  const white = () =>
    new THREE.MeshStandardMaterial({
      color: 'white',
      emissive: new THREE.Color('white'),
      emissiveIntensity: 0.5,
    })
  const shine = () =>
    new THREE.MeshStandardMaterial({
      color: 'white',
      emissive: new THREE.Color('white'),
      emissiveIntensity: 3,
    })

  const group = new THREE.Group()
  group.position.set(char.homePosition[0], char.homePosition[1], char.homePosition[2])

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.5, 10, 20), main())
  body.position.set(0, 1.08, 0)
  body.castShadow = true
  group.add(body)

  // Head group
  const headGroup = new THREE.Group()
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.195, 24, 24), main())
  headMesh.position.set(0, 1.65, 0)
  headMesh.castShadow = true
  headGroup.add(headMesh)

  // Eyes
  const eyeWhitePos: [number, number, number][] = [[-0.082, 1.665, 0.17], [0.082, 1.665, 0.17]]
  eyeWhitePos.forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 12), white())
    m.position.set(x, y, z)
    headGroup.add(m)
  })
  const pupilPos: [number, number, number][] = [[-0.082, 1.665, 0.208], [0.082, 1.665, 0.208]]
  pupilPos.forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), dark())
    m.position.set(x, y, z)
    headGroup.add(m)
  })
  const shinePos: [number, number, number][] = [[-0.074, 1.672, 0.225], [0.09, 1.672, 0.225]]
  shinePos.forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.009, 4, 4), shine())
    m.position.set(x, y, z)
    headGroup.add(m)
  })

  // Mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 6, 12, Math.PI), dark())
  mouth.position.set(0, 1.615, 0.188)
  mouth.rotation.set(0.15, 0, 0)
  headGroup.add(mouth)
  group.add(headGroup)

  // Arms
  const rightArm = new THREE.Group()
  rightArm.position.set(-0.285, 1.28, 0)
  const raBod = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.34, 6, 10), main())
  raBod.castShadow = true
  const raHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), main())
  raHand.position.set(0, -0.23, 0)
  raHand.castShadow = true
  rightArm.add(raBod, raHand)
  group.add(rightArm)

  const leftArm = new THREE.Group()
  leftArm.position.set(0.285, 1.28, 0)
  const laBod = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.34, 6, 10), main())
  laBod.castShadow = true
  const laHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), main())
  laHand.position.set(0, -0.23, 0)
  laHand.castShadow = true
  leftArm.add(laBod, laHand)
  group.add(leftArm)

  // Legs
  const rightLeg = new THREE.Group()
  rightLeg.position.set(-0.1, 0.71, 0)
  const rlBod = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.4, 6, 10), main())
  rlBod.castShadow = true
  const rlShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), dark())
  rlShoe.position.set(0, -0.3, 0.06)
  rlShoe.castShadow = true
  rightLeg.add(rlBod, rlShoe)
  group.add(rightLeg)

  const leftLeg = new THREE.Group()
  leftLeg.position.set(0.1, 0.71, 0)
  const llBod = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.4, 6, 10), main())
  llBod.castShadow = true
  const llShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), dark())
  llShoe.position.set(0, -0.3, 0.06)
  llShoe.castShadow = true
  leftLeg.add(llBod, llShoe)
  group.add(leftLeg)

  // Glow
  const glow = new THREE.PointLight(char.glowColor, isActive ? 2.5 : 1.2, 3, 2)
  glow.position.set(0, 0.5, 0)
  group.add(glow)

  // Floor circle
  const floorCircle = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 40),
    new THREE.MeshStandardMaterial({
      color: char.color,
      transparent: true,
      opacity: 0.22,
      emissive: col,
      emissiveIntensity: 1.2,
      depthWrite: false,
    }),
  )
  floorCircle.rotation.set(-Math.PI / 2, 0, 0)
  floorCircle.position.set(0, 0.005, 0)
  floorCircle.receiveShadow = true
  group.add(floorCircle)

  return {
    group,
    body,
    headGroup,
    rightArm,
    leftArm,
    rightLeg,
    leftLeg,
    mouth,
    glow,
    currentPos: new THREE.Vector3(char.homePosition[0], char.homePosition[1], char.homePosition[2]),
  }
}

// ─── Per-frame animation ──────────────────────────────────────────────────────

function animate(rig: Rig, char: CharacterConfig, state: CharacterState, isActive: boolean, t: number, delta: number) {
  const d = Math.min(delta, 0.05)
  const g = rig.group

  // Movement
  const hx = char.homePosition[0]
  const hy = char.homePosition[1]
  const hz = char.homePosition[2]
  const target = state.targetPosition
    ? new THREE.Vector3(state.targetPosition[0], state.targetPosition[1], state.targetPosition[2])
    : new THREE.Vector3(hx, hy, hz)

  if (state.action === 'walking') {
    rig.currentPos.lerp(target, d * 1.8)
    g.position.set(rig.currentPos.x, hy, rig.currentPos.z)
    const dir = target.clone().sub(rig.currentPos)
    if (dir.length() > 0.05) {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, Math.atan2(dir.x, dir.z), d * 6)
    }
  } else {
    rig.currentPos.lerp(new THREE.Vector3(hx, hy, hz), d * 1.2)
    g.position.set(rig.currentPos.x, hy, rig.currentPos.z)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, d * 4)
  }

  // Head & body
  if (state.action === 'idle' || state.action === 'listening') {
    g.position.y += Math.sin(t * 1.4 + hx * 0.5) * 0.025
    rig.body.rotation.z = Math.sin(t * 0.9) * 0.015
    rig.headGroup.rotation.y = Math.sin(t * 0.6) * 0.12
    rig.headGroup.rotation.x = 0
  }
  if (state.action === 'talking') {
    rig.headGroup.rotation.x = Math.sin(t * 5.5) * 0.07
    rig.headGroup.rotation.y = Math.sin(t * 2) * 0.08
    rig.body.rotation.z = Math.sin(t * 2.5) * 0.025
  }
  if (state.action === 'thinking') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, 0.35, d * 3)
    rig.headGroup.rotation.x = THREE.MathUtils.lerp(rig.headGroup.rotation.x, -0.18, d * 3)
    rig.body.rotation.z = Math.sin(t * 0.5) * 0.01
  }
  if (state.action === 'celebrating') {
    g.position.y += Math.abs(Math.sin(t * 5.5)) * 0.18
    rig.body.rotation.z = Math.sin(t * 5) * 0.12
    rig.headGroup.rotation.z = Math.sin(t * 5 + 1) * 0.15
  }
  if (state.action === 'calling') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, -0.4, d * 4)
    rig.headGroup.rotation.x = 0
    rig.body.rotation.y = THREE.MathUtils.lerp(rig.body.rotation.y, -0.2, d * 3)
  }
  if (state.action === 'walking') {
    rig.body.rotation.z = Math.sin(t * 8) * 0.04
    g.position.y += Math.abs(Math.sin(t * 8)) * 0.03
  }
  if (state.action === 'pointing') {
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(rig.headGroup.rotation.y, -0.5, d * 3)
    rig.headGroup.rotation.x = 0
  }

  // Mouth
  const speaking = state.action === 'talking' || !!state.speech
  rig.mouth.scale.y = THREE.MathUtils.lerp(
    rig.mouth.scale.y,
    speaking ? 0.8 + Math.abs(Math.sin(t * 12)) * 0.8 : 0.5,
    d * 18,
  )

  // Arms
  const ra = rig.rightArm
  const la = rig.leftArm
  if (state.action === 'waving') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -1.1, d * 5)
    ra.rotation.y = Math.sin(t * 7) * 0.35
    ra.rotation.x = 0
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
  } else if (state.action === 'celebrating') {
    ra.rotation.z = -Math.PI / 2 + Math.sin(t * 7) * 0.25
    la.rotation.z = Math.PI / 2 + Math.sin(t * 7 + 1) * 0.25
    ra.rotation.x = 0
    la.rotation.x = 0
  } else if (state.action === 'pointing') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.7, d * 4)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.3, d * 4)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
  } else if (state.action === 'walking') {
    ra.rotation.x = Math.sin(t * 8) * 0.55
    la.rotation.x = -Math.sin(t * 8) * 0.55
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, d * 3)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, d * 3)
  } else if (state.action === 'thinking') {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.6, d * 3)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, -0.4, d * 3)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.15, d * 3)
    la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, d * 3)
  } else if (state.action === 'talking') {
    ra.rotation.z = -0.18 + Math.sin(t * 3) * 0.12
    ra.rotation.x = Math.sin(t * 2.5) * 0.08
    la.rotation.z = 0.18 + Math.sin(t * 3 + 1) * 0.06
    la.rotation.x = 0
  } else {
    ra.rotation.z = THREE.MathUtils.lerp(ra.rotation.z, -0.12, d * 3)
    ra.rotation.x = THREE.MathUtils.lerp(ra.rotation.x, 0, d * 3)
    ra.rotation.y = THREE.MathUtils.lerp(ra.rotation.y, 0, d * 3)
    la.rotation.z = THREE.MathUtils.lerp(la.rotation.z, 0.12, d * 3)
    la.rotation.x = THREE.MathUtils.lerp(la.rotation.x, 0, d * 3)
  }

  // Legs
  const rl = rig.rightLeg
  const ll = rig.leftLeg
  if (state.action === 'walking') {
    rl.rotation.x = -Math.sin(t * 8) * 0.42
    ll.rotation.x = Math.sin(t * 8) * 0.42
  } else if (state.action === 'celebrating') {
    rl.rotation.x = Math.sin(t * 5.5) * 0.25
    ll.rotation.x = -Math.sin(t * 5.5) * 0.25
  } else {
    rl.rotation.x = THREE.MathUtils.lerp(rl.rotation.x, 0, d * 4)
    ll.rotation.x = THREE.MathUtils.lerp(ll.rotation.x, 0, d * 4)
  }

  // Glow
  const base = isActive ? 2.5 : 1.2
  const pulse = state.action === 'talking' || state.action === 'celebrating' ? 0.8 : 0.3
  rig.glow.intensity = base + Math.sin(t * 2.5) * pulse
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ArenaCanvasProps {
  characterStates: Record<string, CharacterState>
}

export function ArenaCanvas({ characterStates }: ArenaCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(characterStates)

  useEffect(() => {
    stateRef.current = characterStates
  }, [characterStates])

  useEffect(() => {
    const mount = mountRef.current as HTMLDivElement
    const overlay = overlayRef.current as HTMLDivElement
    if (!mount || !overlay) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 600)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#060610')
    scene.fog = new THREE.Fog('#060610', 20, 40)

    // Camera
    const w0 = mount.clientWidth || 800
    const h0 = mount.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(48, w0 / h0, 0.1, 100)
    camera.position.set(0, 3.2, 11)
    camera.lookAt(0, 1, 0)

    // Lights
    scene.add(new THREE.AmbientLight('#1a1060', 0.12))

    const sun = new THREE.DirectionalLight('#fffaf0', 1.1)
    sun.position.set(3, 9, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far = 30
    ;(sun.shadow.camera as THREE.OrthographicCamera).left = -12
    ;(sun.shadow.camera as THREE.OrthographicCamera).right = 12
    ;(sun.shadow.camera as THREE.OrthographicCamera).top = 12
    ;(sun.shadow.camera as THREE.OrthographicCamera).bottom = -12
    scene.add(sun)

    const bl = new THREE.DirectionalLight('#4040CC', 0.4)
    bl.position.set(-8, 4, -3)
    scene.add(bl)

    const pl = new THREE.DirectionalLight('#6030A0', 0.3)
    pl.position.set(0, 3, -10)
    scene.add(pl)

    const spot = new THREE.SpotLight('#FEF3C7', 2.5)
    spot.position.set(0, 8, 1)
    spot.angle = 0.35
    spot.penumbra = 0.6
    spot.castShadow = true
    spot.target.position.set(0, 0, 0)
    scene.add(spot, spot.target)

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: '#06060F', roughness: 0.9, metalness: 0.3 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const grid = new THREE.GridHelper(40, 40, '#1a1040', '#0d0826')
    grid.position.y = 0.002
    scene.add(grid)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 64),
      new THREE.MeshStandardMaterial({
        color: '#D97706',
        emissive: new THREE.Color('#D97706'),
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.003
    scene.add(ring)

    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 64),
      new THREE.MeshStandardMaterial({
        color: '#D97706',
        emissive: new THREE.Color('#D97706'),
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      }),
    )
    disk.rotation.x = -Math.PI / 2
    disk.position.y = 0.003
    scene.add(disk)

    // Stars
    const starPos = new Float32Array(2500 * 3)
    for (let i = 0; i < 2500; i++) {
      const r = 35 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 'white', size: 0.1, transparent: true, opacity: 0.8, sizeAttenuation: true }),
    )
    scene.add(stars)

    // Ambient particles
    const partPos = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      partPos[i * 3] = (Math.random() - 0.5) * 28
      partPos[i * 3 + 1] = Math.random() * 12
      partPos[i * 3 + 2] = (Math.random() - 0.5) * 28
    }
    const partGeo = new THREE.BufferGeometry()
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
    const particles = new THREE.Points(
      partGeo,
      new THREE.PointsMaterial({
        size: 0.035,
        color: '#8B5CF6',
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      }),
    )
    scene.add(particles)

    // Floating orbs
    const orbDefs: { pos: [number, number, number]; color: string }[] = [
      { pos: [-8, 4, -5], color: '#6366f1' },
      { pos: [8, 3.5, -4], color: '#8B5CF6' },
      { pos: [0, 6, -8], color: '#0D9488' },
      { pos: [-4, 2.5, 4], color: '#D97706' },
      { pos: [5, 2, 3], color: '#10B981' },
    ]
    const orbs = orbDefs.map(({ pos, color }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(color),
          emissiveIntensity: 2,
          transparent: true,
          opacity: 0.7,
        }),
      )
      mesh.position.set(pos[0], pos[1], pos[2])
      const light = new THREE.PointLight(color, 0.3, 3)
      light.position.set(pos[0], pos[1], pos[2])
      scene.add(mesh, light)
      return { mesh, light, baseY: pos[1] }
    })

    // Characters
    const rigs: Record<string, Rig> = {}
    const bubbleWorldPos = new THREE.Vector3()

    CHARACTER_ORDER.forEach((id) => {
      const char = CHARACTERS[id]
      const base = buildRig(char, id === 'claude')
      scene.add(base.group)

      const labelEl = document.createElement('div')
      labelEl.style.cssText =
        'position:absolute;pointer-events:none;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:4px;'

      const speechEl = document.createElement('div')
      speechEl.style.cssText = [
        'background:rgba(4,4,18,0.94)',
        `border:1.5px solid ${char.color}`,
        'border-radius:14px',
        'padding:7px 13px',
        'max-width:210px',
        'color:#f1f5f9',
        'font-size:12px',
        'line-height:1.45',
        'text-align:center',
        'backdrop-filter:blur(12px)',
        `box-shadow:0 0 20px ${char.color}50,0 4px 20px rgba(0,0,0,0.5)`,
        'font-family:system-ui,sans-serif',
        'white-space:pre-wrap',
        'display:none',
      ].join(';')

      const nameEl = document.createElement('div')
      nameEl.textContent = char.name
      nameEl.style.cssText = [
        'background:rgba(4,4,18,0.82)',
        `border:1px solid ${char.color}`,
        'border-radius:20px',
        'padding:2px 12px',
        `color:${char.color}`,
        'font-size:11px',
        'font-weight:700',
        'font-family:monospace',
        'letter-spacing:0.06em',
        `box-shadow:0 0 10px ${char.color}40`,
        'text-transform:uppercase',
      ].join(';')

      labelEl.append(speechEl, nameEl)
      overlay.appendChild(labelEl)

      rigs[id] = { ...base, labelEl, speechEl }
    })

    // Animation loop
    const clock = new THREE.Clock()
    let prevT = 0
    let rafId = 0
    const defaultState: CharacterState = { action: 'idle', targetPosition: null, speech: null }

    function loop() {
      rafId = requestAnimationFrame(loop)
      const t = clock.getElapsedTime()
      const delta = t - prevT
      prevT = t

      stars.rotation.y = t * 0.04
      stars.rotation.x = Math.sin(t * 0.02) * 0.05
      particles.rotation.y = t * 0.04
      particles.rotation.x = Math.sin(t * 0.02) * 0.05

      orbs.forEach(({ mesh, light, baseY }, i) => {
        const y = baseY + Math.sin(t * 1.4 + i * 1.5) * 0.3
        mesh.position.y = y
        light.position.y = y
      })

      const states = stateRef.current
      CHARACTER_ORDER.forEach((id) => {
        const rig = rigs[id]
        const char = CHARACTERS[id]
        const state = states[id] ?? defaultState
        animate(rig, char, state, id === 'claude', t, delta)
      })

      // Render (updates matrixWorld for all objects)
      renderer.render(scene, camera)

      // Update bubble positions after render so matrixWorld is current
      CHARACTER_ORDER.forEach((id) => {
        const rig = rigs[id]
        const state = states[id] ?? defaultState

        bubbleWorldPos.set(0, 2.3, 0).applyMatrix4(rig.group.matrixWorld).project(camera)

        const px = (bubbleWorldPos.x + 1) * 0.5 * mount.clientWidth
        const py = (-bubbleWorldPos.y + 1) * 0.5 * mount.clientHeight

        if (bubbleWorldPos.z < 1) {
          rig.labelEl.style.left = `${px}px`
          rig.labelEl.style.top = `${py}px`
          rig.labelEl.style.display = 'flex'
        } else {
          rig.labelEl.style.display = 'none'
        }

        if (state.speech) {
          rig.speechEl.textContent = state.speech
          rig.speechEl.style.display = 'block'
        } else {
          rig.speechEl.style.display = 'none'
        }
      })
    }

    loop()

    // Resize
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      CHARACTER_ORDER.forEach((id) => {
        const el = rigs[id]?.labelEl
        if (el && overlay.contains(el)) overlay.removeChild(el)
      })
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#060610' }} />
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      />
    </div>
  )
}

export default ArenaCanvas
