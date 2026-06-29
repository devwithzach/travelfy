import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Map,
  CalendarDays,
  Plane,
  DollarSign,
  Camera,
  Wifi,
  MapPin,
  Star,
  Globe,
  Shield,
  ChevronDown,
  ArrowRight,
  Compass,
  Clock,
  CreditCard,
  FileText,
} from 'lucide-react'

// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.7, delay: i * 0.1, ease: 'easeOut' },
  }),
}

function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 260, height: 520 }}>
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[40px] border-2 overflow-hidden shadow-2xl"
        style={{
          background: 'hsl(222 47% 8%)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 rgba(255,255,255,0.15) inset',
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10" style={{ background: 'hsl(222 47% 8%)' }} />

        {/* Status bar */}
        <div className="pt-8 px-4 pb-1 flex justify-between items-center">
          <span className="text-[10px] text-white/50 font-medium">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-1.5 rounded-sm bg-white/40" />
            <div className="w-1 h-1 rounded-full bg-white/40" />
          </div>
        </div>

        {/* Dashboard header */}
        <div className="px-4 pb-2">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[10px] text-white/40">Current Trip</p>
              <p className="text-sm font-bold text-white">Tokyo Adventure</p>
            </div>
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
            >
              <Plane className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Trip progress bar */}
          <div className="h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #2563EB, #38BDF8)' }}
              initial={{ width: 0 }}
              animate={{ width: '62%' }}
              transition={{ duration: 1.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="text-[9px] text-white/30">Day 4 of 7 · Ends Mar 15</p>
        </div>

        {/* Quick stats row */}
        <div className="px-4 mb-3 grid grid-cols-3 gap-1.5">
          {[
            { label: 'Flights', value: '2', icon: Plane, color: '#2563EB' },
            { label: 'Hotels', value: '3', icon: MapPin, color: '#0ea5e9' },
            { label: 'Budget', value: '$840', icon: DollarSign, color: '#6366f1' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-2 flex flex-col gap-0.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Icon className="w-3 h-3" style={{ color }} />
              <p className="text-[11px] font-bold text-white">{value}</p>
              <p className="text-[8px] text-white/40">{label}</p>
            </div>
          ))}
        </div>

        {/* Timeline preview */}
        <div className="px-4 mb-2">
          <p className="text-[9px] text-white/40 mb-2 uppercase tracking-wider">Today's Plan</p>
          {[
            { time: '10:00', title: 'Senso-ji Temple', done: true, color: '#38BDF8' },
            { time: '13:00', title: 'Ramen Lunch', done: true, color: '#38BDF8' },
            { time: '16:00', title: 'Shibuya Crossing', done: false, color: '#2563EB' },
            { time: '19:00', title: 'Dinner Reservation', done: false, color: '#6366f1' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.15, duration: 0.4 }}
              className="flex items-center gap-2 py-1.5 border-b last:border-b-0"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="w-1 h-5 rounded-full flex-shrink-0"
                style={{ background: item.done ? item.color : 'rgba(255,255,255,0.15)' }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium truncate ${item.done ? 'text-white/40 line-through' : 'text-white/80'}`}>
                  {item.title}
                </p>
                <p className="text-[8px] text-white/30">{item.time}</p>
              </div>
              {item.done && (
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color, opacity: 0.7 }} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Map thumbnail */}
        <div
          className="mx-4 rounded-xl h-16 flex items-center justify-center relative overflow-hidden"
          style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)' }}
        >
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 60%, #2563EB 1px, transparent 1px), radial-gradient(circle at 70% 30%, #38BDF8 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <Map className="w-5 h-5 text-blue-400 mr-2" />
          <span className="text-[10px] text-blue-400 font-medium">Map Explorer</span>
          <motion.div
            className="absolute w-2 h-2 rounded-full"
            style={{ background: '#38BDF8', top: '40%', left: '35%', boxShadow: '0 0 6px #38BDF8' }}
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute right-0 top-28 w-1 h-10 rounded-l-sm" style={{ background: 'rgba(255,255,255,0.12)' }} />
      <div className="absolute left-0 top-24 w-1 h-7 rounded-r-sm" style={{ background: 'rgba(255,255,255,0.12)' }} />
      <div className="absolute left-0 top-36 w-1 h-7 rounded-r-sm" style={{ background: 'rgba(255,255,255,0.12)' }} />
    </div>
  )
}

// ─── Feature cards data ───────────────────────────────────────────────────────

const features = [
  {
    icon: Map,
    title: 'Map Explorer',
    description: 'Discover restaurants, attractions & shops near you with live POI search.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    icon: CalendarDays,
    title: 'Trip Timeline',
    description: 'Day-by-day itinerary with drag-and-drop scheduling and real-time updates.',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    icon: Plane,
    title: 'Flights & Hotels',
    description: 'All your bookings centralised — gate changes, check-in times & more.',
    gradient: 'from-sky-500 to-blue-400',
  },
  {
    icon: CreditCard,
    title: 'Expense Tracker',
    description: 'Log spending in any currency with automatic conversion and budget alerts.',
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    icon: Camera,
    title: 'Trip Photos',
    description: 'GPS-tagged memories automatically organised by day and location.',
    gradient: 'from-pink-500 to-rose-400',
  },
  {
    icon: Wifi,
    title: 'Works Offline',
    description: 'Full PWA — everything you need works without an internet connection.',
    gradient: 'from-orange-500 to-amber-400',
  },
]

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = [
  { value: '10,000+', label: 'Trips planned' },
  { value: '50+', label: 'Countries covered' },
  { value: '6', label: 'Core tools in one app' },
  { value: '100%', label: 'Free to get started' },
]

// ─── Spotlight data ───────────────────────────────────────────────────────────

const spotlights = [
  {
    icon: Compass,
    tag: 'Map Explorer',
    headline: 'Find the best spots around you, instantly',
    body: 'Search for restaurants, landmarks, hotels, and hidden gems. Filter by category, see ratings, and add directly to your itinerary — all without leaving the app.',
    visual: <MapMockVisual />,
  },
  {
    icon: Clock,
    tag: 'Timeline',
    headline: 'Every day of your trip, perfectly organised',
    body: 'Build a day-by-day schedule with times, notes, and locations. See what\'s next at a glance, mark activities done, and never miss a reservation.',
    visual: <TimelineMockVisual />,
  },
]

function MapMockVisual() {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'hsl(222 47% 10%)',
        border: '1px solid rgba(255,255,255,0.08)',
        height: 280,
      }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Animated pings */}
      {[
        { top: '30%', left: '45%', color: '#2563EB', delay: 0 },
        { top: '55%', left: '30%', color: '#38BDF8', delay: 0.5 },
        { top: '45%', left: '65%', color: '#6366f1', delay: 1 },
        { top: '70%', left: '55%', color: '#38BDF8', delay: 0.25 },
      ].map((p, i) => (
        <div key={i} className="absolute" style={{ top: p.top, left: p.left }}>
          <motion.div
            className="w-4 h-4 rounded-full"
            style={{ background: p.color, opacity: 0.3 }}
            animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: p.delay }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
          />
        </div>
      ))}
      {/* POI result cards */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        {[
          { name: 'Ichiran Ramen', cat: 'Restaurant', rating: '4.8', dist: '120m' },
          { name: 'Senso-ji Temple', cat: 'Landmark', rating: '4.9', dist: '340m' },
        ].map((poi) => (
          <div
            key={poi.name}
            className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
          >
            <div>
              <p className="text-xs font-semibold text-white">{poi.name}</p>
              <p className="text-[10px] text-white/40">{poi.cat} · {poi.dist}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs text-white/70">{poi.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineMockVisual() {
  const days = [
    {
      day: 'Day 3 — Tue, Mar 12',
      items: [
        { time: '09:00', title: 'Meiji Shrine', color: '#2563EB', done: true },
        { time: '12:30', title: 'Harajuku Lunch', color: '#38BDF8', done: true },
        { time: '15:00', title: 'Shibuya Crossing', color: '#6366f1', done: false },
        { time: '20:00', title: 'Dinner at Nobu', color: '#0ea5e9', done: false },
      ],
    },
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden p-4 space-y-3"
      style={{
        background: 'hsl(222 47% 10%)',
        border: '1px solid rgba(255,255,255,0.08)',
        minHeight: 280,
      }}
    >
      {days.map((day) => (
        <div key={day.day}>
          <p className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">{day.day}</p>
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute left-1.5 top-2 bottom-2 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="space-y-4">
              {day.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3"
                >
                  {/* Dot */}
                  <div
                    className="absolute left-0 w-3 h-3 rounded-full border-2 mt-0.5"
                    style={{
                      background: item.done ? item.color : 'hsl(222 47% 10%)',
                      borderColor: item.done ? item.color : 'rgba(255,255,255,0.2)',
                      boxShadow: item.done ? `0 0 8px ${item.color}60` : 'none',
                    }}
                  />
                  <div
                    className="flex-1 p-3 rounded-xl"
                    style={{
                      background: item.done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${item.done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <p
                        className={`text-sm font-medium ${item.done ? 'text-white/30 line-through' : 'text-white'}`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-white/30 ml-2 flex-shrink-0">{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Floating icons ───────────────────────────────────────────────────────────

function FloatingIcon({
  icon: Icon,
  style,
  delay = 0,
  color = '#2563EB',
}: {
  icon: React.ElementType
  style: React.CSSProperties
  delay?: number
  color?: string
}) {
  return (
    <motion.div
      className="absolute rounded-2xl flex items-center justify-center"
      style={{
        ...style,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(8px)',
      }}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <Icon style={{ color, width: '55%', height: '55%' }} />
    </motion.div>
  )
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const featuresRef = useRef<HTMLDivElement>(null)

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: 'hsl(222 47% 8%)' }}
    >
      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(10,15,30,0.7)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
          >
            <Plane className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Travelfy</span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:flex items-center gap-8 text-sm text-white/60"
        >
          <button onClick={scrollToFeatures} className="hover:text-white transition-colors">Features</button>
          <a href="#spotlight" className="hover:text-white transition-colors">How it works</a>
          <a href="#cta" className="hover:text-white transition-colors">Get started</a>
        </motion.nav>

        <motion.button
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-white/15 text-white/80 hover:border-white/30 hover:text-white transition-all"
        >
          Login
        </motion.button>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.25) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, hsl(222 47% 8%))',
          }}
        />

        {/* Floating icons — desktop only */}
        <div className="hidden lg:block">
          <FloatingIcon icon={Plane} style={{ top: '22%', left: '10%', width: 52, height: 52 }} delay={0} color="#2563EB" />
          <FloatingIcon icon={MapPin} style={{ top: '60%', left: '8%', width: 44, height: 44 }} delay={1} color="#38BDF8" />
          <FloatingIcon icon={Camera} style={{ top: '30%', right: '9%', width: 48, height: 48 }} delay={0.5} color="#6366f1" />
          <FloatingIcon icon={Globe} style={{ top: '65%', right: '11%', width: 52, height: 52 }} delay={1.5} color="#0ea5e9" />
          <FloatingIcon icon={Star} style={{ top: '15%', right: '22%', width: 38, height: 38 }} delay={0.8} color="#f59e0b" />
          <FloatingIcon icon={Shield} style={{ top: '75%', left: '20%', width: 40, height: 40 }} delay={1.2} color="#10b981" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 py-20">
          {/* Text block */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{
                background: 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(37,99,235,0.35)',
                color: '#93c5fd',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Your all-in-one travel companion
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6"
            >
              Your complete{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                travel
              </span>{' '}
              companion
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-lg text-white/55 leading-relaxed mb-10"
            >
              Plan, explore, and remember every moment of your journey. Maps, timelines, bookings,
              expenses and more — all in one beautiful app.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <button
                onClick={() => navigate('/login')}
                className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                  boxShadow: '0 4px 24px rgba(37,99,235,0.45)',
                }}
              >
                Start Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={scrollToFeatures}
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-base text-white/70 border border-white/12 hover:border-white/25 hover:text-white transition-all duration-200"
              >
                <ChevronDown className="w-4 h-4" />
                See how it works
              </button>
            </motion.div>
          </div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-shrink-0"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <AnimatedSection>
        <section className="py-12 border-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <p
                  className="text-3xl font-extrabold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {s.value}
                </p>
                <p className="text-sm text-white/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* ── Features grid ── */}
      <section ref={featuresRef} className="py-24 max-w-6xl mx-auto px-6">
        <AnimatedSection>
          <div className="text-center mb-16">
            <motion.p
              variants={fadeIn}
              custom={0}
              className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: '#60a5fa' }}
            >
              Everything you need
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5"
            >
              Built for the way you travel
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-white/45 text-lg max-w-xl mx-auto">
              Six powerful tools in one app, crafted for modern travellers who want control without the chaos.
            </motion.p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <AnimatedSection key={f.title}>
              <motion.div
                variants={fadeUp}
                custom={i % 3}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-6 rounded-2xl h-full cursor-default transition-colors duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,0.4)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(37,99,235,0.06)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${f.gradient}`}
                >
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.description}</p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── Feature spotlights ── */}
      <section id="spotlight" className="py-24 max-w-6xl mx-auto px-6 space-y-32">
        {spotlights.map((s, i) => (
          <AnimatedSection key={s.tag}>
            <div
              className={`flex flex-col gap-12 lg:gap-20 items-center ${
                i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              }`}
            >
              {/* Text */}
              <div className="flex-1 max-w-lg">
                <motion.div
                  variants={fadeIn}
                  custom={0}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
                  style={{
                    background: 'rgba(37,99,235,0.12)',
                    border: '1px solid rgba(37,99,235,0.25)',
                    color: '#93c5fd',
                  }}
                >
                  <s.icon className="w-3 h-3" />
                  {s.tag}
                </motion.div>
                <motion.h2
                  variants={fadeUp}
                  custom={1}
                  className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5 leading-tight"
                >
                  {s.headline}
                </motion.h2>
                <motion.p variants={fadeUp} custom={2} className="text-white/50 text-base leading-relaxed mb-8">
                  {s.body}
                </motion.p>
                <motion.button
                  variants={fadeUp}
                  custom={3}
                  onClick={() => navigate('/login')}
                  className="group flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: '#60a5fa' }}
                  whileHover={{ x: 4 }}
                >
                  Try it free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>

              {/* Visual */}
              <motion.div variants={fadeIn} custom={1} className="flex-1 w-full">
                {s.visual}
              </motion.div>
            </div>
          </AnimatedSection>
        ))}
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="py-32 px-6">
        <AnimatedSection>
          <motion.div
            variants={fadeUp}
            custom={0}
            className="max-w-2xl mx-auto text-center rounded-3xl p-12 relative overflow-hidden"
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            {/* Glow */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(37,99,235,0.25) 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10">
              <Plane
                className="mx-auto mb-6 w-10 h-10"
                style={{ color: '#60a5fa' }}
              />
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
                Start planning your{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  next trip
                </span>
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">
                Join thousands of travellers using Travelfy to explore the world smarter.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                  boxShadow: '0 4px 32px rgba(37,99,235,0.5)',
                }}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10 px-6 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
            >
              <Plane className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Travelfy</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/70 transition-colors">Contact</a>
          </div>

          <p className="text-xs text-white/25">© 2026 Travelfy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
