// Currency rate fetcher backed by open.er-api.com (free, no auth, 161
// currencies, updated daily from ECB + IMF feeds). Spec:
//   GET https://open.er-api.com/v6/latest/{BASE}
//   -> { result: 'success', base_code: 'USD', rates: { PHP: 56.8, HKD: 7.8, ... }, time_last_update_unix: 1719... }

const CACHE_KEY_PREFIX = 'travelfy-fx-'
const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

interface CachedRates {
  base: string
  rates: Record<string, number>
  ts: number
}

export interface FetchedRates {
  base: string
  rates: Record<string, number>
  /** Source timestamp (ms epoch) from the upstream feed. */
  sourceTs: number
}

function readCache(base: string): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + base.toUpperCase())
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedRates
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(entry: CachedRates) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + entry.base.toUpperCase(), JSON.stringify(entry))
  } catch {
    // quota — ignore
  }
}

const inflight = new Map<string, Promise<FetchedRates>>()

/**
 * Fetch a fresh rate table for `base`. Returns cached entry if it's <6h old
 * and `force` isn't set.
 */
export async function fetchRates(base: string, opts: { force?: boolean } = {}): Promise<FetchedRates> {
  const key = base.toUpperCase()
  if (!opts.force) {
    const hit = readCache(key)
    if (hit) return { base: hit.base, rates: hit.rates, sourceTs: hit.ts }
  }
  if (inflight.has(key)) return inflight.get(key)!

  const promise = (async () => {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(key)}`, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) throw new Error(`FX API HTTP ${res.status}`)
    const data = await res.json() as {
      result?: string
      base_code?: string
      rates?: Record<string, number>
      time_last_update_unix?: number
      'error-type'?: string
    }
    if (data.result !== 'success' || !data.rates) {
      throw new Error(data['error-type'] || 'Unknown FX API error')
    }
    const ts = (data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now())
    const entry: CachedRates = { base: data.base_code || key, rates: data.rates, ts }
    writeCache(entry)
    return { base: entry.base, rates: entry.rates, sourceTs: ts }
  })()
    .finally(() => { inflight.delete(key) })

  inflight.set(key, promise)
  return promise
}
