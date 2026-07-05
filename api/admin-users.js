import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://travelfy.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).set(corsHeaders).end()
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v))

  // Verify caller is authenticated + is admin
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  // Service-role client (bypasses RLS) — only for admin operations
  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify the caller's JWT and check their role
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — admin only' })
  }

  // ── GET: list all users + stats ────────────────────────────────────────────
  if (req.method === 'GET') {
    // Fetch all user_profiles (includes role + email)
    const { data: profiles, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileErr) return res.status(500).json({ error: profileErr.message })

    // Fetch all trips (just id + user_id) to compute trip counts per user
    const { data: trips } = await adminClient
      .from('trips')
      .select('id, user_id')

    const tripCountByUser = {}
    if (trips) {
      trips.forEach(t => {
        tripCountByUser[t.user_id] = (tripCountByUser[t.user_id] || 0) + 1
      })
    }

    // Enrich profiles with trip counts
    const users = (profiles || []).map(p => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: p.role,
      trip_count: tripCountByUser[p.id] || 0,
      created_at: p.created_at,
      last_sign_in_at: '',
    }))

    // Compute stats
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const stats = {
      total_users: users.length,
      total_trips: trips?.length ?? 0,
      operators: users.filter(u => u.role === 'operator').length,
      admins: users.filter(u => u.role === 'admin').length,
      new_this_week: users.filter(u => u.created_at > oneWeekAgo).length,
    }

    return res.status(200).json({ users, stats })
  }

  // ── PATCH: update a user's role ────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { userId, role } = req.body || {}
    if (!userId || !['traveler', 'operator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'userId and valid role required' })
    }

    // Prevent self-demotion
    if (userId === user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    const { error: updateErr } = await adminClient
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)

    if (updateErr) return res.status(500).json({ error: updateErr.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
