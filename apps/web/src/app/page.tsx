'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Code2, Search, Image, ArrowRight, CheckCircle2, Sparkles, Zap, Brain,
  Globe, Smartphone, Monitor, Bot, GitMerge, ChevronRight,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

// ─── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: d } }),
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ─── Typing animation hook ─────────────────────────────────────────────────────
const PROMPTS = [
  'Build a Kirana store inventory + GST billing app',
  'Research the Indian startup ecosystem in 2025',
  'Generate a pitch deck for my agritech startup',
  'Create a React Native UPI expense tracker',
  'Build an AI agent that monitors mandi prices',
  'Write 10 LinkedIn posts for a founder journey',
  'Generate a futuristic cityscape image at sunset',
  'Create an n8n workflow for customer onboarding',
];

function useTypingAnimation() {
  const [promptIdx, setPromptIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing');

  useEffect(() => {
    const target = PROMPTS[promptIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 38);
      } else {
        timeout = setTimeout(() => setPhase('pause'), 2200);
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('deleting'), 100);
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 18);
      } else {
        setPromptIdx((i) => (i + 1) % PROMPTS.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, phase, promptIdx]);

  return displayed;
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start >= to) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString('en-IN')}{suffix}</span>;
}

// ─── Animated task preview ────────────────────────────────────────────────────
const STEPS_PREVIEW = [
  { label: 'Analyzing requirements…', done: true },
  { label: 'Planning 12 files…', done: true },
  { label: 'Writing src/app/page.tsx…', done: true },
  { label: 'Writing API routes…', active: true },
  { label: 'Auto-fix pass…', pending: true },
];

function LiveTaskPreview() {
  const [activeStep, setActiveStep] = useState(3);
  const [progress, setProgress] = useState(62);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { setActiveStep(5); return 100; }
        return p + 0.4;
      });
      setActiveStep(s => (progress >= 85 ? 4 : s));
    }, 60);
    return () => clearInterval(t);
  }, [progress]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-purple-500/20 rounded-3xl blur-2xl" />

      <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-2 text-xs text-slate-400 font-mono">arivarangam — task #1024</span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold">
            RUNNING
          </span>
        </div>

        {/* Prompt */}
        <div className="px-4 pt-4 pb-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">Prompt</div>
          <div className="bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono leading-relaxed border border-white/5">
            Build a full-stack todo app with auth and PostgreSQL
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Progress</span>
            <span className="text-indigo-400 font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pb-4 space-y-1.5">
          {STEPS_PREVIEW.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {i < activeStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : i === activeStep ? (
                <motion.div
                  className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 flex-shrink-0"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
              )}
              <span className={`text-xs font-mono ${i < activeStep ? 'line-through text-slate-600' : i === activeStep ? 'text-indigo-300' : 'text-slate-600'}`}>
                {s.label}
              </span>
              {i === activeStep && (
                <motion.span className="text-[10px] text-indigo-400 ml-auto font-mono"
                  animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  ▊
                </motion.span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-800/60 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Credits used</span>
          <span className="text-[11px] font-bold text-indigo-400 font-mono">34 / ~50 est.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: Code2, label: 'Web App', color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20', desc: 'Full-stack React apps with live preview and one-click Vercel deploy.' },
  { icon: Smartphone, label: 'Mobile', color: 'from-cyan-500 to-sky-500', bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/20', desc: 'React Native Expo apps with QR preview on your phone instantly.' },
  { icon: Bot, label: 'AI Agent', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', desc: 'Python LangChain agents with tools, auto-deployed to cloud.' },
  { icon: Monitor, label: 'Slides', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10', ring: 'ring-violet-500/20', desc: 'Beautiful Reveal.js presentations rendered live in your browser.' },
  { icon: GitMerge, label: 'Workflow', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', desc: 'n8n automation workflows exported and ready to import in one click.' },
  { icon: Search, label: 'Research', color: 'from-teal-500 to-green-500', bg: 'bg-teal-500/10', ring: 'ring-teal-500/20', desc: 'Deep research with real-time web search, citations, and reports.' },
  { icon: Image, label: 'Image', color: 'from-orange-500 to-rose-500', bg: 'bg-orange-500/10', ring: 'ring-orange-500/20', desc: 'Stunning AI-generated visuals, product images, and artwork.' },
  { icon: Sparkles, label: 'Content', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', ring: 'ring-pink-500/20', desc: 'Blogs, scripts, emails and marketing copy written by AI.' },
];

const PRICING = [
  { name: 'Trial', price: 99, credits: 300, desc: 'Try it out', popular: false },
  { name: 'Starter', price: 299, credits: 1000, desc: 'For individuals', popular: false },
  { name: 'Pro', price: 699, credits: 3000, desc: 'Best value', popular: true },
  { name: 'Business', price: 1499, credits: 8000, desc: 'For teams', popular: false },
];

const STATS = [
  { label: 'Tasks completed', value: 12400, suffix: '+' },
  { label: 'Credits cost per task', value: 30, suffix: ' avg' },
  { label: 'Cheaper than Lovable', value: 70, suffix: 'x' },
  { label: 'Indian languages', value: 11, suffix: '' },
];

const COMPARE = [
  { name: 'Lovable', monthly: '₹3,000+', per1k: '₹3,000+', highlight: false },
  { name: 'Bolt', monthly: '₹3,500+', per1k: '₹3,500+', highlight: false },
  { name: 'Cursor Pro', monthly: '₹1,700/mo', per1k: 'Fixed', highlight: false },
  { name: 'Arivarangam', monthly: '₹699 (3,000 cr)', per1k: '₹233', highlight: true },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const typedText = useTypingAnimation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#05061a] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#05061a]/95 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Logo size={30} showText={true} />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {['How it works', 'Pricing', 'Why us', 'Gallery'].map((t) => (
              <Link key={t} href={t === 'Gallery' ? '/gallery' : `#${t.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-white transition-colors flex items-center gap-1">
                {t === 'Gallery' && <Globe className="w-3.5 h-3.5" />}{t}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              Get started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
            animate={{ x: [0, -20, 0], y: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left text */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border"
              style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>●</motion.span>
              India&apos;s Autonomous AI Platform
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="mb-6 font-black leading-[1.05]"
              style={{ fontSize: 'clamp(42px, 6vw, 72px)', letterSpacing: '-0.04em' }}>
              Build anything.<br />
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}>
                Ship in seconds.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
              Code, research, images, agents — one platform powered by AI. Pay per credit. No subscription.{' '}
              <span className="text-white font-semibold">20–70× cheaper</span> than Lovable or Bolt.
            </motion.p>

            {/* Typing prompt */}
            <motion.div variants={fadeUp}
              className="mb-8 rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur-sm"
              style={{ boxShadow: '0 0 40px rgba(99,102,241,0.1)' }}>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Try it</div>
              <div className="text-sm text-slate-300 font-mono min-h-[1.5rem]">
                {typedText}
                <motion.span className="text-indigo-400" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>▊</motion.span>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-8">
              <Link href="/signup"
                className="group inline-flex items-center gap-2.5 font-bold px-6 py-3.5 rounded-2xl text-white transition-all duration-200 hover:scale-105 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.35)' }}>
                Start Building Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#how-it-works"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-2xl text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                See how it works
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
              {['100 free credits on signup', 'No subscription', 'Credits never expire'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />{t}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right preview */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <LiveTaskPreview />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-slate-600" />
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">Scroll</span>
        </motion.div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1} className="text-center">
                <div className="text-3xl font-black bg-clip-text text-transparent mb-1"
                  style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section id="capabilities" className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
              One prompt.<br /><span className="text-slate-400">Infinite outputs.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Eight AI-powered categories, each using the best model for that job.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.div key={cat.label}
                  variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.07}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className={`group relative rounded-2xl p-6 border border-white/5 bg-white/[0.03] cursor-pointer overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] ring-1 ring-transparent hover:${cat.ring}`}>
                  {/* Hover glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
                  <div className={`${cat.bg} w-11 h-11 rounded-xl flex items-center justify-center mb-4 ring-1 ${cat.ring}`}>
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{cat.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Try it <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-28 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">How it works</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>From idea to shipped<br /><span className="text-slate-400">in under 60 seconds</span></h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px"
              style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4)' }} />

            {[
              { icon: Brain, num: '01', title: 'Describe', desc: 'Type what you need in plain English. No code knowledge required — just your idea.', color: 'from-indigo-500 to-violet-500' },
              { icon: Zap, num: '02', title: 'AI executes', desc: 'Our agents pick the best model, generate files, self-correct errors — fully autonomous.', color: 'from-violet-500 to-purple-500' },
              { icon: Sparkles, num: '03', title: 'Preview & ship', desc: 'Live browser preview. One-click deploy to Vercel, Railway, GitHub — ready in seconds.', color: 'from-purple-500 to-pink-500' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.15}
                  className="relative flex flex-col items-center text-center p-8 rounded-2xl border border-white/5 bg-white/[0.03]">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 relative z-10 shadow-lg`}
                    style={{ boxShadow: `0 0 30px rgba(139,92,246,0.3)` }}>
                    <Icon className="w-8 h-8 text-white" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-slate-900 border-2 border-indigo-500 text-indigo-400 text-xs font-black rounded-full flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── India First ── */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/30 bg-orange-500/10 text-orange-400">
              🇮🇳 Built for India
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
              Made in India.<br /><span className="text-slate-400">Built for Indian builders.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🏦', title: 'GST & UPI Ready', desc: 'Templates pre-built with GST billing, Razorpay UPI, Aadhar-linked auth and Indian bank integrations.' },
              { icon: '🗣️', title: '11 Indian Languages', desc: 'Generate apps and content in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, and more via Sarvam AI.' },
              { icon: '💸', title: 'Pay in ₹', desc: 'Priced in Indian Rupees. 20-70× cheaper than international tools. Credits never expire.' },
              { icon: '🌾', title: 'India-specific templates', desc: 'Kirana stores, FPO platforms, mandi trackers, tiffin apps — 50+ Indian business templates ready to use.' },
              { icon: '⚡', title: 'Fast inference', desc: 'Low-latency AI inference on Indian edge. Most tasks complete in under 60 seconds.' },
              { icon: '🔒', title: 'Data stays in India', desc: 'Your prompts and outputs stay secure. No data shared with third parties.' },
            ].map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-6 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-orange-500/20 transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>Simple, honest pricing</h2>
            <p className="text-slate-400 text-lg">No subscriptions. Credits never expire. Pay only for what you use.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {PRICING.map((p, i) => (
              <motion.div key={p.name}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.1}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`relative rounded-2xl p-6 border transition-all ${p.popular ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-white/5 bg-white/[0.03]'}`}
                style={p.popular ? { boxShadow: '0 0 40px rgba(99,102,241,0.15)' } : {}}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    Most Popular
                  </div>
                )}
                <div className="text-sm text-slate-500 mb-1">{p.desc}</div>
                <div className="text-3xl font-black text-white mb-1">₹{p.price}</div>
                <div className="text-sm text-indigo-400 font-semibold mb-5">{p.credits.toLocaleString('en-IN')} credits</div>
                <ul className="space-y-2 mb-6 text-xs text-slate-400">
                  {['Credits never expire', 'All 8 AI categories', 'Download outputs', 'Community support'].map(f => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/signup"
                  className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-all hover:scale-105 ${p.popular ? 'text-white' : 'text-slate-300 bg-white/5 hover:bg-white/10'}`}
                  style={p.popular ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' } : {}}>
                  Get started →
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Comparison table */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h3 className="text-center text-xl font-bold text-white mb-6">Why Arivarangam wins</h3>
            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-3 px-6 py-3 bg-white/5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Platform</span><span className="text-center">Monthly cost</span><span className="text-center">Per 1000 credits</span>
              </div>
              {COMPARE.map((c, i) => (
                <div key={c.name} className={`grid grid-cols-3 px-6 py-4 text-sm border-t border-white/5 ${c.highlight ? 'bg-indigo-500/10' : ''}`}>
                  <span className={`font-semibold ${c.highlight ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {c.highlight && '⚡ '}{c.name}
                  </span>
                  <span className={`text-center ${c.highlight ? 'text-white font-bold' : 'text-slate-400'}`}>{c.monthly}</span>
                  <span className={`text-center ${c.highlight ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>{c.per1k}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.div variants={fadeUp} className="text-6xl mb-6">🚀</motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black mb-6" style={{ letterSpacing: '-0.04em' }}>
              Ready to build?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-slate-400 mb-10">
              Join thousands of Indian builders. 100 free credits on signup — no card required.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/signup"
                className="inline-flex items-center gap-3 font-black text-lg px-10 py-5 rounded-2xl text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', boxShadow: '0 0 60px rgba(99,102,241,0.4)' }}>
                Start building for free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={28} showText={true} />
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
          <p className="text-xs text-slate-600">© 2025 Arivarangam. Made in India 🇮🇳</p>
        </div>
      </footer>
    </div>
  );
}
