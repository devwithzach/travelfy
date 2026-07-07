export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return res.status(503).json({ error: 'Email not configured' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { to, travelerName, packageName, destination, durationDays, price, currency, bookingId } = body

  if (!to || !packageName) return res.status(400).json({ error: 'Missing required fields' })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#10b981,#0d9488);padding:28px 24px">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Booking Confirmed!</h1>
      <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:14px">Your tour is locked in</p>
    </div>
    <div style="padding:24px">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">Hi ${travelerName || 'Traveler'},</p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px">
        Your booking has been confirmed by the operator. Here are your details:
      </p>
      <div style="background:#f1fdf8;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:40%">Package</td><td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600">${packageName}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Destination</td><td style="padding:4px 0;color:#111827;font-size:13px">${destination || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Duration</td><td style="padding:4px 0;color:#111827;font-size:13px">${durationDays || '—'} day${durationDays === 1 ? '' : 's'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Amount</td><td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600">${currency || 'PHP'} ${Number(price || 0).toLocaleString()}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;font-size:13px">Booking ID</td><td style="padding:4px 0;color:#111827;font-size:11px;font-family:monospace">${String(bookingId || '').slice(0, 8)}</td></tr>
        </table>
      </div>
      <a href="https://travelfy-global.vercel.app/tours" style="display:block;text-align:center;background:#10b981;color:#fff;text-decoration:none;padding:12px;border-radius:10px;font-weight:600;font-size:14px">
        View My Bookings
      </a>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f0f0f0;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">Travelfy — Your travel command center</p>
    </div>
  </div>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Travelfy <bookings@travelfy.app>',
        to: [to],
        subject: `Booking Confirmed: ${packageName}`,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(502).json({ error: data?.message || 'Email send failed' })
    }
    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    console.error('send-booking-email error:', err)
    return res.status(502).json({ error: 'Failed to send email' })
  }
}
