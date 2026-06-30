import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  Utensils, Bus, Landmark, Hotel, ShoppingBag, Star, MoreHorizontal, Check, Circle, ArrowDownToLine, X, MapPin,
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { ItineraryDay, ItineraryActivity } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDayDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import { localDateStr, isActivityDone as isActivityPastTime } from '@/utils/itinerary'

const activityTypeConfig = {
  transport: { label: 'Transport', icon: Bus, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  attraction: { label: 'Attraction', icon: Landmark, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
  meal: { label: 'Meal', icon: Utensils, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
  hotel: { label: 'Hotel', icon: Hotel, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30' },
  free: { label: 'Free Time', icon: Star, color: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
}

// Auto-detect wrapper (no manual flag). Takes the day's full activity list so
// the helper can apply the "next activity already started → previous one is over"
// rule. Without this an undated/single-time activity stays "ongoing" forever.
function autoIsActivityDone(act: ItineraryActivity, day: ItineraryDay, now: Date): boolean {
  const later = day.activities
    .filter(a => a.id !== act.id && a.time && a.time > (act.time || ''))
    .map(a => a.time)
  return isActivityPastTime(day.date, act.time, false, now, later)
}

function dayPhase(date: string, now: Date): 'past' | 'today' | 'future' | 'unknown' {
  if (!date) return 'unknown'
  const today = localDateStr(now)
  if (date < today) return 'past'
  if (date === today) return 'today'
  return 'future'
}

// Legacy localStorage shim: prior versions stored manual done state per-device.
// On first load with the new DB-backed schema we migrate those entries into the
// trip via updateTrip, then drop the key so it can't drift.
const DONE_STORAGE_PREFIX = 'travelfy-done-'

function readLegacyDoneIds(tripId: string): string[] {
  try {
    const raw = localStorage.getItem(DONE_STORAGE_PREFIX + tripId)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function clearLegacyDone(tripId: string) {
  try { localStorage.removeItem(DONE_STORAGE_PREFIX + tripId) } catch { /* noop */ }
}

// Quick-fill templates for the Add Activity dialog. Tapping a template fills
// in type + title + a sensible duration (description left blank for the user).
const ACTIVITY_TEMPLATES: Array<{
  label: string
  type: ItineraryActivity['type']
  title: string
  emoji: string
}> = [
  { label: 'Flight',       type: 'transport',  title: 'Flight',                  emoji: '✈️' },
  { label: 'Check-in',     type: 'hotel',      title: 'Hotel check-in',          emoji: '🏨' },
  { label: 'Check-out',    type: 'hotel',      title: 'Hotel check-out',         emoji: '🛎️' },
  { label: 'Breakfast',    type: 'meal',       title: 'Breakfast',               emoji: '🥐' },
  { label: 'Lunch',        type: 'meal',       title: 'Lunch',                   emoji: '🥢' },
  { label: 'Dinner',       type: 'meal',       title: 'Dinner',                  emoji: '🍽️' },
  { label: 'Sightseeing',  type: 'attraction', title: 'Sightseeing',             emoji: '📸' },
  { label: 'Tour',         type: 'attraction', title: 'Guided tour',             emoji: '🗺️' },
  { label: 'Shopping',     type: 'shopping',   title: 'Shopping',                emoji: '🛍️' },
  { label: 'Transfer',     type: 'transport',  title: 'Transfer',                emoji: '🚐' },
  { label: 'Free time',    type: 'free',       title: 'Free time',               emoji: '🌴' },
]

const defaultActivity = (): ItineraryActivity => ({
  id: crypto.randomUUID(),
  time: '',
  title: '',
  description: '',
  type: 'other',
  location: '',
})

const defaultDay = (): ItineraryDay => ({
  id: crypto.randomUUID(),
  date: '',
  dayNumber: 1,
  title: '',
  subtitle: '',
  meals: [],
  hotel: '',
  activities: [],
})

export default function Timeline() {
  const { trip, updateTrip } = useTrip()
  const tripId = trip.tripInfo.id
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [actDialogOpen, setActDialogOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null)
  const [editingAct, setEditingAct] = useState<{ dayId: string; activity: ItineraryActivity } | null>(null)

  // Tick "now" once a minute so done states refresh while the page is open.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Manual done lives on the activity row itself (synced via Supabase).
  const toggleManualDone = (dayId: string, actId: string) => {
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d => {
        if (d.id !== dayId) return d
        return {
          ...d,
          activities: d.activities.map(a => a.id === actId ? { ...a, done: !a.done } : a),
        }
      }),
    }))
  }

  // Flip every activity in a day to done (or all back to undone).
  const markDayDone = (day: ItineraryDay, done: boolean) => {
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d =>
        d.id !== day.id ? d : {
          ...d,
          activities: d.activities.map(a => ({ ...a, done })),
        }
      ),
    }))
  }

  // One-time migration: lift any legacy per-device done IDs into the trip row.
  useEffect(() => {
    const legacy = readLegacyDoneIds(tripId)
    if (legacy.length === 0) return
    const legacySet = new Set(legacy)
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(d => ({
        ...d,
        activities: d.activities.map(a =>
          legacySet.has(a.id) && !a.done ? { ...a, done: true } : a
        ),
      })),
    }))
    clearLegacyDone(tripId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const isDone = (act: ItineraryActivity, day: ItineraryDay) =>
    !!act.done || autoIsActivityDone(act, day, now)

  // Find the single activity that's currently "in progress":
  // today's last activity whose time has passed (or first activity if none yet).
  const inProgressId = useMemo(() => {
    const today = localDateStr(now)
    const todayDay = trip.itinerary.find(d => d.date === today)
    if (!todayDay || todayDay.activities.length === 0) return null
    const nowMs = now.getTime()
    const sorted = [...todayDay.activities].sort((a, b) => a.time.localeCompare(b.time))
    let candidate: ItineraryActivity | null = null
    for (const a of sorted) {
      if (a.done) continue
      if (!a.time) { candidate = candidate ?? a; continue }
      const ts = new Date(`${today}T${a.time}`).getTime()
      if (!Number.isNaN(ts) && ts <= nowMs) candidate = a
    }
    return candidate?.id ?? null
  }, [trip.itinerary, now])

  // Sticky "Jump to today" — only show if today's day card exists and is scrolled past viewport.
  const todayCardRef = useRef<HTMLDivElement | null>(null)
  const [showJumpToToday, setShowJumpToToday] = useState(false)
  const todayDayId = useMemo(() => {
    const today = localDateStr(now)
    return trip.itinerary.find(d => d.date === today)?.id ?? null
  }, [trip.itinerary, now])

  useEffect(() => {
    const el = todayCardRef.current
    if (!el) { setShowJumpToToday(false); return }
    const observer = new IntersectionObserver(([entry]) => {
      setShowJumpToToday(!entry.isIntersecting)
    }, { rootMargin: '-80px 0px -80px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [todayDayId])

  const jumpToToday = () => {
    todayCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const toggleDay = (id: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAddDay = () => {
    const maxDay = Math.max(0, ...trip.itinerary.map(d => d.dayNumber))
    setEditingDay({ ...defaultDay(), dayNumber: maxDay + 1 })
    setDayDialogOpen(true)
  }

  const openEditDay = (day: ItineraryDay) => {
    setEditingDay({ ...day, activities: [...day.activities] })
    setDayDialogOpen(true)
  }

  const saveDay = () => {
    if (!editingDay) return
    updateTrip(prev => {
      const exists = prev.itinerary.find(d => d.id === editingDay.id)
      const sorted = exists
        ? prev.itinerary.map(d => d.id === editingDay.id ? editingDay : d)
        : [...prev.itinerary, editingDay]
      return { ...prev, itinerary: sorted.sort((a, b) => a.date.localeCompare(b.date)) }
    })
    setDayDialogOpen(false)
  }

  const removeDay = (id: string) => {
    updateTrip(prev => ({ ...prev, itinerary: prev.itinerary.filter(d => d.id !== id) }))
  }

  const openAddActivity = (dayId: string) => {
    setEditingAct({ dayId, activity: defaultActivity() })
    setActDialogOpen(true)
  }

  const openEditActivity = (dayId: string, act: ItineraryActivity) => {
    setEditingAct({ dayId, activity: { ...act } })
    setActDialogOpen(true)
  }

  const saveActivity = () => {
    if (!editingAct) return
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day => {
        if (day.id !== editingAct.dayId) return day
        const exists = day.activities.find(a => a.id === editingAct.activity.id)
        const activities = exists
          ? day.activities.map(a => a.id === editingAct.activity.id ? editingAct.activity : a)
          : [...day.activities, editingAct.activity]
        return { ...day, activities: activities.sort((a, b) => a.time.localeCompare(b.time)) }
      }),
    }))
    setActDialogOpen(false)
  }

  const removeActivity = (dayId: string, actId: string) => {
    updateTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day => {
        if (day.id !== dayId) return day
        return { ...day, activities: day.activities.filter(a => a.id !== actId) }
      }),
    }))
  }

  // Per-day status summary for header subtitle.
  const summary = trip.itinerary.reduce(
    (acc, d) => {
      const phase = dayPhase(d.date, now)
      const total = d.activities.length
      const allDone = phase === 'past' || (total > 0 && d.activities.every(a => isDone(a, d)))
      if (allDone) acc.done++
      else if (phase === 'today') acc.ongoing++
      else if (phase === 'future') acc.upcoming++
      else acc.unknown++
      return acc
    },
    { done: 0, ongoing: 0, upcoming: 0, unknown: 0 },
  )
  const subtitleParts: string[] = []
  if (summary.done) subtitleParts.push(`${summary.done} done`)
  if (summary.ongoing) subtitleParts.push(`${summary.ongoing} ongoing`)
  if (summary.upcoming) subtitleParts.push(`${summary.upcoming} upcoming`)
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : `${trip.itinerary.length} days`

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Map className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Timeline</h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">{subtitle}</p>
          </div>
        </div>
        <Button
          size="icon-sm"
          onClick={openAddDay}
          className="gradient-brand text-white border-0 shadow-sm"
          aria-label="Add day"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-6">
        <AnimatePresence>
          {trip.itinerary.map((day, i) => {
            const isExpanded = expandedDays.has(day.id)
            const phase = dayPhase(day.date, now)
            const doneCount = day.activities.filter(a => isDone(a, day)).length
            const total = day.activities.length
            // A day with date in the past counts as fully done even if it has zero activities.
            const allDone = phase === 'past' || (total > 0 && doneCount === total)
            const isToday = phase === 'today'

            return (
              <motion.div
                key={day.id}
                ref={day.id === todayDayId ? todayCardRef : undefined}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={cn(
                  'rounded-2xl bg-card border border-border overflow-hidden shadow-sm',
                  isToday && 'ring-2 ring-primary/30 shadow-md',
                  allDone && 'opacity-70',
                )}>
                  {/* ── Day Header ── */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer select-none"
                    onClick={() => toggleDay(day.id)}
                  >
                    {/* Day badge */}
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0',
                      allDone
                        ? 'bg-emerald-500'
                        : isToday
                        ? 'bg-primary animate-pulse'
                        : 'gradient-brand',
                    )}>
                      {allDone
                        ? <Check className="h-5 w-5" strokeWidth={3} />
                        : <span className="text-sm font-bold">{day.dayNumber}</span>
                      }
                    </div>

                    {/* Center info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-bold text-sm truncate leading-tight',
                        allDone && 'line-through text-muted-foreground',
                      )}>
                        {day.title || `Day ${day.dayNumber}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                        {day.date ? formatDayDate(day.date) : day.subtitle || 'No date set'}
                      </p>
                      {/* Progress bar */}
                      {total > 0 && (
                        <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(doneCount / total) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Chevron only */}
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </div>
                  </div>

                  {/* ── Activities ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border px-4 pt-3 pb-0">
                          {/* Hotel banner */}
                          {day.hotel && (
                            <div className="mb-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                              <Hotel className="h-3.5 w-3.5 shrink-0" />
                              <span>Staying at: <strong>{day.hotel}</strong></span>
                            </div>
                          )}

                          {/* Activity list */}
                          {day.activities.length > 0 && (
                            <div className="space-y-0">
                              {day.activities.map((act, ai) => {
                                const cfg = activityTypeConfig[act.type]
                                const Icon = cfg.icon
                                const done = isDone(act, day)
                                const manualOnly = !!act.done && !autoIsActivityDone(act, day, now)
                                const inProgress = !done && act.id === inProgressId
                                const isLast = ai === day.activities.length - 1

                                return (
                                  <div key={act.id} className="flex gap-3">
                                    {/* Timeline column */}
                                    <div className="flex flex-col items-center shrink-0 w-8">
                                      {/* Icon circle — also acts as done toggle */}
                                      <button
                                        onClick={() => toggleManualDone(day.id, act.id)}
                                        aria-label={done ? 'Mark as not done' : 'Mark as done'}
                                        title={done
                                          ? (manualOnly ? 'Manually marked done — tap to undo' : 'Auto-detected as past — tap to override')
                                          : 'Tap to mark done'
                                        }
                                        className={cn(
                                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors focus:outline-none',
                                          done
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                            : cfg.color.split(' ').slice(1).join(' '),
                                        )}
                                      >
                                        {done
                                          ? <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
                                          : <Icon className={cn('h-3.5 w-3.5', cfg.color.split(' ')[0])} />
                                        }
                                      </button>
                                      {/* Connector line */}
                                      {!isLast && (
                                        <div className="w-0.5 flex-1 bg-border my-1" style={{ minHeight: '16px' }} />
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className={cn(
                                      'flex-1 min-w-0 pb-3 group',
                                      isLast && 'pb-2',
                                    )}>
                                      <div className={cn(
                                        'rounded-xl px-3 py-2.5 transition-all',
                                        inProgress && 'bg-primary/5 ring-1 ring-primary/20',
                                        done && 'opacity-60',
                                      )}>
                                        {/* Top row: time pill + title + actions */}
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                              {act.time && (
                                                <span className="bg-muted text-xs font-mono px-2 py-0.5 rounded-full text-muted-foreground tabular-nums">
                                                  {act.time.includes(':') ? (() => {
                                                    const [h, m] = act.time.split(':').map(Number)
                                                    const p = h >= 12 ? 'PM' : 'AM'
                                                    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
                                                  })() : act.time}
                                                </span>
                                              )}
                                              {inProgress && (
                                                <Badge className="text-[9px] px-1.5 py-0 bg-primary text-white border-0 uppercase tracking-wider flex items-center gap-1">
                                                  <Circle className="h-2 w-2 fill-current animate-pulse" /> Now
                                                </Badge>
                                              )}
                                              {manualOnly && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Marked</Badge>
                                              )}
                                            </div>
                                            <p className={cn(
                                              'text-sm font-semibold leading-tight',
                                              done && 'line-through',
                                            )}>
                                              {act.title}
                                            </p>
                                            {act.description && (
                                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                                {act.description}
                                              </p>
                                            )}
                                            {act.location && (
                                              <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {act.location}
                                              </p>
                                            )}
                                          </div>

                                          {/* Edit / Delete — smaller, always visible on mobile */}
                                          <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              className="h-7 w-7"
                                              onClick={() => openEditActivity(day.id, act)}
                                              aria-label="Edit activity"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              className="h-7 w-7"
                                              onClick={() => removeActivity(day.id, act.id)}
                                              aria-label="Delete activity"
                                            >
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* ── Action row ── */}
                          <div className="flex items-center gap-2 py-2 border-t border-border mt-1">
                            {/* Add activity — flex-1, dashed */}
                            <button
                              onClick={() => openAddActivity(day.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-all active:scale-[0.98]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Activity
                            </button>

                            {/* Edit day */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-9 w-9 shrink-0"
                              onClick={() => openEditDay(day)}
                              aria-label="Edit day"
                              title="Edit day"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {/* Mark all done */}
                            {total > 0 && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-9 w-9 shrink-0"
                                onClick={() => markDayDone(day, !allDone)}
                                aria-label={allDone ? 'Reopen day' : 'Mark all done'}
                                title={allDone ? 'Reopen day' : 'Mark all activities done'}
                              >
                                <Check className={cn('h-3.5 w-3.5', allDone ? 'text-emerald-600' : 'text-muted-foreground')} strokeWidth={3} />
                              </Button>
                            )}

                            {/* Delete day */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeDay(day.id)}
                              aria-label="Delete day"
                              title="Delete day"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {trip.itinerary.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Map className="h-10 w-10 text-primary/40" />
            </div>
            <div>
              <p className="font-bold text-lg">No itinerary yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add days to plan your trip step by step</p>
            </div>
            <button
              onClick={openAddDay}
              className="gradient-brand text-white font-bold px-6 py-3 rounded-2xl shadow-md active:scale-[0.98] transition-transform text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Day
            </button>
          </div>
        )}
      </div>

      {/* ── Floating "Jump to today" button ── */}
      <AnimatePresence>
        {todayDayId && showJumpToToday && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            onClick={jumpToToday}
            className="fixed bottom-28 right-4 z-[1500] bg-primary text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Today
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Day Bottom Sheet ── */}
      <AnimatePresence>
        {dayDialogOpen && (
          <>
            <motion.div
              key="day-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setDayDialogOpen(false)}
            />
            <motion.div
              key="day-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-bold">
                  {editingDay && trip.itinerary.find(d => d.id === editingDay.id) ? 'Edit Day' : 'Add Day'}
                </h2>
                <button
                  onClick={() => setDayDialogOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              {editingDay && (
                <div className="px-5 pb-8 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Day Number</Label>
                      <input
                        type="number"
                        value={editingDay.dayNumber}
                        onChange={e => setEditingDay({ ...editingDay, dayNumber: parseInt(e.target.value) || 1 })}
                        min={1}
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                      <input
                        type="date"
                        value={editingDay.date}
                        onChange={e => setEditingDay({ ...editingDay, date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                    <input
                      type="text"
                      value={editingDay.title}
                      onChange={e => setEditingDay({ ...editingDay, title: e.target.value })}
                      placeholder="Manila → Hong Kong"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Subtitle</Label>
                    <input
                      type="text"
                      value={editingDay.subtitle}
                      onChange={e => setEditingDay({ ...editingDay, subtitle: e.target.value })}
                      placeholder="Arrival Day"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Hotel</Label>
                    <input
                      type="text"
                      value={editingDay.hotel}
                      onChange={e => setEditingDay({ ...editingDay, hotel: e.target.value })}
                      placeholder="Dorsett Kwun Tong"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Meals (comma-separated)</Label>
                    <input
                      type="text"
                      value={editingDay.meals.join(', ')}
                      onChange={e => setEditingDay({ ...editingDay, meals: e.target.value.split(',').map(m => m.trim()).filter(Boolean) })}
                      placeholder="Breakfast, Lunch"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={saveDay}
                    className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm mt-2 active:scale-[0.98] transition-transform"
                  >
                    Save Day
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Activity Bottom Sheet ── */}
      <AnimatePresence>
        {actDialogOpen && (
          <>
            <motion.div
              key="act-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setActDialogOpen(false)}
            />
            <motion.div
              key="act-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-bold">
                  {editingAct && trip.itinerary.find(d => d.id === editingAct?.dayId)?.activities.find(a => a.id === editingAct?.activity.id) ? 'Edit Activity' : 'Add Activity'}
                </h2>
                <button
                  onClick={() => setActDialogOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              {editingAct && (
                <div className="px-5 pb-8 space-y-3">
                  {/* Quick templates — only when adding new (no title yet). */}
                  {editingAct.activity.title === '' && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quick add</Label>
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {ACTIVITY_TEMPLATES.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setEditingAct(prev => prev ? ({
                              ...prev,
                              activity: { ...prev.activity, type: t.type, title: t.title },
                            }) : prev)}
                            className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-accent active:scale-95 transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <span aria-hidden>{t.emoji}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Time</Label>
                      <input
                        type="time"
                        value={editingAct.activity.time}
                        onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, time: e.target.value } })}
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                      <Select
                        value={editingAct.activity.type}
                        onValueChange={(v: ItineraryActivity['type']) => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, type: v } })}
                      >
                        <SelectTrigger className="rounded-xl bg-muted border-border h-[46px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(activityTypeConfig).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                    <input
                      type="text"
                      value={editingAct.activity.title}
                      onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, title: e.target.value } })}
                      placeholder="Activity name"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                    <textarea
                      value={editingAct.activity.description}
                      onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, description: e.target.value } })}
                      placeholder="Details..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
                    <input
                      type="text"
                      value={editingAct.activity.location || ''}
                      onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, location: e.target.value } })}
                      placeholder="Wong Tai Sin, Hong Kong"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <button
                    onClick={saveActivity}
                    className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm mt-2 active:scale-[0.98] transition-transform"
                  >
                    Save Activity
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
