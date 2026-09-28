'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatInTimeZone } from 'date-fns-tz'
import { id as idLocale } from 'date-fns/locale'
import { type Category, type TransactionRow, getJoinedCategory } from '@/types'
import { BTN_SECONDARY, TxIcon } from '@/components/dashboard/ui'
import { deleteTransaction } from './actions'
import { AddTransaction } from './add-transaction'
import { formatIDR } from '@/lib/utils'

interface Props {
  transactions: TransactionRow[]
  timezone: string
  totalCount: number
  page: number
  pageSize: number
  typeFilter?: string
  categories: Category[]
}

const SOURCE_LABEL: Record<string, string> = { telegram: 'Telegram', web: 'Manual', import: 'Import' }

export function TransactionsTable({ transactions, timezone, totalCount, page, pageSize, typeFilter, categories }: Props) {
  const [isPending, startTransition] = useTransition()
  const totalPages = Math.ceil(totalCount / pageSize)
  const pageHref = (p: number) => `?${typeFilter ? `type=${typeFilter}&` : ''}page=${p}`

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', id)
      await deleteTransaction(formData)
      toast.success('Transaksi berhasil dihapus')
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <span className="text-base font-bold">Belum ada transaksi</span>
        <span className="max-w-[320px] text-sm text-cd-muted-2">Mulai catat via bot Telegram atau tambah manual</span>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard/telegram" className={BTN_SECONDARY}>Hubungkan Telegram</Link>
          <AddTransaction categories={categories} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {transactions.map((tx) => {
        const category = getJoinedCategory(tx.categories)
        const income = tx.type === 'income'
        const catName = category?.name ?? 'Lainnya'
        return (
          <div key={tx.id} className="flex items-center gap-3.5 border-b border-cd-line-soft px-5 py-3.5 last:border-b-0 hover:bg-[#FAFCFB]">
            <TxIcon label={catName} income={income} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="truncate">{tx.description ?? catName}</span>
                {tx.needs_review && (
                  <span className="flex-shrink-0 rounded-full bg-[#FFF8EB] px-2 py-0.5 text-[11px] font-bold text-[#6B4A0E]">Review</span>
                )}
              </span>
              <span className="truncate text-[13px] text-cd-muted-2">
                {catName} · {formatInTimeZone(new Date(tx.transaction_date), timezone, 'd MMM yyyy', { locale: idLocale })} · via{' '}
                {SOURCE_LABEL[tx.source ?? ''] ?? tx.source}
              </span>
            </div>
            <span className={`whitespace-nowrap text-[15px] font-bold tabular-nums ${income ? 'text-cd-primary' : 'text-cd-expense'}`}>
              {income ? '+' : '−'}{formatIDR(tx.amount)}
            </span>
            <div className="flex flex-shrink-0">
              <Link
                href={`/dashboard/transactions/${tx.id}/edit`}
                className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-cd-placeholder hover:bg-cd-bg hover:text-cd-ink"
              >
                Edit
              </Link>
              <button
                type="button"
                title="Hapus"
                disabled={isPending}
                onClick={() => handleDelete(tx.id)}
                className="cursor-pointer rounded-lg px-2 py-1.5 text-[13px] font-semibold text-cd-placeholder hover:bg-[#FDF0F0] hover:text-cd-expense disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          </div>
        )
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-cd-line-soft px-5 py-4">
          <p className="m-0 text-[13px] text-cd-muted-2">Halaman {page} dari {totalPages}</p>
          <div className="flex gap-2">
            <Link
              href={pageHref(page - 1)}
              aria-disabled={page <= 1}
              className={`${BTN_SECONDARY} py-2 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
            >
              Sebelumnya
            </Link>
            <Link
              href={pageHref(page + 1)}
              aria-disabled={page >= totalPages}
              className={`${BTN_SECONDARY} py-2 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
            >
              Selanjutnya
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
