'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Category } from '@/types'
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">💸 Pengeluaran</SelectItem>
                  <SelectItem value="income">💰 Pemasukan</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah (Rp)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="25000"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi <span className="text-muted-foreground">(opsional)</span></FormLabel>
              <FormControl>
                <Input placeholder="contoh: makan siang, gaji januari..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori <span className="text-muted-foreground">(opsional)</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">— Tanpa kategori —</SelectItem>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField
          control={form.control}
          name="transaction_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? (isEdit ? 'Menyimpan...' : 'Menambahkan...')
            : (isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi')}
        </Button>
      </form>
    </Form>
  )
}
