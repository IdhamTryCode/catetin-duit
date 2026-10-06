'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { type Category } from '@/types'
import { FIELD, LABEL } from '@/components/dashboard/modal'
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
  const selectedCategory = form.watch('category_id') ?? ''
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === 'both'
  )
  const errors = form.formState.errors
  const lastCategory = useRef<Record<'income' | 'expense', string>>({
    income: initialValues?.type === 'income' ? initialValues.category_id ?? '' : '',
    expense: initialValues?.type !== 'income' ? initialValues?.category_id ?? '' : '',
  })

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

  // Kategori terakhir yang dipilih untuk tiap jenis. Pindah jenis lalu kembali
  // memulihkan pilihannya, bukan mengosongkan.
  function changeType(next: 'income' | 'expense') {
    const prev = form.getValues('type')
    if (next === prev) return
    lastCategory.current[prev] = form.getValues('category_id') ?? ''
    form.setValue('type', next, { shouldDirty: true })
    form.setValue('category_id', lastCategory.current[next], { shouldDirty: true })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]">
      <label className={LABEL}>
        Jenis
        <select value={selectedType} onChange={(e) => changeType(e.target.value as 'income' | 'expense')} className={`${FIELD} font-normal`}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
      </label>

      <label className={LABEL}>
        Jumlah (Rp)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="25000"
          className={`${FIELD} font-normal`}
          {...form.register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <span className="text-[13px] font-medium text-cd-expense">{errors.amount.message}</span>}
      </label>

      <label className={LABEL}>
        <span>Deskripsi <span className="font-normal text-cd-muted-2">(opsional)</span></span>
        <input placeholder="Contoh: makan siang, gaji Januari" className={`${FIELD} font-normal`} {...form.register('description')} />
      </label>

      <label className={LABEL}>
        <span>Kategori <span className="font-normal text-cd-muted-2">(opsional)</span></span>
        {/* <select> native: menampilkan NAMA kategori, bukan ID-nya */}
        {/* Controlled: nilai dipulihkan saat ganti jenis, setelah opsinya ikut berganti */}
        <select
          className={`${FIELD} font-normal`}
          value={selectedCategory}
          onChange={(e) => form.setValue('category_id', e.target.value, { shouldDirty: true })}
        >
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

      <button type="submit" disabled={isLoading} className={`${BTN_PRIMARY} justify-center`}>
        {isLoading
          ? (isEdit ? 'Menyimpan…' : 'Menambahkan…')
          : (isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi')}
      </button>
    </form>
  )
}
