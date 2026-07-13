import { useRef, useEffect, useState } from 'react'
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
  Package,
  Users,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourPackage {
  id: string
  name: string
  destination: string
  duration_days: number
  price: number
  currency: string
  description: string
  cover_image_url?: string
  status: string
  created_at: string
}

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
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10"
          style={{ background: 'hsl(222 47% 8%)' }}
        />

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
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              <Plane className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Trip progress bar */}
          <div
            className="h-1.5 rounded-full mb-1"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
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
            { label: 'Flights', value: '2', icon: Plane, color: '#4f46e5' },
            { label: 'Hotels', value: '3', icon: MapPin, color: '#7c3aed' },
            { label: 'Budget', value: '$840', icon: DollarSign, color: '#8b5cf6' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-2 flex flex-col gap-0.5"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
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
            { time: '10:00', title: 'Senso-ji Temple', done: true, color: '#7c3aed' },
            { time: '13:00', title: 'Ramen Lunch', done: true, color: '#7c3aed' },
            { time: '16:00', title: 'Shibuya Crossing', done: false, color: '#4f46e5' },
            { time: '19:00', title: 'Dinner Reservation', done: false, color: '#8b5cf6' },
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
                style={{
                  background: item.done ? item.color : 'rgba(255,255,255,0.15)',
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-[10px] font-medium truncate',
                    item.done ? 'text-white/40 line-through' : 'text-white/80',
                  )}
                >
                  {item.title}
                </p>
                <p className="text-[8px] text-white/30">{item.time}</p>
              </div>
              {item.done && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: item.color, opacity: 0.7 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Map thumbnail */}
        <div
          className="mx-4 rounded-xl h-16 flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'rgba(79,70,229,0.12)',
            border: '1px solid rgba(79,70,229,0.2)',
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 60%, #4f46e5 1px, transparent 1px), radial-gradient(circle at 70% 30%, #7c3aed 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <Map className="w-5 h-5 text-violet-400 mr-2" />
          <span className="text-[10px] text-violet-400 font-medium">Map Explorer</span>
          <motion.div
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: '#7c3aed',
              top: '40%',
              left: '35%',
              boxShadow: '0 0 6px #7c3aed',
            }}
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Side buttons */}
      <div
        className="absolute right-0 top-28 w-1 h-10 rounded-l-sm"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      />
      <div
        className="absolute left-0 top-24 w-1 h-7 rounded-r-sm"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      />
      <div
        className="absolute left-0 top-36 w-1 h-7 rounded-r-sm"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      />
    </div>
  )
}

// ─── Floating feature cards ───────────────────────────────────────────────────

const heroFloatingCards = [
  { icon: CalendarDays, label: 'Day-by-day Itinerary', color: '#7c3aed', delay: 0 },
  { icon: DollarSign, label: 'Multi-currency Expenses', color: '#4f46e5', delay: 0.4 },
  { icon: Map, label: 'Interactive Map', color: '#8b5cf6', delay: 0.8 },
  { icon: Plane, label: 'Flight Tracking', color: '#6d28d9', delay: 1.2 },
]

function FloatingFeatureCards() {
  return (
    <div className="relative flex flex-col gap-3">
      {heroFloatingCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 + card.delay, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, i % 2 === 0 ? -6 : 6, 0] }}
            transition={{
              duration: 3.5 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: card.delay,
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 24px ${card.color}20`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${card.color}25`, border: `1px solid ${card.color}40` }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <span className="text-sm font-medium text-white/80">{card.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Features data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: CalendarDays,
    title: 'Day-by-day Itinerary',
    description: 'Build your perfect schedule with timed activities, notes, and real-time done tracking.',
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    icon: Plane,
    title: 'Flights, Hotels & Transport',
    description: 'All your bookings in one place — gate changes, check-in times, ferry legs, local transport.',
    gradient: 'from-indigo-500 to-blue-400',
  },
  {
    icon: DollarSign,
    title: 'Multi-currency Expenses',
    description: 'Log spending in any currency with live FX rates and automatic budget tracking.',
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    icon: Map,
    title: 'Interactive Map Explorer',
    description: 'Discover restaurants, landmarks & hidden gems near you with live POI search and walking nav.',
    gradient: 'from-sky-500 to-cyan-400',
  },
  {
    icon: Shield,
    title: 'Smart Packing Checklist',
    description: 'Never forget essentials again. Customisable lists that sync across all your devices.',
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    icon: Globe,
    title: 'Works Offline',
    description: 'Full PWA — maps, itinerary, and essentials work even without an internet connection.',
    gradient: 'from-pink-500 to-rose-400',
  },
]

// ─── Tour Package Card ────────────────────────────────────────────────────────

function TourPackageCard({
  pkg,
  onBook,
}: {
  pkg: TourPackage
  onBook: () => void
}) {
  const nights = pkg.duration_days > 1 ? `${pkg.duration_days}D/${pkg.duration_days - 1}N` : '1 Day'

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Cover */}
      <div
        className="h-40 relative flex-shrink-0"
        style={{
          background: pkg.cover_image_url
            ? undefined
            : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        }}
      >
        {pkg.cover_image_url ? (
          <img
            src={pkg.cover_image_url}
            alt={pkg.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute top-3 right-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}
          >
            {nights}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-2 mb-1">
          <MapPin className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-violet-600 font-medium">{pkg.destination}</span>
        </div>
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-1">
          {pkg.name}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1 mb-4">
          {pkg.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-xs text-gray-400">from</span>
            <p className="text-lg font-extrabold text-gray-900 tabular-nums leading-tight">
              {pkg.currency ?? 'PHP'}{' '}
              {Number(pkg.price).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onBook}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 2px 12px rgba(79,70,229,0.35)',
            }}
          >
            Book Now
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const toursRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  const [packages, setPackages] = useState<TourPackage[]>([])
  const [pkgLoading, setPkgLoading] = useState(true)

  useEffect(() => {
    async function fetchPackages() {
      try {
        const { data, error } = await supabase
          .from('tour_packages')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(6)

        if (error) {
          // Treat all errors as empty — packages are optional landing content
          setPackages([])
        } else {
          setPackages(data ?? [])
        }
      } catch {
        setPackages([])
      } finally {
        setPkgLoading(false)
      }
    }

    fetchPackages()
  }, [])

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleBookNow = () => {
    navigate('/login', { state: { redirect: '/tours' } })
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#f9fafb' }}>

      {/* ── Sticky header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
        style={{
          background: 'rgba(15,10,40,0.82)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            <Plane className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Travelfy</span>
        </motion.div>

        {/* Nav — desktop */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:flex items-center gap-7 text-sm text-white/55"
        >
          <button
            onClick={() => scrollTo(featuresRef)}
            className="hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo(toursRef)}
            className="hover:text-white transition-colors"
          >
            Tour Packages
          </button>
          <a href="#operators" className="hover:text-white transition-colors">
            For Operators
          </a>
        </motion.nav>

        {/* Auth buttons */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: '0 2px 12px rgba(79,70,229,0.4)',
            }}
          >
            Get Started
          </button>
        </motion.div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 60%, #4c1d95 100%)',
        }}
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-5 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-20">
          {/* Text block */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{
                background: 'rgba(124,58,237,0.2)',
                border: '1px solid rgba(124,58,237,0.45)',
                color: '#c4b5fd',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Your complete travel companion & tour booking platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight mb-5 text-white"
            >
              Plan smarter.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Travel better.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-base sm:text-lg text-white/55 leading-relaxed mb-10"
            >
              Travelfy is your all-in-one trip command center — itineraries, bookings,
              expenses, maps, and tour packages. Built for Filipino travelers.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <button
                onClick={() => navigate('/login')}
                className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 24px rgba(79,70,229,0.5)',
                }}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => scrollTo(toursRef)}
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-base text-white/70 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200"
              >
                <ChevronDown className="w-4 h-4" />
                Browse Tours
              </button>
            </motion.div>
          </div>

          {/* Right column — phone + floating cards */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex-shrink-0"
            >
              <PhoneMockup />
            </motion.div>

            <div className="hidden lg:block">
              <FloatingFeatureCards />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }}
        />
      </section>

      {/* ── Features row ── */}
      <section ref={featuresRef} className="py-20 max-w-6xl mx-auto px-5">
        <AnimatedSection>
          <div className="text-center mb-14">
            <motion.p
              variants={fadeIn}
              custom={0}
              className="text-sm font-semibold uppercase tracking-widest mb-3 text-violet-600"
            >
              Everything you need
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900"
            >
              Built for the way you travel
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-gray-500 text-base max-w-xl mx-auto">
              Six powerful tools — one beautiful app, crafted for modern travelers who want
              control without the chaos.
            </motion.p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <AnimatedSection key={f.title}>
              <motion.div
                variants={fadeUp}
                custom={i % 3}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group p-5 rounded-2xl h-full cursor-default transition-all duration-200"
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(124,58,237,0.35)'
                  el.style.boxShadow = '0 4px 20px rgba(124,58,237,0.1)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = '#e5e7eb'
                  el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br',
                    f.gradient,
                  )}
                >
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── For Operators ── */}
      <section
        id="operators"
        className="py-20 px-5"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)' }}
      >
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-300 mb-3">
                For travel professionals
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Are you a travel operator?
              </h2>
              <p className="text-white/55 text-base max-w-xl mx-auto">
                Grow your business on Travelfy. List your packages, manage bookings, and reach
                thousands of Filipino travelers.
              </p>
            </motion.div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: Package,
                title: 'Create Tour Packages',
                body: 'List day trips, island hops, multi-day adventures and more. Set prices in PHP or any currency.',
                color: '#a78bfa',
              },
              {
                icon: Users,
                title: 'Manage Bookings',
                body: 'See incoming requests, confirm reservations, and message guests — all in one dashboard.',
                color: '#c084fc',
              },
              {
                icon: TrendingUp,
                title: 'Grow Your Business',
                body: 'Reach travelers who are already planning their trips. Zero commission to start.',
                color: '#818cf8',
              },
            ].map((item, i) => (
              <AnimatedSection key={item.title}>
                <motion.div
                  variants={fadeUp}
                  custom={i}
                  className="p-5 rounded-2xl h-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${item.color}20`, border: `1px solid ${item.color}35` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{item.body}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center">
            <motion.button
              variants={fadeUp}
              custom={0}
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
              }}
            >
              Register as Operator
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Live Tour Packages ── */}
      <section ref={toursRef} id="tours" className="py-20 px-5 max-w-6xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-12">
            <motion.p
              variants={fadeIn}
              custom={0}
              className="text-sm font-semibold uppercase tracking-widest mb-3 text-violet-600"
            >
              Live packages
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4"
            >
              Browse Tour Packages
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-gray-500 text-base max-w-xl mx-auto">
              Curated experiences from verified Filipino travel operators. No login needed to browse.
            </motion.p>
          </div>
        </AnimatedSection>

        {/* Loading */}
        {pkgLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading packages…</span>
          </div>
        )}

        {/* Empty state */}
        {!pkgLoading && packages.length === 0 && (
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              custom={0}
              className="text-center py-20 rounded-2xl"
              style={{ background: '#fff', border: '1px solid #e5e7eb' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Coming soon</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Operators are adding packages right now. Check back soon or{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-violet-600 font-medium hover:underline"
                >
                  register as an operator
                </button>{' '}
                to list yours first.
              </p>
            </motion.div>
          </AnimatedSection>
        )}

        {/* Package grid */}
        {!pkgLoading && packages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg, i) => (
              <AnimatedSection key={pkg.id}>
                <motion.div variants={fadeUp} custom={i % 3} className="h-full">
                  <TourPackageCard pkg={pkg} onBook={handleBookNow} />
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        )}

        {/* View all CTA */}
        {!pkgLoading && packages.length > 0 && (
          <AnimatedSection className="mt-10 text-center">
            <motion.button
              variants={fadeUp}
              custom={0}
              onClick={() => navigate('/login', { state: { redirect: '/tours' } })}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 2px 16px rgba(79,70,229,0.35)',
              }}
            >
              View All Packages
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </AnimatedSection>
        )}
      </section>

      {/* ── Final CTA ── */}
      <section
        className="py-24 px-5"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)' }}
      >
        <AnimatedSection>
          <motion.div
            variants={fadeUp}
            custom={0}
            className="max-w-2xl mx-auto text-center rounded-3xl p-10 sm:p-14 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.3) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <Plane className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Ready for your next adventure?
              </h2>
              <p className="text-white/50 text-base mb-10 max-w-md mx-auto">
                Join Filipino travelers who plan smarter with Travelfy. Free to start, no credit
                card needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 32px rgba(79,70,229,0.5)',
                  }}
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-medium text-base text-white/70 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10 px-5"
        style={{ background: '#0f0a28', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              <Plane className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">Travelfy</span>
          </div>

          <p className="text-xs text-white/30 text-center">
            Travelfy &copy; 2026 &middot; Built for Filipino travelers
          </p>

          <div className="flex items-center gap-5 text-sm text-white/40">
            <button
              onClick={() => navigate('/login')}
              className="hover:text-white/70 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hover:text-white/70 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
