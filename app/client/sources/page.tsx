'use client'

import { useState, useEffect } from 'react'
import { ensureArray } from '@/lib/validation'
import ErrorBoundary from '@/components/ErrorBoundary'
import SourceTable from '@/components/SourceTable'
import SourceForm from '@/components/SourceForm'
import SourceFilters from '@/components/SourceFilters'
import CSVImport from '@/components/CSVImport'

function SourcesPageContent() {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingSource, setEditingSource] = useState<any>(null)
  const [filters, setFilters] = useState({
    topic: '',
    geoScope: '',
    active: ''
  })

  useEffect(() => {
    fetchSources()
  }, [filters])

  const fetchSources = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.topic) params.append('topic', filters.topic)
      if (filters.geoScope) params.append('geoScope', filters.geoScope)
      if (filters.active) params.append('active', filters.active)

      const response = await fetch(`/api/sources?${params}`, {
        credentials: 'include'
      })

      // Check if response was successful
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Validate that data is an array before setting state
      const validatedData = ensureArray(data, 'Sources API')
      setSources(validatedData)
    } catch (error) {
      console.error('Error fetching sources:', error)
      setError(error instanceof Error ? error.message : 'Failed to load sources. Please try again.')
      setSources([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleAddSource = () => {
    setEditingSource(null)
    setShowForm(true)
  }

  const handleImportClick = () => {
    setShowImport(true)
  }

  const handleEditSource = (source: any) => {
    setEditingSource(source)
    setShowForm(true)
  }

  const handleDeleteSource = async (id: number) => {
    if (!confirm('Are you sure you want to delete this source?')) return

    try {
      await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      fetchSources()
    } catch (error) {
      console.error('Error deleting source:', error)
    }
  }

  const handleSaveSource = async (sourceData: any) => {
    try {
      const url = editingSource
        ? `/api/sources/${editingSource.id}`
        : '/api/sources'

      const method = editingSource ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sourceData)
      })

      if (response.ok) {
        setShowForm(false)
        fetchSources()
      }
    } catch (error) {
      console.error('Error saving source:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">News Sources</h1>
        <p className="text-gray-600">
          Manage news sources for newsletter generation
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Source Management</h2>
          <div className="space-x-2">
            <button
              onClick={handleImportClick}
              className="bg-inovintell-green text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={handleAddSource}
              className="bg-inovintell-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add New Source
            </button>
          </div>
        </div>

        <SourceFilters filters={filters} setFilters={setFilters} />

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-inovintell-blue"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Sources</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchSources}
                className="bg-inovintell-blue text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <SourceTable
            sources={sources}
            onEdit={handleEditSource}
            onDelete={handleDeleteSource}
          />
        )}
      </div>

      {showForm && (
        <SourceForm
          source={editingSource}
          onSave={handleSaveSource}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showImport && (
        <CSVImport
          onImportComplete={() => {
            setShowImport(false)
            fetchSources()
          }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

export default function SourcesPage() {
  return (
    <ErrorBoundary>
      <SourcesPageContent />
    </ErrorBoundary>
  )
}