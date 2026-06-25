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
