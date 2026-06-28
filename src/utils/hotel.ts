import type { Hotel } from '@/types'

export type HotelPhase = 'upcoming' | 'staying' | 'past'

export interface HotelStatus {
  hotel: Hotel
  phase: HotelPhase
  /** "Tonight" / "Tomorrow" / "In 3 days" / "Now" / formatted date — context-aware. */
  label: string
  /** ms epoch of the relevant boundary (check-in for upcoming, check-out for staying). */
  pivotMs: number
}

// Default check-in 15:00, check-out 11:00 — most hotels worldwide.
const DEFAULT_CHECKIN_TIME = '15:00'
const DEFAULT_CHECKOUT_TIME = '11:00'

function parse(date: string, time: string): number {
  if (!date) return Number.NaN
  return new Date(`${date}T${time || '00:00'}`).getTime()
}

function daysUntil(ms: number, now: Date): number {
  const t = new Date(ms)
  t.setHours(0, 0, 0, 0)
  const n = new Date(now)
  n.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - n.getTime()) / (1000 * 60 * 60 * 24))
}

function phaseLabel(diffDays: number, isCheckin: boolean): string {
  if (diffDays < 0) return isCheckin ? 'Already started' : 'Past'
  if (diffDays === 0) return isCheckin ? 'Tonight' : 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `In ${diffDays} days`
}

/**
 * Pick the most relevant hotel right now:
 *   - If a hotel's check-in <= now < check-out  → 'staying' (highest priority)
 *   - Otherwise: the hotel with the next future check-in → 'upcoming'
 *   - If all hotels are past → null
 */
export function findActiveOrNextHotel(hotels: Hotel[], now: Date = new Date()): HotelStatus | null {
  if (hotels.length === 0) return null
  const nowMs = now.getTime()

  // First pass: any hotel we're currently staying at?
  for (const h of hotels) {
    const inMs = parse(h.checkIn, DEFAULT_CHECKIN_TIME)
    const outMs = parse(h.checkOut, DEFAULT_CHECKOUT_TIME)
    if (Number.isNaN(inMs) || Number.isNaN(outMs)) continue
    if (inMs <= nowMs && nowMs < outMs) {
      return {
        hotel: h,
        phase: 'staying',
        label: phaseLabel(daysUntil(outMs, now), false),
        pivotMs: outMs,
      }
    }
  }

  // Second pass: nearest upcoming check-in.
  const upcoming = hotels
    .map(h => ({ hotel: h, inMs: parse(h.checkIn, DEFAULT_CHECKIN_TIME) }))
    .filter(x => !Number.isNaN(x.inMs) && x.inMs > nowMs)
    .sort((a, b) => a.inMs - b.inMs)
  if (upcoming.length > 0) {
    const next = upcoming[0]
    return {
      hotel: next.hotel,
      phase: 'upcoming',
      label: phaseLabel(daysUntil(next.inMs, now), true),
      pivotMs: next.inMs,
    }
  }

  return null
}
