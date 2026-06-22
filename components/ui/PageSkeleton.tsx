// Generic page loading skeleton — used by loading.tsx files for instant navigation feel
export function PageSkeleton({ rows = 6, cards = 4 }: { rows?: number; cards?: number }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="fixed left-0 top-0 h-screen w-[260px] bg-[#0f172a]" />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        <div className="h-16 bg-white border-b border-slate-200 shrink-0" />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 h-24 animate-pulse">
                <div className="h-4 w-16 bg-slate-100 rounded mb-3" />
                <div className="h-6 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          {/* Table / content */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="h-11 bg-slate-50 border-b border-slate-100 animate-pulse" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 animate-pulse last:border-0">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-50 rounded" />
                <div className="h-4 w-20 bg-slate-50 rounded ml-auto" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
