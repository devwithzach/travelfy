import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@travelfy.app'

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: 'Push not configured' })
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { userId, title, message, url } = body

  if (!userId || !title) return res.status(400).json({ error: 'Missing userId or title' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 })

  const payload = JSON.stringify({ title, body: message, url: url || '/tours' })
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return res.status(200).json({ sent, total: subs.length })
}
