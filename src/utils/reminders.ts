import type { ItineraryDay, ItineraryActivity } from '@/types'
import { localDateStr } from './itinerary'

export interface DueReminder {
  id: string  // composite: `${activityId}:${type}`
  activityId: string
  dayId: string
  type: 'soon' | 'now'
  title: string
  time: string
  location?: string
}

const SOON_WINDOW_MS = 15 * 60 * 1000 // notify 15min before start
const NOW_WINDOW_MS = 5 * 60 * 1000   // and again at start (within +5min so we don't miss a tick)

/**
 * Return any reminders that should fire right now based on `now` and the
 * itinerary. Pure — call sites are responsible for dedup'ing already-shown
 * reminders against an external "fired" set.
 */
export function computeDueReminders(itinerary: ItineraryDay[], now: Date): DueReminder[] {
  const today = localDateStr(now)
  const day = itinerary.find(d => d.date === today)
  if (!day) return []
  const nowMs = now.getTime()
  const out: DueReminder[] = []
  for (const a of day.activities) {
    if (!a.time || a.done) continue
    const start = new Date(`${today}T${a.time}`).getTime()
    if (Number.isNaN(start)) continue
    const deltaMs = start - nowMs
    // 15-min heads-up
    if (deltaMs > 0 && deltaMs <= SOON_WINDOW_MS) {
      out.push(reminder(a, day, 'soon'))
    }
    // Started in the last NOW_WINDOW_MS
    if (deltaMs <= 0 && deltaMs > -NOW_WINDOW_MS) {
      out.push(reminder(a, day, 'now'))
    }
  }
  return out
}

function reminder(a: ItineraryActivity, d: ItineraryDay, type: 'soon' | 'now'): DueReminder {
  return {
    id: `${a.id}:${type}`,
    activityId: a.id,
    dayId: d.id,
    type,
    title: a.title,
    time: a.time,
    location: a.location,
  }
}

// localStorage key for the "already fired this trip" set, so a refresh
// doesn't re-spam reminders we already showed today.
const STORAGE_KEY = 'travelfy-fired-reminders'
const RETENTION_HOURS = 36

interface FiredEntry { id: string; ts: number }

export function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as FiredEntry[]
    const cutoff = Date.now() - RETENTION_HOURS * 60 * 60 * 1000
    return new Set(arr.filter(e => e.ts > cutoff).map(e => e.id))
  } catch {
    return new Set()
  }
}

export function saveFired(set: Set<string>) {
  try {
    const arr: FiredEntry[] = [...set].map(id => ({ id, ts: Date.now() }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // quota — best effort
  }
}
