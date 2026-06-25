const MAX_QUERY_BYTES = 4096

function isOriginAllowed(origin, allowList) {
  if (!origin) return false
  if (allowList.length === 0) return true
  return allowList.includes(origin)
}

export default async function handler(req, res) {
  const allowList = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const origin = req.headers.origin || ''
  const allowed = isOriginAllowed(origin, allowList)

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(allowed ? 200 : 403).end()
  if (!allowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let query
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    query = body?.query
  } catch {
    return res.status(400).json({ error: 'Invalid body' })
  }

  if (typeof query !== 'string' || query.length === 0) {
    return res.status(400).json({ error: 'Missing query' })
  }
  if (Buffer.byteLength(query, 'utf8') > MAX_QUERY_BYTES) {
    return res.status(413).json({ error: 'Query too large' })
  }
  if (!/^\s*\[out:json\b/.test(query)) {
    return res.status(400).json({ error: 'Query must start with [out:json ...]' })
  }

  const ENDPOINTS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ]

  const formBody = `data=${encodeURIComponent(query)}`
  const errors = []

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Travelfy/1.0',
        },
        body: formBody,
        signal: AbortSignal.timeout(18000),
      })

      if (response.ok) {
        const data = await response.json()
        return res.status(200).json(data)
      }

      errors.push(`${endpoint}: HTTP ${response.status}`)
    } catch (err) {
      errors.push(`${endpoint}: ${err?.message || 'timeout'}`)
    }
  }

  console.error('Overpass proxy: all endpoints failed', errors)
  return res.status(502).json({ error: 'All Overpass endpoints failed', details: errors })
}
