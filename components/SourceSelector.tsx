'use client'

import { useState, useEffect } from 'react'
import { ensureArray } from '@/lib/validation'

interface SourceSelectorProps {
  sources: any[]
  loading: boolean
  config: any
  setConfig: (config: any) => void
}

export default function SourceSelector({ sources, loading, config, setConfig }: SourceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [geoFilter, setGeoFilter] = useState('all')

  // Ensure sources is always an array to prevent crashes
  const safeSources = ensureArray<any>(sources, 'SourceSelector')

  // Extract unique topics and geo scopes
  const topics = [...new Set(safeSources.map(s => s.topic))].sort()
  const geoScopes = [...new Set(safeSources.map(s => s.geoScope))].sort()

  const filteredSources = safeSources.filter(source => {
    const matchesSearch = source.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          source.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          source.comment?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTopic = topicFilter === 'all' || source.topic === topicFilter
    const matchesGeo = geoFilter === 'all' || source.geoScope === geoFilter

    return matchesSearch && matchesTopic && matchesGeo
  })

  const handleSourceToggle = (sourceId: number) => {
    setConfig((prev: any) => ({
      ...prev,
      selectedSources: prev.selectedSources.includes(sourceId)
        ? prev.selectedSources.filter((id: number) => id !== sourceId)
        : [...prev.selectedSources, sourceId]
    }))
  }

  const handleSelectAll = () => {
    const visibleIds = filteredSources.map(s => s.id)
    setConfig((prev: any) => ({
      ...prev,
      selectedSources: visibleIds
    }))
  }

  const handleDeselectAll = () => {
    setConfig((prev: any) => ({
      ...prev,
      selectedSources: []
    }))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Select News Sources</h2>
        <div className="text-sm text-gray-600">
          {config.selectedSources.length} of {safeSources.length} selected
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          />
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
          <select
            value={geoFilter}
            onChange={(e) => setGeoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
          >
            <option value="all">All Regions</option>
            {geoScopes.map(geo => (
              <option key={geo} value={geo}>{geo}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm px-3 py-1 bg-inovintell-blue text-white rounded hover:bg-blue-700"
          >
            Select All Visible
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Source List */}
      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
        {filteredSources.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No sources found matching your filters
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSources.map(source => (
              <div
                key={source.id}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSourceToggle(source.id)}
              >
                <input
                  type="checkbox"
                  checked={config.selectedSources.includes(source.id)}
                  onChange={() => {}}
                  className="mr-3 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{source.website}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {source.topic}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {source.geoScope}
                    </span>
                    {source.importanceLevel && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        {source.importanceLevel}
                      </span>
                    )}
                  </div>
                  {source.comment && (
                    <p className="text-sm text-gray-600 mt-1">{source.comment}</p>
                  )}
                  <a
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-inovintell-blue hover:underline mt-1 inline-block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {source.link}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-inovintell-blue">
            {config.selectedSources.length}
          </div>
          <div className="text-gray-600">Selected</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-700">
            {[...new Set(safeSources.filter(s => config.selectedSources.includes(s.id)).map(s => s.topic))].length}
          </div>
          <div className="text-gray-600">Topics</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-2xl font-bold text-gray-700">
            {[...new Set(safeSources.filter(s => config.selectedSources.includes(s.id)).map(s => s.geoScope))].length}
          </div>
          <div className="text-gray-600">Regions</div>
        </div>
      </div>
    </div>
  )
}