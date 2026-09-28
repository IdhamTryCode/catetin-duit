'use client'

import { Bar, BarChart, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatIDRCompact } from '@/lib/utils'

interface ChartData {
  month: string
  income: number
  expense: number
}

export function OverviewChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={4} barCategoryGap="28%">
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={{ stroke: '#DCE9E1' }}
          tick={{ fontSize: 13, fill: '#56685D' }}
          tickMargin={10}
        />
        <Tooltip
          cursor={{ fill: '#F4F9F6' }}
          formatter={(value) => formatIDRCompact(Number(value))}
          contentStyle={{ borderRadius: 12, border: '1px solid #DCE9E1', fontSize: 13 }}
        />
        <Bar dataKey="income" name="Pemasukan" fill="#16B06A" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Pengeluaran" fill="#F2A3A3" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
