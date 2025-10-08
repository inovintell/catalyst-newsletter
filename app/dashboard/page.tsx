'use client'

import { useState, useEffect } from 'react'
import NewsletterConfig from '@/components/NewsletterConfig'
import SourceSelector from '@/components/SourceSelector'
import GenerationProgress from '@/components/GenerationProgress'
import { showToast } from '@/components/Toast'

interface NewsletterConfiguration {
  dateRange: {
    from: string
    to: string
  }
  selectedSources: number[]
  topics: string[]
  geoScopes: string[]
  outputFormat: 'executive' | 'detailed' | 'custom'
  includeExecutiveSummary: boolean
  groupByTopic: boolean
  customSections?: {
    executiveHighlights?: boolean
    criticalSources?: boolean
    htaDecisions?: boolean
    policyUpdates?: boolean
    methodologyDevelopments?: boolean
    industryNews?: boolean
    emergingTrends?: boolean
    upcomingDates?: boolean
  }
}

export default function DashboardPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [hasError, setHasError] = useState(false)
  const [config, setConfig] = useState<NewsletterConfiguration>({
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    selectedSources: [],
    topics: [],
    geoScopes: [],
    outputFormat: 'detailed',
    includeExecutiveSummary: true,
    groupByTopic: true,
    customSections: {
      executiveHighlights: true,
      criticalSources: true,
      htaDecisions: true,
      policyUpdates: true,
      methodologyDevelopments: true,
      industryNews: true,
      emergingTrends: true,
      upcomingDates: true
    }
  })

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sources?active=true', {
        credentials: 'include'
      })
      const data = await response.json()
      setSources(data)
      // Initially select all sources
      setConfig(prev => ({
        ...prev,
        selectedSources: data.map((s: any) => s.id)
      }))
    } catch (error) {
      console.error('Error fetching sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNewsletter = async () => {
    setGenerating(true)
    setGenerationStatus('Preparing configuration...')
    setHasError(false)

    try {
      // Start generation process
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          dateRange: config.dateRange,
          selectedSources: config.selectedSources,
          outputFormat: config.outputFormat,
          includeExecutiveSummary: config.includeExecutiveSummary,
          groupByTopic: config.groupByTopic,
          topics: config.topics,
          geoScopes: config.geoScopes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const { generationId } = await response.json()

      // Connect to SSE stream for real-time updates
      const eventSource = new EventSource(`/api/generate/stream?id=${generationId}`)

      eventSource.addEventListener('status', (event) => {
        const data = JSON.parse(event.data)
        setGenerationStatus(data.message)
      })

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data)
        setGenerationStatus('Newsletter generated successfully!')
        eventSource.close()

        // Store output and redirect
        sessionStorage.setItem('newsletterOutput', data.output)
        sessionStorage.setItem('generationId', data.generationId)

        setTimeout(() => {
          window.location.href = '/newsletters/output'
        }, 1500)
      })

      eventSource.addEventListener('error', (event: any) => {
        const data = event.data ? JSON.parse(event.data) : {}
        const errorMessage = data.message || 'Error generating newsletter'

        setHasError(true)
        setGenerationStatus(errorMessage)
        eventSource.close()

        // Store error information in sessionStorage for output page
        sessionStorage.setItem('newsletterError', JSON.stringify({
          type: data.type || 'unknown',
          message: errorMessage,
          status: data.status,
          prompt: data.prompt,
          details: data.details
        }))
        sessionStorage.setItem('generationId', generationId)

        // Redirect to output page to show error details
        setTimeout(() => {
          window.location.href = '/newsletters/output'
        }, 1500)
      })

    } catch (error) {
      console.error('Error generating newsletter:', error)
      setHasError(true)
      setGenerationStatus('Error generating newsletter')

      // Show toast notification
      showToast('Unable to generate newsletter. Please try again later.', 'error')

      // Keep error visible for 3 seconds
      setTimeout(() => {
        setGenerating(false)
        setGenerationStatus('')
      }, 3000)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Newsletter Generator</h1>
        <p className="text-gray-600">
          Configure and generate AI-powered newsletters from your news sources
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <NewsletterConfig
            config={config}
            setConfig={setConfig}
          />
        </div>

        {/* Source Selection Panel */}
        <div className="lg:col-span-2">
          <SourceSelector
            sources={sources}
            loading={loading}
            config={config}
            setConfig={setConfig}
          />
        </div>
      </div>

      {/* Generation Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Ready to Generate</h3>
            <p className="text-sm text-gray-600">
              {config.selectedSources.length} sources selected •
              {config.dateRange.from} to {config.dateRange.to}
            </p>
          </div>
          <button
            onClick={handleGenerateNewsletter}
            disabled={generating || config.selectedSources.length === 0}
            className="bg-gradient-to-r from-inovintell-blue to-inovintell-green text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {generating ? 'Generating...' : 'Generate Newsletter'}
          </button>
        </div>

        {generating && (
          <GenerationProgress status={generationStatus} hasError={hasError} />
        )}
      </div>
    </div>
  )
}