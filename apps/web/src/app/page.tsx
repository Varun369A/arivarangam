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
  Star,
} from 'lucide-react';

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
    label: 'Code',
    color: 'indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    tag: 'bg-indigo-100 text-indigo-700',
    desc: 'Full-stack apps, scripts, debugging, code review — powered by Claude & GPT-4o.',
    example: 'Build a REST API with auth',
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
    example: 'Compare top 5 CRM tools',
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
    desc: 'Studio-quality text-to-speech in 30+ voices and languages via ElevenLabs.',
    example: 'Narrate a product explainer',
  },
];

const STEPS = [
  {
    num: '01',
    icon: <Brain className="w-6 h-6 text-indigo-600" />,
    title: 'Describe what you need',
    desc: 'Type your task in plain English. No technical jargon required — just tell us what you want to build or create.',
  },
  {
    num: '02',
    icon: <Zap className="w-6 h-6 text-purple-600" />,
    title: 'AI builds it autonomously',
    desc: 'Our agent picks the best model, executes the task, and self-corrects errors — all without you lifting a finger.',
  },
  {
    num: '03',
    icon: <Sparkles className="w-6 h-6 text-green-600" />,
    title: 'Get results instantly',
    desc: 'Download code, read reports, preview images, or play audio. All results are yours to use.',
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
    color: 'border-slate-200',
    btn: 'bg-slate-900 hover:bg-slate-800 text-white',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 299,
    credits: 1000,
    popular: false,
    desc: 'For individuals',
    color: 'border-slate-200',
    btn: 'bg-slate-900 hover:bg-slate-800 text-white',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 699,
    credits: 3000,
    popular: true,
    desc: 'Best value',
    color: 'border-indigo-400',
    btn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white',
  },
  {
    id: 'business',
    name: 'Business',
    price: 1499,
    credits: 8000,
    popular: false,
    desc: 'For teams',
    color: 'border-slate-200',
    btn: 'bg-slate-900 hover:bg-slate-800 text-white',
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
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-slate-400 font-mono">Task #1024</span>
      </div>
      <div className="bg-indigo-50 rounded-xl p-3 mb-3 border border-indigo-100">
        <p className="text-sm text-indigo-800 font-medium">
          "Build a full-stack todo app with auth and PostgreSQL"
        </p>
      </div>
      <div className="space-y-2">
        {['Analyzing task…', 'Scaffolding Next.js project…', 'Writing API routes…', 'Done! 47 files created'].map(
          (step, i) => (
            <div key={i} className="flex items-center gap-2">
              {i < 3 ? (
                <div
                  className={`w-4 h-4 rounded-full border-2 ${i < 2 ? 'border-indigo-500 bg-indigo-500' : 'border-indigo-300 bg-white'} flex items-center justify-center`}
                >
                  {i < 2 && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <span className={`text-xs ${i === 3 ? 'text-green-600 font-semibold' : i === 2 ? 'text-slate-500' : 'text-slate-400 line-through'}`}>
                {step}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">Credits used</span>
        <span className="text-xs font-bold text-indigo-600">42 / ~50 estimated</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-slate-800 text-lg">arrivarangam</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#how" className="hover:text-indigo-600 transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="#why" className="hover:text-indigo-600 transition-colors">Why us</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 30%, #e0e7ff 60%, #dbeafe 100%)',
        }}
      >
        {/* Animated blobs */}
        <div
          className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #c4b5fd 0%, #a5b4fc 100%)',
            filter: 'blur(80px)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #93c5fd 0%, #6ee7b7 100%)',
            filter: 'blur(80px)',
            animation: 'float 10s ease-in-out infinite',
            animationDelay: '3s',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-indigo-200 rounded-full px-4 py-1.5 text-sm text-indigo-700 font-medium mb-6 shadow-sm"
            >
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              New users get 100 free credits
            </motion.div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.1}
              className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6"
            >
              Build anything{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #6366f1, #7c3aed, #2563eb)',
                }}
              >
                with AI.
              </span>
              <br />
              Autonomously.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.2}
              className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed"
            >
              One platform for code, research, images and voice. Our AI agents pick the best
              model for your task and deliver results — no subscriptions, pay only per credit.
              <strong className="text-slate-800"> 20-70x cheaper</strong> than Lovable or Bolt.
            </motion.p>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.3}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
              >
                Start Building Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 bg-white/80 hover:bg-white text-slate-700 font-semibold px-6 py-3 rounded-xl border border-slate-200 transition-all duration-200"
              >
                <Play className="w-4 h-4 text-indigo-500" />
                See it in action
              </Link>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.4}
              className="mt-8 flex items-center gap-6 text-sm text-slate-500"
            >
              {['No subscription', 'Pay per use', '4 AI models'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Preview */}
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
      <section id="categories" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Everything you need, one platform</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
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
                className={`${cat.bg} ${cat.border} border rounded-2xl p-6 cursor-pointer group`}
              >
                <div className={`${cat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                  <span className={cat.iconColor}>{cat.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{cat.label}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{cat.desc}</p>
                <div className={`${cat.tag} text-xs font-medium px-2.5 py-1 rounded-full inline-block`}>
                  Try: "{cat.example}"
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how"
        className="py-24"
        style={{ background: 'linear-gradient(180deg, #f8faff 0%, #ffffff 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">From idea to results in seconds</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">No setup. No configuration. Just describe what you want.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-green-200" />
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
                  <div className="relative w-16 h-16 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm mb-6 z-10">
                    {step.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed max-w-xs">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Pay once, use when you want</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              No monthly subscriptions. Buy credits, use them at your own pace. Credits never expire.
            </p>
          </motion.div>

          {/* Free credits banner */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-6 py-3 mb-12 max-w-lg mx-auto"
          >
            <Sparkles className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-semibold">New users get 100 free credits — no card required</span>
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
                className={`relative bg-white rounded-2xl border-2 ${pack.color} p-6 ${pack.popular ? 'shadow-xl shadow-indigo-100' : 'shadow-sm'}`}
              >
                {pack.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{pack.desc}</p>
                  <h3 className="text-2xl font-extrabold text-slate-800">{pack.name}</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">₹{pack.price}</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    <span className="font-bold text-slate-700">{pack.credits.toLocaleString()}</span> credits
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ≈ ₹{(pack.price / pack.credits).toFixed(2)} per credit
                  </p>
                </div>
                <Link
                  href="/signup"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${pack.btn}`}
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
            className="text-center text-sm text-slate-400 mt-8"
          >
            7-day refund on unused credit packs · Credits do not expire · No hidden fees
          </motion.p>
        </div>
      </section>

      {/* ── Why Arivarangam ── */}
      <section
        id="why"
        className="py-24"
        style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #f0f4ff 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">Why us</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              20–70x cheaper than the rest
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              We built on top of the best models at cost, pass the savings to you.
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
            <table className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Platform', '₹699 buys…', 'Credits', 'Verdict'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COMPETITORS.map((c) => (
                  <tr
                    key={c.name}
                    className={c.highlight ? 'bg-indigo-50' : 'bg-white'}
                  >
                    <td className={`px-5 py-4 font-semibold ${c.highlight ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {c.name}
                      {c.highlight && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{c.price}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{c.credits}</td>
                    <td className={`px-5 py-4 text-sm font-semibold ${c.highlight ? 'text-green-600' : 'text-red-500'}`}>
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
                className="text-center bg-white rounded-2xl border border-indigo-100 shadow-sm p-6"
              >
                <div className="text-4xl font-black bg-clip-text text-transparent mb-2"
                  style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                  {s.stat}
                </div>
                <div className="font-bold text-slate-800 text-lg">{s.label}</div>
                <div className="text-sm text-slate-500 mt-1">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto px-4 text-center"
        >
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Ready to build with AI?
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Start with 100 free credits. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:text-indigo-800 font-bold px-8 py-3.5 rounded-xl text-lg transition-all duration-200 hover:shadow-xl"
          >
            Start Building Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-slate-700">arrivarangam</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</Link>
              <Link href="/login" className="hover:text-slate-700 transition-colors">Sign in</Link>
            </div>
            <p className="text-sm text-slate-400">© 2025 Arrivarangam. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
