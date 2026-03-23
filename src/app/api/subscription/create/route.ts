import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const SUBSCRIPTION_PRICE = 29000
const IS_SANDBOX = process.env.NODE_ENV !== 'production'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.DUITKU_API_KEY
  const merchantCode = process.env.DUITKU_MERCHANT_CODE

  if (!apiKey || !merchantCode) {
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
  }

  const merchantOrderId = `SUB_${user.id}_${Date.now()}`
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHash('sha256')
    .update(`${merchantCode}${timestamp}${apiKey}`)
    .digest('hex')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const baseUrl = IS_SANDBOX
    ? 'https://api-sandbox.duitku.com/api/merchant/createInvoice'
    : 'https://api-prod.duitku.com/api/merchant/createInvoice'

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const nameParts = fullName.split(' ')
  const firstName = nameParts[0] ?? fullName
  const lastName = nameParts.slice(1).join(' ') || firstName

  const duitkuRes = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-duitku-signature': signature,
      'x-duitku-timestamp': timestamp,
      'x-duitku-merchantcode': merchantCode,
    },
    body: JSON.stringify({
      paymentAmount: SUBSCRIPTION_PRICE,
      merchantOrderId,
      productDetails: 'Catetin Duit Premium 1 Bulan',
      email: user.email,
      customerVaName: fullName || user.email,
      itemDetails: [
        { name: 'Catetin Duit Premium 1 Bulan', price: SUBSCRIPTION_PRICE, quantity: 1 },
      ],
      customerDetail: {
        firstName,
        lastName,
        email: user.email,
      },
      callbackUrl: `${appUrl}/api/webhooks/duitku`,
      returnUrl: `${appUrl}/dashboard/subscription`,
      expiryPeriod: 1440, // 24 hours in minutes
    }),
  })

  const duitkuData = await duitkuRes.json() as {
    statusCode: string
    statusMessage: string
    reference: string
    paymentUrl: string
  }

  if (duitkuData.statusCode !== '00') {
    return NextResponse.json({ error: duitkuData.statusMessage }, { status: 400 })
  }

  // Save payment record
  const adminSupabase = await createAdminClient()
  await adminSupabase.from('payments').insert({
    user_id: user.id,
    gateway_reference: duitkuData.reference,
    merchant_order_id: merchantOrderId,
    idempotency_key: duitkuData.reference,
    amount: SUBSCRIPTION_PRICE,
    status: 'pending',
    payment_method: 'DUITKU',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })

  return NextResponse.json({
    payment_url: duitkuData.paymentUrl,
    reference: duitkuData.reference,
  })
}
