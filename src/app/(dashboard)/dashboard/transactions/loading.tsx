/**
 * Transactions page loading skeleton.
 */
export default function TransactionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card">
        {/* Filter buttons */}
        <div className="px-4 py-3 border-b flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-muted rounded-lg" />
          ))}
        </div>

        {/* Table rows */}
        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex gap-4 pb-2 border-b">
            {[80, 140, 100, 80, 90, 60].map((w, i) => (
              <div key={i} className={`h-3 bg-muted rounded`} style={{ width: w }} />
            ))}
          </div>
          {/* Data rows */}
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-1">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded-full hidden md:block" />
              <div className="h-4 w-20 bg-muted rounded ml-auto" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
