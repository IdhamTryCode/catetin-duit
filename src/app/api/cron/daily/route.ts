import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
  sendPremiumExpiringEmail,
} from '@/lib/email'
import { TRIAL_REMINDER_DAYS, PREMIUM_REMINDER_DAYS } from '@/lib/constants'

/**
 * Validate that the request originates from Vercel Cron or an authorized manual trigger.
 *
 * Two accepted authorization paths:
 * 1. Vercel Cron: sends `x-vercel-cron: 1` header automatically.
 * 2. Manual trigger (GitHub Actions, cron-job.org, etc.): sends `Authorization: Bearer <CRON_SECRET>`.
 */
function isAuthorized(req: NextRequest): boolean {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const hasValidSecret = secret && authHeader === `Bearer ${secret}`
  return isVercelCron || !!hasValidSecret
}

/**
 * Calculate the number of days between now and a future/past date string.
 * Positive = date is in the future (e.g. +3 means 3 days from now).
 * Negative = date is in the past.
 */
function daysBetween(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

/**
 * GET /api/cron/daily
 *
 * Scheduled job that runs daily. Handles three tasks:
 * 1. Trial reminders — emails users H-3 and H-1 before trial ends.
 * 2. Trial expiry    — marks expired trials as 'trial_expired' and sends email.
 * 3. Premium reminders — emails premium users H-3 and H-1 before subscription ends.
 *
 * Returns a summary of actions taken and any errors encountered.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = {
    trial_reminder: 0,
    trial_expired: 0,
    premium_expiring: 0,
    errors: [] as string[],
  }

  // ─── 1. Trial reminder (H-3 dan H-1) ──────────────────────────────────────
  const { data: trialUsers, error: trialErr } = await supabase
    .from('profiles')
    .select('id, full_name, trial_ends_at')
    .eq('subscription_status', 'trial')
    .not('trial_ends_at', 'is', null)

  if (trialErr) {
    results.errors.push(`trial_query: ${trialErr.message}`)
  } else {
    for (const profile of trialUsers ?? []) {
      const days = daysBetween(profile.trial_ends_at)
      if (!(TRIAL_REMINDER_DAYS as readonly number[]).includes(days)) continue

      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      try {
        await sendTrialReminderEmail(
          user.email,
          profile.full_name ?? 'Pengguna',
          days,
          profile.trial_ends_at,
        )
        results.trial_reminder++
      } catch (e) {
        results.errors.push(`trial_reminder ${user.email}: ${e}`)
      }
    }
  }

  // ─── 2. Trial expired (status masih 'trial' tapi sudah lewat) ─────────────
  const { data: expiredTrialUsers, error: expiredErr } = await supabase
    .from('profiles')
    .select('id, full_name, trial_ends_at')
    .eq('subscription_status', 'trial')
    .lt('trial_ends_at', new Date().toISOString())

  if (expiredErr) {
    results.errors.push(`expired_query: ${expiredErr.message}`)
  } else {
    for (const profile of expiredTrialUsers ?? []) {
      await supabase
        .from('profiles')
        .update({ subscription_status: 'trial_expired' })
        .eq('id', profile.id)

      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      try {
        await sendTrialExpiredEmail(user.email, profile.full_name ?? 'Pengguna')
        results.trial_expired++
      } catch (e) {
        results.errors.push(`trial_expired ${user.email}: ${e}`)
      }
    }
  }

  // ─── 3. Premium expiring (H-3 dan H-1) ────────────────────────────────────
  const { data: premiumUsers, error: premiumErr } = await supabase
    .from('profiles')
    .select('id, full_name, subscription_ends_at')
    .eq('subscription_status', 'premium')
    .not('subscription_ends_at', 'is', null)

  if (premiumErr) {
    results.errors.push(`premium_query: ${premiumErr.message}`)
  } else {
    for (const profile of premiumUsers ?? []) {
      if (!profile.subscription_ends_at) continue
      const days = daysBetween(profile.subscription_ends_at)
      if (!(PREMIUM_REMINDER_DAYS as readonly number[]).includes(days)) continue

      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      try {
        await sendPremiumExpiringEmail(
          user.email,
          profile.full_name ?? 'Pengguna',
          days,
          profile.subscription_ends_at,
        )
        results.premium_expiring++
      } catch (e) {
        results.errors.push(`premium_expiring ${user.email}: ${e}`)
      }
    }
  }

  const hasErrors = results.errors.length > 0
  console.log('[cron/daily]', results)

  return NextResponse.json(
    { ok: !hasErrors, ...results },
    { status: hasErrors ? 207 : 200 },
  )
}
