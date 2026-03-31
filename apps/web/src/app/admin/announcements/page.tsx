'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api, { getApiError } from '@/lib/api'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'maintenance' | 'feature'
  active: boolean
  createdAt: string
}

export default function AnnouncementsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', message: '', type: 'info' as Announcement['type'] })
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSending(true)
    try {
      await (api as any).post('/admin/platform/announcements', form)
      toast.success('Announcement sent to all users')
      setForm({ title: '', message: '', type: 'info' })
      qc.invalidateQueries('admin-announcements')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSending(false)
    }
  }

  const typeColors = {
    info:        { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: '📢 Info' },
    warning:     { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', label: '⚠ Warning' },
    maintenance: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E', label: '🔧 Maintenance' },
    feature:     { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: '✨ New Feature' },
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.03em', margin: 0 }}>Announcements</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Send platform-wide messages to all users</p>
      </div>

      {/* Compose */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: '0 0 20px' }}>New Announcement</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Scheduled maintenance on April 5"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
                  border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as Announcement['type'] }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
                  border: '1px solid #E5E7EB', outline: 'none', background: 'white',
                }}
              >
                {Object.entries(typeColors).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={4}
              placeholder="Full message text shown to all users in the arena…"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
                border: '1px solid #E5E7EB', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'system-ui, sans-serif',
              }}
            />
          </div>

          {/* Preview */}
          {form.title && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: typeColors[form.type].bg,
              border: `1px solid ${typeColors[form.type].border}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: typeColors[form.type].text, marginBottom: 4 }}>
                {typeColors[form.type].label} · {form.title}
              </div>
              {form.message && (
                <div style={{ fontSize: 12, color: typeColors[form.type].text, opacity: 0.8 }}>{form.message}</div>
              )}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: sending ? '#E5E7EB' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: sending ? '#9CA3AF' : 'white', border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start', boxShadow: sending ? 'none' : '0 0 20px rgba(99,102,241,0.3)',
            }}
          >
            {sending ? 'Sending…' : '→ Send to all users'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 13,
        color: '#6B7280',
      }}>
        Announcements are shown as banners in the user's arena. Users can dismiss them. Maintenance announcements are shown immediately on login.
      </div>
    </div>
  )
}
