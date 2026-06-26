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
//   - its date is today and its own start time has passed, or
//   - any later same-day activity has already started (so this one must be over).
// Future-dated activities are never done.
export function isActivityDone(
  date: string,
  time: string,
  manualDone: boolean,
  now: Date,
  laterTodayStartTimes: string[] = [],
): boolean {
  if (manualDone) return true
  if (!date) return false
  const today = localDateStr(now)
  if (date < today) return true
  if (date > today) return false
  const nowMs = now.getTime()
  if (time) {
    const ts = new Date(`${date}T${time}`).getTime()
    if (!Number.isNaN(ts) && ts < nowMs) return true
  }
  // No own start time or it hasn't passed — fall back to "next activity already started".
  for (const t of laterTodayStartTimes) {
    if (!t) continue
    const ts = new Date(`${date}T${t}`).getTime()
    if (!Number.isNaN(ts) && ts <= nowMs) return true
  }
  return false
}

// Find the currently in-progress activity: today's most-recently-started undone
// activity. Anything older than that is treated as over (since a later one began).
export function findInProgressActivity(
  itinerary: ItineraryDay[],
  now: Date,
): { day: ItineraryDay; activity: ItineraryActivity } | null {
  const today = localDateStr(now)
  const todayDay = itinerary.find(d => d.date === today)
  if (!todayDay || todayDay.activities.length === 0) return null
  const nowMs = now.getTime()
  const sorted = [...todayDay.activities].sort((a, b) => a.time.localeCompare(b.time))
  // Find the activity whose start time most recently passed and isn't manually done.
  let lastStarted: ItineraryActivity | null = null
  for (const a of sorted) {
    if (!a.time) { lastStarted = lastStarted ?? a; continue }
    const ts = new Date(`${today}T${a.time}`).getTime()
    if (!Number.isNaN(ts) && ts <= nowMs) lastStarted = a
  }
  if (!lastStarted || lastStarted.done) return null
  return { day: todayDay, activity: lastStarted }
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
