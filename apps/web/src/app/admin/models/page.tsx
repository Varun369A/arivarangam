'use client'

import { useQuery } from 'react-query'
import { adminApi } from '@/lib/api'

interface ModelCard {
  name: string
  label: string
  role: string
  color: string
}

const MODELS: ModelCard[] = [
  { name: 'claude-sonnet-4-6',     label: 'Claude Sonnet 4.6',     role: 'Design spec + Build (main workhorse)', color: '#D97706' },
  { name: 'claude-haiku-4-5',      label: 'Claude Haiku 4.5',      role: 'Analyze + Plan + Review (fast)',       color: '#6366f1' },
  { name: 'gpt-4o',                label: 'GPT-4o (ChatGPT)',       role: 'Architecture suggestions in Plan',     color: '#10B981' },
  { name: 'perplexity-sonar',      label: 'Perplexity Sonar',      role: 'Design research in DesignSpec',        color: '#0EA5E9' },
  { name: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      role: 'Code quality review',                  color: '#8B5CF6' },
  { name: 'sarvam',                label: 'Sarvam AI',              role: 'Voice synthesis (TTS)',                color: '#F59E0B' },
  { name: 'dall-e-3',              label: 'DALL-E 3',               role: 'Image generation',                    color: '#EC4899' },
]

export default function ModelsPage() {
  const { data: health, isLoading } = useQuery(
    'admin-health',
    () => adminApi.getHealth(),
    { refetchInterval: 30000 }
  )

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.03em', margin: 0 }}>AI Models</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Which AI is used at each phase and their live status</p>
      </div>

      {/* Pipeline flow */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: '0 0 20px' }}>Task Build Pipeline</h2>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {[
            { phase: 'Analyze',   model: 'Haiku',      color: '#6366f1' },
            { phase: 'Research',  model: 'Perplexity', color: '#0EA5E9' },
            { phase: 'Plan',      model: 'GPT-4o',     color: '#10B981' },
            { phase: 'Build',     model: 'Sonnet',     color: '#D97706' },
            { phase: 'Review',    model: 'Gemini',     color: '#8B5CF6' },
            { phase: 'Repair',    model: 'Sonnet',     color: '#D97706' },
          ].map((p, i) => (
            <div key={p.phase} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                background: `${p.color}15`,
                border: `1.5px solid ${p.color}40`,
                borderRadius: 12,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 100,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, letterSpacing: '0.06em' }}>
                  PHASE {i + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>{p.phase}</div>
                <div style={{ fontSize: 11, color: p.color, fontWeight: 600, marginTop: 4 }}>{p.model}</div>
              </div>
              {i < 5 && (
                <div style={{ width: 24, height: 2, background: '#E5E7EB', flexShrink: 0, margin: '0 2px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Model cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {MODELS.map(m => {
          const modelHealth = (health as any)?.models?.[m.name]
          const status = isLoading ? 'checking' : (modelHealth?.ok ?? true) ? 'online' : 'degraded'

          return (
            <div key={m.name} style={{
              background: 'white',
              borderRadius: 14,
              border: '1px solid #E5E7EB',
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${m.color}20`,
                  border: `1.5px solid ${m.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {m.name.includes('claude') ? '◆' : m.name.includes('gpt') ? '◇' : m.name.includes('perplexity') ? '◉' : m.name.includes('gemini') ? '◈' : m.name.includes('sarvam') ? '◎' : '◐'}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: status === 'online' ? '#D1FAE5' : status === 'degraded' ? '#FEF3C7' : '#F3F4F6',
                  color: status === 'online' ? '#065F46' : status === 'degraded' ? '#92400E' : '#6B7280',
                }}>
                  {status === 'checking' ? 'Checking…' : status === 'online' ? '● Online' : '⚠ Degraded'}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{m.role}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, fontFamily: 'monospace' }}>{m.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
