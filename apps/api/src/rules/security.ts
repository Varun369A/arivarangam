// ─── Security Rules ───────────────────────────────────────────────────────────
// Injected into the SecurityAudit phase for ALL task types.

export const SECURITY_RULES = `
═══ SECURITY AUDIT CHECKLIST ═══

Scan every generated file and fix ALL issues found:

XSS PREVENTION:
✗ NEVER: element.innerHTML = userInput
✓ USE:   element.textContent = userInput
✓ OR:    DOMPurify.sanitize(userInput) if HTML needed

✗ NEVER: eval(code), new Function(str), setTimeout('string', ms)
✓ USE:   JSON.parse() for data, named functions for callbacks

✗ NEVER: document.write(anything)
✓ USE:   DOM manipulation methods

INPUT VALIDATION — Every form field needs:
• required attribute where mandatory
• maxlength on text inputs (reasonable limit)
• type="email" for emails, type="url" for URLs
• pattern attribute for specific formats
• JavaScript validation before any processing

API & FETCH SECURITY:
✗ NEVER: Hardcode API keys, tokens, or secrets in frontend code
✓ USE:   Environment variables or backend proxy endpoints

✗ NEVER:
  fetch(url).then(r => r.json()).then(data => use(data))

✓ ALWAYS wrap fetch in try/catch + check response.ok:
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const data = await res.json();
  } catch (err) {
    console.error('Request failed:', err);
  }

RESOURCE SECURITY:
• All external links: rel="noopener noreferrer"
• iframes: sandbox="allow-scripts allow-same-origin" if embedding external content
• Never use SRC from user input without URL validation

CSP META TAG — Add to <head> of every HTML file:
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;">

CLICKJACKING PROTECTION — Add to HTML pages:
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">

COMMON FIXES TO APPLY:
• Replace: location.href = userInput  →  Validate URL before redirect
• Replace: src = untrustedUrl         →  Validate and sanitize URL
• Add: noopener noreferrer to ALL <a target="_blank"> tags
• Add: error boundaries around any code that touches user data
`;
