import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plane, Building2, Map, ListChecks, DollarSign,
  AlertCircle, Clock, CalendarDays, ChevronRight,
  TrendingUp, CheckSquare, FileText, Globe, Circle, Check, MapPin, Plus, Pencil,
  ArrowLeftRight, BookMarked, Users, Share2, Stamp, RefreshCw, Package, Calendar
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentPlace } from '@/hooks/useCurrentPlace'
import { countryFlag } from '@/components/map/geocode'
import { getDaysUntil, formatDate, formatShortDate, getTripProgress, getTripStatus, formatTime } from '@/utils/dateUtils'
import { sumExpenses, getRate } from '@/utils/currency'
import { findInProgressActivity, findNextUpcomingActivity, localDateStr, isActivityDone } from '@/utils/itinerary'
import { findNextFlight, deriveFlightStatus } from '@/utils/flight'
import { findActiveOrNextHotel } from '@/utils/hotel'
import QuickAddExpense from '@/components/common/QuickAddExpense'
import TripCard from '@/components/common/TripCard'
import ProfileSheet from '@/components/common/ProfileSheet'
import { computeExpiryAlerts } from '@/utils/expiry'
import { cn } from '@/utils/cn'
import type { TripData } from '@/types'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// Friendly first name. Priority:
//   1. The trip's "Traveler Name" setting (editable from Settings page)
//   2. Supabase user_metadata.full_name (settable via auth)
//   3. Best-effort parse of the email local-part
//   4. "Traveler"
function deriveName(
  travelerName: string | null | undefined,
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (travelerName?.trim()) return travelerName.trim().split(/\s+/)[0]
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0]
  if (!email) return 'Traveler'
  const local = email.split('@')[0]
  const first = local.replace(/\d+/g, '').split(/[._-]/)[0]
  if (!first) return 'Traveler'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

function timeGreeting(d: Date): string {
  const h = d.getHours()
  if (h < 5) return 'Good evening'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { trip, updateTrip, activeTripId, trips, selectTrip, refreshTrip } = useTrip()
  const { user } = useAuth()
  const place = useCurrentPlace()
  const navigate = useNavigate()
  const inLobby = !activeTripId

  // Tick once a minute so the "Now" card and elapsed states stay fresh.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const inProgress = findInProgressActivity(trip.itinerary, now)
  const nextUpcoming = inProgress ? null : findNextUpcomingActivity(trip.itinerary, now)

  const markActivityDone = (dayId: string, actId: string) => {
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d => d.id !== dayId ? d : {
        ...d,
        activities: d.activities.map(a => a.id !== actId ? a : { ...a, done: true }),
      }),
    }))
  }

  const { tripInfo, flights, hotels, checklist, expenses, settings } = trip
  const daysUntil = getDaysUntil(tripInfo.startDate)
  const tripStatus = getTripStatus(tripInfo.startDate, tripInfo.endDate)
  const progress = getTripProgress(tripInfo.startDate, tripInfo.endDate)

  const nextFlight = findNextFlight(flights, now)
  const nextFlightStatus = nextFlight ? deriveFlightStatus(nextFlight, now) : null
  const hotelStatus = findActiveOrNextHotel(hotels, now)
  const checkedCount = checklist.filter(c => c.checked).length
  const totalBudget = settings.totalBudget
  const { total: spentAmount } = sumExpenses(trip.currencyRates, expenses, settings.homeCurrency)
  const budgetUsed = totalBudget > 0 ? Math.min((spentAmount / totalBudget) * 100, 100) : 0

  // Today's spend, converted to home currency.
  const todayStr = localDateStr(now)
  const todayExpenses = expenses.filter(e => e.date === todayStr)
  const { total: todaySpent } = sumExpenses(trip.currencyRates, todayExpenses, settings.homeCurrency)

  // Passport/visa risk alerts — only relevant when a trip is loaded.
  const expiryAlerts = activeTripId ? computeExpiryAlerts(trip.passport, trip.visas, tripInfo, now) : []

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const [upcomingTour, setUpcomingTour] = useState<{
    id: string
    packageName: string
    destination: string
    durationDays: number
    price: number
    currency: string
    bookedAt: string
  } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('tour_bookings')
      .select('id, created_at, tour_packages(name, destination, duration_days, price, currency)')
      .eq('traveler_id', user.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const pkg = data.tour_packages as { name?: string; destination?: string; duration_days?: number; price?: number; currency?: string } | null
          setUpcomingTour({
            id: data.id,
            packageName: pkg?.name ?? 'Tour',
            destination: pkg?.destination ?? '',
            durationDays: pkg?.duration_days ?? 0,
            price: Number(pkg?.price ?? 0),
            currency: pkg?.currency ?? 'PHP',
            bookedAt: data.created_at,
          })
        }
      })
  }, [user?.id])

  const greeting = timeGreeting(now)
  const name = deriveName(
    settings.travelerName,
    (user?.user_metadata?.full_name as string | undefined) ?? null,
    user?.email,
  )

  // Profile sheet (avatar tap on greeting opens it).
  const [profileOpen, setProfileOpen] = useState(false)
  const avatarInitial = (name.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()
  // Name "source": did we get it from a real saved value (settings or auth metadata)
  // or did we fall back to email-parsing? When fallback, show a hint to set it.
  const hasRealName = !!(settings.travelerName?.trim()) || !!(user?.user_metadata?.full_name as string | undefined)?.trim()

  const quickActions = [
    { label: 'Flights', icon: Plane, to: '/flights', color: 'bg-blue-500' },
    { label: 'Hotels', icon: Building2, to: '/hotels', color: 'bg-violet-500' },
    { label: 'Timeline', icon: Map, to: '/timeline', color: 'bg-emerald-500' },
    { label: 'Checklist', icon: ListChecks, to: '/checklist', color: 'bg-amber-500' },
    { label: 'Expenses', icon: DollarSign, to: '/expenses', color: 'bg-rose-500' },
    { label: 'Emergency', icon: AlertCircle, to: '/emergency', color: 'bg-red-600' },
    { label: 'Documents', icon: FileText, to: '/documents', color: 'bg-cyan-500' },
    { label: 'Journal', icon: BookMarked, to: '/journal', color: 'bg-purple-500' },
    { label: 'Splitter', icon: Users, to: '/splitter', color: 'bg-sky-500' },
    { label: 'Visas', icon: Stamp, to: '/visa-tracker', color: 'bg-teal-500' },
    { label: 'Export', icon: Share2, to: '/export', color: 'bg-indigo-500' },
    { label: 'Passport', icon: Globe, to: '/passport', color: 'bg-green-600' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 pb-4 pt-[max(2.5rem,env(safe-area-inset-top))] space-y-3"
    >
      {/* Personalized greeting + current location + local time */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setProfileOpen(true)}
            aria-label="Edit profile"
            className="group flex items-center gap-3 min-w-0 flex-1 text-left active:scale-[0.98] transition-transform"
          >
            <div className="relative w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center text-white text-base font-bold shrink-0">
              {avatarInitial}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-background flex items-center justify-center">
                <span className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                  <Pencil className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{greeting}</p>
              <p className="text-2xl font-bold mt-0.5 truncate max-w-full leading-tight flex items-center gap-1.5">
                {name} 👋
              </p>
            </div>
          </button>
          <div className="text-right shrink-0" key={now.getTime()}>
            {/* Use a fresh Date for the display itself so callers that
                accidentally mutate the shared `now` (Date is a reference!)
                can't snap the clock. The interval-driven `now` state still
                triggers the re-render every 60s; `key` forces the subtree
                to remount, sidestepping any stale React reconciliation. */}
            <p className="text-2xl font-bold tabular-nums leading-none">
              {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        {/* Location row only renders once we have a result. While the
            geolocation + reverse-geocode is in flight we show nothing —
            the prior "Finding you…" / "Location unavailable" text felt
            noisy on every page load. Permission-denied / unsupported also
            stay silent (the user can re-enable in browser settings; no need
            to nag from here). */}
        {!place.loading && place.country && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-2 text-xs"
          >
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              <span className="text-muted-foreground">Currently in </span>
              {place.region && (
                <>
                  <span className="text-foreground font-medium">{place.region}</span>
                  <span className="text-muted-foreground">, </span>
                </>
              )}
              <span className="text-foreground font-semibold">{place.country}</span>
              {place.countryCode && (
                <span className="ml-1" aria-hidden>{countryFlag(place.countryCode)}</span>
              )}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* One-time prompt: greeting fell back to email-parsing because no real
          name is saved anywhere. Tap to open ProfileSheet and fix it. */}
      {!hasRealName && (
        <motion.button
          variants={itemVariants}
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30 text-left active:scale-[0.99] transition-all"
        >
          <Pencil className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Set your name</p>
            <p className="text-xs text-muted-foreground">
              We're calling you <span className="font-medium text-foreground">{name}</span> based on your email. Tap to fix.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
        </motion.button>
      )}

      {/* LOBBY MODE — no trip selected. Show only the picker, no trip-specific
          features. User must explicitly enter a trip from /trips before
          anything else is accessible (MainLayout redirects every other route). */}
      {inLobby && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Plane className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Pick a trip to start</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Tap a trip below to open its flights, hotels, timeline, photos, and everything else.
              </p>
              {trips.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">You don't have any trips yet.</p>
                  <Button onClick={() => navigate('/trips')} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Create your first trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trips.slice(0, 4).map(t => (
                    <TripCard
                      key={t.id}
                      trip={t}
                      compact
                      onSelect={() => {
                        selectTrip(t.id)
                        navigate('/')
                      }}
                    />
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => navigate('/trips')}
                    className="w-full mt-2 gap-1.5"
                  >
                    {trips.length > 4 ? `View all ${trips.length} trips` : 'Manage trips'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* IN-TRIP MODE — everything below requires an active trip. */}
      {!inLobby && (
      <>
      {/* Hero Card — entire card is tappable to switch trips */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate('/trips')}
          aria-label="Switch trip"
          className="w-full text-left relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-primary/20 active:scale-[0.99] transition-transform"
          style={tripInfo.coverImage
            ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%), url(${tripInfo.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined}
        >
          {/* Fallback gradient when no cover photo is set. */}
          {!tripInfo.coverImage && <div className="absolute inset-0 gradient-hero" />}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-8" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0 flex-1">
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                  {tripStatus === 'upcoming' ? 'Next Adventure' : tripStatus === 'active' ? 'Currently Traveling' : 'Trip Completed'}
                </p>
                <h2 className="text-2xl font-bold leading-tight truncate">{tripInfo.name}</h2>
                <p className="text-white/80 text-sm mt-1 truncate">{tripInfo.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {tripStatus === 'upcoming' ? 'Upcoming' : tripStatus === 'active' ? 'Live' : 'Done'}
                </Badge>
                <span className="text-[10px] text-white/60 flex items-center gap-1">
                  Switch <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-white/80 text-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{formatShortDate(tripInfo.startDate)} – {formatShortDate(tripInfo.endDate)}</span>
              </div>
            </div>

            {tripStatus === 'upcoming' && (
              <div className="glass rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs">Departing in</p>
                    <p className="text-3xl font-bold">
                      {daysUntil > 0 ? daysUntil : 0}
                      <span className="text-lg font-medium text-white/80 ml-1">
                        {daysUntil === 1 ? 'day' : 'days'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs mb-1">Departs</p>
                    <p className="text-white font-semibold text-sm">{formatDate(tripInfo.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            )}

            {tripStatus === 'active' && (
              <div className="glass rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-xs">Trip Progress</p>
                  <p className="text-white text-xs font-medium">{progress}%</p>
                </div>
                <Progress value={progress} className="h-2 bg-white/20 [&>div]:bg-white" />
              </div>
            )}
          </div>
        </button>
      </motion.div>

      {/* Expiry alerts — passport + visas tied to the active trip's end date */}
      {expiryAlerts.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-2">
          {expiryAlerts.map(a => (
            <button
              key={a.id}
              onClick={() => navigate(a.href)}
              className={
                'w-full text-left rounded-2xl p-3 flex items-start gap-3 transition-all active:scale-[0.99] ' +
                (a.severity === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 hover:bg-red-100/60 dark:hover:bg-red-900/30'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/30')
              }
            >
              <AlertCircle className={
                'h-5 w-5 shrink-0 mt-0.5 ' +
                (a.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')
              } />
              <div className="flex-1 min-w-0">
                <p className={
                  'text-sm font-bold ' +
                  (a.severity === 'critical' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')
                }>{a.title}</p>
                <p className={
                  'text-xs mt-0.5 ' +
                  (a.severity === 'critical' ? 'text-red-600/90 dark:text-red-400/90' : 'text-amber-700/80 dark:text-amber-400/80')
                }>{a.detail}</p>
              </div>
              <ChevronRight className={
                'h-4 w-4 shrink-0 mt-0.5 ' +
                (a.severity === 'critical' ? 'text-red-500' : 'text-amber-500')
              } />
            </button>
          ))}
        </motion.div>
      )}

      {/* Now / Next Activity */}
      {(inProgress || nextUpcoming) && (
        <motion.div variants={itemVariants}>
          {inProgress && (
            <Card
              className="ring-2 ring-primary/40 shadow-md cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => navigate('/timeline')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="h-2 w-2 fill-primary text-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Happening Now</span>
                  {inProgress.activity.time && (
                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                      {formatTime(inProgress.activity.time)}
                    </span>
                  )}
                </div>
                <p className="font-bold text-base leading-tight">{inProgress.activity.title}</p>
                {inProgress.activity.location && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {inProgress.activity.location}
                  </p>
                )}
                {inProgress.activity.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inProgress.activity.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={e => {
                      e.stopPropagation()
                      markActivityDone(inProgress.day.id, inProgress.activity.id)
                    }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Mark Done
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={e => { e.stopPropagation(); navigate('/timeline') }}>
                    View Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {nextUpcoming && (
            <Card
              className="cursor-pointer active:scale-[0.99] transition-transform hover:shadow-md"
              onClick={() => navigate('/timeline')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Up Next</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {nextUpcoming.day.date === localDateStr(now)
                      ? (nextUpcoming.activity.time ? formatTime(nextUpcoming.activity.time) : 'Today')
                      : formatShortDate(nextUpcoming.day.date)
                    }
                  </span>
                </div>
                <p className="font-semibold text-sm leading-tight">{nextUpcoming.activity.title}</p>
                {nextUpcoming.activity.location && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {nextUpcoming.activity.location}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Next Flight */}
      {nextFlight && (
        <motion.div variants={itemVariants}>
          <button onClick={() => navigate('/flights')} className="w-full text-left">
            <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold">
                      {nextFlightStatus === 'boarding' ? 'Boarding now'
                        : nextFlightStatus === 'departed' ? 'In flight'
                        : 'Next Flight'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-xs">{nextFlight.flightNumber}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{nextFlight.fromCode}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(nextFlight.departureTime)}</p>
                  </div>
                  <div className="flex-1 mx-3 flex flex-col items-center gap-1">
                    <div className="flex items-center w-full">
                      <div className="h-[2px] flex-1 bg-border" />
                      <Plane className="h-4 w-4 text-primary mx-1" />
                      <div className="h-[2px] flex-1 bg-border" />
                    </div>
                    <p className="text-xs text-muted-foreground">{nextFlight.airline}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{nextFlight.toCode}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(nextFlight.arrivalTime)}{nextFlight.arrivalDateOffset && <span className="text-primary ml-0.5">{nextFlight.arrivalDateOffset}</span>}</p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">{formatDate(nextFlight.departureDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        </motion.div>
      )}

      {/* Hotel check-in / check-out countdown */}
      {hotelStatus && (
        <motion.div variants={itemVariants}>
          <button onClick={() => navigate('/hotels')} className="w-full text-left">
            <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-sm font-semibold">
                      {hotelStatus.phase === 'staying' ? 'Currently staying' : 'Next hotel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-xs font-mono">{hotelStatus.hotel.checkIn} → {hotelStatus.hotel.checkOut}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="font-bold text-base leading-tight">{hotelStatus.hotel.name}</p>
                {hotelStatus.hotel.address && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {hotelStatus.hotel.address}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <div className={cn(
                    'flex-1 rounded-xl p-2.5 flex items-center gap-2',
                    hotelStatus.phase === 'staying'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
                  )}>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                        {hotelStatus.phase === 'staying' ? 'Check-out' : 'Check-in'}
                      </p>
                      <p className="text-sm font-bold leading-tight">{hotelStatus.label}</p>
                    </div>
                  </div>
                  {hotelStatus.hotel.phone && (
                    <a
                      href={`tel:${hotelStatus.hotel.phone.replace(/\s+/g, '')}`}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Call ${hotelStatus.hotel.name}`}
                      className="w-10 h-10 rounded-xl bg-muted hover:bg-accent flex items-center justify-center shrink-0"
                    >
                      <span className="text-lg" aria-hidden>📞</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        </motion.div>
      )}

      {/* Upcoming Tour */}
      {upcomingTour && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center">
                      <Package className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                      Confirmed Tour
                    </span>
                  </div>
                  <p className="font-bold text-base leading-snug truncate">{upcomingTour.packageName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{upcomingTour.destination}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {upcomingTour.durationDays} day{upcomingTour.durationDays !== 1 ? 's' : ''}
                    </span>
                    <span className="tabular-nums font-semibold text-foreground">
                      {upcomingTour.currency} {upcomingTour.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400"
                  onClick={() => navigate('/tours')}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Row — all 3 tiles share the same vertical structure + visual weight */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/expenses')}>
          <div className="text-2xl font-bold text-rose-600 leading-tight tabular-nums truncate">
            {todaySpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{settings.homeCurrency} · Today</div>
          <DollarSign className="h-4 w-4 text-rose-400 mx-auto mt-1" />
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/checklist')}>
          <div className="text-2xl font-bold text-primary leading-tight tabular-nums">{checkedCount}/{checklist.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Packed</div>
          <CheckSquare className="h-4 w-4 text-primary/40 mx-auto mt-1" />
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/expenses')}>
          <div className="text-2xl font-bold text-amber-600 leading-tight tabular-nums">{Math.round(budgetUsed)}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Budget</div>
          <TrendingUp className="h-4 w-4 text-amber-400 mx-auto mt-1" />
        </Card>
      </motion.div>

      {/* Budget Card */}
      {totalBudget > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/expenses')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-rose-600" />
                  Budget Tracker
                </span>
                <span className="text-xs text-muted-foreground">
                  {settings.homeCurrency} {spentAmount.toLocaleString()} / {totalBudget.toLocaleString()}
                </span>
              </div>
              <Progress value={budgetUsed} className={budgetUsed > 90 ? '[&>div]:bg-rose-500' : budgetUsed > 70 ? '[&>div]:bg-amber-500' : ''} />
              <p className="text-xs text-muted-foreground mt-1.5">
                {settings.homeCurrency} {(totalBudget - spentAmount).toLocaleString()} remaining
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Checklist Preview */}
      {checklist.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-amber-600" />
                  Packing Progress
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/checklist')}>
                  View all
                </Button>
              </div>
              <Progress value={checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {checkedCount} of {checklist.length} items packed
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Time Zone + Currency widgets */}
      {!inLobby && (
        <motion.div variants={itemVariants}>
          <TimeZoneCurrencyWidgets now={now} />
        </motion.div>
      )}

      {/* Quick Actions — wrapped in Card for consistency with other sections */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Quick Access</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map(({ label, icon: Icon, to, color }) => (
                <motion.button
                  key={to}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate(to)}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight text-center">{label}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Itinerary Preview */}
      <motion.div variants={itemVariants}>
        <TodayPreview now={now} updateTrip={updateTrip} onRefresh={refreshTrip} />
      </motion.div>

      {/* Tour Notes */}
      {trip.tourNotes.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold">Important Tour Notes</span>
              </div>
              <div className="space-y-2">
                {trip.tourNotes.slice(0, 4).map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
                {trip.tourNotes.length > 4 && (
                  <p className="text-xs text-primary">+{trip.tourNotes.length - 4} more notes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      </>
      )}

      {/* Quick-add FAB only makes sense when there's a trip to attach to. */}
      {!inLobby && (
        <>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick add expense"
            className="fixed bottom-24 right-4 z-[1700] w-14 h-14 rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/40 flex items-center justify-center active:shadow-lg"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </motion.button>
          <QuickAddExpense open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
        </>
      )}

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initialName={settings.travelerName}
      />
    </motion.div>
  )
}

const DEST_TIMEZONES: [string[], string][] = [
  [['japan', 'tokyo', 'osaka', 'kyoto', 'hiroshima'], 'Asia/Tokyo'],
  [['korea', 'seoul', 'busan'], 'Asia/Seoul'],
  [['thailand', 'bangkok', 'phuket', 'chiang mai', 'pattaya'], 'Asia/Bangkok'],
  [['hong kong', 'hk'], 'Asia/Hong_Kong'],
  [['singapore'], 'Asia/Singapore'],
  [['taiwan', 'taipei'], 'Asia/Taipei'],
  [['macau'], 'Asia/Macau'],
  [['vietnam', 'hanoi', 'ho chi minh', 'da nang', 'hoi an'], 'Asia/Ho_Chi_Minh'],
  [['indonesia', 'bali', 'jakarta', 'lombok', 'komodo'], 'Asia/Makassar'],
  [['malaysia', 'kuala lumpur', 'kl', 'penang', 'kota kinabalu'], 'Asia/Kuala_Lumpur'],
  [['cambodia', 'phnom penh', 'siem reap', 'angkor'], 'Asia/Phnom_Penh'],
  [['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen'], 'Asia/Shanghai'],
  [['maldives'], 'Indian/Maldives'],
  [['dubai', 'uae', 'abu dhabi'], 'Asia/Dubai'],
  [['france', 'paris'], 'Europe/Paris'],
  [['spain', 'madrid', 'barcelona'], 'Europe/Madrid'],
  [['italy', 'rome', 'milan', 'venice', 'florence'], 'Europe/Rome'],
  [['uk', 'london', 'england', 'britain'], 'Europe/London'],
  [['australia', 'sydney', 'melbourne', 'brisbane'], 'Australia/Sydney'],
  [['usa', 'new york', 'los angeles', 'chicago', 'miami'], 'America/New_York'],
  [['philippines', 'manila', 'cebu', 'davao', 'palawan', 'boracay', 'siargao', 'bohol', 'iloilo', 'baguio'], 'Asia/Manila'],
]

function getDestTimezone(destination: string): string | null {
  const lower = destination.toLowerCase()
  for (const [keywords, tz] of DEST_TIMEZONES) {
    if (keywords.some(k => lower.includes(k))) return tz
  }
  return null
}

const DEST_CURRENCIES: [string[], string][] = [
  [['japan', 'tokyo', 'osaka', 'kyoto'], 'JPY'],
  [['korea', 'seoul'], 'KRW'],
  [['thailand', 'bangkok', 'phuket'], 'THB'],
  [['hong kong', 'hk'], 'HKD'],
  [['singapore'], 'SGD'],
  [['taiwan', 'taipei'], 'TWD'],
  [['macau'], 'MOP'],
  [['vietnam', 'hanoi', 'ho chi minh'], 'VND'],
  [['indonesia', 'bali', 'jakarta'], 'IDR'],
  [['malaysia', 'kuala lumpur'], 'MYR'],
  [['cambodia', 'siem reap'], 'USD'],
  [['china', 'beijing', 'shanghai'], 'CNY'],
  [['maldives'], 'MVR'],
  [['dubai', 'uae', 'abu dhabi'], 'AED'],
  [['france', 'paris', 'spain', 'madrid', 'italy', 'rome', 'europe'], 'EUR'],
  [['uk', 'london'], 'GBP'],
  [['australia', 'sydney'], 'AUD'],
  [['usa', 'new york', 'los angeles'], 'USD'],
  [['philippines', 'manila', 'cebu', 'davao', 'palawan', 'boracay'], 'PHP'],
]

function getDestCurrency(destination: string): string | null {
  const lower = destination.toLowerCase()
  for (const [keywords, cur] of DEST_CURRENCIES) {
    if (keywords.some(k => lower.includes(k))) return cur
  }
  return null
}

function TimeZoneCurrencyWidgets({ now }: { now: Date }) {
  const { trip } = useTrip()
  const dest = trip.tripInfo.destination
  const home = trip.settings.homeCurrency
  const destTz = getDestTimezone(dest)
  const destCurrency = getDestCurrency(dest) ?? (trip.currencyRates[0]?.to ?? null)

  const [amount, setAmount] = useState('')

  const homeTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const homeTzName = Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' ').split('/').pop() ?? 'Home'

  const destTime = destTz
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: destTz })
    : null
  const destTzName = destTz ? destTz.split('/').pop()?.replace(/_/g, ' ') ?? dest : null

  const diffHours = destTz ? (() => {
    const home = new Date(now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
    const d = new Date(now.toLocaleString('en-US', { timeZone: destTz }))
    const diff = Math.round((d.getTime() - home.getTime()) / 3600000)
    return diff
  })() : null

  const rate = destCurrency && destCurrency !== home
    ? getRate(trip.currencyRates, home, destCurrency)
    : null
  const converted = rate && amount ? (parseFloat(amount) * rate).toFixed(2) : null

  if (!destTz && !rate) return null

  return (
    <div className="space-y-3">
      {/* Time Zone widget */}
      {destTz && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold">Time Zones</span>
              {diffHours !== null && diffHours !== 0 && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-auto',
                  Math.abs(diffHours) >= 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                )}>
                  {diffHours > 0 ? '+' : ''}{diffHours}h
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">🏠 Home</p>
                <p className="text-xl font-bold tabular-nums">{homeTime}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{homeTzName}</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">✈️ {dest.split(',')[0]}</p>
                <p className="text-xl font-bold tabular-nums text-primary">{destTime}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{destTzName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currency quick-calc */}
      {rate && destCurrency && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">Quick Convert</span>
              <span className="text-xs text-muted-foreground ml-auto">1 {home} = {rate.toFixed(4)} {destCurrency}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{home}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-muted text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{destCurrency}</span>
                <div className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {converted ?? '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TodayPreview({ now, updateTrip, onRefresh }: { now: Date; updateTrip: (u: (prev: TripData) => TripData) => void; onRefresh: () => Promise<void> }) {
  const { trip } = useTrip()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = async () => {
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  const toggleDone = (dayId: string, actId: string) => {
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d => d.id !== dayId ? d : {
        ...d,
        activities: d.activities.map(a => a.id !== actId ? a : { ...a, done: !a.done }),
      }),
    }))
  }

  // Local-timezone date string so we match Timeline's logic exactly.
  const today = localDateStr(now)
  const todayItinerary = trip.itinerary.find(d => d.date === today)

  if (!todayItinerary) return null

  // Sort by time so the chronological order is correct regardless of how the
  // rows came back from the DB.
  const sortedActivities = [...todayItinerary.activities].sort((a, b) => a.time.localeCompare(b.time))

  // Find the activity that's currently in progress (most-recently-started undone).
  // Used to highlight the row and to dim earlier ones automatically.
  const nowMs = now.getTime()
  let inProgressId: string | null = null
  for (const a of sortedActivities) {
    if (a.done) continue
    if (!a.time) { inProgressId = inProgressId ?? a.id; continue }
    const ts = new Date(`${today}T${a.time}`).getTime()
    if (!Number.isNaN(ts) && ts <= nowMs) inProgressId = a.id
  }

  const visible = sortedActivities.slice(0, 4)
  const doneCount = sortedActivities.filter(a => {
    const later = sortedActivities
      .filter(x => x.id !== a.id && x.time && x.time > (a.time || ''))
      .map(x => x.time)
    return isActivityDone(today, a.time, !!a.done, now, later)
  }).length

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Today's Plan
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
              {doneCount}/{sortedActivities.length}
            </span>
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh from server"
              title="Pull latest from server"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/timeline')}>
              Full timeline
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {visible.map(act => {
            // Apply the day-aware rule: an activity is done if its own time
            // passed OR any later same-day activity has already started.
            const later = sortedActivities
              .filter(x => x.id !== act.id && x.time && x.time > (act.time || ''))
              .map(x => x.time)
            const done = isActivityDone(today, act.time, !!act.done, now, later)
            const isNow = !done && act.id === inProgressId
            return (
              <button
                key={act.id}
                onClick={() => toggleDone(todayItinerary.id, act.id)}
                aria-label={done ? `Mark "${act.title}" not done` : `Mark "${act.title}" done`}
                title={done ? 'Tap to undo' : 'Tap to mark done'}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg -mx-1 px-1 py-1 text-left transition-all active:scale-[0.99]',
                  done && 'opacity-50',
                  isNow && 'bg-primary/5 ring-1 ring-primary/30',
                  !done && !isNow && 'hover:bg-accent/40',
                )}
              >
                <div className="text-xs text-muted-foreground w-14 shrink-0 font-mono tabular-nums">
                  {act.time ? formatTime(act.time) : '—'}
                </div>
                {done ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" strokeWidth={3} />
                ) : (
                  <div className={cn(
                    'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                    isNow ? 'border-primary animate-pulse' : 'border-muted-foreground/40',
                  )} />
                )}
                <div className={cn('text-sm font-medium truncate flex-1', done && 'line-through')}>{act.title}</div>
                {isNow && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary shrink-0">Now</span>
                )}
              </button>
            )
          })}
          {sortedActivities.length > 4 && (
            <p className="text-xs text-primary pl-[70px]">+{sortedActivities.length - 4} more</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
