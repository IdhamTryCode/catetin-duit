'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCategory, updateCategory } from './actions'
import { type Category } from '@/types'

const SUGGESTED_ICONS = ['🍔', '🚗', '🏠', '💊', '📚', '👗', '✈️', '🎮', '💰', '📦', '💸', '🎁', '⚡', '📱', '🛒', '🏋️', '☕', '🎵']

interface Props {
  /** If provided, renders in edit mode */
  initialValues?: Pick<Category, 'id' | 'name' | 'type' | 'icon'>
  onSuccess?: () => void
  onCancel?: () => void
}

export function CategoryForm({ initialValues, onSuccess, onCancel }: Props) {
  const isEdit = !!initialValues
  const [isPending, startTransition] = useTransition()
  const [icon, setIcon] = useState(initialValues?.icon ?? '')
  const [type, setType] = useState<string>(initialValues?.type ?? 'expense')
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(formData)
        : await createCategory(formData)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan')
        formRef.current?.reset()
        setIcon('')
        onSuccess?.()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={initialValues.id} />}

      {/* Nama */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama Kategori</Label>
        <Input
          id="name"
          name="name"
          placeholder="contoh: Makan & Minum"
          defaultValue={initialValues?.name}
          required
          maxLength={50}
        />
      </div>

      {/* Jenis */}
      <div className="space-y-1.5">
        <Label>Jenis Transaksi</Label>
        <input type="hidden" name="type" value={type} />
        <Select value={type} onValueChange={(v) => { if (v) setType(v) }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">💸 Pengeluaran</SelectItem>
            <SelectItem value="income">💰 Pemasukan</SelectItem>
            <SelectItem value="both">🔄 Keduanya</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Icon */}
      <div className="space-y-1.5">
        <Label htmlFor="icon">
          Icon <span className="text-muted-foreground text-xs">(emoji, opsional)</span>
        </Label>
        <Input
          id="icon"
          name="icon"
          placeholder="Ketik atau pilih emoji..."
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={10}
        />
        {/* Quick-pick emoji grid */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`h-8 w-8 text-base rounded-md border transition-colors hover:bg-muted ${icon === emoji ? 'bg-primary/10 border-primary/40' : 'border-transparent'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending
            ? isEdit ? 'Menyimpan...' : 'Menambahkan...'
            : isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
        </Button>
      </div>
    </form>
  )
}
