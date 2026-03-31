'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ─── Typing prompt animation ──────────────────────────────────────────────────
const PROMPTS = [
  'Build me a SaaS landing page for my startup…',
  'Create an animated portfolio website…',
  'Design a delivery tracking dashboard…',
  'Build an e-commerce store with cart…',
  'Make a real-time data visualization dashboard…',
  'Create a mobile-ready restaurant app…',
]

function TypingPrompt() {
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed]  = useState('')
  const [deleting, setDeleting]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const full = PROMPTS[promptIdx]
    if (!deleting && displayed.length < full.length) {
      timerRef.current = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 40)
    } else if (!deleting && displayed.length === full.length) {
      timerRef.current = setTimeout(() => setDeleting(true), 2200)
    } else if (deleting && displayed.length > 0) {
      timerRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22)
    } else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setPromptIdx(i => (i + 1) % PROMPTS.length)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [displayed, deleting, promptIdx])

  return (
    <span style={{ color: '#a5b4fc' }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: 2, height: '1.1em',
        background: '#6366f1', marginLeft: 2, verticalAlign: 'text-bottom',
        animation: 'blink 1s step-end infinite',
      }} />
    </span>
  )
}

// ─── AI Character Preview Card ────────────────────────────────────────────────
const AI_CHARS = [
  { name: 'Claude', role: 'Builder', color: '#D97706', emoji: '🔨' },
  { name: 'Perplexity', role: 'Researcher', color: '#0D9488', emoji: '🔍' },
  { name: 'ChatGPT', role: 'Advisor', color: '#10B981', emoji: '💡' },
  { name: 'Gemini', role: 'Visualizer', color: '#8B5CF6', emoji: '✨' },
  { name: 'Sarvam', role: 'Translator', color: '#F59E0B', emoji: '🌏' },
]

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#060610',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes walkBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px',
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(6,6,16,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'linear-gradient(135deg, #D97706, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 17, color: 'white',
            boxShadow: '0 0 20px rgba(217,119,6,0.4)',
          }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em' }}>
            Arivarangam
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{
            color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500,
            padding: '8px 16px',
          }}>
            Sign in
          </Link>
          <Link href="/signup" style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            padding: '9px 22px', borderRadius: 12,
            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
          }}>
            Get started free →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '100px 24px 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '20%',
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', top: '25%', right: '15%',
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', left: '35%',
            width: 350, height: 350,
            background: 'radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20, padding: '6px 16px',
          marginBottom: 28, fontSize: 13, fontWeight: 600,
          color: '#a5b4fc',
          animation: 'fadeUp 0.6s ease both',
        }}>
          <span style={{ color: '#6366f1', animation: 'glow 2s ease infinite' }}>✦</span>
          5 AI models. One arena. Zero complexity.
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          marginBottom: 20,
          animation: 'fadeUp 0.7s ease 0.1s both',
        }}>
          <span style={{ color: '#f1f5f9' }}>Meet your AI</span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #D97706 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            build team
          </span>
        </h1>

        {/* Subtitle with typing prompt */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#64748b',
          maxWidth: 580, lineHeight: 1.65,
          marginBottom: 12,
          animation: 'fadeUp 0.7s ease 0.2s both',
        }}>
          Tell Claude what to build.
          <br />
          Watch the team get to work.
        </p>
        <div style={{
          fontSize: 'clamp(0.9rem, 1.6vw, 1.1rem)',
          color: '#475569',
          minHeight: '1.6em',
          marginBottom: 40,
          animation: 'fadeUp 0.7s ease 0.25s both',
        }}>
          "<TypingPrompt />"
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeUp 0.7s ease 0.35s both',
        }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            color: 'white', textDecoration: 'none',
            fontSize: 15, fontWeight: 700, padding: '14px 32px',
            borderRadius: 16,
            boxShadow: '0 0 40px rgba(99,102,241,0.45), 0 4px 16px rgba(0,0,0,0.3)',
            letterSpacing: '-0.01em',
          }}>
            Enter the arena →
          </Link>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8', textDecoration: 'none',
            fontSize: 15, fontWeight: 600, padding: '14px 28px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            Sign in
          </Link>
        </div>

        {/* 100 free credits badge */}
        <p style={{
          marginTop: 20, color: '#334155', fontSize: 12,
          animation: 'fadeUp 0.7s ease 0.45s both',
        }}>
          ✦ 100 free credits on signup — no credit card required
        </p>
      </section>

      {/* ── Characters section ── */}
      <section style={{
        padding: '80px 24px',
        textAlign: 'center',
        maxWidth: 960, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 800, letterSpacing: '-0.03em',
          marginBottom: 12,
        }}>
          Your AI team, in physical form
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 52, lineHeight: 1.6 }}>
          Each AI model becomes a unique character in your arena. They collaborate visibly — walk to each other, discuss, then deliver.
        </p>

        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {AI_CHARS.map((char, i) => (
            <div key={char.name} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${char.color}30`,
              borderRadius: 20,
              padding: '28px 24px',
              width: 160, flexShrink: 0,
              animation: `fadeUp 0.6s ease ${0.1 + i * 0.08}s both`,
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${char.color}30`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              {/* Mini character figure */}
              <div style={{ position: 'relative', height: 70, marginBottom: 14 }}>
                {/* Body */}
                <div style={{
                  position: 'absolute', left: '50%', top: '40%',
                  transform: 'translateX(-50%)',
                  width: 22, height: 32,
                  background: char.color,
                  borderRadius: 8,
                  boxShadow: `0 0 16px ${char.color}60`,
                  animation: `walkBounce ${1.5 + i * 0.2}s ease-in-out infinite`,
                }} />
                {/* Head */}
                <div style={{
                  position: 'absolute', left: '50%', top: '8%',
                  transform: 'translateX(-50%)',
                  width: 20, height: 20,
                  background: char.color,
                  borderRadius: '50%',
                  boxShadow: `0 0 20px ${char.color}80`,
                  animation: `walkBounce ${1.5 + i * 0.2}s ease-in-out infinite`,
                }} />
                {/* Glow */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 40, height: 8,
                  background: `radial-gradient(ellipse, ${char.color}50, transparent)`,
                }} />
              </div>
              <p style={{ fontWeight: 800, fontSize: 14, color: char.color, marginBottom: 4 }}>
                {char.name}
              </p>
              <p style={{ color: '#475569', fontSize: 11, fontWeight: 500 }}>{char.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        padding: '80px 24px',
        maxWidth: 800, margin: '0 auto',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 48,
        }}>
          How the arena works
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { step: '01', title: 'You speak.', desc: 'Type what you want to build. Claude listens, understands your vision in any language.' },
            { step: '02', title: 'The team assembles.', desc: 'Claude calls in Perplexity for research, ChatGPT for ideas, Gemini for visuals — you watch them walk to each other and collaborate.' },
            { step: '03', title: 'It gets built.', desc: 'Watch your project come to life in real-time as files appear. Every step visible in the chat.' },
            { step: '04', title: 'Claude demos it.', desc: 'When done, Claude walks you through the product — showing every feature, every screen. Then hands it over.' },
            { step: '05', title: 'Download and ship.', desc: 'One click to download your full project as a ZIP. Yours to deploy anywhere.' },
          ].map((item, i) => (
            <div key={item.step} style={{
              display: 'flex', gap: 20, alignItems: 'flex-start', textAlign: 'left',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(99,102,241,0.1)',
              borderRadius: 16, padding: '20px 24px',
              animation: `fadeUp 0.6s ease ${i * 0.1}s both`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                color: '#4F46E5', background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8, padding: '4px 8px', flexShrink: 0, marginTop: 2,
              }}>
                {item.step}
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.title}</p>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{
        padding: '80px 24px 100px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16,
        }}>
          Ready to build?
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 36 }}>
          Create your account. Claude is waiting.
        </p>
        <Link href="/signup" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white', textDecoration: 'none',
          fontSize: 16, fontWeight: 700, padding: '16px 40px',
          borderRadius: 18,
          boxShadow: '0 0 50px rgba(99,102,241,0.4), 0 8px 24px rgba(0,0,0,0.4)',
        }}>
          Enter the arena — it's free →
        </Link>
        <p style={{ marginTop: 16, color: '#1e293b', fontSize: 12 }}>
          100 credits free · No card needed · Build anything
        </p>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '24px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#1e293b', fontSize: 12,
        flexWrap: 'wrap', gap: 12,
      }}>
        <span>© 2026 Arivarangam</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ color: '#1e293b', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ color: '#1e293b', textDecoration: 'none' }}>Terms</Link>
        </div>
      </footer>
    </div>
  )
}
