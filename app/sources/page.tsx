'use client'

import { useState, useEffect } from 'react'
import SourceTable from '@/components/SourceTable'
import SourceForm from '@/components/SourceForm'
import SourceFilters from '@/components/SourceFilters'
import CSVImport from '@/components/CSVImport'

export default function SourcesPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
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
    try {
      const params = new URLSearchParams()
      if (filters.topic) params.append('topic', filters.topic)
      if (filters.geoScope) params.append('geoScope', filters.geoScope)
      if (filters.active) params.append('active', filters.active)

      const response = await fetch(`/api/sources?${params}`)
      const data = await response.json()
      setSources(data)
    } catch (error) {
      console.error('Error fetching sources:', error)
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
      await fetch(`/api/sources/${id}`, { method: 'DELETE' })
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