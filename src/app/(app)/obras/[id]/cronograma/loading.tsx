export default function CronogramaLoading() {
  return (
    <div className="p-6 animate-pulse space-y-4">
      {/* Breadcrumb */}
      <div className="h-4 w-56 bg-gray-200 rounded" />

      {/* Título */}
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />

      {/* Gantt skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header months */}
        <div className="flex border-b border-gray-200 h-9 bg-gray-50">
          <div className="w-52 flex-shrink-0 border-r border-gray-200" />
          <div className="flex-1 flex gap-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex border-b border-gray-100 h-14 items-center">
            <div className="w-52 flex-shrink-0 border-r border-gray-100 px-3">
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="flex-1 relative px-2">
              <div
                className="absolute h-2 bg-gray-200 rounded"
                style={{
                  left: `${10 + i * 5}%`,
                  width: `${20 + (i % 3) * 10}%`,
                  top: '35%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
