'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CharacterState } from './CharacterFigure'
import type { CharacterId } from '@/lib/characters'

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTENCE_MS = 7000
const WALK_SECS   = 5
const ROAM_SECS   = 6

// ─── Visual config ────────────────────────────────────────────────────────────

type Side = 'center' | 'left' | 'right'
interface CharVisual { shirt: string; skin: string; hair: string; label: string; side: Side }

const CHAR_VISUAL: Record<CharacterId, CharVisual> = {
  claude:     { shirt: '#D97706', skin: '#F5CBA7', hair: '#1c1c1c', label: 'Claude',     side: 'center' },
  perplexity: { shirt: '#0D9488', skin: '#EBD5BC', hair: '#1c1c1c', label: 'Perplexity', side: 'right'  },
  chatgpt:    { shirt: '#10B981', skin: '#F0B07A', hair: '#2a1a0a', label: 'ChatGPT',    side: 'right'  },
  gemini:     { shirt: '#8B5CF6', skin: '#D4A76A', hair: '#1c1c1c', label: 'Gemini',     side: 'left'   },
  sarvam:     { shirt: '#F59E0B', skin: '#C47B3E', hair: '#0f0a00', label: 'Sarvam',     side: 'left'   },
}

// ─── Positions — perspective effect (far = small + high, near = full + floor) ─

interface Pos { x: number; bottomPct: number; scale: number }

const HOME_POS: Record<CharacterId, Pos> = {
  claude:     { x: 42,  bottomPct: 17, scale: 1.0  },
  perplexity: { x: 92,  bottomPct: 25, scale: 0.50 },
  chatgpt:    { x: 88,  bottomPct: 28, scale: 0.45 },
  gemini:     { x: 8,   bottomPct: 25, scale: 0.50 },
  sarvam:     { x: 12,  bottomPct: 28, scale: 0.45 },
}

const MEET_POS: Record<CharacterId, Pos> = {
  claude:     { x: 42, bottomPct: 17, scale: 1.0 },
  perplexity: { x: 64, bottomPct: 17, scale: 1.0 },
  chatgpt:    { x: 64, bottomPct: 17, scale: 1.0 },
  gemini:     { x: 26, bottomPct: 17, scale: 1.0 },
  sarvam:     { x: 26, bottomPct: 17, scale: 1.0 },
}

// Dance positions — all 5 stand in a row
const DANCE_POS: Record<CharacterId, Pos> = {
  claude:     { x: 42, bottomPct: 17, scale: 1.0  },
  perplexity: { x: 58, bottomPct: 17, scale: 0.9  },
  chatgpt:    { x: 68, bottomPct: 17, scale: 0.88 },
  gemini:     { x: 32, bottomPct: 17, scale: 0.88 },
  sarvam:     { x: 22, bottomPct: 17, scale: 0.9  },
}

// ─── Speech Bubble — 7s per sentence ────────────────────────────────────────

function SpeechBubble({ text, color }: { text: string | null; color: string }) {
  const [current, setCurrent] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!text) { setCurrent(null); return }

    const sentences = text.split(/(?<=[.!?।])\s+/).map(s => s.trim()).filter(Boolean)
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
          initial={{ opacity: 0, y: -12, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.93 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'absolute', bottom: '105%', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(8,8,22,0.94)', border: `2.5px solid ${color}`,
            borderRadius: 16, padding: '11px 17px',
            maxWidth: 240, minWidth: 115, width: 'max-content',
            textAlign: 'center', color: '#f0f4ff', fontSize: 13,
            lineHeight: 1.6, fontFamily: 'system-ui,-apple-system,sans-serif',
            fontWeight: 500, pointerEvents: 'none', zIndex: 20,
            boxShadow: `0 4px 30px ${color}55, 0 2px 10px rgba(0,0,0,0.6)`,
          }}
        >
          {current}
          <div style={{
            position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
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
}: { shirt: string; skin: string; hair: string; label: string; action: string; isWalking: boolean }) {

  const isTalking   = action === 'talking'
  const isWaving    = action === 'waving'
  const isThinking  = action === 'thinking'
  const isCelebrate = action === 'celebrating'
  const isCalling   = action === 'calling'
  const isListening = action === 'listening'
  const isDancing   = action === 'dancing'

  const fastLoop = { repeat: Infinity, repeatType: 'mirror' as const }
  const walkB    = { duration: 0.44, ...fastLoop, ease: 'easeInOut' as const }
  const danceB   = { duration: 0.26, ...fastLoop, ease: 'easeInOut' as const }

  return (
    <svg viewBox="0 0 100 240" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>
      {/* Ground shadow */}
      <ellipse cx="50" cy="237" rx="27" ry="5.5" fill="rgba(0,0,0,0.13)" />

      {/* LEFT LEG + sock + shoe (all swing together) */}
      <motion.g style={{ transformOrigin: '33px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['-34deg','34deg'] } : isDancing ? { rotate: ['-22deg','22deg'] } : { rotate: '0deg' }}
        transition={isWalking ? walkB : isDancing ? danceB : { duration: 0.3 }}
      >
        <rect x="23" y="184" width="20" height="32" rx="10" fill={skin} />
        <rect x="23" y="210" width="20" height="16" rx="4"  fill="white" />
        <ellipse cx="33" cy="227" rx="19" ry="8" fill="#14142a" />
        <line x1="23" y1="222" x2="43" y2="222" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
        <ellipse cx="42" cy="227" rx="7" ry="4" fill="#0c0c20" />
      </motion.g>

      {/* RIGHT LEG + sock + shoe (opposite phase) */}
      <motion.g style={{ transformOrigin: '67px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['34deg','-34deg'] } : isDancing ? { rotate: ['22deg','-22deg'] } : { rotate: '0deg' }}
        transition={isWalking ? walkB : isDancing ? danceB : { duration: 0.3 }}
      >
        <rect x="57" y="184" width="20" height="32" rx="10" fill={skin} />
        <rect x="57" y="210" width="20" height="16" rx="4"  fill="white" />
        <ellipse cx="67" cy="227" rx="19" ry="8" fill="#14142a" />
        <line x1="57" y1="222" x2="77" y2="222" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
        <ellipse cx="58" cy="227" rx="7" ry="4" fill="#0c0c20" />
      </motion.g>

      {/* SHORTS */}
      <rect x="22" y="153" width="56" height="35" rx="8" fill="#14142a" />
      <rect x="25" y="155" width="18" height="3"  rx="1.5" fill="rgba(255,255,255,0.07)" />

      {/* T-SHIRT */}
      <rect x="19" y="98" width="62" height="59" rx="10" fill={shirt} />
      <path d="M 36 98 Q 50 113 64 98" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" fill="none" />
      <rect x="19" y="151" width="62" height="4" rx="2" fill="rgba(0,0,0,0.14)" />
      <text x="50" y="129" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.72)"
        fontFamily="system-ui,Arial,sans-serif" fontWeight="700" letterSpacing="0.8">
        {label.toUpperCase().slice(0, 9)}
      </text>

      {/* LEFT ARM */}
      <motion.g style={{ transformOrigin: '22px 106px' } as React.CSSProperties}
        animate={
          isDancing   ? { rotate: ['-100deg','-50deg'] } :
          isWaving    ? { rotate: ['-55deg','-115deg'] } :
          isWalking   ? { rotate: ['34deg','-34deg']   } :
          isTalking   ? { rotate: ['-14deg','8deg']    } :
          isCelebrate ? { rotate: ['-65deg','-20deg']  } :
          { rotate: '0deg' }
        }
        transition={
          isDancing   ? danceB :
          isWaving    ? { duration: 0.36, ...fastLoop } :
          isWalking   ? walkB :
          isTalking   ? { duration: 0.75, ...fastLoop } :
          isCelebrate ? { duration: 0.28, ...fastLoop } :
          { duration: 0.35 }
        }
      >
        <rect x="5" y="103" width="17" height="46" rx="8.5" fill={shirt} />
        <circle cx="13.5" cy="152" r="8.5" fill={skin} />
      </motion.g>

      {/* RIGHT ARM */}
      <motion.g style={{ transformOrigin: '78px 106px' } as React.CSSProperties}
        animate={
          isDancing   ? { rotate: ['-50deg','-100deg'] } :
          isWaving    ? { rotate: ['-50deg','-115deg'] } :
          isCalling   ? { rotate: ['-75deg','-98deg']  } :
          isWalking   ? { rotate: ['-34deg','34deg']   } :
          isTalking   ? { rotate: ['14deg','-8deg']    } :
          isThinking  ? { rotate: '-28deg'             } :
          isCelebrate ? { rotate: ['-65deg','-20deg']  } :
          { rotate: '0deg' }
        }
        transition={
          isDancing   ? { duration: 0.26, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.13 } :
          isWaving    ? { duration: 0.36, ...fastLoop } :
          isCalling   ? { duration: 0.5,  ...fastLoop } :
          isWalking   ? walkB :
          isTalking   ? { duration: 0.75, ...fastLoop } :
          isCelebrate ? { duration: 0.28, ...fastLoop } :
          { duration: 0.35 }
        }
      >
        <rect x="78" y="103" width="17" height="46" rx="8.5" fill={shirt} />
        <circle cx="86.5" cy="152" r="8.5" fill={skin} />
        {isCalling && <ellipse cx="86" cy="92" rx="8.5" ry="6" fill={skin} />}
      </motion.g>

      {/* NECK */}
      <rect x="40" y="87" width="20" height="16" rx="7" fill={skin} />

      {/* HEAD */}
      <motion.g
        style={{ transformOrigin: '50px 53px' } as React.CSSProperties}
        animate={
          isDancing   ? { y: [0,-8,0], rotate: ['-5deg','5deg']   } :
          isWalking   ? { y: [0,-2.5,0], rotate: ['-3deg','3deg'] } :
          isThinking  ? { rotate: '13deg', y: 8                   } :
          isTalking   ? { y: [0,-4,0]                             } :
          isCelebrate ? { y: [0,-14,0]                            } :
          isListening ? { rotate: '-7deg'                         } :
          { rotate: '0deg', y: 0 }
        }
        transition={
          isDancing   ? { duration: 0.26, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } :
          isWalking   ? { duration: 0.44, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } :
          isTalking   ? { duration: 0.5,  repeat: Infinity } :
          isCelebrate ? { duration: 0.32, repeat: Infinity } :
          { duration: 0.4 }
        }
      >
        <circle cx="50" cy="53" r="36" fill={skin} />

        {/* Hair */}
        <path d="M 14 54 C 14 11 86 11 86 54 C 82 19 70 9 50 9 C 30 9 18 19 14 54 Z" fill={hair} />
        <path d="M 14 56 C 11 67 12 79 21 86 C 16 72 14 60 17 51 Z" fill={hair} />
        <path d="M 86 56 C 89 67 88 79 79 86 C 84 72 86 60 83 51 Z" fill={hair} />
        <path d="M 42 13 C 42 1 50 -3 58 13 C 52 5 48 5 42 13 Z" fill={hair} />
        <path d="M 25 33 C 27 24 33 18 38 20 C 33 23 29 29 29 37 Z" fill={hair} opacity="0.9" />
        <path d="M 75 33 C 73 24 67 18 62 20 C 67 23 71 29 71 37 Z" fill={hair} opacity="0.9" />

        {/* Eyes */}
        <circle cx="37" cy="52" r="10.5" fill="white" />
        <circle cx="63" cy="52" r="10.5" fill="white" />
        <circle cx="37" cy="52" r="8"    fill="#18181e" />
        <circle cx="63" cy="52" r="8"    fill="#18181e" />
        <circle cx="37" cy="52" r="5.5"  fill="#050508" />
        <circle cx="63" cy="52" r="5.5"  fill="#050508" />
        <circle cx="40.5" cy="48"  r="3.2" fill="white" />
        <circle cx="66.5" cy="48"  r="3.2" fill="white" />
        <circle cx="34.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />
        <circle cx="60.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />

        {/* Eyebrows — raised when dancing */}
        <path d={isDancing ? "M 25 38 Q 37 33 44 36" : "M 26 41 Q 37 36 44 39"}
          stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d={isDancing ? "M 56 36 Q 63 33 75 38" : "M 56 39 Q 63 36 74 41"}
          stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <path d="M 46 64 Q 50 68 54 64" stroke="#c07050" strokeWidth="1.7" fill="none" opacity="0.5" strokeLinecap="round" />

        {/* Mouth — big happy smile when dancing */}
        <motion.path
          stroke="#bf5f40" strokeWidth="2.8" fill="none" strokeLinecap="round"
          animate={{
            d: isDancing
              ? ['M 36 72 Q 50 90 64 72', 'M 38 74 Q 50 86 62 74']
              : isTalking
              ? ['M 38 74 Q 50 88 62 74', 'M 42 71 Q 50 76 58 71']
              : ['M 41 73 Q 50 82 59 73'],
          }}
          transition={
            isDancing
              ? { duration: 0.28, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
              : isTalking
              ? { duration: 0.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
              : { duration: 0.25 }
          }
        />

        {/* Cheeks — brighter when dancing */}
        <ellipse cx="22" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity={isDancing ? 0.7 : 0.42} />
        <ellipse cx="78" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity={isDancing ? 0.7 : 0.42} />

        {/* Thinking bubbles */}
        {isThinking && (
          <g>
            <circle cx="77" cy="32" r="4.5" fill="rgba(255,255,255,0.88)" />
            <circle cx="85" cy="21" r="3.5" fill="rgba(255,255,255,0.88)" />
            <circle cx="92" cy="11" r="6.5" fill="rgba(255,255,255,0.92)" />
            <text x="92" y="14" textAnchor="middle" fontSize="7.5" fill="#555" fontFamily="system-ui">···</text>
          </g>
        )}

        {/* Music notes when dancing */}
        {isDancing && (
          <g>
            <motion.text x="92" y="10" fontSize="12" fill={shirt}
              animate={{ y: [10, 0, -5], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            >♪</motion.text>
            <motion.text x="4" y="15" fontSize="10" fill={shirt}
              animate={{ y: [15, 5, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            >♫</motion.text>
          </g>
        )}
      </motion.g>
    </svg>
  )
}

// ─── Desk SVG ─────────────────────────────────────────────────────────────────

function DeskSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 230 130" style={{ width: '100%', height: '100%' }}>
      <rect x="8"   y="46" width="214" height="14" rx="5" fill="#6b3f22" />
      <rect x="10"  y="47" width="210" height="10" rx="4" fill="#8a5535" opacity="0.7" />
      <rect x="18"  y="60" width="14"  height="66" rx="4" fill="#6b3f22" />
      <rect x="198" y="60" width="14"  height="66" rx="4" fill="#6b3f22" />
      <rect x="76"  y="8"  width="78"  height="40" rx="6" fill="#16162a" />
      <rect x="78"  y="10" width="74"  height="36" rx="4" fill="#1c1c3e" />
      <rect x="83" y="14" width="44" height="3" rx="1.5" fill={color}    opacity="0.85" />
      <rect x="83" y="19" width="60" height="3" rx="1.5" fill="#10B981"  opacity="0.75" />
      <rect x="83" y="24" width="36" height="3" rx="1.5" fill="#A78BFA"  opacity="0.75" />
      <rect x="83" y="29" width="52" height="3" rx="1.5" fill={color}    opacity="0.6"  />
      <rect x="83" y="34" width="40" height="3" rx="1.5" fill="#10B981"  opacity="0.55" />
      <rect x="111" y="48" width="8" height="7" fill="#16162a" />
      <rect x="100" y="54" width="30" height="5" rx="2" fill="#16162a" />
      <rect x="70" y="57" width="90" height="16" rx="4" fill="#1a1a30" />
      {[0,1,2,3,4,5,6,7].map(i => (
        <rect key={i} x={74 + i * 10} y={59} width="7" height="5" rx="1.5" fill="#2a2a48" />
      ))}
      <rect x="74" y="66" width="72" height="5" rx="1.5" fill="#2a2a48" />
      <rect x="32" y="38" width="18" height="18" rx="4" fill="#ffe4b0" />
      <path d="M 50 43 Q 57 46 50 49" stroke="#e0c080" strokeWidth="2.2" fill="none" />
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
  danceMode?: boolean
}

export function ArenaCanvas2D({ characterStates, welcomeUser, taskStatus, danceMode }: ArenaCanvas2DProps) {

  const [pos, setPos] = useState<Record<CharacterId, Pos>>(() => ({
    claude: { ...HOME_POS.claude }, perplexity: { ...HOME_POS.perplexity },
    chatgpt: { ...HOME_POS.chatgpt }, gemini: { ...HOME_POS.gemini }, sarvam: { ...HOME_POS.sarvam },
  }))

  const [present, setPresent] = useState<Record<CharacterId, boolean>>({
    claude: true, perplexity: false, chatgpt: false, gemini: false, sarvam: false,
  })

  // Local dance-action override
  const [localAction, setLocalAction] = useState<Partial<Record<CharacterId, string>>>({})
  const [localSpeech, setLocalSpeech] = useState<Partial<Record<CharacterId, string>>>({})

  // Welcome greeting
  const [greetSpeech, setGreetSpeech] = useState<string | null>(null)
  const [greetAction, setGreetAction] = useState<string | null>(null)
  const greetedRef = useRef(false)

  // Claude roam
  const [claudeRoamX, setClaudeRoamX]       = useState(42)
  const [claudeIsRoaming, setClaudeIsRoaming] = useState(false)
  const roamDirRef = useRef(1)

  // Walk transition timers — prevent re-triggering on each render
  const walkTimersRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const prevActionRef  = useRef<Record<CharacterId, string>>({} as Record<CharacterId, string>)

  // Write cycle
  const [writePhase, setWritePhase] = useState<'look' | 'write'>('look')

  // ── Welcome ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!welcomeUser || greetedRef.current) return
    greetedRef.current = true
    setGreetAction('waving')
    setGreetSpeech(`Hi ${welcomeUser}! Welcome to Arivarangam. I'm Claude — your AI builder. Tell me what to create!`)
    const t = setTimeout(() => { setGreetAction(null); setGreetSpeech(null) }, 15000)
    return () => clearTimeout(t)
  }, [welcomeUser])

  // ── Claude roaming when idle ──────────────────────────────────────────────
  useEffect(() => {
    const isIdle = !taskStatus || taskStatus === 'idle'
    if (!isIdle || danceMode) { setClaudeIsRoaming(false); setClaudeRoamX(42); return }
    const step = () => {
      setClaudeIsRoaming(true)
      setClaudeRoamX(prev => {
        const next = prev + roamDirRef.current * 9
        if (next > 56 || next < 32) roamDirRef.current *= -1
        return Math.max(32, Math.min(56, prev + roamDirRef.current * 9))
      })
      const st = setTimeout(() => setClaudeIsRoaming(false), ROAM_SECS * 900)
      return st
    }
    const iv = setInterval(step, (ROAM_SECS + 1) * 1000)
    const ft = setTimeout(step, 2000)
    return () => { clearInterval(iv); clearTimeout(ft) }
  }, [taskStatus, danceMode])

  // ── Walk position updates from character state ────────────────────────────
  // Only fires on action CHANGE to 'walking'; characters walk in from background.
  useEffect(() => {
    const ids = Object.keys(characterStates) as CharacterId[]
    for (const id of ids) {
      if (id === 'claude') continue
      const state    = characterStates[id]
      const prevAct  = prevActionRef.current[id] ?? 'idle'

      if (state.action === 'walking' && prevAct !== 'walking' && state.targetPosition) {
        const goingHome = Math.abs(state.targetPosition[0]) > 10
        if (walkTimersRef.current[id]) clearTimeout(walkTimersRef.current[id])

        if (!goingHome) {
          // 1) Appear instantly at HOME_POS (small, background)
          setPos(prev => ({ ...prev, [id]: { ...HOME_POS[id] } }))
          setPresent(prev => ({ ...prev, [id]: true }))
          // 2) After one frame, start CSS transition to MEET_POS (full-size, floor)
          walkTimersRef.current[id] = setTimeout(() => {
            setPos(prev => ({ ...prev, [id]: { ...MEET_POS[id] } }))
          }, 80)
        } else {
          // Walk back home: start transition to HOME_POS …
          setPos(prev => ({ ...prev, [id]: { ...HOME_POS[id] } }))
          // … then hide once they arrive
          walkTimersRef.current[id] = setTimeout(() => {
            setPresent(prev => ({ ...prev, [id]: false }))
          }, (WALK_SECS + 1.5) * 1000)
        }
      }

      prevActionRef.current[id] = state.action
    }
  }, [characterStates])

  // ── Dance mode: all AIs appear at HOME_POS then walk to dance positions ───
  useEffect(() => {
    if (!danceMode) {
      setLocalAction({})
      setLocalSpeech({})
      // Return non-Claude AIs to hidden
      ;(['perplexity','chatgpt','gemini','sarvam'] as CharacterId[]).forEach(id => {
        setPos(prev => ({ ...prev, [id]: { ...HOME_POS[id] } }))
        setPresent(prev => ({ ...prev, [id]: false }))
      })
      setPos(prev => ({ ...prev, claude: { ...HOME_POS.claude } }))
      return
    }

    const ALL4: CharacterId[] = ['perplexity', 'chatgpt', 'gemini', 'sarvam']

    // Step 1: make AIs appear at background HOME positions (staggered)
    ALL4.forEach((id, i) => {
      setTimeout(() => {
        setPos(prev => ({ ...prev, [id]: { ...HOME_POS[id] } }))
        setPresent(prev => ({ ...prev, [id]: true }))
      }, i * 200)
    })

    // Step 2: walk to dance positions (CSS transition handles the walk)
    const t1 = setTimeout(() => {
      ALL4.forEach(id => setPos(prev => ({ ...prev, [id]: { ...DANCE_POS[id] } })))
      setPos(prev => ({ ...prev, claude: { ...DANCE_POS.claude } }))
    }, ALL4.length * 200 + 100)

    // Step 3: start dancing once everyone arrives
    const DANCE_PHRASES: Partial<Record<CharacterId, string>> = {
      claude:     "Let's dance, everyone! This is our moment!",
      perplexity: "Research says dancing is healthy — science confirmed!",
      chatgpt:    "Best party ever! Maximum fun achieved!",
      gemini:     "The visual vibes here are absolutely immaculate!",
      sarvam:     "நடனம் ஆடலாம்! Everyone dance together!",
    }
    const t2 = setTimeout(() => {
      const ALL5: CharacterId[] = ['claude', 'perplexity', 'chatgpt', 'gemini', 'sarvam']
      const actions: Partial<Record<CharacterId, string>> = {}
      ALL5.forEach(id => { actions[id] = 'dancing' })
      setLocalAction(actions)
      // Stagger dance speech so only one AI speaks at a time
      ALL5.forEach((id, i) => {
        setTimeout(() => {
          setLocalSpeech(prev => ({ ...prev, [id]: DANCE_PHRASES[id] ?? '' }))
        }, i * 7000)
      })
    }, ALL4.length * 200 + WALK_SECS * 1000 + 600)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [danceMode])

  // ── Write cycle ───────────────────────────────────────────────────────────
  useEffect(() => {
    const isBuilding = taskStatus === 'running' || taskStatus === 'done'
    if (!isBuilding) { setWritePhase('look'); return }
    let stopped = false
    const cycle = () => {
      if (stopped) return
      setWritePhase('write')
      const t1 = setTimeout(() => {
        if (stopped) return
        setWritePhase('look')
        const t2 = setTimeout(cycle, 2500)
        return () => clearTimeout(t2)
      }, 3500)
      return () => clearTimeout(t1)
    }
    const t = setTimeout(cycle, 1500)
    return () => { stopped = true; clearTimeout(t) }
  }, [taskStatus])

  const isBuilding = taskStatus === 'running' || taskStatus === 'done'
  const charIds    = Object.keys(CHAR_VISUAL) as CharacterId[]
  const charH = 22; const charW = charH * 0.46

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: danceMode
        ? 'linear-gradient(180deg, #1a0a2e 0%, #2d1060 40%, #1a0a2e 100%)'
        : 'linear-gradient(180deg, #eef6fa 0%, #f0e8d8 40%, #e8dcc8 100%)',
      transition: 'background 1s ease',
    }}>

      {/* Sky / atmosphere */}
      {!danceMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, rgba(190,230,255,0.28) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Dance floor lights */}
      {danceMode && (
        <>
          {['#ff4488','#44ddff','#ffcc00','#88ff44','#aa44ff'].map((c, i) => (
            <motion.div key={i} style={{
              position: 'absolute', bottom: '14%',
              left: `${15 + i * 18}%`, width: 60, height: 60,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${c}55 0%, transparent 70%)`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
              transition={{ duration: 0.56, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            />
          ))}
          {/* Disco ball */}
          <motion.div style={{
            position: 'absolute', top: '8%', left: '50%',
            transform: 'translateX(-50%)',
            width: 40, height: 40, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #fff 0%, #ccc 40%, #888 100%)',
            boxShadow: '0 0 30px rgba(255,255,255,0.6)',
          }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}

      {/* Floor */}
      {!danceMode && (
        <>
          <div style={{
            position: 'absolute', bottom: '17%', left: 0, right: 0,
            height: 2, background: 'rgba(140,110,80,0.22)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
            background: 'linear-gradient(180deg, transparent 0%, rgba(140,110,70,0.2) 100%)',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Dance floor grid */}
      {danceMode && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
          background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 60px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Ambient glows */}
      {([
        { left: '8%',  top: '32%', color: '#D97706', size: 180 },
        { left: '78%', top: '22%', color: '#0D9488', size: 155 },
        { left: '46%', top: '10%', color: '#8B5CF6', size: 130 },
      ] as const).map((orb, i) => (
        <motion.div key={i} style={{
          position: 'absolute', left: orb.left, top: orb.top,
          width: orb.size, height: orb.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${danceMode ? orb.color + '35' : orb.color + '1a'} 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: danceMode ? 0.56 : 4.5 + i * 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Desk — z-index 8 so it overlaps Claude's legs (makes Claude look seated) */}
      <AnimatePresence>
        {isBuilding && !danceMode && (
          <motion.div key="desk"
            initial={{ opacity: 0, scale: 0.65, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.65, y: 50 }}
            transition={{ duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'absolute', bottom: '14%', left: '24%',
              width: '30%', height: '22%', zIndex: 8,
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
        const charPos = pos[id]

        // Action resolution priority: danceMode override > greeting > state
        const rawAction = danceMode && localAction[id]
          ? localAction[id]!
          : (id === 'claude' && greetAction) ? greetAction : state.action

        const speech = danceMode && localSpeech[id]
          ? localSpeech[id]!
          : (id === 'claude' && greetSpeech) ? greetSpeech : state.speech

        let effectiveAction = rawAction
        if (!danceMode && id === 'claude') {
          if (isBuilding) effectiveAction = writePhase === 'write' ? 'thinking' : 'idle'
          else if (claudeIsRoaming && rawAction === 'idle') effectiveAction = 'walking'
        }

        const isWalking = effectiveAction === 'walking'

        // ── Facing direction ─────────────────────────────────────────────
        // Find which non-Claude AI is currently speaking (speech ≠ null + present)
        const activeSpeakerId = charIds.find(cid =>
          cid !== 'claude' && present[cid] &&
          (danceMode ? false : (localSpeech[cid] || characterStates[cid].speech) !== null)
        )

        const shouldFlip = (() => {
          if (danceMode) return false  // All face forward in dance
          if (id === 'claude') {
            // Face active speaker if one is talking
            if (activeSpeakerId) return CHAR_VISUAL[activeSpeakerId].side === 'right'
            // Otherwise face whichever side has AIs present
            const hasRight = (['perplexity','chatgpt'] as CharacterId[]).some(a => present[a])
            const hasLeft  = (['gemini','sarvam']      as CharacterId[]).some(a => present[a])
            if (hasRight && !hasLeft) return true
            if (hasLeft && !hasRight) return false
            return roamDirRef.current < 0
          }
          if (visual.side === 'right') return present[id]
          if (visual.side === 'left')  return !present[id]
          return false
        })()

        // When building, Claude stays at normal floor level — desk (z-index 8) covers their legs
        const bottomOverride = charPos.bottomPct

        const currentX = (id === 'claude' && claudeIsRoaming && !danceMode)
          ? claudeRoamX : charPos.x

        // Hide non-Claude characters until they are called
        if (id !== 'claude' && !present[id] && !danceMode) return null

        const walkDur    = isWalking ? WALK_SECS : 0.5
        const roamingDur = (id === 'claude' && claudeIsRoaming) ? ROAM_SECS * 0.95 : walkDur

        return (
          <div key={id} style={{
            position: 'absolute',
            left: `${currentX}%`,
            bottom: `${bottomOverride}%`,
            width: `${charW}vh`,
            height: `${charH}vh`,
            transform: `translateX(-50%) scale(${charPos.scale})`,
            transformOrigin: 'bottom center',
            zIndex: id === 'claude' ? 6 : (present[id] ? 5 : 2),
            transition: [
              `left ${roamingDur}s ${isWalking || claudeIsRoaming ? 'ease-in-out' : 'ease-out'}`,
              `bottom ${walkDur}s ease-out`,
              `transform ${walkDur}s ease-out`,
            ].join(', '),
          }}>
            <motion.div
              style={{ position: 'relative', width: '100%', height: '100%' }}
              animate={{ y: isWalking ? [0,-4,0] : [0,-5,0] }}
              transition={{ duration: isWalking ? 0.44 : 3.0, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Speech bubble — NEVER flipped, always readable */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
                <SpeechBubble text={speech} color={visual.shirt} />
              </div>

              {/* Character SVG — flipped to face direction */}
              <div style={{ position: 'absolute', inset: 0, transform: shouldFlip ? 'scaleX(-1)' : 'none' }}>
                <AnimeCharSVG
                  shirt={visual.shirt} skin={visual.skin} hair={visual.hair}
                  label={visual.label} action={effectiveAction} isWalking={isWalking}
                />
              </div>

              {/* Name label */}
              <div style={{
                position: 'absolute', top: '104%', left: '50%', transform: 'translateX(-50%)',
                color: danceMode ? 'white' : visual.shirt,
                fontSize: 'clamp(10px, 1.3vh, 14px)', fontWeight: 800,
                fontFamily: 'system-ui,-apple-system,sans-serif',
                letterSpacing: '0.06em',
                textShadow: danceMode ? `0 0 12px ${visual.shirt}` : '0 1px 6px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap', pointerEvents: 'none',
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
