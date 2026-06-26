import type { ItineraryActivity, ItineraryDay } from '@/types'

// Local YYYY-MM-DD for a given Date in the user's timezone.
export function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// An activity counts as done if:
//   - it's manually flagged done, or
//   - its date is strictly before today (whole day past), or
//   - its date is today and its time has already passed.
// Future-dated activities are never done.
export function isActivityDone(date: string, time: string, manualDone: boolean, now: Date): boolean {
  if (manualDone) return true
  if (!date) return false
  const today = localDateStr(now)
  if (date < today) return true
  if (date > today) return false
  if (!time) return false
  const ts = new Date(`${date}T${time}`).getTime()
  return !Number.isNaN(ts) && ts < now.getTime()
}

// Find the currently in-progress activity: among today's undone activities,
// the one whose time most recently passed (or the first untimed one).
export function findInProgressActivity(
  itinerary: ItineraryDay[],
  now: Date,
): { day: ItineraryDay; activity: ItineraryActivity } | null {
  const today = localDateStr(now)
  const todayDay = itinerary.find(d => d.date === today)
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
  return candidate ? { day: todayDay, activity: candidate } : null
}

// First undone activity in chronological order (date, then time).
export function findNextUpcomingActivity(
  itinerary: ItineraryDay[],
  now: Date,
): { day: ItineraryDay; activity: ItineraryActivity } | null {
  const today = localDateStr(now)
  const nowMs = now.getTime()
  const futureDays = [...itinerary]
    .filter(d => d.date && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const d of futureDays) {
    const acts = [...d.activities].sort((a, b) => a.time.localeCompare(b.time))
    for (const a of acts) {
      if (a.done) continue
      if (d.date === today && a.time) {
        const ts = new Date(`${d.date}T${a.time}`).getTime()
        if (!Number.isNaN(ts) && ts < nowMs) continue
      }
      return { day: d, activity: a }
    }
  }
  return null
}
