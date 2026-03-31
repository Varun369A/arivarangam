// ─── Design Rules ─────────────────────────────────────────────────────────────
// Injected into all visual tasks. Encodes senior-designer quality standards.

export const DESIGN_RULES = `
═══ SENIOR DESIGNER STANDARDS — NON-NEGOTIABLE ═══

MANDATORY CSS BASE — Copy EXACTLY at top of every CSS file:
\`\`\`css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --color-bg:           #0a0a0f;
  --color-surface:      #1a1a2e;
  --color-surface-alt:  #0f0f23;
  --color-text:         #f1f5f9;
  --color-text-muted:   #94a3b8;
  --color-primary:      #6366f1;
  --color-secondary:    #8b5cf6;
  --color-accent:       #a855f7;
  --color-border:       rgba(255, 255, 255, 0.08);
}
html, body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
\`\`\`

CRITICAL: color: var(--color-text) on body is MANDATORY. Without it text is invisible on dark backgrounds.
NEVER set opacity: 0 in CSS — only use GSAP for that. Elements must be visible without JavaScript.

COLOR SYSTEM:
• Apply the 60-30-10 rule: 60% base, 30% secondary, 10% accent
• Always define CSS custom properties at :root:
  --color-primary, --color-secondary, --color-accent, --color-surface,
  --color-surface-alt, --color-text, --color-text-muted, --color-border
• Gradients: use multi-stop mesh gradients, NOT flat fills
• Dark themes: base #0a0a0f, cards #1a1a2e, glow accents (indigo/violet/cyan)
• Light themes: base #f8f7ff (warm tint), cards #ffffff, deep accent
• NEVER use plain #ffffff as page background

TYPOGRAPHY — Premium font pairing always:
• Load 2 Google Fonts: one Display/Serif + one Sans-serif via single CDN link
  Example: https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap
• Hero headings: clamp(2.5rem, 6vw, 5rem) — NEVER fixed px
• Subheadings: clamp(1.4rem, 3vw, 2.2rem)
• Body: 1rem / line-height: 1.65
• Letter-spacing: -0.03em on large headings (tighter = more premium)
• Font weight contrast: 800–900 for heroes, 400–500 for body

SPACING — Generous breathing room signals quality:
• Section padding: min 100px top/bottom (desktop), 60px (mobile)
• Container: max-width 1200px, margin: 0 auto, padding: 0 clamp(1rem, 4vw, 2rem)
• Card gap: 24–32px
• Element gap within sections: 16–24px

LAYOUT — Premium patterns only:
• Floating nav: fixed, backdrop-filter: blur(20px), semi-transparent bg
• Hero: min 100vh, full-bleed background, centered or split layout
• Bento grids for feature sections (asymmetric, varying card sizes)
• Cards: border-radius 20–28px, subtle border (1px rgba(255,255,255,0.1))
• Cards hover: translateY(-6px) + box-shadow deepening (200ms ease)
• Buttons: gradient fill, border-radius 10px, min 48px height

FORBIDDEN — These kill the premium feel:
• Bootstrap, jQuery, Materialize
• Plain flat white cards with no depth or texture
• Default blue hyperlinks (#0000ff)
• All text centered (use left-align for body, center only for hero)
• Generic stock photo placeholders without styling
• Arial or Times New Roman as display font
`;
