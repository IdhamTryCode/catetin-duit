'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { type Category } from '@/types'
import { FIELD, LABEL, TypeToggle } from '@/components/dashboard/modal'
import { BTN_PRIMARY } from '@/components/dashboard/ui'
import { createTransaction, updateTransaction } from './actions'

const formSchema = z.object({
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  type: z.enum(['income', 'expense']),
  description: z.string().optional(),
  category_id: z.string().optional(),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  categories: Category[]
  /** If provided, renders in edit mode and pre-fills the form */
  initialValues?: {
    id: string
    amount: number
    type: 'income' | 'expense'
    description: string | null
    category_id: string | null
    transaction_date: string
  }
}

export function TransactionForm({ categories, initialValues }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!initialValues

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialValues?.amount ?? undefined,
      type: initialValues?.type ?? 'expense',
      description: initialValues?.description ?? '',
      category_id: initialValues?.category_id ?? '',
      // transaction_date is stored as 'YYYY-MM-DD' — input[type=date] needs that format
      transaction_date:
        initialValues?.transaction_date?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
    },
  })

  const selectedType = form.watch('type')
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === 'both'
  )
  const errors = form.formState.errors

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    const formData = new FormData()

    if (isEdit) formData.append('id', initialValues!.id)
    formData.append('amount', String(values.amount))
    formData.append('type', values.type)
    formData.append('description', values.description ?? '')
    formData.append('category_id', values.category_id ?? '')
    formData.append('transaction_date', values.transaction_date)

    const result = isEdit
      ? await updateTransaction(formData)
      : await createTransaction(formData)

    if (result?.error) {
      toast.error(result.error)
      setIsLoading(false)
    }
    // On success, actions.ts calls redirect() so no need to handle it here
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]">
      <TypeToggle
        value={selectedType}
        onChange={(v) => {
          form.setValue('type', v, { shouldDirty: true })
          // Kategori lama mungkin tidak berlaku untuk jenis baru
          const current = categories.find((c) => c.id === form.getValues('category_id'))
          if (current && current.type !== v && current.type !== 'both') form.setValue('category_id', '')
        }}
      />

      <label className={LABEL}>
        Nominal (Rp)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="25000"
          className={`${FIELD} text-xl font-bold`}
          {...form.register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <span className="text-[13px] font-medium text-cd-expense">{errors.amount.message}</span>}
      </label>

      <label className={LABEL}>
        Keterangan
        <input placeholder="Contoh: makan siang, gaji Januari" className={`${FIELD} font-normal`} {...form.register('description')} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Kategori
          {/* <select> native: menampilkan NAMA kategori, bukan ID-nya */}
          <select className={`${FIELD} font-normal`} {...form.register('category_id')}>
            <option value="">Tanpa kategori</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Tanggal
          <input type="date" className={`${FIELD} font-normal`} {...form.register('transaction_date')} />
          {errors.transaction_date && (
            <span className="text-[13px] font-medium text-cd-expense">{errors.transaction_date.message}</span>
          )}
        </label>
      </div>

      <div>
        <button type="submit" disabled={isLoading} className={BTN_PRIMARY}>
          {isLoading
            ? (isEdit ? 'Menyimpan…' : 'Menambahkan…')
            : (isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi')}
        </button>
      </div>
    </form>
  )
}
