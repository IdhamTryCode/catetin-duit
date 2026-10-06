'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type Category } from '@/types'
import { CdModal, FIELD, LABEL, TypeToggle } from '@/components/dashboard/modal'
import { BTN_PRIMARY, BTN_SECONDARY } from '@/components/dashboard/ui'
import { createTransaction } from './actions'

/** Tombol "+ Tambah Manual" + modal. Memakai server action createTransaction yang sama. */
export function AddTransaction({ categories, label = '+ Tambah Manual' }: { categories: Category[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const lastCategory = useRef<Record<'expense' | 'income', string>>({ expense: '', income: '' })

  const options = categories.filter((c) => c.type === type || c.type === 'both')

  function openModal() {
    setType('expense')
    setAmount('')
    setDescription('')
    setCategoryId('')
    lastCategory.current = { expense: '', income: '' }
    setDate(new Date().toISOString().slice(0, 10))
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!Number(amount)) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }
    setSaving(true)
    const fd = new FormData()
    fd.append('amount', amount)
    fd.append('type', type)
    fd.append('description', description)
    fd.append('category_id', categoryId)
    fd.append('transaction_date', date)
    // Saat sukses, createTransaction memanggil redirect() dan promise-nya bisa
    // tidak pernah resolve, jadi modal ditutup lebih dulu; error tetap via toast.
    setOpen(false)
    try {
      const result = await createTransaction(fd)
      if (result?.error) toast.error(result.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} className={BTN_PRIMARY}>
        {label}
      </button>
      <CdModal open={open} onOpenChange={setOpen} title="Tambah Transaksi">
        <form onSubmit={submit} className="flex flex-col gap-[18px]">
          <TypeToggle
            value={type}
            onChange={(v) => {
              if (v === type) return
              // Ingat pilihan kategori per jenis supaya tidak hilang saat bolak-balik
              lastCategory.current[type] = categoryId
              setType(v)
              setCategoryId(lastCategory.current[v])
            }}
          />
          <label className={LABEL}>
            Nominal
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="25000"
              className={`${FIELD} text-xl font-bold`}
              autoFocus
            />
          </label>
          <label className={LABEL}>
            Keterangan
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beli kopi" className={FIELD} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL}>
              Kategori
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={FIELD}>
                <option value="">Tanpa kategori</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Tanggal
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={FIELD} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
              Batal
            </button>
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </CdModal>
    </>
  )
}
