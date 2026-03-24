import { type SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { PLAN_LIMITS, type Plan } from '@/lib/constants'

/**
 * Check whether a user can still create a transaction today based on their plan's
 * daily limit. Uses `created_at` (not `transaction_date`) so manually backdated
 * entries still count toward today's quota.
 *
 * @returns `{ allowed: true }` or `{ allowed: false, used, limit }`
 */
export async function checkDailyTransactionLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].dailyTransactions

  // Pro plan has no limit — skip DB query entirely
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity }
  }

  const todayStart = `${format(new Date(), 'yyyy-MM-dd')}T00:00:00.000Z`
  const todayEnd   = `${format(new Date(), 'yyyy-MM-dd')}T23:59:59.999Z`

  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)

  if (error) {
    // Fail open — don't block users if the count query errors
    console.error('[checkDailyTransactionLimit] count error:', error.message)
    return { allowed: true, used: 0, limit }
  }

  const used = count ?? 0
  return { allowed: used < limit, used, limit }
}
