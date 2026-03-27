'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Code2,
  Search,
  Image,
  Mic,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Brain,
  Play,
  Globe,
  Smartphone,
  Monitor,
  Bot,
  GitMerge,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

// ─── Fade-in helper ───────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay },
  }),
};

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    icon: <Code2 className="w-6 h-6" />,
    label: 'Web App',
    color: 'indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    tag: 'bg-indigo-100 text-indigo-700',
    desc: 'Full-stack React/Next.js apps with live preview — deployed to Vercel in one click.',
    example: 'Kirana store inventory tracker',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    label: 'Mobile App',
    color: 'cyan',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    tag: 'bg-cyan-100 text-cyan-700',
    desc: 'React Native / Expo mobile apps with QR code preview on your phone instantly.',
    example: 'UPI expense tracker app',
  },
  {
    icon: <Bot className="w-6 h-6" />,
    label: 'AI Agent',
    color: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    tag: 'bg-emerald-100 text-emerald-700',
    desc: 'Python LangChain/CrewAI agents with tools, deployed to Cloudflare Workers.',
    example: 'GST invoice filing agent',
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    label: 'Presentation',
    color: 'violet',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    tag: 'bg-violet-100 text-violet-700',
    desc: 'Beautiful Reveal.js slideshows rendered and previewed right in your browser.',
    example: 'Startup pitch deck in 10 slides',
  },
  {
    icon: <GitMerge className="w-6 h-6" />,
    label: 'Workflow',
    color: 'amber',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    tag: 'bg-amber-100 text-amber-700',
    desc: 'n8n automation workflows exported as JSON — import and run with one click.',
    example: 'GST invoice → Slack workflow',
  },
  {
    icon: <Search className="w-6 h-6" />,
    label: 'Research',
    color: 'green',
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    tag: 'bg-green-100 text-green-700',
    desc: 'Deep-dive research, competitive analysis, and real-time web search with citations.',
    example: 'India startup ecosystem 2025',
  },
  {
    icon: <Image className="w-6 h-6" />,
    label: 'Image',
    color: 'orange',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    tag: 'bg-orange-100 text-orange-700',
    desc: 'Generate stunning visuals, product images, and creative artwork with GPT-4o.',
    example: 'Logo for a fintech startup',
  },
  {
    icon: <Mic className="w-6 h-6" />,
    label: 'Voice',
    color: 'pink',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    tag: 'bg-pink-100 text-pink-700',
    desc: 'Studio-quality text-to-speech in Indian languages via Sarvam AI + ElevenLabs.',
    example: 'Hindi product explainer narration',
  },
];

const STEPS = [
  {
    num: '01',
    icon: <Brain className="w-6 h-6" style={{ color: '#1E3461' }} />,
    title: 'Describe what you need',
    desc: 'Type your task in plain English. No technical jargon required — just tell us what you want to build or create.',
  },
  {
    num: '02',
    icon: <Zap className="w-6 h-6" style={{ color: '#C4882A' }} />,
    title: 'AI builds it autonomously',
    desc: 'Our agent picks the best model, executes the task, and self-corrects errors — all without you lifting a finger.',
  },
  {
    num: '03',
    icon: <Sparkles className="w-6 h-6" style={{ color: '#059669' }} />,
    title: 'Deploy with one click',
    desc: 'Preview live in browser, deploy to Vercel/Railway/Cloudflare, push to GitHub — all from one button.',
  },
];

const PRICING = [
  {
    id: 'trial',
    name: 'Trial',
    price: 99,
    credits: 300,
    popular: false,
    desc: 'Perfect to try',
    color: 'border-[#E8E5DF]',
    btn: 'bg-[#1E3461] hover:bg-[#16284D] text-white',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 299,
    credits: 1000,
    popular: false,
    desc: 'For individuals',
    color: 'border-[#E8E5DF]',
    btn: 'bg-[#1E3461] hover:bg-[#16284D] text-white',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 699,
    credits: 3000,
    popular: true,
    desc: 'Best value',
    color: 'border-[#1E3461]',
    btn: 'bg-[#1E3461] hover:bg-[#16284D] text-white',
  },
  {
    id: 'business',
    name: 'Business',
    price: 1499,
    credits: 8000,
    popular: false,
    desc: 'For teams',
    color: 'border-[#E8E5DF]',
    btn: 'bg-[#1E3461] hover:bg-[#16284D] text-white',
  },
];

const COMPETITORS = [
  { name: 'Lovable', price: '₹1,500–3,000', credits: '~500', ratio: '6x more expensive' },
  { name: 'Bolt', price: '₹1,600–4,000', credits: '~600', ratio: '7x more expensive' },
  { name: 'Cursor Pro', price: '₹1,700/mo', credits: 'Fixed', ratio: '~5x more expensive' },
  { name: 'Arivarangam', price: '₹699', credits: '3,000', ratio: 'You save 20-70x', highlight: true },
];

// ─── Mini Task Preview ─────────────────────────────────────────────────────────
function TaskPreview() {
  return (
    <div
      className="bg-white rounded-2xl w-full max-w-sm mx-auto p-5"
      style={{
        border: '1px solid #E8E5DF',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-[#6B7280] font-mono">Task #1024</span>
      </div>

      {/* Prompt */}
      <div
        className="rounded-xl p-3 mb-4"
        style={{ background: '#FEF3C7', border: '1px solid #C4882A30' }}
      >
        <p className="text-sm font-medium" style={{ color: '#92400E' }}>
          &quot;Build a full-stack todo app with auth and PostgreSQL&quot;
        </p>
      </div>

      {/* Progress steps */}
      <div className="space-y-2.5">
        {[
          'Analyzing task…',
          'Scaffolding Next.js project…',
          'Writing API routes…',
          'Done! 47 files created',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {i < 3 ? (
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: i < 2 ? '#1E3461' : '#E8E5DF',
                  background: i < 2 ? '#1E3461' : 'white',
                }}
              >
                {i < 2 && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
            )}
            <span
              className="text-xs"
              style={{
                color:
                  i === 3
                    ? '#059669'
                    : i === 2
                    ? '#6B7280'
                    : '#9CA3AF',
                textDecoration: i < 2 ? 'line-through' : 'none',
                fontWeight: i === 3 ? 600 : 400,
              }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="mt-4 pt-3 flex items-center justify-between"
        style={{ borderTop: '1px solid #E8E5DF' }}
      >
        <span className="text-xs" style={{ color: '#6B7280' }}>Credits used</span>
        <span className="text-xs font-bold" style={{ color: '#1E3461' }}>42 / ~50 estimated</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 bg-white"
        style={{ borderBottom: '1px solid #E8E5DF' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Logo size={30} showText={true} />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: '#374151' }}>
            <Link href="#how" className="hover:text-[#1E3461] transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-[#1E3461] transition-colors">Pricing</Link>
            <Link href="#why" className="hover:text-[#1E3461] transition-colors">Why us</Link>
            <Link href="/gallery" className="hover:text-[#1E3461] transition-colors flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />Gallery
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors"
              style={{ color: '#374151' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 text-white"
              style={{ background: '#1E3461' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#16284D')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1E3461')}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{ background: '#FFFFFF' }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#E8E5DF 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.7,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{
                border: '1px solid #C4882A',
                color: '#C4882A',
                background: '#FEF3C7',
              }}
            >
              Autonomous AI Platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.1}
              className="mb-6"
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#0A0D14',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              The AI Platform
              <br />
              Built for{' '}
              <span style={{ color: '#1E3461' }}>Execution</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.2}
              className="max-w-lg mb-8"
              style={{ fontSize: '16px', lineHeight: 1.7, color: '#374151' }}
            >
              One platform for code, research, images and voice. Our AI agents pick the best
              model for every task and deliver results — no subscriptions, pay only per credit.{' '}
              <strong style={{ color: '#0A0D14' }}>20-70x cheaper</strong> than Lovable or Bolt.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.3}
              className="flex flex-wrap gap-3 mb-8"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                style={{
                  background: '#1E3461',
                  boxShadow: '0 4px 14px rgba(30,52,97,0.25)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#16284D')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1E3461')}
              >
                Start Building Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                style={{
                  background: 'white',
                  border: '1px solid #E8E5DF',
                  color: '#374151',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <Play className="w-4 h-4" style={{ color: '#1E3461' }} />
                See it in action
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.4}
              className="flex items-center gap-6 text-sm"
              style={{ color: '#6B7280' }}
            >
              {['No subscription', 'Pay per use', '4 AI models'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Preview card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          >
            <TaskPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section id="categories" className="py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#C4882A' }}
            >
              Capabilities
            </p>
            <h2
              className="mb-4"
              style={{ fontSize: '40px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
            >
              Everything you need, one platform
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>
              Four powerful AI categories, each powered by the model best suited for that job.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.1}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl p-6 cursor-pointer"
                style={{
                  border: '1px solid #E8E5DF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div className={`${cat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <span className={cat.iconColor}>{cat.icon}</span>
                </div>
                <h3
                  className="mb-2"
                  style={{ fontSize: '18px', fontWeight: 700, color: '#0A0D14' }}
                >
                  {cat.label}
                </h3>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
                  {cat.desc}
                </p>
                <div className={`${cat.tag} text-xs font-medium px-2.5 py-1 rounded-full inline-block`}>
                  Try: &quot;{cat.example}&quot;
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24" style={{ background: '#F7F6F3' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#1E3461' }}
            >
              How it works
            </p>
            <h2
              className="mb-4"
              style={{ fontSize: '40px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
            >
              From idea to results in seconds
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>
              No setup. No configuration. Just describe what you want.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div
              className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px"
              style={{ background: 'linear-gradient(to right, #1E3461, #C4882A, #059669)' }}
            />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.15}
                className="relative text-center"
              >
                <div className="inline-flex flex-col items-center">
                  <div
                    className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 z-10"
                    style={{
                      border: '1px solid #E8E5DF',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    }}
                  >
                    {step.icon}
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center"
                      style={{ background: '#1E3461' }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3
                    className="mb-3"
                    style={{ fontSize: '20px', fontWeight: 700, color: '#0A0D14' }}
                  >
                    {step.title}
                  </h3>
                  <p className="leading-relaxed max-w-xs" style={{ color: '#6B7280' }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#C4882A' }}
            >
              Pricing
            </p>
            <h2
              className="mb-4"
              style={{ fontSize: '40px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
            >
              Pay once, use when you want
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>
              No monthly subscriptions. Buy credits, use them at your own pace. Credits never expire.
            </p>
          </motion.div>

          {/* Free credits banner */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 mb-12 max-w-lg mx-auto"
            style={{
              background: '#FEF3C7',
              border: '1px solid #C4882A40',
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: '#C4882A' }} />
            <span className="font-semibold" style={{ color: '#92400E' }}>
              New users get <strong>100 free credits</strong> — no card required
            </span>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((pack, i) => (
              <motion.div
                key={pack.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.1}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative bg-white rounded-2xl p-6"
                style={{
                  border: `2px solid ${pack.popular ? '#1E3461' : '#E8E5DF'}`,
                  boxShadow: pack.popular
                    ? '0 4px 24px rgba(30,52,97,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {/* Popular header band */}
                {pack.popular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full"
                    style={{ background: '#1E3461' }}
                  >
                    POPULAR
                  </div>
                )}

                <div className="mb-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: '#6B7280' }}
                  >
                    {pack.desc}
                  </p>
                  <h3
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      color: pack.popular ? '#1E3461' : '#0A0D14',
                    }}
                  >
                    {pack.name}
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      style={{
                        fontSize: '36px',
                        fontWeight: 900,
                        color: '#0A0D14',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ₹{pack.price}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                    <span className="font-bold" style={{ color: '#374151' }}>
                      {pack.credits.toLocaleString()}
                    </span>{' '}
                    credits
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    ≈ ₹{(pack.price / pack.credits).toFixed(2)} per credit
                  </p>
                </div>

                <Link
                  href="/signup"
                  className={`block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${pack.btn}`}
                >
                  Get started
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center text-sm mt-8"
            style={{ color: '#9CA3AF' }}
          >
            7-day refund on unused credit packs · Credits do not expire · No hidden fees
          </motion.p>
        </div>
      </section>

      {/* ── Why Arivarangam ── */}
      <section id="why" className="py-24" style={{ background: '#F7F6F3' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#1E3461' }}
            >
              Why us
            </p>
            <h2
              className="mb-4"
              style={{ fontSize: '40px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
            >
              20–70x cheaper than the rest
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>
              We built on top of the best models at cost and pass the savings to you.
              Our 91% margin goal means we stay sustainable — and you pay less.
            </p>
          </motion.div>

          {/* Comparison table */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="overflow-x-auto mb-16"
          >
            <table
              className="w-full max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden"
              style={{
                border: '1px solid #E8E5DF',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <thead>
                <tr style={{ background: '#F7F6F3', borderBottom: '1px solid #E8E5DF' }}>
                  {['Platform', '₹699 buys…', 'Credits', 'Verdict'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                      style={{ color: '#6B7280' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr
                    key={c.name}
                    style={{
                      background: c.highlight ? '#FEF3C7' : 'white',
                      borderTop: i > 0 ? '1px solid #E8E5DF' : 'none',
                    }}
                  >
                    <td
                      className="px-5 py-4 font-semibold"
                      style={{ color: c.highlight ? '#92400E' : '#374151' }}
                    >
                      {c.name}
                      {c.highlight && (
                        <span
                          className="ml-2 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#C4882A20', color: '#C4882A' }}
                        >
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#374151' }}>{c.price}</td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: '#374151' }}>{c.credits}</td>
                    <td
                      className="px-5 py-4 text-sm font-semibold"
                      style={{ color: c.highlight ? '#059669' : '#DC2626' }}
                    >
                      {c.ratio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { stat: '91%', label: 'Cost margin goal', sub: 'Sustainable + affordable' },
              { stat: '4', label: 'AI models', sub: 'Best model per task' },
              { stat: '20-70x', label: 'Cheaper', sub: 'vs Lovable, Bolt, Cursor' },
            ].map((s, i) => (
              <motion.div
                key={s.stat}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i * 0.1}
                className="text-center bg-white rounded-2xl p-6"
                style={{
                  border: '1px solid #E8E5DF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="mb-2"
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#1E3461',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.stat}
                </div>
                <div className="font-bold text-lg" style={{ color: '#0A0D14' }}>{s.label}</div>
                <div className="text-sm mt-1" style={{ color: '#6B7280' }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20" style={{ background: '#1E3461' }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto px-4 text-center"
        >
          <h2
            className="mb-4 text-white"
            style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Ready to build with AI?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Start with{' '}
            <strong style={{ color: '#C4882A' }}>100 free credits</strong>
            . No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-lg text-lg transition-all duration-200"
            style={{ background: 'white', color: '#1E3461' }}
          >
            Start Building Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white py-12" style={{ borderTop: '1px solid #E8E5DF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/">
              <Logo size={28} showText={true} />
            </Link>
            <div className="flex items-center gap-6 text-sm" style={{ color: '#6B7280' }}>
              <Link href="/terms" className="hover:text-[#1E3461] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[#1E3461] transition-colors">Privacy</Link>
              <Link href="/login" className="hover:text-[#1E3461] transition-colors">Sign in</Link>
            </div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              © 2025 Arivarangam. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
