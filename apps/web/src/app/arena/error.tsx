'use client'

export default function ArenaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#060610',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#94a3b8',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(239,68,68,0.15)',
        border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        ✗
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
        Arena failed to load
      </p>
      <p style={{ fontSize: 13, color: '#475569', margin: 0, maxWidth: 340, textAlign: 'center' }}>
        {error?.message || 'An unexpected error occurred in the 3D scene.'}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white', border: 'none',
          borderRadius: 12, padding: '10px 24px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
