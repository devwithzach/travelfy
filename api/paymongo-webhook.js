import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function verifySignature(rawBody, header, secret) {
  const parts = Object.fromEntries(
    header.split(',').map(p => p.split('='))
  )
  const timestamp = parts['t']
  const signature = parts['v1']
  if (!timestamp || !signature) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await getRawBody(req)

  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (webhookSecret) {
    const sigHeader = req.headers['paymongo-signature'] ?? ''
    if (!verifySignature(rawBody, sigHeader, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const eventType = event?.data?.attributes?.type
  if (
    eventType === 'checkout.session.completed' ||
    eventType === 'checkout.session.payment.paid'
  ) {
    const sessionData = event.data?.attributes?.data
    const bookingId = sessionData?.attributes?.metadata?.booking_id
    const sessionId = event.data?.attributes?.data?.id ?? ''

    if (bookingId) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      )
      await supabase
        .from('tour_bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          paymongo_session_id: sessionId,
        })
        .eq('id', bookingId)

      // Fetch booking details for confirmation email
      const { data: bookingData } = await supabase
        .from('tour_bookings')
        .select('traveler_email, traveler_name, package_id, tour_packages(name, destination, duration_days, price, currency)')
        .eq('id', bookingId)
        .single()

      if (bookingData) {
        const pkg = bookingData.tour_packages
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://travelfy-global.vercel.app'

        await fetch(`${baseUrl}/api/send-booking-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: bookingData.traveler_email,
            travelerName: bookingData.traveler_name,
            packageName: pkg?.name ?? '',
            destination: pkg?.destination ?? '',
            durationDays: pkg?.duration_days ?? 0,
            price: pkg?.price ?? 0,
            currency: pkg?.currency ?? 'PHP',
            bookingId,
          }),
        }).catch(() => {})
      }
    }
  }

  return res.status(200).json({ received: true })
}
