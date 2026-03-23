/**
 * Dashboard route group loading skeleton.
 * Shown while the (dashboard)/layout.tsx and its nested pages are loading.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto md:max-w-none animate-pulse">
      {/* Page title skeleton */}
      <div className="hidden md:block space-y-2">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 md:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3.5 w-3.5 bg-muted rounded" />
            </div>
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-2.5 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-[280px] bg-muted rounded-lg" />
      </div>

      {/* Recent transactions skeleton */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="h-4 w-36 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
