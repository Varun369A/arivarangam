'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CharacterState } from './CharacterFigure'
import type { CharacterId } from '@/lib/characters'
import { CHARACTERS } from '@/lib/characters'

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTENCE_MS = 7000   // 7 seconds per sentence before advancing
const WALK_DURATION = 5    // seconds for walk animation

// ─── Visual config per AI ─────────────────────────────────────────────────────

type Side = 'center' | 'left' | 'right'
interface CharVisual { shirt: string; skin: string; hair: string; label: string; side: Side }

const CHAR_VISUAL: Record<CharacterId, CharVisual> = {
  claude:     { shirt: '#D97706', skin: '#F5CBA7', hair: '#1c1c1c', label: 'Claude',     side: 'center' },
  perplexity: { shirt: '#0D9488', skin: '#EBD5BC', hair: '#1c1c1c', label: 'Perplexity', side: 'right'  },
  chatgpt:    { shirt: '#10B981', skin: '#F0B07A', hair: '#2a1a0a', label: 'ChatGPT',    side: 'right'  },
  gemini:     { shirt: '#8B5CF6', skin: '#D4A76A', hair: '#1c1c1c', label: 'Gemini',     side: 'left'   },
  sarvam:     { shirt: '#F59E0B', skin: '#C47B3E', hair: '#0f0a00', label: 'Sarvam',     side: 'left'   },
}

// Scene X positions as % of scene width (character centered here)
const MEET_X: Record<CharacterId, number> = {
  claude: 42, perplexity: 63, chatgpt: 67, gemini: 27, sarvam: 23,
}
const HOME_X: Record<CharacterId, number> = {
  claude: 42, perplexity: 118, chatgpt: 118, gemini: -18, sarvam: -18,
}

// ─── Speech Bubble — sentence-by-sentence, 7s each ───────────────────────────

function SpeechBubble({ text, color }: { text: string | null; color: string }) {
  const [current, setCurrent] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!text) { setCurrent(null); return }

    const sentences = text
      .split(/(?<=[.!?।])\s+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (!sentences.length) { setCurrent(text); return }

    let idx = 0
    setCurrent(sentences[0])

    const tick = () => {
      idx++
      if (idx < sentences.length) {
        setCurrent(sentences[idx])
        timerRef.current = setTimeout(tick, SENTENCE_MS)
      } else {
        setCurrent(null)
      }
    }
    timerRef.current = setTimeout(tick, SENTENCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [text])

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={current.slice(0, 24)}
          initial={{ opacity: 0, y: -10, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.94 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: '102%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            background: 'rgba(8,8,22,0.94)',
            border: `2.5px solid ${color}`,
            borderRadius: 16,
            padding: '11px 17px',
            maxWidth: 240,
            minWidth: 115,
            width: 'max-content',
            textAlign: 'center',
            color: '#f0f4ff',
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: `0 4px 30px ${color}55, 0 2px 10px rgba(0,0,0,0.6)`,
            letterSpacing: '0.01em',
          }}
        >
          {current}
          {/* Pointer */}
          <div style={{
            position: 'absolute', bottom: -11, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: `11px solid ${color}`,
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Anime Boy SVG ────────────────────────────────────────────────────────────

function AnimeCharSVG({
  shirt, skin, hair, label, action, isWalking,
}: {
  shirt: string; skin: string; hair: string; label: string
  action: string; isWalking: boolean
}) {
  const isTalking   = action === 'talking'
  const isWaving    = action === 'waving'
  const isThinking  = action === 'thinking'
  const isCelebrate = action === 'celebrating'
  const isCalling   = action === 'calling'

  return (
    <svg viewBox="0 0 100 240" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>

      {/* Ground shadow */}
      <ellipse cx="50" cy="237" rx="27" ry="5.5" fill="rgba(0,0,0,0.13)" />

      {/* ══ SHOES ══ */}
      <ellipse cx="33" cy="226" rx="19" ry="8" fill="#14142a" />
      <ellipse cx="67" cy="226" rx="19" ry="8" fill="#14142a" />
      {/* Laces */}
      <line x1="23" y1="221" x2="43" y2="221" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="57" y1="221" x2="77" y2="221" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
      {/* Toe cap */}
      <ellipse cx="42" cy="226" rx="7" ry="4" fill="#0c0c20" />
      <ellipse cx="58" cy="226" rx="7" ry="4" fill="#0c0c20" />

      {/* ══ SOCKS ══ */}
      <rect x="23" y="212" width="20" height="15" rx="4" fill="white" />
      <rect x="57" y="212" width="20" height="15" rx="4" fill="white" />

      {/* ══ LEGS ══ */}
      <motion.g
        style={{ transformOrigin: '33px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['-22deg', '22deg'] } : { rotate: '0deg' }}
        transition={isWalking
          ? { duration: 0.52, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
          : { duration: 0.3 }}
      >
        <rect x="23" y="184" width="20" height="30" rx="10" fill={skin} />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '67px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['22deg', '-22deg'] } : { rotate: '0deg' }}
        transition={isWalking
          ? { duration: 0.52, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
          : { duration: 0.3 }}
      >
        <rect x="57" y="184" width="20" height="30" rx="10" fill={skin} />
      </motion.g>

      {/* ══ SHORTS ══ */}
      <rect x="22" y="153" width="56" height="35" rx="8" fill="#14142a" />
      <rect x="25" y="155" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />

      {/* ══ T-SHIRT ══ */}
      <rect x="19" y="98" width="62" height="59" rx="10" fill={shirt} />
      {/* Collar */}
      <path d="M 36 98 Q 50 113 64 98" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" fill="none" />
      {/* Shirt bottom hem */}
      <rect x="19" y="151" width="62" height="4" rx="2" fill="rgba(0,0,0,0.14)" />
      {/* Name on shirt */}
      <text x="50" y="129" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.72)"
        fontFamily="system-ui, Arial, sans-serif" fontWeight="700" letterSpacing="0.8">
        {label.toUpperCase().slice(0, 9)}
      </text>

      {/* ══ LEFT ARM ══ */}
      <motion.g
        style={{ transformOrigin: '22px 106px' } as React.CSSProperties}
        animate={
          isWalking   ? { rotate: ['14deg', '-14deg'] } :
          isTalking   ? { rotate: ['-14deg', '8deg']  } :
          isCelebrate ? { rotate: ['-65deg', '-25deg'] } :
          { rotate: '0deg' }
        }
        transition={
          isWalking   ? { duration: 0.52, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } :
          isTalking   ? { duration: 0.75, repeat: Infinity, repeatType: 'mirror' } :
          isCelebrate ? { duration: 0.3,  repeat: Infinity, repeatType: 'mirror' } :
          { duration: 0.35 }
        }
      >
        <rect x="5" y="103" width="17" height="46" rx="8.5" fill={shirt} />
        <circle cx="13.5" cy="152" r="8.5" fill={skin} />
      </motion.g>

      {/* ══ RIGHT ARM ══ */}
      <motion.g
        style={{ transformOrigin: '78px 106px' } as React.CSSProperties}
        animate={
          isWaving    ? { rotate: ['-55deg', '-110deg'] } :
          isCalling   ? { rotate: ['-75deg', '-95deg']  } :
          isWalking   ? { rotate: ['-14deg', '14deg']   } :
          isTalking   ? { rotate: ['14deg', '-8deg']    } :
          isThinking  ? { rotate: '-28deg'              } :
          isCelebrate ? { rotate: ['-65deg', '-25deg']  } :
          { rotate: '0deg' }
        }
        transition={
          isWaving    ? { duration: 0.38, repeat: Infinity, repeatType: 'mirror' } :
          isCalling   ? { duration: 0.5,  repeat: Infinity, repeatType: 'mirror' } :
          isWalking   ? { duration: 0.52, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } :
          isTalking   ? { duration: 0.75, repeat: Infinity, repeatType: 'mirror' } :
          isCelebrate ? { duration: 0.3,  repeat: Infinity, repeatType: 'mirror' } :
          { duration: 0.35 }
        }
      >
        <rect x="78" y="103" width="17" height="46" rx="8.5" fill={shirt} />
        <circle cx="86.5" cy="152" r="8.5" fill={skin} />
        {/* Megaphone hand when calling */}
        {isCalling && (
          <ellipse cx="86" cy="92" rx="8.5" ry="6" fill={skin} />
        )}
      </motion.g>

      {/* ══ NECK ══ */}
      <rect x="40" y="87" width="20" height="16" rx="7" fill={skin} />

      {/* ══ HEAD ══ */}
      <motion.g
        style={{ transformOrigin: '50px 53px' } as React.CSSProperties}
        animate={
          isThinking  ? { rotate: '13deg', y: 7    } :
          isTalking   ? { y: [0, -3.5, 0]          } :
          isCelebrate ? { y: [0, -14, 0]           } :
          action === 'listening' ? { rotate: '-7deg' } :
          { rotate: '0deg', y: 0 }
        }
        transition={
          isTalking   ? { duration: 0.55, repeat: Infinity } :
          isCelebrate ? { duration: 0.32, repeat: Infinity } :
          { duration: 0.4 }
        }
      >
        {/* Head base */}
        <circle cx="50" cy="53" r="36" fill={skin} />

        {/* ── HAIR ── */}
        {/* Base top */}
        <path d="M 14 54 C 14 11 86 11 86 54 C 82 19 70 9 50 9 C 30 9 18 19 14 54 Z" fill={hair} />
        {/* Left side sideburn */}
        <path d="M 14 56 C 11 67 12 79 21 86 C 16 72 14 60 17 51 Z" fill={hair} />
        {/* Right side sideburn */}
        <path d="M 86 56 C 89 67 88 79 79 86 C 84 72 86 60 83 51 Z" fill={hair} />
        {/* Top tuft */}
        <path d="M 42 13 C 42 1 50 -3 58 13 C 52 5 48 5 42 13 Z" fill={hair} />
        {/* Fringe left */}
        <path d="M 25 33 C 27 24 33 18 38 20 C 33 23 29 29 29 37 Z" fill={hair} opacity="0.9" />
        {/* Fringe right */}
        <path d="M 75 33 C 73 24 67 18 62 20 C 67 23 71 29 71 37 Z" fill={hair} opacity="0.9" />

        {/* ── EYES ── */}
        {/* Whites */}
        <circle cx="37" cy="52" r="10.5" fill="white" />
        <circle cx="63" cy="52" r="10.5" fill="white" />
        {/* Iris */}
        <circle cx="37" cy="52" r="8" fill="#18181e" />
        <circle cx="63" cy="52" r="8" fill="#18181e" />
        {/* Pupil */}
        <circle cx="37" cy="52" r="5.5" fill="#050508" />
        <circle cx="63" cy="52" r="5.5" fill="#050508" />
        {/* Highlight large */}
        <circle cx="40.5" cy="48" r="3.2" fill="white" />
        <circle cx="66.5" cy="48" r="3.2" fill="white" />
        {/* Highlight small */}
        <circle cx="34.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />
        <circle cx="60.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />

        {/* ── EYEBROWS ── */}
        <path d="M 26 41 Q 37 36 44 39" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M 56 39 Q 63 36 74 41" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />

        {/* ── NOSE ── */}
        <path d="M 46 64 Q 50 68 54 64" stroke="#c07050" strokeWidth="1.7" fill="none"
          opacity="0.5" strokeLinecap="round" />

        {/* ── MOUTH ── */}
        <path
          d={isTalking ? 'M 40 74 Q 50 84 60 74' : 'M 41 73 Q 50 81 59 73'}
          stroke="#bf5f40" strokeWidth="2.5" fill="none" strokeLinecap="round"
        />

        {/* ── CHEEKS ── */}
        <ellipse cx="22" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity="0.42" />
        <ellipse cx="78" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity="0.42" />

        {/* ── THINKING BUBBLES ── */}
        {isThinking && (
          <g>
            <circle cx="77" cy="32" r="4.5" fill="rgba(255,255,255,0.88)" />
            <circle cx="85" cy="21" r="3.5" fill="rgba(255,255,255,0.88)" />
            <circle cx="92" cy="11" r="6.5" fill="rgba(255,255,255,0.92)" />
            <text x="92" y="14" textAnchor="middle" fontSize="7.5" fill="#555" fontFamily="system-ui">···</text>
          </g>
        )}
      </motion.g>
    </svg>
  )
}

// ─── Desk (appears during build phase) ───────────────────────────────────────

function DeskSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 230 130" style={{ width: '100%', height: '100%' }}>
      {/* Desk surface */}
      <rect x="8" y="46" width="214" height="14" rx="5" fill="#6b3f22" />
      <rect x="10" y="47" width="210" height="10" rx="4" fill="#8a5535" opacity="0.7" />
      {/* Desk legs */}
      <rect x="18" y="60" width="14" height="66" rx="4" fill="#6b3f22" />
      <rect x="198" y="60" width="14" height="66" rx="4" fill="#6b3f22" />
      {/* Monitor */}
      <rect x="76" y="8" width="78" height="40" rx="6" fill="#16162a" />
      <rect x="78" y="10" width="74" height="36" rx="4" fill="#1c1c3e" />
      {/* Code lines */}
      <rect x="83" y="14" width="44" height="3" rx="1.5" fill={color} opacity="0.85" />
      <rect x="83" y="19" width="60" height="3" rx="1.5" fill="#10B981" opacity="0.75" />
      <rect x="83" y="24" width="36" height="3" rx="1.5" fill="#A78BFA" opacity="0.75" />
      <rect x="83" y="29" width="52" height="3" rx="1.5" fill={color} opacity="0.6" />
      <rect x="83" y="34" width="40" height="3" rx="1.5" fill="#10B981" opacity="0.55" />
      {/* Monitor stand */}
      <rect x="111" y="48" width="8" height="7" fill="#16162a" />
      <rect x="100" y="54" width="30" height="5" rx="2" fill="#16162a" />
      {/* Keyboard */}
      <rect x="70" y="57" width="90" height="16" rx="4" fill="#1a1a30" />
      {[0,1,2,3,4,5,6,7].map(i => (
        <rect key={i} x={74 + i * 10} y={59} width="7" height="5" rx="1.5" fill="#2a2a48" />
      ))}
      <rect x="74" y="66" width="72" height="5" rx="1.5" fill="#2a2a48" />
      {/* Coffee mug */}
      <rect x="32" y="38" width="18" height="18" rx="4" fill="#ffe4b0" />
      <path d="M 50 43 Q 57 46 50 49" stroke="#e0c080" strokeWidth="2.2" fill="none" />
      <rect x="34" y="52" width="14" height="3" rx="1" fill="#d4a06a" opacity="0.5" />
      {/* Steam wisps */}
      <path d="M 37 36 Q 38 31 37 26" stroke="#ccc" strokeWidth="1.5" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
      <path d="M 43 35 Q 44 30 43 25" stroke="#ccc" strokeWidth="1.5" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Main Arena 2D Canvas ─────────────────────────────────────────────────────

export interface ArenaCanvas2DProps {
  characterStates: Record<CharacterId, CharacterState>
  welcomeUser?: string | null
  taskStatus?: string
}

export function ArenaCanvas2D({ characterStates, welcomeUser, taskStatus }: ArenaCanvas2DProps) {
  // X position (%) per character
  const [xPos, setXPos] = useState<Record<CharacterId, number>>({
    claude:     MEET_X.claude,
    perplexity: HOME_X.perplexity,
    chatgpt:    HOME_X.chatgpt,
    gemini:     HOME_X.gemini,
    sarvam:     HOME_X.sarvam,
  })

  // Which non-Claude chars are present at meet position
  const [present, setPresent] = useState<Record<CharacterId, boolean>>({
    claude: true, perplexity: false, chatgpt: false, gemini: false, sarvam: false,
  })

  // Local welcome greeting (overrides incoming characterState for Claude)
  const [greetSpeech, setGreetSpeech]   = useState<string | null>(null)
  const [greetAction, setGreetAction]   = useState<string | null>(null)
  const greetedRef = useRef(false)

  // Claude writing cycle when building (look-up / look-down loop)
  const [writePhase, setWritePhase] = useState<'look' | 'write'>('look')

  // Trigger welcome wave on first load with username
  useEffect(() => {
    if (!welcomeUser || greetedRef.current) return
    greetedRef.current = true
    setGreetAction('waving')
    setGreetSpeech(
      `Hi ${welcomeUser}! Welcome to Arivarangam. ` +
      `I'm Claude — your AI builder. Tell me what you want to create and I'll make it happen!`
    )
    const t = setTimeout(() => {
      setGreetAction(null)
      setGreetSpeech(null)
    }, 15000) // ~2 sentences × 7s + buffer
    return () => clearTimeout(t)
  }, [welcomeUser])

  // Update x positions when action is 'walking'
  useEffect(() => {
    const ids = Object.keys(characterStates) as CharacterId[]
    for (const id of ids) {
      if (id === 'claude') continue
      const state = characterStates[id]
      if (state.action === 'walking' && state.targetPosition) {
        // homePosition has |x| > 10, meetPosition has |x| < 10
        const goingHome = Math.abs(state.targetPosition[0]) > 10
        setXPos(prev => ({ ...prev, [id]: goingHome ? HOME_X[id] : MEET_X[id] }))
        setPresent(prev => ({ ...prev, [id]: !goingHome }))
      }
    }
  }, [characterStates])

  // Writing cycle for Claude when building
  useEffect(() => {
    if (taskStatus !== 'running') return
    const cycle = () => {
      setWritePhase('write')
      const t1 = setTimeout(() => {
        setWritePhase('look')
        const t2 = setTimeout(cycle, 2500)
        return () => clearTimeout(t2)
      }, 3500)
      return () => clearTimeout(t1)
    }
    const t = setTimeout(cycle, 1200)
    return () => clearTimeout(t)
  }, [taskStatus])

  const isBuilding = taskStatus === 'running'
  const charIds    = Object.keys(CHAR_VISUAL) as CharacterId[]

  // Character dimensions (vh-based for responsive sizing)
  const charH = 22  // vh
  const charW = charH * 0.46

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #eef6fa 0%, #f0e8d8 40%, #e8dcc8 100%)',
    }}>
      {/* Sky gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(190,230,255,0.28) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Floor */}
      <div style={{
        position: 'absolute', bottom: '17%', left: 0, right: 0,
        height: 2,
        background: 'rgba(140,110,80,0.22)',
        boxShadow: '0 2px 12px rgba(140,110,80,0.12)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(140,110,70,0.2) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Soft ambient glows (background atmosphere) */}
      {([
        { left: '8%',  top: '32%', color: '#D97706', size: 180 },
        { left: '78%', top: '22%', color: '#0D9488', size: 155 },
        { left: '46%', top: '10%', color: '#8B5CF6', size: 130 },
      ] as const).map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: orb.left, top: orb.top,
            width: orb.size, height: orb.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}1a 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 4.5 + i * 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Desk — appears when Claude is building */}
      <AnimatePresence>
        {isBuilding && (
          <motion.div
            key="desk"
            initial={{ opacity: 0, scale: 0.65, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.65, y: 50 }}
            transition={{ duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'absolute',
              bottom: '13%',
              left: '26%',
              width: '27%',
              height: '20%',
              zIndex: 3,
            }}
          >
            <DeskSVG color={CHAR_VISUAL.claude.shirt} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Characters */}
      {charIds.map(id => {
        const state   = characterStates[id]
        const visual  = CHAR_VISUAL[id]

        // Merge greeting override for Claude
        const action  = (id === 'claude' && greetAction)  ? greetAction  : state.action
        const speech  = (id === 'claude' && greetSpeech)  ? greetSpeech  : state.speech

        // When building, override Claude's action with the write cycle
        const effectiveAction = (isBuilding && id === 'claude')
          ? (writePhase === 'write' ? 'thinking' : 'idle')
          : action

        const isWalking = action === 'walking'
        const x = xPos[id]

        // Face direction
        const facingLeft = (() => {
          if (id === 'claude') return false
          if (visual.side === 'right') return present[id]              // face left toward Claude
          if (visual.side === 'left')  return isWalking && !present[id] // face left walking home
          return false
        })()

        // Claude sits lower when desk is present
        const bottomPct = (isBuilding && id === 'claude') ? 27 : 17

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              bottom: `${bottomPct}%`,
              // Use CSS transition for smooth walk — Framer Motion handles the bob
              left: `calc(${x}% - ${charW / 2}vh)`,
              width: `${charW}vh`,
              height: `${charH}vh`,
              zIndex: id === 'claude' ? 6 : 4,
              transition: `left ${isWalking ? WALK_DURATION : 0.5}s ${isWalking ? 'linear' : 'ease-out'}, bottom 0.6s ease-out`,
            }}
          >
            {/* Idle bob via Framer Motion on inner wrapper */}
            <motion.div
              style={{ position: 'relative', width: '100%', height: '100%' }}
              animate={{ y: isWalking ? 0 : [0, -5, 0] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Speech bubble — always rendered in screen direction */}
              <SpeechBubble text={speech} color={visual.shirt} />

              {/* Character SVG — flipped when facing left */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: facingLeft ? 'scaleX(-1)' : 'none',
              }}>
                <AnimeCharSVG
                  shirt={visual.shirt}
                  skin={visual.skin}
                  hair={visual.hair}
                  label={visual.label}
                  action={effectiveAction}
                  isWalking={isWalking}
                />
              </div>

              {/* Name label below feet */}
              <div style={{
                position: 'absolute',
                top: '104%',
                left: '50%',
                transform: 'translateX(-50%)',
                color: visual.shirt,
                fontSize: 'clamp(10px, 1.3vh, 14px)',
                fontWeight: 800,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.06em',
                textShadow: '0 1px 6px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                {visual.label}
              </div>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}
