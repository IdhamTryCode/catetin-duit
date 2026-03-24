// ─── Enums ────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'
export type TransactionSource = 'telegram' | 'web' | 'import'
export type SubscriptionStatus =
  | 'trial'
  | 'premium'
  | 'trial_expired'
  | 'cancelled'
  | 'grace_period'
export type UserRole = 'user' | 'admin'
export type Plan = 'free' | 'starter' | 'premium'

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: TransactionType | 'both'
  icon: string | null
  color: string | null
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string | null
  description: string | null
  source: TransactionSource
  raw_message: string | null
  ai_confidence: number | null
  needs_review: boolean
  transaction_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  plan: Plan
  telegram_chat_id: number | null
  subscription_status: SubscriptionStatus
  trial_started_at: string
  trial_ends_at: string
  subscription_started_at: string | null
  subscription_ends_at: string | null
  grace_period_ends_at: string | null
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── Query Result Types (with joins) ──────────────────────────────────────────

/** Category as returned by Supabase many-to-one join (object, not array) */
export type CategoryJoin = Pick<Category, 'name' | 'icon'> | null

export interface TransactionWithCategory extends Transaction {
  categories: CategoryJoin
}

/** Lightweight type for dashboard recent transactions list */
export interface RecentTransaction {
  id: string
  amount: number
  type: TransactionType
  description: string | null
  transaction_date: string
  needs_review: boolean
  categories: CategoryJoin
}

/** Lightweight type for transactions table (list page) */
export interface TransactionRow {
  id: string
  amount: number
  type: TransactionType
  description: string | null
  transaction_date: string
  needs_review: boolean
  source: TransactionSource
  created_at: string
  categories: CategoryJoin
}

// ─── Chart Types ──────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  month: string
  income: number
  expense: number
}

// ─── Form / Server Action Return Types ────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: never }
  | { success?: never; error: string }

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Return the joined category from a Supabase many-to-one join, or null */
export function getJoinedCategory(categories: CategoryJoin): Pick<Category, 'name' | 'icon'> | null {
  return categories ?? null
}
