'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Modal dashboard (radius 20, max 440px) di atas primitive Dialog yang sudah ada. */
export function CdModal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(6,20,13,.45)]" />
        <DialogPrimitive.Popup
          className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-[18px] rounded-[20px] bg-white p-[26px] text-cd-ink outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-extrabold">{title}</DialogTitle>
            <DialogPrimitive.Close className="cursor-pointer rounded-md p-1 text-cd-muted-2 hover:text-cd-ink" aria-label="Tutup">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}

/** Toggle Pengeluaran / Pemasukan (segmented). */
export function TypeToggle({ value, onChange }: { value: 'expense' | 'income'; onChange: (v: 'expense' | 'income') => void }) {
  const opts = [
    { v: 'expense' as const, label: 'Pengeluaran', color: 'text-cd-expense' },
    { v: 'income' as const, label: 'Pemasukan', color: 'text-cd-primary' },
  ]
  return (
    <div className="flex gap-1 rounded-[11px] bg-cd-bg p-1" role="radiogroup">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            'flex-1 cursor-pointer rounded-lg p-[9px] text-sm',
            value === o.v ? `bg-white font-bold shadow-[0_1px_2px_rgba(6,20,13,.1)] ${o.color}` : 'font-semibold text-cd-muted-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Kelas field form dashboard (input & select). */
export const FIELD =
  'w-full rounded-xl border border-cd-line-strong bg-white px-3.5 py-3 text-[15px] text-cd-ink outline-none placeholder:text-cd-placeholder focus:border-cd-primary focus:shadow-[0_0_0_3px_rgba(0,117,74,.15)]'
export const LABEL = 'flex flex-col gap-1.5 text-sm font-semibold'
