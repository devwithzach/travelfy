import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { subscription, userId } = body

  if (!subscription?.endpoint || !userId) {
    return res.status(400).json({ error: 'Missing subscription or userId' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh ?? '',
    auth_key: subscription.keys?.auth ?? '',
  }, { onConflict: 'user_id,endpoint' })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
