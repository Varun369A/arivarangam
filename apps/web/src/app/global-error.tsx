'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{
        margin: 0,
        background: '#060610',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        textAlign: 'center',
        padding: '24px',
      }}>
        <div style={{ fontSize: 32 }}>✗</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 13, color: '#475569', margin: 0, maxWidth: 360 }}>
          {error?.message || 'An unexpected error occurred.'}
        </p>
        {error?.digest && (
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', margin: 0 }}>
            digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
