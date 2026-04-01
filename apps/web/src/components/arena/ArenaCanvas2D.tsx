'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CharacterState } from './CharacterFigure'
import type { CharacterId } from '@/lib/characters'
import { CHARACTERS } from '@/lib/characters'

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTENCE_MS  = 7000  // 7 seconds per sentence
const WALK_SECS    = 5     // CSS transition seconds for walk
const ROAM_SECS    = 6     // seconds for Claude roam step

// ─── Visual config ────────────────────────────────────────────────────────────

type Side = 'center' | 'left' | 'right'
interface CharVisual { shirt: string; skin: string; hair: string; label: string; side: Side; voiceRate: number }

const CHAR_VISUAL: Record<CharacterId, CharVisual> = {
  claude:     { shirt: '#D97706', skin: '#F5CBA7', hair: '#1c1c1c', label: 'Claude',     side: 'center', voiceRate: 0.90 },
  perplexity: { shirt: '#0D9488', skin: '#EBD5BC', hair: '#1c1c1c', label: 'Perplexity', side: 'right',  voiceRate: 0.95 },
  chatgpt:    { shirt: '#10B981', skin: '#F0B07A', hair: '#2a1a0a', label: 'ChatGPT',    side: 'right',  voiceRate: 0.85 },
  gemini:     { shirt: '#8B5CF6', skin: '#D4A76A', hair: '#1c1c1c', label: 'Gemini',     side: 'left',   voiceRate: 0.88 },
  sarvam:     { shirt: '#F59E0B', skin: '#C47B3E', hair: '#0f0a00', label: 'Sarvam',     side: 'left',   voiceRate: 0.92 },
}

// ─── Position system (perspective: far = small + high, near = full + floor) ──

interface Pos { x: number; bottomPct: number; scale: number }

// Home positions: characters appear to come from the "back" of the scene
const HOME_POS: Record<CharacterId, Pos> = {
  claude:     { x: 42,  bottomPct: 17, scale: 1.0  },
  perplexity: { x: 92,  bottomPct: 25, scale: 0.50 },
  chatgpt:    { x: 88,  bottomPct: 28, scale: 0.45 },
  gemini:     { x: 8,   bottomPct: 25, scale: 0.50 },
  sarvam:     { x: 12,  bottomPct: 28, scale: 0.45 },
}

// Meet positions: arrive at floor level, full size, near Claude
const MEET_POS: Record<CharacterId, Pos> = {
  claude:     { x: 42, bottomPct: 17, scale: 1.0 },
  perplexity: { x: 63, bottomPct: 17, scale: 1.0 },
  chatgpt:    { x: 63, bottomPct: 17, scale: 1.0 },
  gemini:     { x: 27, bottomPct: 17, scale: 1.0 },
  sarvam:     { x: 27, bottomPct: 17, scale: 1.0 },
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

function speakText(text: string, rate = 0.9) {
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate   = rate
  utter.volume = 0.85
  utter.pitch  = 1.0
  synth.speak(utter)
}

// ─── Speech Bubble — sentence-by-sentence, 7s each, with TTS ─────────────────

function SpeechBubble({
  text, color, voiceRate,
}: { text: string | null; color: string; voiceRate: number }) {
  const [current, setCurrent] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!text) {
      setCurrent(null)
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
      return
    }

    const sentences = text.split(/(?<=[.!?।])\s+/).map(s => s.trim()).filter(Boolean)
    if (!sentences.length) {
      setCurrent(text)
      speakText(text, voiceRate)
      return
    }

    let idx = 0
    setCurrent(sentences[0])
    speakText(sentences[0], voiceRate)

    const tick = () => {
      idx++
      if (idx < sentences.length) {
        setCurrent(sentences[idx])
        speakText(sentences[idx], voiceRate)
        timerRef.current = setTimeout(tick, SENTENCE_MS)
      } else {
        setCurrent(null)
      }
    }
    timerRef.current = setTimeout(tick, SENTENCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [text, voiceRate])

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
            background: 'rgba(8,8,22,0.94)',
            border: `2.5px solid ${color}`,
            borderRadius: 16, padding: '11px 17px',
            maxWidth: 240, minWidth: 115, width: 'max-content',
            textAlign: 'center', color: '#f0f4ff', fontSize: 13,
            lineHeight: 1.6, fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500, pointerEvents: 'none', zIndex: 20,
            boxShadow: `0 4px 30px ${color}55, 0 2px 10px rgba(0,0,0,0.6)`,
          }}
        >
          {current}
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
  const isListening = action === 'listening'

  // Walk bounce speed matches leg cycle
  const walkBounce = { duration: 0.52, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const }

  return (
    <svg viewBox="0 0 100 240" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>

      {/* Ground shadow */}
      <ellipse cx="50" cy="237" rx="27" ry="5.5" fill="rgba(0,0,0,0.13)" />

      {/* ══ SHOES ══ */}
      <ellipse cx="33" cy="226" rx="19" ry="8" fill="#14142a" />
      <ellipse cx="67" cy="226" rx="19" ry="8" fill="#14142a" />
      <line x1="23" y1="221" x2="43" y2="221" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="57" y1="221" x2="77" y2="221" stroke="white" strokeWidth="1.4" strokeOpacity="0.7" />
      <ellipse cx="42" cy="226" rx="7" ry="4" fill="#0c0c20" />
      <ellipse cx="58" cy="226" rx="7" ry="4" fill="#0c0c20" />

      {/* ══ SOCKS ══ */}
      <rect x="23" y="212" width="20" height="15" rx="4" fill="white" />
      <rect x="57" y="212" width="20" height="15" rx="4" fill="white" />

      {/* ══ LEGS ══ */}
      <motion.g
        style={{ transformOrigin: '33px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['-22deg', '22deg'] } : { rotate: '0deg' }}
        transition={isWalking ? walkBounce : { duration: 0.3 }}
      >
        <rect x="23" y="184" width="20" height="30" rx="10" fill={skin} />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '67px 184px' } as React.CSSProperties}
        animate={isWalking ? { rotate: ['22deg', '-22deg'] } : { rotate: '0deg' }}
        transition={isWalking ? walkBounce : { duration: 0.3 }}
      >
        <rect x="57" y="184" width="20" height="30" rx="10" fill={skin} />
      </motion.g>

      {/* ══ SHORTS ══ */}
      <rect x="22" y="153" width="56" height="35" rx="8" fill="#14142a" />
      <rect x="25" y="155" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.07)" />

      {/* ══ T-SHIRT ══ */}
      <rect x="19" y="98" width="62" height="59" rx="10" fill={shirt} />
      <path d="M 36 98 Q 50 113 64 98" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" fill="none" />
      <rect x="19" y="151" width="62" height="4" rx="2" fill="rgba(0,0,0,0.14)" />
      <text x="50" y="129" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.72)"
        fontFamily="system-ui, Arial, sans-serif" fontWeight="700" letterSpacing="0.8">
        {label.toUpperCase().slice(0, 9)}
      </text>

      {/* ══ LEFT ARM ══ */}
      <motion.g
        style={{ transformOrigin: '22px 106px' } as React.CSSProperties}
        animate={
          isWaving    ? { rotate: ['-55deg', '-105deg'] } :
          isWalking   ? { rotate: ['14deg', '-14deg']   } :
          isTalking   ? { rotate: ['-14deg', '8deg']    } :
          isCelebrate ? { rotate: ['-65deg', '-25deg']  } :
          { rotate: '0deg' }
        }
        transition={
          isWaving    ? { duration: 0.38, repeat: Infinity, repeatType: 'mirror' } :
          isWalking   ? walkBounce :
          isTalking   ? { duration: 0.75, repeat: Infinity, repeatType: 'mirror' } :
          isCelebrate ? { duration: 0.3, repeat: Infinity, repeatType: 'mirror'  } :
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
          isWalking   ? walkBounce :
          isTalking   ? { duration: 0.75, repeat: Infinity, repeatType: 'mirror' } :
          isCelebrate ? { duration: 0.3,  repeat: Infinity, repeatType: 'mirror' } :
          { duration: 0.35 }
        }
      >
        <rect x="78" y="103" width="17" height="46" rx="8.5" fill={shirt} />
        <circle cx="86.5" cy="152" r="8.5" fill={skin} />
        {isCalling && <ellipse cx="86" cy="92" rx="8.5" ry="6" fill={skin} />}
      </motion.g>

      {/* ══ NECK ══ */}
      <rect x="40" y="87" width="20" height="16" rx="7" fill={skin} />

      {/* ══ HEAD ══ */}
      <motion.g
        style={{ transformOrigin: '50px 53px' } as React.CSSProperties}
        animate={
          isThinking  ? { rotate: '13deg', y: 8    } :
          isTalking   ? { y: [0, -4, 0]             } :
          isCelebrate ? { y: [0, -14, 0]            } :
          isListening ? { rotate: '-7deg'           } :
          { rotate: '0deg', y: 0 }
        }
        transition={
          isTalking   ? { duration: 0.5, repeat: Infinity } :
          isCelebrate ? { duration: 0.32, repeat: Infinity } :
          { duration: 0.4 }
        }
      >
        {/* Head */}
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
        <circle cx="40.5" cy="48" r="3.2" fill="white" />
        <circle cx="66.5" cy="48" r="3.2" fill="white" />
        <circle cx="34.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />
        <circle cx="60.5" cy="55.5" r="1.6" fill="rgba(255,255,255,0.55)" />

        {/* Eyebrows */}
        <path d="M 26 41 Q 37 36 44 39" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M 56 39 Q 63 36 74 41" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <path d="M 46 64 Q 50 68 54 64" stroke="#c07050" strokeWidth="1.7" fill="none" opacity="0.5" strokeLinecap="round" />

        {/* ── MOUTH with lip sync ── */}
        <motion.path
          stroke="#bf5f40" strokeWidth="2.8" fill="none" strokeLinecap="round"
          animate={{
            d: isTalking
              ? ['M 38 74 Q 50 88 62 74', 'M 42 71 Q 50 76 58 71']
              : ['M 41 73 Q 50 82 59 73'],
          }}
          transition={
            isTalking
              ? { duration: 0.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
              : { duration: 0.25 }
          }
        />

        {/* Cheeks */}
        <ellipse cx="22" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity="0.42" />
        <ellipse cx="78" cy="65" rx="10" ry="6.5" fill="#ffb3c6" opacity="0.42" />

        {/* Thinking bubbles */}
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

// ─── Desk SVG ─────────────────────────────────────────────────────────────────

function DeskSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 230 130" style={{ width: '100%', height: '100%' }}>
      <rect x="8" y="46" width="214" height="14" rx="5" fill="#6b3f22" />
      <rect x="10" y="47" width="210" height="10" rx="4" fill="#8a5535" opacity="0.7" />
      <rect x="18" y="60" width="14" height="66" rx="4" fill="#6b3f22" />
      <rect x="198" y="60" width="14" height="66" rx="4" fill="#6b3f22" />
      {/* Monitor */}
      <rect x="76" y="8" width="78" height="40" rx="6" fill="#16162a" />
      <rect x="78" y="10" width="74" height="36" rx="4" fill="#1c1c3e" />
      <rect x="83" y="14" width="44" height="3" rx="1.5" fill={color} opacity="0.85" />
      <rect x="83" y="19" width="60" height="3" rx="1.5" fill="#10B981" opacity="0.75" />
      <rect x="83" y="24" width="36" height="3" rx="1.5" fill="#A78BFA" opacity="0.75" />
      <rect x="83" y="29" width="52" height="3" rx="1.5" fill={color} opacity="0.6" />
      <rect x="83" y="34" width="40" height="3" rx="1.5" fill="#10B981" opacity="0.55" />
      <rect x="111" y="48" width="8" height="7" fill="#16162a" />
      <rect x="100" y="54" width="30" height="5" rx="2" fill="#16162a" />
      {/* Keyboard */}
      <rect x="70" y="57" width="90" height="16" rx="4" fill="#1a1a30" />
      {[0,1,2,3,4,5,6,7].map(i => (
        <rect key={i} x={74 + i * 10} y={59} width="7" height="5" rx="1.5" fill="#2a2a48" />
      ))}
      <rect x="74" y="66" width="72" height="5" rx="1.5" fill="#2a2a48" />
      {/* Coffee */}
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
}

export function ArenaCanvas2D({ characterStates, welcomeUser, taskStatus }: ArenaCanvas2DProps) {

  // ── Position state (x%, bottomPct, scale) per character ──────────────────
  const [pos, setPos] = useState<Record<CharacterId, Pos>>(() => ({
    claude:     { ...HOME_POS.claude },
    perplexity: { ...HOME_POS.perplexity },
    chatgpt:    { ...HOME_POS.chatgpt },
    gemini:     { ...HOME_POS.gemini },
    sarvam:     { ...HOME_POS.sarvam },
  }))

  // Whether each non-Claude character is at the meet position
  const [present, setPresent] = useState<Record<CharacterId, boolean>>({
    claude: true, perplexity: false, chatgpt: false, gemini: false, sarvam: false,
  })

  // ── Welcome greeting (overrides Claude's state on first load) ─────────────
  const [greetSpeech, setGreetSpeech]   = useState<string | null>(null)
  const [greetAction, setGreetAction]   = useState<string | null>(null)
  const greetedRef = useRef(false)

  // ── Claude roaming (when idle, no task) ───────────────────────────────────
  const [claudeRoamX, setClaudeRoamX]   = useState(42)
  const [claudeIsRoaming, setClaudeIsRoaming] = useState(false)
  const roamDirRef  = useRef(1)       // 1 = right, -1 = left

  // ── Claude write cycle at desk ────────────────────────────────────────────
  const [writePhase, setWritePhase] = useState<'look' | 'write'>('look')

  // ── Welcome wave ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!welcomeUser || greetedRef.current) return
    greetedRef.current = true
    setGreetAction('waving')
    setGreetSpeech(
      `Hi ${welcomeUser}! Welcome to Arivarangam. ` +
      `I'm Claude — your AI builder. Tell me what you want to create!`
    )
    const t = setTimeout(() => {
      setGreetAction(null)
      setGreetSpeech(null)
    }, 15000)
    return () => clearTimeout(t)
  }, [welcomeUser])

  // ── Claude roams slowly when there is no active task ─────────────────────
  useEffect(() => {
    const isIdle = !taskStatus || taskStatus === 'idle'
    if (!isIdle) {
      setClaudeIsRoaming(false)
      setClaudeRoamX(42)
      return
    }
    const doRoam = () => {
      setClaudeIsRoaming(true)
      setClaudeRoamX(prev => {
        const next = prev + roamDirRef.current * 9
        if (next > 55 || next < 33) roamDirRef.current *= -1
        return Math.max(33, Math.min(55, prev + roamDirRef.current * 9))
      })
      // Stop walking after each step, then roam again
      const stopT = setTimeout(() => setClaudeIsRoaming(false), ROAM_SECS * 1000 * 0.9)
      return stopT
    }

    const interval = setInterval(doRoam, (ROAM_SECS + 1) * 1000)
    const first = setTimeout(doRoam, 2000)
    return () => {
      clearInterval(interval)
      clearTimeout(first)
    }
  }, [taskStatus])

  // ── Update positions when action is 'walking' ─────────────────────────────
  useEffect(() => {
    const ids = Object.keys(characterStates) as CharacterId[]
    for (const id of ids) {
      if (id === 'claude') continue
      const state = characterStates[id]
      if (state.action === 'walking' && state.targetPosition) {
        const goingHome = Math.abs(state.targetPosition[0]) > 10
        if (goingHome) {
          setPos(prev => ({ ...prev, [id]: { ...HOME_POS[id] } }))
          setPresent(prev => ({ ...prev, [id]: false }))
        } else {
          setPos(prev => ({ ...prev, [id]: { ...MEET_POS[id] } }))
          setPresent(prev => ({ ...prev, [id]: true }))
        }
      }
    }
  }, [characterStates])

  // ── Claude write cycle ────────────────────────────────────────────────────
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

  const isBuilding   = taskStatus === 'running' || taskStatus === 'done'
  const charIds      = Object.keys(CHAR_VISUAL) as CharacterId[]

  // Character visual dimensions
  const charH = 22   // vh
  const charW = charH * 0.46

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #eef6fa 0%, #f0e8d8 40%, #e8dcc8 100%)',
    }}>
      {/* Sky */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(190,230,255,0.28) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Floor line */}
      <div style={{
        position: 'absolute', bottom: '17%', left: 0, right: 0,
        height: 2, background: 'rgba(140,110,80,0.22)',
        boxShadow: '0 2px 12px rgba(140,110,80,0.12)',
      }} />

      {/* Floor gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(140,110,70,0.2) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Ambient glows */}
      {([
        { left: '8%',  top: '32%', color: '#D97706', size: 180 },
        { left: '78%', top: '22%', color: '#0D9488', size: 155 },
        { left: '46%', top: '10%', color: '#8B5CF6', size: 130 },
      ] as const).map((orb, i) => (
        <motion.div key={i} style={{
          position: 'absolute', left: orb.left, top: orb.top,
          width: orb.size, height: orb.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${orb.color}1a 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 4.5 + i * 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Desk — during build */}
      <AnimatePresence>
        {isBuilding && (
          <motion.div
            key="desk"
            initial={{ opacity: 0, scale: 0.65, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.65, y: 50 }}
            transition={{ duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'absolute', bottom: '13%',
              left: '26%', width: '27%', height: '20%', zIndex: 3,
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

        // Merge greeting override for Claude
        const rawAction = (id === 'claude' && greetAction) ? greetAction : state.action
        const speech    = (id === 'claude' && greetSpeech) ? greetSpeech : state.speech

        // Claude: roaming action override + write cycle
        let effectiveAction = rawAction
        if (id === 'claude') {
          if (isBuilding) {
            effectiveAction = writePhase === 'write' ? 'thinking' : 'idle'
          } else if (claudeIsRoaming && rawAction === 'idle') {
            effectiveAction = 'walking'
          }
        }

        const isWalking = effectiveAction === 'walking'

        // ── Facing direction ───────────────────────────────────────────────
        // Right-side chars at meet position face LEFT (toward Claude at 42%)
        // Left-side chars at meet position face RIGHT (toward Claude at 42%)
        // While walking: face direction of travel
        // Claude: faces toward whichever side has active AIs
        const shouldFlip = (() => {
          if (id === 'claude') {
            const hasRight = (['perplexity', 'chatgpt'] as CharacterId[]).some(a => present[a])
            const hasLeft  = (['gemini', 'sarvam'] as CharacterId[]).some(a => present[a])
            if (hasRight) return true   // face left toward right-side AIs
            if (hasLeft)  return false  // face right toward left-side AIs
            return roamDirRef.current < 0  // face roam direction
          }
          // Right-side: flip = present (face left when at meet, face right when at home)
          // Left-side:  flip = !present (face right when at meet, face left when at home)
          if (visual.side === 'right') return present[id]
          if (visual.side === 'left')  return !present[id]
          return false
        })()

        // Claude sits lower during build
        const bottomOverride = (isBuilding && id === 'claude')
          ? charPos.bottomPct + 8
          : charPos.bottomPct

        // Current x: if claude roaming, use claudeRoamX
        const currentX = (id === 'claude' && claudeIsRoaming)
          ? claudeRoamX
          : charPos.x

        // Walk duration for CSS transition
        const walkDur = isWalking ? WALK_SECS : 0.5

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: `${currentX}%`,
              bottom: `${bottomOverride}%`,
              width: `${charW}vh`,
              height: `${charH}vh`,
              // Perspective scale: characters appear to grow as they approach
              transform: `translateX(-50%) scale(${charPos.scale})`,
              transformOrigin: 'bottom center',
              zIndex: id === 'claude' ? 6 : (present[id] ? 5 : 2),
              transition: [
                `left ${walkDur}s ${isWalking ? 'ease-in-out' : 'ease-out'}`,
                `bottom ${walkDur}s ease-out`,
                `transform ${walkDur}s ease-out`,
              ].join(', '),
            }}
          >
            {/* Idle / walk bounce */}
            <motion.div
              style={{ position: 'relative', width: '100%', height: '100%' }}
              animate={{ y: isWalking ? [0, -5, 0] : [0, -4, 0] }}
              transition={{
                duration: isWalking ? 0.52 : 2.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Speech bubble — always in screen direction (not flipped with char) */}
              <div style={{ position: 'absolute', inset: 0, transform: shouldFlip ? 'scaleX(-1)' : 'none', pointerEvents: 'none', zIndex: 20 }}>
                <SpeechBubble
                  text={speech}
                  color={visual.shirt}
                  voiceRate={visual.voiceRate}
                />
              </div>

              {/* Character SVG — flipped when facing the other way */}
              <div style={{
                position: 'absolute', inset: 0,
                transform: shouldFlip ? 'scaleX(-1)' : 'none',
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

              {/* Name label */}
              <div style={{
                position: 'absolute', top: '104%', left: '50%',
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
