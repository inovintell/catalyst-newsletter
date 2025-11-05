'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface JobProgress {
  logs: string[]
  metadata?: Record<string, any>
}

export default function StatusPage() {
  const params = useParams()
  const router = useRouter()
  const generationId = params.id as string

  const [status, setStatus] = useState<string>('Connecting...')
  const [jobStatus, setJobStatus] = useState<string>('queued')
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [output, setOutput] = useState<string>('')

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  const connectToEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('[StatusPage] Connecting to event source:', generationId)
    const eventSource = new EventSource(`/api/generate/stream?id=${generationId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[StatusPage] Connection opened')
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
    }

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data)
      console.log('[StatusPage] Status event:', data)
      setStatus(data.message)
      if (data.jobStatus) {
        setJobStatus(data.jobStatus)
      }
      if (data.progress?.logs) {
        setLogs(data.progress.logs)
      }
    })

    eventSource.addEventListener('content', (e) => {
      const data = JSON.parse(e.data)
      console.log('[StatusPage] Content chunk received')
      setOutput(prev => prev + data.chunk)
    })

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      console.log('[StatusPage] Generation complete')
      setStatus('Newsletter generation completed!')
      setJobStatus('completed')
      if (data.output) {
        setOutput(data.output)
      }

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push(`/newsletters/output?id=${generationId}`)
      }, 2000)
    })

    eventSource.addEventListener('error', (e: any) => {
      const data = e.data ? JSON.parse(e.data) : { message: 'Connection error' }
      console.error('[StatusPage] Error event:', data)
      setError(data.message)
      setJobStatus(data.jobStatus || 'failed')
    })

    eventSource.onerror = (e) => {
      console.error('[StatusPage] EventSource error:', e)
      setIsConnected(false)

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        console.log(`[StatusPage] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)

        setTimeout(() => {
          connectToEventSource()
        }, 1000 * reconnectAttemptsRef.current) // Exponential backoff
      } else {
        setError('Connection lost. Please refresh the page.')
      }
    }
  }

  useEffect(() => {
    connectToEventSource()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [generationId])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this generation?')) {
      return
    }

    try {
      const response = await fetch('/api/generate/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ generationId: parseInt(generationId) })
      })

      if (response.ok) {
        setStatus('Cancelling...')
        setJobStatus('cancelled')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to cancel generation')
      }
    } catch (err) {
      console.error('Error cancelling generation:', err)
      setError('Failed to cancel generation')
    }
  }

  const getProgressStage = () => {
    switch (jobStatus) {
      case 'queued':
        return 1
      case 'running':
        return 2
      case 'completed':
        return 4
      case 'failed':
      case 'cancelled':
        return 0
      default:
        return 1
    }
  }

  const progressStage = getProgressStage()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Newsletter Generation Status
            </h1>
            <p className="text-sm text-gray-600">
              Generation ID: {generationId}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {['Queued', 'Processing', 'Formatting', 'Complete'].map((stage, index) => (
                <div key={stage} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      progressStage > index
                        ? 'bg-blue-600 text-white'
                        : progressStage === index + 1
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-xs mt-2 text-gray-600">{stage}</span>
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 ${
                      progressStage > index + 1 ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {jobStatus === 'running' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                <div>
                  <p className="text-sm font-medium text-blue-900">Current Status</p>
                  <p className="text-blue-700">{status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Progress Logs</h2>
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output Preview */}
          {output && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Output Preview</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{output}</pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {(jobStatus === 'queued' || jobStatus === 'running') && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Cancel Generation
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Return to Dashboard
            </button>
            {jobStatus === 'completed' && (
              <button
                onClick={() => router.push(`/newsletters/output?id=${generationId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View Newsletter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
