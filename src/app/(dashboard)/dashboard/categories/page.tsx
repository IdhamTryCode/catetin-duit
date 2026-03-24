'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Lock, Tag } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CategoryForm } from './category-form'
import { deleteCategory } from './actions'
import { type Category } from '@/types'
import { type Plan, PLAN_LIMITS, PLAN_NAMES } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageData {
  plan: Plan
  userCategories: Category[]
  defaultCategories: Category[]
}

// ─── Fetch helper (client-side, hits our own Supabase via API) ────────────────
// We use a lightweight fetch to a small API endpoint rather than importing
// the server client in a Client Component.

async function fetchPageData(): Promise<PageData> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Gagal memuat data kategori')
  return res.json()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    income:  { label: 'Pemasukan',  variant: 'default' },
    expense: { label: 'Pengeluaran', variant: 'secondary' },
    both:    { label: 'Keduanya',   variant: 'outline' },
  }
  const cfg = map[type] ?? map['both']
  return <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
}

function CategoryCard({
  category,
  editable,
  onDeleted,
}: {
  category: Category
  editable: boolean
  onDeleted: () => void
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Hapus kategori "${category.name}"? Transaksi yang terkait tidak akan terhapus.`)) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('id', category.id)
      const result = await deleteCategory(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('Kategori dihapus'); onDeleted() }
    })
  }

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b last:border-0">
      {/* Icon */}
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
        {category.icon ?? <Tag className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
        <TypeBadge type={category.type} />
      </div>

      {/* Actions — hanya untuk kategori kustom */}
      {editable && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Edit */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>Edit Kategori</DialogTitle>
              </DialogHeader>
              <CategoryForm
                initialValues={{ id: category.id, name: category.name, type: category.type, icon: category.icon }}
                onSuccess={() => { setIsEditOpen(false); onDeleted() /* reuse refresh */ }}
                onCancel={() => setIsEditOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    try {
      const result = await fetchPageData()
      setData(result)
    } catch {
      toast.error('Gagal memuat kategori')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const { plan, userCategories, defaultCategories } = data
  const limit = PLAN_LIMITS[plan].customCategories
  const canAdd = limit === Infinity || userCategories.length < limit
  const isFreePlan = plan === 'free'

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Kategori</h1>
          <p className="text-sm text-muted-foreground">Kelola kategori transaksimu</p>
        </div>

        {isFreePlan ? (
          <Button asChild variant="outline" size="sm" className="flex-shrink-0 gap-1.5 text-muted-foreground">
            <Link href="/dashboard/subscription">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upgrade</span>
            </Link>
          </Button>
        ) : canAdd ? (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-shrink-0 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tambah Kategori</span>
                <span className="sm:hidden">Tambah</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>Tambah Kategori</DialogTitle>
              </DialogHeader>
              <CategoryForm onSuccess={() => { setIsAddOpen(false); load() }} onCancel={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild variant="outline" size="sm" className="flex-shrink-0 gap-1.5 text-muted-foreground">
            <Link href="/dashboard/subscription">
              <Lock className="h-3.5 w-3.5" />
              Upgrade Premium
            </Link>
          </Button>
        )}
      </div>

      {/* Plan gate info */}
      {isFreePlan && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <Lock className="h-6 w-6 text-primary/60 mx-auto" />
          <p className="text-sm font-medium">Kategori kustom tidak tersedia di plan Free</p>
          <p className="text-xs text-muted-foreground">Upgrade ke Starter atau Premium untuk membuat kategori sendiri</p>
          <Button asChild size="sm" className="mt-1">
            <Link href="/dashboard/subscription">Lihat Plan</Link>
          </Button>
        </div>
      )}

      {/* Limit indicator — Starter only */}
      {plan === 'starter' && limit !== Infinity && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Kategori kustom</span>
          <span className={userCategories.length >= limit ? 'text-destructive font-medium' : ''}>
            {userCategories.length}/{limit} digunakan
          </span>
        </div>
      )}

      {/* User categories */}
      {!isFreePlan && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Kategori Kustom</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {userCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Tag className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada kategori kustom</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Klik &ldquo;Tambah Kategori&rdquo; untuk mulai</p>
              </div>
            ) : (
              userCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  editable
                  onDeleted={load}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Default categories (read-only) */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Kategori Bawaan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {defaultCategories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} editable={false} onDeleted={() => {}} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
