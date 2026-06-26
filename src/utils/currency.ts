import type { CurrencyRate } from '@/types'

// Best-guess local currency for a free-text destination string. Falls back to
// homeCurrency when nothing matches. Comparison is substring-based and
// case-insensitive so "Tokyo, Japan" → JPY, "Hong Kong–Macau" → HKD (first hit).
const DESTINATION_HINTS: Array<{ match: RegExp; currency: string }> = [
  { match: /hong\s*kong|hk\b/i, currency: 'HKD' },
  { match: /macau|macao/i, currency: 'MOP' },
  { match: /japan|tokyo|kyoto|osaka/i, currency: 'JPY' },
  { match: /singapore|sg\b/i, currency: 'SGD' },
  { match: /thailand|bangkok|phuket/i, currency: 'THB' },
  { match: /korea|seoul|busan/i, currency: 'KRW' },
  { match: /china|beijing|shanghai|shenzhen/i, currency: 'CNY' },
  { match: /taiwan|taipei/i, currency: 'TWD' },
  { match: /vietnam|hanoi|ho\s*chi\s*minh|saigon/i, currency: 'VND' },
  { match: /malaysia|kuala\s*lumpur/i, currency: 'MYR' },
  { match: /indonesia|bali|jakarta/i, currency: 'IDR' },
  { match: /philippines|manila|cebu/i, currency: 'PHP' },
  { match: /australia|sydney|melbourne/i, currency: 'AUD' },
  { match: /new\s*zealand|auckland|wellington/i, currency: 'NZD' },
  { match: /united\s*kingdom|uk\b|london|england/i, currency: 'GBP' },
  { match: /usa\b|united\s*states|new\s*york|los\s*angeles|chicago/i, currency: 'USD' },
  { match: /canada|toronto|vancouver/i, currency: 'CAD' },
  { match: /europe|france|paris|germany|berlin|spain|madrid|italy|rome/i, currency: 'EUR' },
  { match: /switzerland|zurich|geneva/i, currency: 'CHF' },
  { match: /uae|dubai|abu\s*dhabi/i, currency: 'AED' },
]

export function guessLocalCurrency(destination: string, fallback: string): string {
  for (const { match, currency } of DESTINATION_HINTS) {
    if (match.test(destination)) return currency
  }
  return fallback
}

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
