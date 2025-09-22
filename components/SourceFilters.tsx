'use client'

interface SourceFiltersProps {
  filters: {
    topic: string
    geoScope: string
    active: string
  }
  setFilters: (filters: any) => void
}

export default function SourceFilters({ filters, setFilters }: SourceFiltersProps) {
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [name]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      topic: '',
      geoScope: '',
      active: ''
    })
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Topic
          </label>
          <input
            type="text"
            placeholder="Search topic..."
            value={filters.topic}
            onChange={(e) => handleFilterChange('topic', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Geo Scope
          </label>
          <input
            type="text"
            placeholder="Search location..."
            value={filters.geoScope}
            onChange={(e) => handleFilterChange('geoScope', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.active}
            onChange={(e) => handleFilterChange('active', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}