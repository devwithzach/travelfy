import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Plane, Building2, Map as MapIcon, Camera, DollarSign,
  CheckSquare, CalendarDays, ChevronRight, Sparkles, AlertCircle,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { sumExpenses, convert } from '@/utils/currency'
import { isActivityDone, localDateStr } from '@/utils/itinerary'
import { getTripStatus, formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b',
  transport: '#3b82f6',
  shopping: '#ec4899',
  hotel: '#8b5cf6',
  activities: '#10b981',
  other: '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  transport: 'Transport',
  shopping: 'Shopping',
  hotel: 'Hotel & Stays',
  activities: 'Activities',
  other: 'Other',
}

export default function Stats() {
  const { trip, activeTripId } = useTrip()
  const { user } = useAuth()
  const navigate = useNavigate()
  const home = trip.settings.homeCurrency || 'PHP'

  // ── Trip duration ────────────────────────────────────────
  const tripStart = trip.tripInfo.startDate
  const tripEnd = trip.tripInfo.endDate
  const durationDays = useMemo(() => {
    if (!tripStart || !tripEnd) return 0
    const s = new Date(tripStart + 'T00:00:00').getTime()
    const e = new Date(tripEnd + 'T00:00:00').getTime()
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
  }, [tripStart, tripEnd])
  const status = tripStart && tripEnd ? getTripStatus(tripStart, tripEnd) : 'upcoming'

  // ── Spend totals ─────────────────────────────────────────
  const { total: totalSpent, unconvertedCount } = sumExpenses(trip.currencyRates, trip.expenses, home)
  const avgPerDay = durationDays > 0 ? totalSpent / durationDays : 0
  const totalBudget = trip.settings.totalBudget || 0
  const budgetUsedPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999) : 0

  // ── Activities done ──────────────────────────────────────
  const activityStats = useMemo(() => {
    const now = new Date()
    let total = 0
    let done = 0
    for (const day of trip.itinerary) {
      for (const a of day.activities) {
        total++
        const later = day.activities
          .filter(x => x.id !== a.id && x.time && x.time > (a.time || ''))
          .map(x => x.time)
        if (isActivityDone(day.date, a.time, !!a.done, now, later)) done++
      }
    }
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [trip.itinerary])

  // ── Spend by category (converted to home currency) ───────
  const categoryData = useMemo(() => {
    return Object.keys(CATEGORY_COLORS).map(cat => {
      const items = trip.expenses.filter(e => e.category === cat)
      const { total } = sumExpenses(trip.currencyRates, items, home)
      return {
        name: CATEGORY_LABELS[cat],
        value: total,
        color: CATEGORY_COLORS[cat],
        key: cat,
      }
    }).filter(c => c.value > 0)
  }, [trip.expenses, trip.currencyRates, home])

  // ── Spend by day ─────────────────────────────────────────
  const dailyData = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const e of trip.expenses) {
      const converted = convert(trip.currencyRates, e.amount, e.currency, home)
      if (converted === null || !e.date) continue
      byDate.set(e.date, (byDate.get(e.date) ?? 0) + converted)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({
        date,
        label: formatDate(date, { month: 'short', day: 'numeric' }),
        total: Math.round(total),
      }))
  }, [trip.expenses, trip.currencyRates, home])

  const topSpendDay = dailyData.length > 0
    ? dailyData.reduce((max, d) => d.total > max.total ? d : max, dailyData[0])
    : null

  // ── Photos count (live from Supabase) ────────────────────
  const [photoCount, setPhotoCount] = useState<number | null>(null)
  useEffect(() => {
    if (!user || !activeTripId) { setPhotoCount(0); return }
    supabase
      .from('trip_photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('trip_id', activeTripId)
      .then(({ count }) => setPhotoCount(count ?? 0))
  }, [user, activeTripId])

  return (
    <div>
      <PageHeader
        title="Trip Stats"
        subtitle={status === 'completed' ? 'Trip wrap-up' : status === 'active' ? `Day ${currentDay(tripStart, new Date())} of ${durationDays}` : `${durationDays}-day trip`}
        icon={BarChart3}
        iconColor="text-emerald-600"
      />

      <div className="px-4 space-y-3">
        {/* Hero summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-3xl p-5 text-white shadow-xl relative overflow-hidden',
            status === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'gradient-hero',
          )}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 flex items-center gap-1">
              {status === 'completed' ? <><Sparkles className="h-3 w-3" /> Trip Complete</> : status === 'active' ? 'In Progress' : 'Upcoming'}
            </p>
            <h2 className="text-xl font-bold leading-tight">{trip.tripInfo.name}</h2>
            <p className="text-white/80 text-sm mt-1">{trip.tripInfo.destination}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <HeroStat label="Days" value={String(durationDays)} />
              <HeroStat label="Spent" value={`${home} ${Math.round(totalSpent).toLocaleString()}`} />
              <HeroStat label="Activities" value={`${activityStats.done}/${activityStats.total}`} />
            </div>
          </div>
        </motion.div>

        {/* At-a-glance grid */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
          <MiniStat icon={Plane} label="Flights" value={trip.flights.length} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
          <MiniStat icon={Building2} label="Hotels" value={trip.hotels.length} color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/30" />
          <MiniStat icon={MapIcon} label="Days" value={trip.itinerary.length} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" />
          <MiniStat icon={Camera} label="Photos" value={photoCount ?? '—'} color="text-pink-600" bg="bg-pink-100 dark:bg-pink-900/30" />
        </motion.div>

        {/* Activity progress */}
        {activityStats.total > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                  Itinerary completion
                </span>
                <span className="text-xs font-bold tabular-nums">{activityStats.pct}%</span>
              </div>
              <Progress value={activityStats.pct} className="h-2.5 [&>div]:bg-emerald-500" />
              <p className="text-xs text-muted-foreground mt-1.5">
                {activityStats.done} of {activityStats.total} activities done
              </p>
            </CardContent>
          </Card>
        )}

        {/* Budget */}
        {totalBudget > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-rose-600" />
                  Budget used
                </span>
                <span className="text-xs font-bold tabular-nums">{budgetUsedPct}%</span>
              </div>
              <Progress
                value={Math.min(budgetUsedPct, 100)}
                className={cn(
                  'h-2.5',
                  budgetUsedPct > 100 ? '[&>div]:bg-rose-600' : budgetUsedPct > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500',
                )}
              />
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{home} {Math.round(totalSpent).toLocaleString()} of {home} {totalBudget.toLocaleString()}</span>
                <span>{home} {Math.round(avgPerDay).toLocaleString()}/day avg</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spending breakdown */}
        {categoryData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Spending by category</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${home} ${value.toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categoryData.map(c => (
                  <div key={c.key} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground truncate">{c.name}</span>
                    <span className="font-semibold ml-auto tabular-nums">{Math.round(c.value).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily spend */}
        {dailyData.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Daily spend</p>
                {topSpendDay && (
                  <span className="text-[10px] text-muted-foreground">
                    Top: <span className="text-foreground font-medium">{topSpendDay.label}</span> · {home} {topSpendDay.total.toLocaleString()}
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: number) => [`${home} ${value.toLocaleString()}`, '']} contentStyle={{ borderRadius: 12, border: 'none' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Unconverted warning */}
        {unconvertedCount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {unconvertedCount} expense{unconvertedCount === 1 ? ' is' : 's are'} excluded from totals — no exchange rate set.{' '}
              <button onClick={() => navigate('/currency')} className="font-bold underline">Add rates</button>.
            </p>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => navigate('/expenses')}>
            <DollarSign className="h-4 w-4" /> Expenses
          </Button>
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => navigate('/timeline')}>
            <CalendarDays className="h-4 w-4" /> Timeline
          </Button>
        </div>

        {/* Empty-data hint */}
        {trip.expenses.length === 0 && trip.itinerary.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm font-semibold">No data yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Add flights, hotels, activities, and expenses to see your trip stats fill in.
              </p>
              <Button size="sm" onClick={() => navigate('/timeline')} className="gap-1.5">
                Start with Timeline <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur-sm">
      <p className="text-[9px] uppercase tracking-widest opacity-80 leading-none">{label}</p>
      <p className="text-base font-bold mt-1 leading-none truncate">{value}</p>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color, bg }: {
  icon: typeof Plane; label: string; value: number | string; color: string; bg: string
}) {
  return (
    <Card className="active:scale-[0.98] transition-transform">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function currentDay(start: string, now: Date): number {
  if (!start) return 1
  const s = new Date(start + 'T00:00:00').getTime()
  const n = new Date(now)
  n.setHours(0, 0, 0, 0)
  const diff = Math.round((n.getTime() - s) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diff)
}
