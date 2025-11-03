'use client'

interface NewsletterConfigProps {
  config: any
  setConfig: (config: any) => void
}

export default function NewsletterConfig({ config, setConfig }: NewsletterConfigProps) {
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }))
  }

  const handleFormatChange = (format: string) => {
    setConfig((prev: any) => ({
      ...prev,
      outputFormat: format
    }))
  }

  const handleToggle = (field: string) => {
    setConfig((prev: any) => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSectionToggle = (section: string) => {
    setConfig((prev: any) => ({
      ...prev,
      customSections: {
        ...prev.customSections,
        [section]: !prev.customSections?.[section]
      }
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Configuration</h2>

      {/* Date Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={config.dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={config.dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
            />
          </div>
        </div>
      </div>

      {/* Output Format */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output Format
        </label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="radio"
              name="format"
              value="executive"
              checked={config.outputFormat === 'executive'}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue"
            />
            <div>
              <span className="text-sm font-medium">Executive Summary</span>
              <p className="text-xs text-gray-500">Brief overview with key highlights</p>
            </div>
          </label>
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="radio"
              name="format"
              value="detailed"
              checked={config.outputFormat === 'detailed'}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue"
            />
            <div>
              <span className="text-sm font-medium">Detailed Report</span>
              <p className="text-xs text-gray-500">Comprehensive analysis with all news</p>
            </div>
          </label>
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="radio"
              name="format"
              value="custom"
              checked={config.outputFormat === 'custom'}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue"
            />
            <div>
              <span className="text-sm font-medium">Custom Format</span>
              <p className="text-xs text-gray-500">Choose specific sections</p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Format Sections - Show only when custom format is selected */}
      {config.outputFormat === 'custom' && (
        <div className="mb-6 ml-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Sections to Include
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.executiveHighlights !== false}
                onChange={() => handleSectionToggle('executiveHighlights')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Executive Highlights</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.criticalSources !== false}
                onChange={() => handleSectionToggle('criticalSources')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Critical Sources (100% Important)</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.htaDecisions !== false}
                onChange={() => handleSectionToggle('htaDecisions')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">HTA Agency Decisions</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.policyUpdates !== false}
                onChange={() => handleSectionToggle('policyUpdates')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Policy & Regulatory Updates</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.methodologyDevelopments !== false}
                onChange={() => handleSectionToggle('methodologyDevelopments')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Methodology & Framework Developments</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.industryNews !== false}
                onChange={() => handleSectionToggle('industryNews')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Industry & Market Access News</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.emergingTrends !== false}
                onChange={() => handleSectionToggle('emergingTrends')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Emerging Trends</span>
            </label>
            <label className="flex items-center cursor-pointer hover:bg-white p-2 rounded">
              <input
                type="checkbox"
                checked={config.customSections?.upcomingDates !== false}
                onChange={() => handleSectionToggle('upcomingDates')}
                className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
              />
              <span className="text-sm">Upcoming Key Dates</span>
            </label>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={config.includeExecutiveSummary}
              onChange={() => handleToggle('includeExecutiveSummary')}
              className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
            />
            <span className="text-sm">Include Executive Summary</span>
          </label>
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={config.groupByTopic}
              onChange={() => handleToggle('groupByTopic')}
              className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
            />
            <span className="text-sm">Group by Topic</span>
          </label>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDateChange('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Last 7 days
          </button>
          <button
            onClick={() => handleDateChange('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Last 30 days
          </button>
          <button
            onClick={() => handleDateChange('from', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            Last quarter
          </button>
        </div>
      </div>
    </div>
  )
}