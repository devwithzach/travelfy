import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  Utensils, Bus, Landmark, Hotel, ShoppingBag, Clock, Star, MoreHorizontal, Check, Circle, ArrowDownToLine
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { ItineraryDay, ItineraryActivity } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

// Wrapper: the local isActivityDone used to take (date, time, now). The shared
// helper takes (date, time, manualDone, now). Keep the same shape here so the
// rest of this file's auto-detect call sites stay terse.
function isActivityDone(date: string, time: string, now: Date): boolean {
  return isActivityPastTime(date, time, false, now)
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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(trip.itinerary.map(d => d.id)))
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

  const isDone = (act: ItineraryActivity, dayDate: string) =>
    !!act.done || isActivityDone(dayDate, act.time, now)

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

  return (
    <div>
      <PageHeader
        title="Timeline"
        subtitle={`${trip.itinerary.length} days`}
        icon={Map}
        iconColor="text-emerald-600"
        action={
          <Button size="icon-sm" onClick={openAddDay}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        <AnimatePresence>
          {trip.itinerary.map((day, i) => {
            const isExpanded = expandedDays.has(day.id)
            const phase = dayPhase(day.date, now)
            const doneCount = day.activities.filter(a => isDone(a, day.date)).length
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
                <Card className={cn(
                  'overflow-hidden',
                  allDone && 'opacity-70',
                  isToday && 'ring-2 ring-primary/40 shadow-md'
                )}>
                  {/* Day Header */}
                  <div
                    className="flex items-center p-4 cursor-pointer select-none"
                    onClick={() => toggleDay(day.id)}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold mr-3 shrink-0',
                      allDone ? 'bg-emerald-500' : isToday ? 'bg-primary animate-pulse' : 'gradient-brand'
                    )}>
                      {allDone ? <Check className="h-5 w-5" strokeWidth={3} /> : day.dayNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('font-bold text-sm truncate', allDone && 'line-through')}>{day.title}</p>
                        {isToday && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-primary text-white border-0 uppercase tracking-wider">Today</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{day.date ? formatDayDate(day.date) : day.subtitle}</p>
                      {day.meals.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {day.meals.map(m => (
                            <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0">{m}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className={cn(
                        'text-xs',
                        allDone ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'
                      )}>
                        {total > 0 ? `${doneCount}/${total}` : '0'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={e => { e.stopPropagation(); openEditDay(day) }}
                        className="h-7 w-7"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={e => { e.stopPropagation(); removeDay(day.id) }}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Activities */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t"
                      >
                        <div className="p-4 pt-3 space-y-3">
                          {day.activities.map((act, ai) => {
                            const cfg = activityTypeConfig[act.type]
                            const Icon = cfg.icon
                            const done = isDone(act, day.date)
                            const manualOnly = !!act.done && !isActivityDone(day.date, act.time, now)
                            const inProgress = !done && act.id === inProgressId
                            return (
                              <div key={act.id} className={cn(
                                'flex items-start gap-3 rounded-xl -mx-1 px-1 transition-all',
                                done && 'opacity-50',
                                inProgress && 'bg-primary/5 ring-1 ring-primary/30 py-1.5'
                              )}>
                                <button
                                  onClick={() => toggleManualDone(day.id, act.id)}
                                  aria-label={done ? 'Mark as not done' : 'Mark as done'}
                                  title={done ? (manualOnly ? 'Manually marked done — tap to undo' : 'Auto-detected as past — tap to override') : 'Tap to mark done'}
                                  className="flex flex-col items-center shrink-0 group focus:outline-none"
                                >
                                  <div className={cn(
                                    'p-1.5 rounded-lg relative transition-colors',
                                    done
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50'
                                      : cfg.color.split(' ').slice(1).join(' ') + ' group-hover:ring-2 group-hover:ring-emerald-400/40'
                                  )}>
                                    {done
                                      ? <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
                                      : <Icon className={cn('h-3.5 w-3.5', cfg.color.split(' ')[0])} />
                                    }
                                  </div>
                                  {ai < day.activities.length - 1 && (
                                    <div className="w-[2px] h-4 bg-border mt-1" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0 pb-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                        {act.time && (
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span className="font-mono">
                                              {act.time.includes(':') ? (() => {
                                                const [h, m] = act.time.split(':').map(Number)
                                                const p = h >= 12 ? 'PM' : 'AM'
                                                return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${p}`
                                              })() : act.time}
                                            </span>
                                          </div>
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
                                      <p className={cn('text-sm font-medium truncate', done && 'line-through')}>{act.title}</p>
                                      {act.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{act.description}</p>
                                      )}
                                      {act.location && (
                                        <p className="text-xs text-primary mt-0.5">📍 {act.location}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => openEditActivity(day.id, act)}>
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => removeActivity(day.id, act.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-dashed"
                            onClick={() => openAddActivity(day.id)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Activity
                          </Button>
                          {day.hotel && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                              <Hotel className="h-3.5 w-3.5 shrink-0" />
                              <span>Staying at: <strong>{day.hotel}</strong></span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {trip.itinerary.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Map className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No itinerary yet</p>
            <p className="text-sm mt-1">Tap + to add your first day</p>
          </div>
        )}
      </div>

      {/* Floating "Jump to today" button */}
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

      {/* Day Dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDay && trip.itinerary.find(d => d.id === editingDay.id) ? 'Edit Day' : 'Add Day'}</DialogTitle>
          </DialogHeader>
          {editingDay && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Day Number</Label>
                  <Input type="number" value={editingDay.dayNumber} onChange={e => setEditingDay({ ...editingDay, dayNumber: parseInt(e.target.value) || 1 })} min={1} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                  <Input type="date" value={editingDay.date} onChange={e => setEditingDay({ ...editingDay, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                <Input value={editingDay.title} onChange={e => setEditingDay({ ...editingDay, title: e.target.value })} placeholder="Manila → Hong Kong" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Subtitle</Label>
                <Input value={editingDay.subtitle} onChange={e => setEditingDay({ ...editingDay, subtitle: e.target.value })} placeholder="Arrival Day" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Hotel</Label>
                <Input value={editingDay.hotel} onChange={e => setEditingDay({ ...editingDay, hotel: e.target.value })} placeholder="Dorsett Kwun Tong" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Meals (comma-separated)</Label>
                <Input
                  value={editingDay.meals.join(', ')}
                  onChange={e => setEditingDay({ ...editingDay, meals: e.target.value.split(',').map(m => m.trim()).filter(Boolean) })}
                  placeholder="Breakfast, Lunch"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDayDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDay}>Save Day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={actDialogOpen} onOpenChange={setActDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAct && trip.itinerary.find(d => d.id === editingAct?.dayId)?.activities.find(a => a.id === editingAct?.activity.id) ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          {editingAct && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Time</Label>
                  <Input type="time" value={editingAct.activity.time} onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, time: e.target.value } })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                  <Select
                    value={editingAct.activity.type}
                    onValueChange={(v: ItineraryActivity['type']) => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, type: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={editingAct.activity.title} onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, title: e.target.value } })} placeholder="Activity name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <Textarea value={editingAct.activity.description} onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, description: e.target.value } })} placeholder="Details..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
                <Input value={editingAct.activity.location || ''} onChange={e => setEditingAct({ ...editingAct, activity: { ...editingAct.activity, location: e.target.value } })} placeholder="Wong Tai Sin, Hong Kong" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveActivity}>Save Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
