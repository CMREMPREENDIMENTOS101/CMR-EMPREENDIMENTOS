export default function DiarioCalendarLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div className="h-4 w-48 bg-gray-200 rounded" />

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
        <div className="h-6 w-36 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
      </div>

      {/* Stats badges */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-24 bg-gray-100 rounded-full" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded mx-auto w-6" />
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
