import type { Flight } from '@/types'

// Combine "YYYY-MM-DD" + "HH:MM" into an epoch ms in local time.
// Returns NaN if either is missing or malformed — callers should treat as
// "unknown time" rather than a hard error.
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
 * Derive a flight's effective status from its date/time. Falls back to the
 * stored status only when dates are missing or unparseable. Buckets:
 *   - upcoming: hasn't departed yet
 *   - boarding: within 1h of departure
 *   - departed: departed but not arrived
 *   - arrived:  arrival time has passed
 */
export function deriveFlightStatus(f: Flight, now: Date = new Date()): Flight['status'] {
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

// The first flight that hasn't departed yet, or null if every flight is past.
export function findNextFlight(flights: Flight[], now: Date = new Date()): Flight | null {
  const t = now.getTime()
  const sorted = [...flights].sort(compareFlightsByDeparture)
  for (const f of sorted) {
    const dep = flightDepartureMs(f)
    if (Number.isNaN(dep) || dep > t) return f
  }
  return null
}
