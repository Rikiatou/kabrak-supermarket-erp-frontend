export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="fixed left-0 top-0 h-screen w-[260px] bg-[#0f172a]" />

      <div className="flex-1 flex flex-col min-w-0 ml-[260px]">
        {/* Topbar skeleton */}
        <div className="h-16 bg-white border-b border-[var(--border)]" />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Status bar */}
          <div className="flex gap-3 mb-6">
            <div className="h-7 w-48 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-7 w-56 bg-slate-100 rounded-full animate-pulse" />
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-[var(--border)] rounded-2xl p-5 h-32 animate-pulse">
                <div className="w-10 h-10 bg-slate-100 rounded-xl mb-4" />
                <div className="h-7 w-28 bg-slate-100 rounded-lg mb-2" />
                <div className="h-3 w-20 bg-slate-50 rounded" />
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3 bg-white border border-[var(--border)] rounded-2xl p-5 h-80 animate-pulse">
              <div className="h-5 w-32 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-48 bg-slate-50 rounded mb-6" />
              <div className="h-48 bg-slate-50 rounded-xl" />
            </div>
            <div className="lg:col-span-2 bg-white border border-[var(--border)] rounded-2xl p-5 h-80 animate-pulse">
              <div className="h-5 w-32 bg-slate-100 rounded mb-2" />
              <div className="h-48 bg-slate-50 rounded-xl mt-6" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
