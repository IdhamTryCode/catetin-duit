'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatInTimeZone } from 'date-fns-tz'
import { Receipt, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type TransactionRow, getJoinedCategory } from '@/types'
import { deleteTransaction } from './actions'
import { formatIDR } from '@/lib/utils'

interface Props {
  transactions: TransactionRow[]
  timezone: string
  totalCount: number
  page: number
  pageSize: number
}

export function TransactionsTable({ transactions, timezone, totalCount, page, pageSize }: Props) {
  const [isPending, startTransition] = useTransition()
  const totalPages = Math.ceil(totalCount / pageSize)

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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">Belum ada transaksi</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Mulai catat via bot Telegram atau tambah manual
        </p>
        <div className="flex gap-2 mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/telegram">
              <Bot className="h-3.5 w-3.5 mr-1.5" />
              Hubungkan Telegram
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/transactions/new">+ Tambah Manual</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="hidden md:table-cell">Sumber</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const category = getJoinedCategory(tx.categories)
            return (
              <TableRow key={tx.id}>
                <TableCell className="text-sm">
                  {formatInTimeZone(new Date(tx.transaction_date), timezone, 'dd MMM yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{tx.description ?? '-'}</span>
                    {tx.needs_review && (
                      <Badge variant="destructive" className="text-xs">Review</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {category ? `${category.icon ?? ''} ${category.name}`.trim() : '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-xs capitalize">{tx.source}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/transactions/${tx.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(tx.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">{totalCount} transaksi</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?page=${page - 1}`}>Sebelumnya</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?page=${page + 1}`}>Selanjutnya</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
