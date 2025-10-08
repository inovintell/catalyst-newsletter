'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentConfigPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/agent-config', {
        credentials: 'include'
      })
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching agent config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAgent = async () => {
    setUpdating(true)
    try {
      const response = await fetch('/api/sources/update-agent', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        alert('Agent configuration updated successfully!')
        await fetchConfig()
      } else {
        alert('Failed to update agent configuration')
      }
    } catch (error) {
      console.error('Error updating agent:', error)
      alert('Error updating agent configuration')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Configuration</h1>
          <p className="text-gray-600 mt-2">
            Manage the Claude Code sub-agent configuration for newsletter generation
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Configuration Status</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Agent Name</p>
                <p className="font-medium">{config?.name || 'newsletter-agent'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Version</p>
                <p className="font-medium">{config?.version || '1.0.0'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Active Sources</p>
                <p className="font-medium text-2xl text-inovintell-blue">
                  {config?.sources?.length || 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">
                  {config?.updated_at
                    ? new Date(config.updated_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>

            <button
              onClick={handleUpdateAgent}
              disabled={updating}
              className="mt-6 w-full bg-gradient-to-r from-inovintell-blue to-inovintell-green text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Agent Configuration'}
            </button>
          </div>

          {/* Capabilities */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-4">
            <h3 className="font-semibold mb-3">Agent Capabilities</h3>
            <div className="space-y-2">
              {config?.capabilities?.map((capability: string, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-inovintell-green rounded-full mr-2"></div>
                  <span className="text-sm">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Configuration File</h2>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(config, null, 2)], {
                    type: 'application/json'
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'agent-config.json'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Download JSON
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
              <pre className="text-xs font-mono">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>

          {/* Sources List */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-4">
            <h2 className="text-lg font-semibold mb-4">Configured Sources</h2>
            <div className="overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Topic
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Region
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Importance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {config?.sources?.map((source: any) => (
                    <tr key={source.id}>
                      <td className="px-4 py-2 text-sm">{source.name}</td>
                      <td className="px-4 py-2 text-sm">{source.topic}</td>
                      <td className="px-4 py-2 text-sm">{source.geoScope}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          source.importance === 'High'
                            ? 'bg-red-100 text-red-700'
                            : source.importance === 'Medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {source.importance || 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}