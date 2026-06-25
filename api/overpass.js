export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let query
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    query = body?.query
  } catch {
    return res.status(400).json({ error: 'Invalid body' })
  }

  if (!query) return res.status(400).json({ error: 'Missing query' })

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

  return res.status(502).json({ error: 'All Overpass endpoints failed', details: errors })
}
