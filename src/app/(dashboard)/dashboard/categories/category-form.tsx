'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FIELD, LABEL } from '@/components/dashboard/modal'
import { BTN_PRIMARY, BTN_SECONDARY } from '@/components/dashboard/ui'
import { createCategory, updateCategory } from './actions'
import { type Category } from '@/types'

const TYPES = [
  { v: 'expense', label: 'Pengeluaran', color: 'text-cd-expense' },
  { v: 'income', label: 'Pemasukan', color: 'text-cd-primary' },
  { v: 'both', label: 'Keduanya', color: 'text-cd-ink' },
]

interface Props {
  /** If provided, renders in edit mode */
  initialValues?: Pick<Category, 'id' | 'name' | 'type' | 'icon'>
  onSuccess?: () => void
  onCancel?: () => void
}

export function CategoryForm({ initialValues, onSuccess, onCancel }: Props) {
  const isEdit = !!initialValues
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<string>(initialValues?.type ?? 'expense')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit ? await updateCategory(formData) : await createCategory(formData)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan')
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      {isEdit && <input type="hidden" name="id" value={initialValues.id} />}
      {/* Ikon lama dipertahankan saat edit (form baru tidak lagi memilih ikon) */}
      <input type="hidden" name="icon" value={initialValues?.icon ?? ''} />
      <input type="hidden" name="type" value={type} />

      <div className="flex gap-1 rounded-[11px] bg-cd-bg p-1" role="radiogroup" aria-label="Jenis kategori">
        {TYPES.map((t) => (
          <button
            key={t.v}
            type="button"
            role="radio"
            aria-checked={type === t.v}
            onClick={() => setType(t.v)}
            className={cn(
              'flex-1 cursor-pointer rounded-lg p-[9px] text-sm',
              type === t.v ? `bg-white font-bold shadow-[0_1px_2px_rgba(6,20,13,.1)] ${t.color}` : 'font-semibold text-cd-muted-2',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className={LABEL}>
        Nama Kategori
        <input
          name="name"
          placeholder="Contoh: Langganan Software"
          defaultValue={initialValues?.name}
          required
          maxLength={50}
          autoFocus
          className={FIELD}
        />
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isPending} className={BTN_SECONDARY}>
            Batal
          </button>
        )}
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}
