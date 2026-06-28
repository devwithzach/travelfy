import type { PassportInfo, VisaInfo, TripInfo } from '@/types'

export type Severity = 'critical' | 'warning'

export interface ExpiryAlert {
  id: string
  severity: Severity
  title: string
  detail: string
  /** Routing hint for the consumer. */
  href: string
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function parse(d: string | undefined | null): Date | null {
  if (!d) return null
  const t = new Date(d + 'T00:00:00')
  return Number.isNaN(t.getTime()) ? null : t
}

/**
 * Compute every passport + visa risk worth surfacing on Dashboard.
 *   - Passport expired or expiring within 30 days: critical
 *   - Passport expiring within 6 months: warning (most countries require this)
 *   - Visa expired: critical
 *   - Visa expires before the trip ends: critical
 *   - Visa expires within 14 days after trip end: warning
 */
export function computeExpiryAlerts(
  passport: PassportInfo | undefined,
  visas: VisaInfo[],
  trip: TripInfo,
  now: Date = new Date(),
): ExpiryAlert[] {
  // Important: do NOT mutate the caller's `now` Date — callers (Dashboard)
  // store it in React state and use it to render the current time. Use a
  // midnight-anchored clone for day-bucket math instead.
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const alerts: ExpiryAlert[] = []
  const tripEnd = parse(trip.endDate)

  // ── Passport ──
  const passportExp = parse(passport?.expiryDate)
  if (passportExp) {
    const days = daysBetween(today, passportExp)
    if (days < 0) {
      alerts.push({
        id: 'passport-expired',
        severity: 'critical',
        title: 'Passport expired',
        detail: `Expired ${-days} day${-days === 1 ? '' : 's'} ago — renew before flying.`,
        href: '/passport',
      })
    } else if (days <= 30) {
      alerts.push({
        id: 'passport-1mo',
        severity: 'critical',
        title: 'Passport expires soon',
        detail: `${days} day${days === 1 ? '' : 's'} left — most countries deny entry with <6 months validity.`,
        href: '/passport',
      })
    } else if (days <= 180) {
      alerts.push({
        id: 'passport-6mo',
        severity: 'warning',
        title: 'Passport <6 months from expiry',
        detail: `${days} day${days === 1 ? '' : 's'} left. Many destinations require 6 months past entry.`,
        href: '/passport',
      })
    }
  }

  // ── Visas ──
  for (const v of visas) {
    if (v.status === 'expired') {
      alerts.push({
        id: `visa-expired-${v.id}`,
        severity: 'critical',
        title: `${v.country} visa expired`,
        detail: 'Renew before travel.',
        href: '/passport',
      })
      continue
    }
    const visaExp = parse(v.expiryDate)
    if (!visaExp) continue
    const daysToVisa = daysBetween(today, visaExp)
    if (daysToVisa < 0) {
      alerts.push({
        id: `visa-past-${v.id}`,
        severity: 'critical',
        title: `${v.country} visa expired`,
        detail: `Expired ${-daysToVisa} day${-daysToVisa === 1 ? '' : 's'} ago.`,
        href: '/passport',
      })
      continue
    }
    if (tripEnd) {
      const tripEndToVisa = daysBetween(tripEnd, visaExp)
      if (tripEndToVisa < 0) {
        alerts.push({
          id: `visa-before-trip-end-${v.id}`,
          severity: 'critical',
          title: `${v.country} visa expires mid-trip`,
          detail: `Visa ends ${-tripEndToVisa} day${-tripEndToVisa === 1 ? '' : 's'} before trip end.`,
          href: '/passport',
        })
        continue
      }
      if (tripEndToVisa <= 14) {
        alerts.push({
          id: `visa-close-to-trip-end-${v.id}`,
          severity: 'warning',
          title: `${v.country} visa tight on trip end`,
          detail: `Visa expires only ${tripEndToVisa} day${tripEndToVisa === 1 ? '' : 's'} after the trip.`,
          href: '/passport',
        })
      }
    }
  }

  // Sort critical first.
  return alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))
}
