export default function RelatoriosLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div className="h-4 w-56 bg-gray-200 rounded" />

      {/* Título */}
      <div className="space-y-1">
        <div className="h-6 w-64 bg-gray-200 rounded-lg" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>

      {/* Date form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="flex gap-3">
          <div className="flex-1 h-9 bg-gray-100 rounded-lg" />
          <div className="flex-1 h-9 bg-gray-100 rounded-lg" />
          <div className="h-9 w-32 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Diary list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="h-4 w-36 bg-gray-200 rounded" />
        </div>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50">
              <div className="h-4 w-40 bg-gray-100 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
