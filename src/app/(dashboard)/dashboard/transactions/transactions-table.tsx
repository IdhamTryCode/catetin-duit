'use client'

import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type TransactionRow, getJoinedCategory } from '@/types'
import { deleteTransaction } from './actions'

interface Props {
  transactions: TransactionRow[]
  timezone: string
  totalCount: number
  page: number
  pageSize: number
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

export function TransactionsTable({ transactions, timezone, totalCount, page, pageSize }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Sumber</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Belum ada transaksi
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => {
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
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{tx.source}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/transactions/${tx.id}/edit`}>Edit</Link>
                      </Button>
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={tx.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Hapus
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
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
