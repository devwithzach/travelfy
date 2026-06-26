import type { CurrencyRate } from '@/types'

// Return the exchange rate from→to, or null if neither a direct nor inverse
// rate exists. A two-hop pivot through any common currency (typically USD) is
// also tried so that PHP→JPY works when only PHP↔USD and USD↔JPY are stored.
export function getRate(rates: CurrencyRate[], from: string, to: string): number | null {
  if (from === to) return 1

  const direct = rates.find(r => r.from === from && r.to === to)
  if (direct) return direct.rate

  const reverse = rates.find(r => r.from === to && r.to === from)
  if (reverse) return 1 / reverse.rate

  // Two-hop: find any pivot currency reachable from both sides.
  for (const fromRate of rates) {
    const pivot = fromRate.from === from
      ? fromRate.to
      : fromRate.to === from
        ? fromRate.from
        : null
    if (!pivot || pivot === to) continue
    const fromToPivot = fromRate.from === from ? fromRate.rate : 1 / fromRate.rate
    const pivotToTarget = getRateSingleHop(rates, pivot, to)
    if (pivotToTarget !== null) return fromToPivot * pivotToTarget
  }

  return null
}

function getRateSingleHop(rates: CurrencyRate[], from: string, to: string): number | null {
  if (from === to) return 1
  const direct = rates.find(r => r.from === from && r.to === to)
  if (direct) return direct.rate
  const reverse = rates.find(r => r.from === to && r.to === from)
  if (reverse) return 1 / reverse.rate
  return null
}

// Convert amount from one currency to another. Returns null if no rate path
// exists — callers should treat that as "skip this expense" rather than
// silently treating the unconverted amount as if it were in homeCurrency.
export function convert(
  rates: CurrencyRate[],
  amount: number,
  from: string,
  to: string,
): number | null {
  const rate = getRate(rates, from, to)
  return rate === null ? null : amount * rate
}

// Sum a list of expenses in the target currency. Expenses we can't convert
// are skipped and counted separately so callers can surface a warning.
export function sumExpenses<T extends { amount: number; currency: string }>(
  rates: CurrencyRate[],
  expenses: T[],
  targetCurrency: string,
): { total: number; unconvertedCount: number } {
  let total = 0
  let unconvertedCount = 0
  for (const e of expenses) {
    const converted = convert(rates, e.amount, e.currency, targetCurrency)
    if (converted === null) unconvertedCount++
    else total += converted
  }
  return { total, unconvertedCount }
}
