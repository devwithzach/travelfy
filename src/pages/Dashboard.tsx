import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plane, Building2, Map, ListChecks, DollarSign,
  AlertCircle, Clock, CalendarDays, ChevronRight,
  TrendingUp, CheckSquare, FileText, Globe, Circle, Check, MapPin, Plus
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentPlace } from '@/hooks/useCurrentPlace'
import { getDaysUntil, formatDate, formatShortDate, getTripProgress, getTripStatus, formatTime } from '@/utils/dateUtils'
import { sumExpenses } from '@/utils/currency'
import { findInProgressActivity, findNextUpcomingActivity, localDateStr } from '@/utils/itinerary'
import QuickAddExpense from '@/components/common/QuickAddExpense'
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

// Friendly first name from a Supabase user record. Falls back to "Traveler".
function deriveName(email: string | null | undefined, fullName: string | null | undefined): string {
  if (fullName?.trim()) return fullName.split(/\s+/)[0]
  if (!email) return 'Traveler'
  const local = email.split('@')[0]
  // Strip digits and split on common separators.
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
  const { trip, updateTrip } = useTrip()
  const { user } = useAuth()
  const place = useCurrentPlace()
  const navigate = useNavigate()

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

  const nextFlight = flights.find(f => f.status === 'upcoming') || flights[0]
  const checkedCount = checklist.filter(c => c.checked).length
  const totalBudget = settings.totalBudget
  const { total: spentAmount } = sumExpenses(trip.currencyRates, expenses, settings.homeCurrency)
  const budgetUsed = totalBudget > 0 ? Math.min((spentAmount / totalBudget) * 100, 100) : 0

  // Today's spend, converted to home currency.
  const todayStr = localDateStr(now)
  const todayExpenses = expenses.filter(e => e.date === todayStr)
  const { total: todaySpent } = sumExpenses(trip.currencyRates, todayExpenses, settings.homeCurrency)

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const greeting = timeGreeting(now)
  const name = deriveName(user?.email, (user?.user_metadata?.full_name as string | undefined) ?? null)

  const quickActions = [
    { label: 'Flights', icon: Plane, to: '/flights', color: 'bg-blue-500' },
    { label: 'Hotels', icon: Building2, to: '/hotels', color: 'bg-violet-500' },
    { label: 'Timeline', icon: Map, to: '/timeline', color: 'bg-emerald-500' },
    { label: 'Checklist', icon: ListChecks, to: '/checklist', color: 'bg-amber-500' },
    { label: 'Expenses', icon: DollarSign, to: '/expenses', color: 'bg-rose-500' },
    { label: 'Emergency', icon: AlertCircle, to: '/emergency', color: 'bg-red-600' },
    { label: 'Documents', icon: FileText, to: '/documents', color: 'bg-cyan-500' },
    { label: 'Passport', icon: Globe, to: '/passport', color: 'bg-indigo-500' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 pb-4"
    >
      {/* Personalized greeting + current location */}
      <motion.div
        variants={itemVariants}
        className="pt-[max(2.5rem,env(safe-area-inset-top))] pb-2"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{greeting}</p>
        <h1 className="text-2xl font-bold mt-0.5">{name} 👋</h1>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          {place.loading ? (
            <span className="opacity-60">Finding you…</span>
          ) : place.label ? (
            <span className="truncate">Currently in <span className="text-foreground font-medium">{place.label}</span></span>
          ) : place.permissionState === 'denied' ? (
            <span className="opacity-60">Location off · enable in browser to see where you are</span>
          ) : place.permissionState === 'unsupported' ? (
            <span className="opacity-60">Location unavailable on this device</span>
          ) : (
            <span className="opacity-60">Location unavailable</span>
          )}
        </div>
      </motion.div>

      {/* Hero Card */}
      <motion.div variants={itemVariants} className="pb-4">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 text-white shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-8" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                  {tripStatus === 'upcoming' ? 'Next Adventure' : tripStatus === 'active' ? 'Currently Traveling' : 'Trip Completed'}
                </p>
                <h2 className="text-2xl font-bold leading-tight">{tripInfo.name}</h2>
                <p className="text-white/80 text-sm mt-1">{tripInfo.description}</p>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs">
                {tripStatus === 'upcoming' ? 'Upcoming' : tripStatus === 'active' ? 'Live' : 'Done'}
              </Badge>
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
        </div>
      </motion.div>

      {/* Now / Next Activity */}
      {(inProgress || nextUpcoming) && (
        <motion.div variants={itemVariants}>
          {inProgress && (
            <Card
              className="mb-3 ring-2 ring-primary/40 shadow-md cursor-pointer active:scale-[0.99] transition-transform"
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
              className="mb-3 cursor-pointer active:scale-[0.99] transition-transform hover:shadow-md"
              onClick={() => navigate('/timeline')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Up Next</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {nextUpcoming.day.date === new Date().toISOString().split('T')[0]
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
            <Card className="mb-3 hover:shadow-md transition-shadow active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold">Next Flight</span>
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

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 mb-3">
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/expenses')}>
          <div className="text-xl font-bold text-rose-600 leading-tight">
            {settings.homeCurrency} {todaySpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Today</div>
          <DollarSign className="h-4 w-4 text-rose-400 mx-auto mt-1" />
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/checklist')}>
          <div className="text-2xl font-bold text-primary">{checkedCount}/{checklist.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Packed</div>
          <CheckSquare className="h-4 w-4 text-primary/40 mx-auto mt-1" />
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => navigate('/expenses')}>
          <div className="text-2xl font-bold text-amber-600">{Math.round(budgetUsed)}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">Budget</div>
          <TrendingUp className="h-4 w-4 text-amber-400 mx-auto mt-1" />
        </Card>
      </motion.div>

      {/* Budget Card */}
      {totalBudget > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/expenses')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-rose-500" />
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
          <Card className="mb-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-amber-500" />
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

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Access</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(({ label, icon: Icon, to, color }) => (
            <motion.button
              key={to}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:shadow-md transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground leading-tight text-center">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Today's Itinerary Preview */}
      <motion.div variants={itemVariants} className="mt-3">
        <TodayPreview />
      </motion.div>

      {/* Tour Notes */}
      {trip.tourNotes.length > 0 && (
        <motion.div variants={itemVariants} className="mt-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-500" />
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

      {/* Floating "Quick Add Expense" FAB */}
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
    </motion.div>
  )
}

function TodayPreview() {
  const { trip } = useTrip()
  const navigate = useNavigate()

  const today = new Date().toISOString().split('T')[0]
  const todayItinerary = trip.itinerary.find(d => d.date === today)

  if (!todayItinerary) return null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
            Today's Plan
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/timeline')}>
            Full timeline
          </Button>
        </div>
        <div className="space-y-2">
          {todayItinerary.activities.slice(0, 3).map(act => (
            <div key={act.id} className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-14 shrink-0 font-mono">
                {act.time ? formatTime(act.time) : '—'}
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <div className="text-sm font-medium truncate">{act.title}</div>
            </div>
          ))}
          {todayItinerary.activities.length > 3 && (
            <p className="text-xs text-primary pl-[70px]">+{todayItinerary.activities.length - 3} more</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
