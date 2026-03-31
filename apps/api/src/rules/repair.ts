// ─── Repair Rules ─────────────────────────────────────────────────────────────
// Pattern library for auto-fixing common generation errors.

export const REPAIR_RULES = `
═══ AUTO-REPAIR PATTERNS ═══

Given a list of review failures, apply ONLY the minimal targeted fixes.
Do not rewrite files that have no failures.

BLANK PAGE / SCRIPT ERRORS:
Issue: CDN script fails to load silently
Fix: Add crossorigin="anonymous" to CDN script tags
     Verify script tag order: GSAP → ScrollTrigger → Lenis → app.js

Issue: GSAP ScrollTrigger not working
Fix: Add at top of script: gsap.registerPlugin(ScrollTrigger);
     Ensure gsap.min.js loads BEFORE ScrollTrigger.min.js

Issue: Google Fonts not loading
Fix: Use preconnect + correct URL format:
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link href="https://fonts.googleapis.com/css2?family=NAME&display=swap" rel="stylesheet">

LAYOUT ISSUES:
Issue: Horizontal scrollbar / overflow
Fix: Add to css: html, body { overflow-x: hidden; max-width: 100%; }

Issue: Flexbox children not expanding
Fix: Ensure parent has display: flex and children have appropriate flex values

Issue: Grid not aligning
Fix: Check grid-template-columns syntax. Use fr units.
     Example: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));

Issue: Height collapsing to 0
Fix: Add min-height to containers. Use height: 100% on children only when parent has explicit height.

ANIMATION ISSUES:
Issue: GSAP target not found
Fix: Wrap animations in DOMContentLoaded or move script to end of body

Issue: ScrollTrigger not firing
Fix: Verify trigger element exists. Check start value (try 'top 90%').

Issue: Lenis conflict with ScrollTrigger
Fix: Ensure only ONE lenis instance. Check for duplicate init code.

RESPONSIVE ISSUES:
Issue: Missing viewport meta
Fix: Add to <head>: <meta name="viewport" content="width=device-width, initial-scale=1">

Issue: Fixed pixel widths breaking mobile
Fix: Replace width: Npx with max-width: Npx + width: 100%
     Use clamp() for font sizes: clamp(1rem, 2.5vw, 1.5rem)

TYPESCRIPT/JS ERRORS:
Issue: "Cannot read property of null"
Fix: Add null check: if (!el) return; or use optional chaining: el?.method()

Issue: Module not found
Fix: Check import path. Use relative paths (./file) not absolute.

Issue: async/await without try/catch
Fix: Wrap all async operations in try/catch blocks

SECURITY FIXES (from security audit):
Issue: innerHTML with dynamic content
Fix: Replace with textContent, or sanitize: el.innerHTML = DOMPurify.sanitize(content)

Issue: Missing rel on external link
Fix: Add rel="noopener noreferrer" to all <a target="_blank"> tags

Issue: API key in frontend code
Fix: Move to backend proxy or environment variable comment
`;
