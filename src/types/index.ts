import { type Tables } from './database.types'

// ─── Re-export database row types (derived from generated schema) ─────────────

export type { Tables } from './database.types'

/** Raw DB row for categories table */
export type Category = Tables<'categories'>

/** Raw DB row for transactions table */
export type Transaction = Tables<'transactions'>

/** Raw DB row for profiles table */
export type Profile = Tables<'profiles'>

// ─── Narrowed string unions (DB stores these as plain `string`) ───────────────

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

// ─── Query Result Types (with joins) ──────────────────────────────────────────

/**
 * Category as returned by Supabase many-to-one join.
 * The client is typed with Database so Supabase infers this as a single
 * object (not an array) based on the FK relationship metadata.
 */
export type CategoryJoin = Pick<Category, 'name' | 'icon'> | null

export interface TransactionWithCategory extends Transaction {
  categories: CategoryJoin
}

/** Lightweight type for dashboard recent transactions list */
export interface RecentTransaction {
  id: string
  amount: number
  type: string
  description: string | null
  transaction_date: string
  needs_review: boolean | null
  categories: CategoryJoin
}

/** Lightweight type for transactions table (list page) */
export interface TransactionRow {
  id: string
  amount: number
  type: string
  description: string | null
  transaction_date: string
  needs_review: boolean | null
  source: string
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
