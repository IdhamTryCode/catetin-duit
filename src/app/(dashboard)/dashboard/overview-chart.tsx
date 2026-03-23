'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatIDRCompact } from '@/lib/utils'

interface ChartData {
  month: string
  income: number
  expense: number
}

export function OverviewChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => formatIDRCompact(Number(v))} tick={{ fontSize: 11 }} width={80} />
        <Tooltip
          formatter={(value) => formatIDRCompact(Number(value))}
          contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
        />
        <Legend />
        <Bar dataKey="income" name="Pemasukan" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Pengeluaran" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
