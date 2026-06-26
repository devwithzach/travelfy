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

const REVERSE_CACHE_KEY = 'travelfy-reverse-geocode-cache-v1'
const REVERSE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

interface ReverseEntry {
  label: string | null
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

const reverseInflight = new Map<string, Promise<string | null>>()

// Reverse geocode lat/lon → a short human-readable place label like
// "Kowloon, Hong Kong" or "Manila, Philippines". Cached 30 days.
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  // Round to 3 decimals (~110m) so nearby calls share a cache entry.
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`

  const cache = readReverseCache()
  const hit = cache[key]
  if (hit && Date.now() - hit.ts < REVERSE_TTL_MS) return hit.label

  if (reverseInflight.has(key)) return reverseInflight.get(key)!

  const promise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&accept-language=en`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { address?: Record<string, string>; display_name?: string }
      const a = data.address ?? {}
      // Build a 2-part label: a smaller region + the country.
      const region =
        a.suburb || a.neighbourhood || a.city_district ||
        a.city || a.town || a.village || a.county || a.state || ''
      const country = a.country || ''
      const label = [region, country].filter(Boolean).join(', ') || data.display_name || null
      cache[key] = { label, ts: Date.now() }
      writeReverseCache(cache)
      return label
    } catch {
      return null
    } finally {
      reverseInflight.delete(key)
    }
  })()

  reverseInflight.set(key, promise)
  return promise
}
