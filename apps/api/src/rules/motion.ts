// ─── Motion Rules ─────────────────────────────────────────────────────────────
// Injected into all visual tasks. Every page must feel alive.

export const MOTION_RULES = `
═══ ANIMATION MANDATES — EVERY PAGE MUST MOVE ═══

REQUIRED CDN LIBRARIES (always include ALL of these for web/animation tasks):
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>

PAGE INIT — Copy this EXACTLY at the top of every main <script>:
\`\`\`js
gsap.registerPlugin(ScrollTrigger);
// Smooth scroll with Lenis
const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
\`\`\`

PAGE LOAD ANIMATIONS (required on every page):
\`\`\`js
// Animate hero elements in on load
gsap.from('.hero-content > *', {
  y: 70, opacity: 0, duration: 1.1, stagger: 0.18,
  ease: 'power4.out', delay: 0.2
});
// Nav slides in from top
gsap.from('nav', { y: -60, opacity: 0, duration: 0.8, ease: 'power3.out' });
\`\`\`

SCROLL ANIMATIONS (add data-animate to EVERY section's children):
\`\`\`js
gsap.utils.toArray('[data-animate]').forEach((el) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
    y: 55, opacity: 0, duration: 0.85, ease: 'power3.out'
  });
});
gsap.utils.toArray('[data-animate-group]').forEach((group) => {
  gsap.from((group as Element).children, {
    scrollTrigger: { trigger: group, start: 'top 80%' },
    y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out'
  });
});
\`\`\`

HOVER MICRO-INTERACTIONS (add to ALL interactive elements):
\`\`\`js
// Buttons
document.querySelectorAll('button, .btn, a.cta').forEach(btn => {
  btn.addEventListener('mouseenter', () => gsap.to(btn, { scale: 1.04, duration: 0.2 }));
  btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: 0.2 }));
  btn.addEventListener('mousedown',  () => gsap.to(btn, { scale: 0.97, duration: 0.1 }));
  btn.addEventListener('mouseup',    () => gsap.to(btn, { scale: 1.04, duration: 0.1 }));
});
// Cards
document.querySelectorAll('.card, [data-card]').forEach(card => {
  card.addEventListener('mouseenter', () => gsap.to(card, { y: -6, duration: 0.25, ease: 'power2.out' }));
  card.addEventListener('mouseleave', () => gsap.to(card, { y: 0, duration: 0.25, ease: 'power2.out' }));
});
\`\`\`

NUMBER COUNTERS (add to all stat/metric sections):
\`\`\`js
document.querySelectorAll('[data-count]').forEach(el => {
  const target = parseFloat(el.getAttribute('data-count') || '0');
  ScrollTrigger.create({
    trigger: el, start: 'top 80%', once: true,
    onEnter: () => gsap.to({ val: 0 }, {
      val: target, duration: 1.8, ease: 'power2.out',
      onUpdate: function() { el.textContent = Math.round(this.targets()[0].val).toLocaleString() + (el.getAttribute('data-suffix') || ''); }
    })
  });
});
\`\`\`

HERO BACKGROUND (use one of these — dark themes):
Option A — Animated gradient mesh:
\`\`\`css
.hero { background: linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a1628 100%); }
@keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.hero { background-size: 400% 400%; animation: gradientShift 8s ease infinite; }
\`\`\`

FORBIDDEN:
• Zero animation on any web/animation task
• CSS transition: all (causes jank — use specific properties)
• jQuery .animate()
• Autoplay video without muted + playsinline attributes
• Animations that start immediately with no delay (feels jarring)
`;
