'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CdModal } from '@/components/dashboard/modal'
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PageHeader } from '@/components/dashboard/ui'
import { CategoryForm } from './category-form'
import { deleteCategory } from './actions'
import { type Category } from '@/types'
import { type Plan, PLAN_LIMITS } from '@/lib/constants'

interface PageData {
  plan: Plan
  userCategories: Category[]
  defaultCategories: Category[]
}

async function fetchPageData(): Promise<PageData> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Gagal memuat data kategori')
  return res.json()
}

// ─── Baris kategori ────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  column,
  editable,
  onRefresh,
}: {
  category: Category
  column: 'income' | 'expense'
  editable: boolean
  onRefresh: () => void
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Hapus kategori "${category.name}"? Transaksi yang terkait tidak akan terhapus.`)) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('id', category.id)
      const result = await deleteCategory(fd)
      if (result?.error) toast.error(result.error)
      else { toast.success('Kategori dihapus'); onRefresh() }
    })
  }

  return (
    <div className="group flex items-center gap-3 border-t border-cd-line-soft px-5 py-3">
      <div
        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] text-xs font-bold ${
          column === 'income' ? 'bg-cd-tint text-cd-primary-hover' : 'bg-[#FBEAEA] text-[#A12828]'
        }`}
        aria-hidden
      >
        {category.name.slice(0, 2)}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{category.name}</span>

      {editable && (
        <div className="flex">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-semibold text-cd-placeholder hover:bg-cd-bg hover:text-cd-ink"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-semibold text-cd-placeholder hover:bg-[#FDF0F0] hover:text-cd-expense disabled:opacity-50"
          >
            Hapus
          </button>
          <CdModal open={isEditOpen} onOpenChange={setIsEditOpen} title="Edit Kategori">
            <CategoryForm
              initialValues={{ id: category.id, name: category.name, type: category.type, icon: category.icon }}
              onSuccess={() => { setIsEditOpen(false); onRefresh() }}
              onCancel={() => setIsEditOpen(false)}
            />
          </CdModal>
        </div>
      )}

      <span className="rounded-full bg-cd-bg px-2 py-[3px] text-xs font-semibold text-cd-muted-2">
        {category.is_default ? 'Bawaan' : 'Kustom'}
      </span>
    </div>
  )
}

function CategoryColumn({
  title,
  column,
  categories,
  onRefresh,
}: {
  title: string
  column: 'income' | 'expense'
  categories: Category[]
  onRefresh: () => void
}) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-[18px]">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-cd-muted-2">{categories.length}</span>
      </div>
      {categories.map((cat) => (
        <CategoryRow key={cat.id} category={cat} column={column} editable={!cat.is_default} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setData(await fetchPageData())
    } catch {
      toast.error('Gagal memuat kategori')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-cd-tint" />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <div className="h-56 animate-pulse rounded-[18px] bg-cd-tint" />
          <div className="h-56 animate-pulse rounded-[18px] bg-cd-tint" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { plan, userCategories, defaultCategories } = data
  const limit = PLAN_LIMITS[plan].customCategories
  const canAdd = limit === Infinity || userCategories.length < limit
  const all = [...defaultCategories, ...userCategories].sort((a, b) => a.name.localeCompare(b.name, 'id'))
  const income = all.filter((c) => c.type === 'income' || c.type === 'both')
  const expense = all.filter((c) => c.type === 'expense' || c.type === 'both')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategori"
        subtitle="Kelola kategori transaksimu"
        actions={
          canAdd ? (
            <button type="button" onClick={() => setIsAddOpen(true)} className={BTN_PRIMARY}>
              + Tambah Kategori
            </button>
          ) : (
            <Link href="/dashboard/subscription" className={BTN_SECONDARY}>
              Upgrade untuk kategori kustom
            </Link>
          )
        }
      />

      {limit === 0 && (
        <div className="rounded-[14px] border border-[#F2DDB0] bg-[#FFF8EB] px-[18px] py-3.5 text-sm text-[#6B5A36]">
          <strong className="text-[#6B4A0E]">Trial kamu sudah berakhir.</strong> Upgrade ke Premium untuk membuat kategori sendiri.
        </div>
      )}

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <CategoryColumn title="Pemasukan" column="income" categories={income} onRefresh={load} />
        <CategoryColumn title="Pengeluaran" column="expense" categories={expense} onRefresh={load} />
      </div>

      <p className="m-0 text-[13px] text-cd-muted-2">
        Kategori bawaan tidak bisa dihapus. Kategori kustom yang kamu buat bisa dipilih AI saat mencatat.
      </p>

      <CdModal open={isAddOpen} onOpenChange={setIsAddOpen} title="Tambah Kategori">
        <CategoryForm onSuccess={() => { setIsAddOpen(false); load() }} onCancel={() => setIsAddOpen(false)} />
      </CdModal>
    </div>
  )
}
