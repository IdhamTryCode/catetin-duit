import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const SUBSCRIPTION_PRICE = 29000

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.TRIPAY_API_KEY
  const privateKey = process.env.TRIPAY_PRIVATE_KEY
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE

  if (!apiKey || !privateKey || !merchantCode) {
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
  }

  const merchantRef = `SUB_${user.id}_${Date.now()}`
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(`${merchantCode}${merchantRef}${SUBSCRIPTION_PRICE}`)
    .digest('hex')

  // Create Tripay transaction
  const tripayRes = await fetch('https://tripay.co.id/api/transaction/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: SUBSCRIPTION_PRICE,
      customer_name: user.email,
      customer_email: user.email,
      order_items: [{ name: 'Catetin Duit Premium 1 Bulan', price: SUBSCRIPTION_PRICE, quantity: 1 }],
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      signature,
    }),
  })

  const tripayData = await tripayRes.json()

  if (!tripayData.success) {
    return NextResponse.json({ error: tripayData.message }, { status: 400 })
  }

  // Save payment record
  const adminSupabase = await createAdminClient()
  await adminSupabase.from('payments').insert({
    user_id: user.id,
    tripay_reference: tripayData.data.reference,
    tripay_merchant_ref: merchantRef,
    idempotency_key: tripayData.data.reference,
    amount: SUBSCRIPTION_PRICE,
    status: 'pending',
    payment_method: 'QRIS',
    expires_at: new Date(tripayData.data.expired_time * 1000).toISOString(),
  })

  return NextResponse.json({
    payment_url: tripayData.data.checkout_url,
    reference: tripayData.data.reference,
  })
}
