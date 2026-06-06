export default function ObraDashboardLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div className="h-4 w-48 bg-gray-200 rounded" />

      {/* Título + status */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-64 bg-gray-200 rounded-lg" />
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart + ocorrências */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 h-56" />
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>

      {/* Etapas + info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-2 w-full bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
