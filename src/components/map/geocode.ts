// Lazy address geocoder backed by Nominatim (OpenStreetMap). Results are cached
// in localStorage to avoid hammering the public API and to respect their usage
// policy (https://operations.osmfoundation.org/policies/nominatim/).

const CACHE_KEY = 'travelfy-geocode-cache-v2'
const NEGATIVE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

interface CacheEntry {
  lat: number | null
  lon: number | null
  ts: number
}

type Cache = Record<string, CacheEntry>

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // quota exceeded — ignore
  }
}

const inflight = new Map<string, Promise<{ lat: number; lon: number } | null>>()

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  const key = query.trim().toLowerCase()
  if (!key) return null

  const cache = readCache()
  const hit = cache[key]
  if (hit) {
    if (hit.lat !== null && hit.lon !== null) return { lat: hit.lat, lon: hit.lon }
    if (Date.now() - hit.ts < NEGATIVE_TTL_MS) return null
    // negative cache expired — retry
  }

  if (inflight.has(key)) return inflight.get(key)!

  const promise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      const first = data[0]
      const result = first
        ? { lat: Number(first.lat), lon: Number(first.lon) }
        : null
      cache[key] = { lat: result?.lat ?? null, lon: result?.lon ?? null, ts: Date.now() }
      writeCache(cache)
      return result && Number.isFinite(result.lat) && Number.isFinite(result.lon) ? result : null
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

// ── Reverse geocoding ─────────────────────────────────────

const REVERSE_CACHE_KEY = 'travelfy-reverse-geocode-cache-v2'
const REVERSE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface ReverseGeocodeResult {
  label: string | null       // "Kowloon, Hong Kong"
  region: string | null      // "Kowloon"
  country: string | null     // "Hong Kong"
  countryCode: string | null // ISO-3166-1 alpha-2, lowercased, e.g. "hk"
}

interface ReverseEntry extends ReverseGeocodeResult {
  ts: number
}

type ReverseCache = Record<string, ReverseEntry>

function readReverseCache(): ReverseCache {
  try {
    const raw = localStorage.getItem(REVERSE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as ReverseCache) : {}
  } catch { return {} }
}

function writeReverseCache(c: ReverseCache) {
  try { localStorage.setItem(REVERSE_CACHE_KEY, JSON.stringify(c)) } catch { /* noop */ }
}

const reverseInflight = new Map<string, Promise<ReverseGeocodeResult>>()

const EMPTY: ReverseGeocodeResult = { label: null, region: null, country: null, countryCode: null }

// Reverse geocode lat/lon → structured place fields (region + country + ISO
// country code for flag emoji). Cached 30 days.
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  // Round to 3 decimals (~110m) so nearby calls share a cache entry.
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`

  const cache = readReverseCache()
  const hit = cache[key]
  if (hit && Date.now() - hit.ts < REVERSE_TTL_MS) {
    const { label, region, country, countryCode } = hit
    return { label, region, country, countryCode }
  }

  if (reverseInflight.has(key)) return reverseInflight.get(key)!

  const promise = (async (): Promise<ReverseGeocodeResult> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&accept-language=en`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { address?: Record<string, string>; display_name?: string }
      const a = data.address ?? {}
      const region =
        a.suburb || a.neighbourhood || a.city_district ||
        a.city || a.town || a.village || a.county || a.state || null
      const country = a.country || null
      const countryCode = a.country_code ? a.country_code.toLowerCase() : null
      const label = [region, country].filter(Boolean).join(', ') || data.display_name || null
      const result: ReverseGeocodeResult = { label, region, country, countryCode }
      cache[key] = { ...result, ts: Date.now() }
      writeReverseCache(cache)
      return result
    } catch {
      return EMPTY
    } finally {
      reverseInflight.delete(key)
    }
  })()

  reverseInflight.set(key, promise)
  return promise
}

// ISO-3166-1 alpha-2 → flag emoji (regional indicator symbols).
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  const A = 0x1F1E6 // Regional Indicator Symbol Letter A
  const a = 'a'.charCodeAt(0)
  const cc = code.toLowerCase()
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - a),
    A + (cc.charCodeAt(1) - a),
  )
}
