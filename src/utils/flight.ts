import type { Flight } from '@/types'

// Local YYYY-MM-DD for a given Date (so we can compare with stored date strings).
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Combine "YYYY-MM-DD" + "HH:MM" into an epoch ms in local time.
function flightDepartureMs(f: Flight): number {
  if (!f.departureDate) return Number.NaN
  const time = f.departureTime || '00:00'
  return new Date(`${f.departureDate}T${time}`).getTime()
}

function flightArrivalMs(f: Flight): number {
  if (!f.arrivalDate && !f.departureDate) return Number.NaN
  const date = f.arrivalDate || f.departureDate
  const time = f.arrivalTime || f.departureTime || '00:00'
  return new Date(`${date}T${time}`).getTime()
}

/**
 * Derive a flight's effective status from its date/time. Buckets:
 *   - upcoming: hasn't departed yet
 *   - boarding: within 1h of departure
 *   - departed: departed but not arrived
 *   - arrived:  arrival time has passed
 *
 * Date-based shortcut: if the entire departure date is in the past (strictly
 * before today in local time), the flight is treated as arrived — without
 * this, a row whose time strings were tweaked or whose parse failed could
 * stay "upcoming" indefinitely after the day has passed.
 */
export function deriveFlightStatus(f: Flight, now: Date = new Date()): Flight['status'] {
  const todayStr = localDateStr(now)
  if (f.departureDate && f.departureDate < todayStr) return 'arrived'
  if (f.departureDate && f.departureDate > todayStr) return 'upcoming'

  // Same day as today (or unparseable date) — fall back to the timestamp check.
  const dep = flightDepartureMs(f)
  const arr = flightArrivalMs(f)
  const t = now.getTime()
  if (Number.isNaN(dep)) return f.status
  if (t < dep - 60 * 60 * 1000) return 'upcoming'
  if (t < dep) return 'boarding'
  if (Number.isNaN(arr) || t < arr) return 'departed'
  return 'arrived'
}

// Convenience: chronological ordering for flight lists/selection.
export function compareFlightsByDeparture(a: Flight, b: Flight): number {
  const aMs = flightDepartureMs(a)
  const bMs = flightDepartureMs(b)
  if (Number.isNaN(aMs) && Number.isNaN(bMs)) return 0
  if (Number.isNaN(aMs)) return 1
  if (Number.isNaN(bMs)) return -1
  return aMs - bMs
}

// The first flight that hasn't arrived yet (today's flight that's still
// boarding/in-flight counts), or null if every flight is in the past.
export function findNextFlight(flights: Flight[], now: Date = new Date()): Flight | null {
  const sorted = [...flights].sort(compareFlightsByDeparture)
  for (const f of sorted) {
    const status = deriveFlightStatus(f, now)
    if (status !== 'arrived') return f
  }
  return null
}
