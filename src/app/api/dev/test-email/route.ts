import { NextRequest, NextResponse } from 'next/server'
import {
  sendWelcomeEmail,
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendPremiumExpiringEmail,
} from '@/lib/email'

// Only available in development
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'welcome'
  const to = searchParams.get('to') ?? 'test@example.com'
  const name = searchParams.get('name') ?? 'Budi Santoso'

  let result

  switch (type) {
    case 'welcome':
      result = await sendWelcomeEmail(to, name)
      break

    case 'trial-reminder-3':
      result = await sendTrialReminderEmail(to, name, 3, new Date(Date.now() + 3 * 86400000).toISOString())
      break

    case 'trial-reminder-1':
      result = await sendTrialReminderEmail(to, name, 1, new Date(Date.now() + 86400000).toISOString())
      break

    case 'trial-expired':
      result = await sendTrialExpiredEmail(to, name)
      break

    case 'payment-success':
      result = await sendPaymentSuccessEmail(
        to,
        name,
        29000,
        'INV-TEST-20260323',
        new Date(Date.now() + 30 * 86400000).toISOString(),
      )
      break

    case 'payment-failed':
      result = await sendPaymentFailedEmail(to, name)
      break

    case 'premium-expiring-3':
      result = await sendPremiumExpiringEmail(to, name, 3, new Date(Date.now() + 3 * 86400000).toISOString())
      break

    case 'premium-expiring-1':
      result = await sendPremiumExpiringEmail(to, name, 1, new Date(Date.now() + 86400000).toISOString())
      break

    default:
      return NextResponse.json({
        error: 'Unknown type',
        available: [
          'welcome',
          'trial-reminder-3',
          'trial-reminder-1',
          'trial-expired',
          'payment-success',
          'payment-failed',
          'premium-expiring-3',
          'premium-expiring-1',
        ],
      }, { status: 400 })
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, type, to, id: result.data?.id })
}
