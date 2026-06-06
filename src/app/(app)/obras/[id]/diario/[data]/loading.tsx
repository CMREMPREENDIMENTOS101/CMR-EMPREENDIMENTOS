export default function DiarioFormLoading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse space-y-4">
      {/* Breadcrumb */}
      <div className="h-4 w-64 bg-gray-200 rounded" />

      {/* Título */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-gray-200 rounded-lg" />
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>

      {/* Sections */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-4 bg-gray-100 rounded" />
          </div>
          {/* Section body */}
          <div className="px-5 py-4 space-y-3">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
            {i < 2 && <div className="h-4 w-1/2 bg-gray-100 rounded" />}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="h-10 w-full bg-gray-200 rounded-lg" />
    </div>
  )
}
