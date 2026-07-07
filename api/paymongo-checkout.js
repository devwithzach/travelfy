export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.PAYMONGO_SECRET_KEY
  if (!secret) return res.status(503).json({ error: 'PayMongo not configured' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { bookingId, packageName, price, currency, successUrl, cancelUrl } = body

  if (!bookingId || !price || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const amount = Math.round(Number(price) * 100)

  const payload = {
    data: {
      attributes: {
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        line_items: [{
          currency: 'PHP',
          amount,
          description: `Tour booking #${String(bookingId).slice(0, 8)}`,
          name: String(packageName).slice(0, 100),
          quantity: 1,
        }],
        payment_method_types: ['gcash', 'paymaya', 'card', 'dob', 'dob_ubp'],
        success_url: successUrl,
        cancel_url: cancelUrl,
        description: 'Travelfy tour booking',
        metadata: { booking_id: String(bookingId) },
      },
    },
  }

  try {
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()
    if (!response.ok) {
      const msg = data?.errors?.[0]?.detail || 'PayMongo request failed'
      return res.status(502).json({ error: msg })
    }

    return res.status(200).json({
      checkoutUrl: data.data?.attributes?.checkout_url,
      sessionId: data.data?.id,
    })
  } catch (err) {
    console.error('paymongo-checkout error:', err)
    return res.status(502).json({ error: 'Failed to connect to PayMongo' })
  }
}
