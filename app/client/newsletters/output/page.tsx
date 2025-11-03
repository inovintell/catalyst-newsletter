'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NewsletterRenderer from '@/components/NewsletterRenderer'
import ErrorPromptDisplay, { ClaudeAPIError } from '@/components/ErrorPromptDisplay'
import { generateStandaloneHTML } from '@/lib/markdown-utils'

export default function OutputPage() {
  const [output, setOutput] = useState<string>('')
  const [generationId, setGenerationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'html' | 'markdown'>('html')
  const [error, setError] = useState<ClaudeAPIError | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get output from sessionStorage
    const storedOutput = sessionStorage.getItem('newsletterOutput')
    const storedGenerationId = sessionStorage.getItem('generationId')
    const storedError = sessionStorage.getItem('newsletterError')

    if (storedError) {
      // Parse and set error if present
      try {
        const parsedError = JSON.parse(storedError)
        // Batch state updates in microtask to avoid sync setState in effect
        queueMicrotask(() => {
          setError(parsedError)
          setGenerationId(storedGenerationId || 'unknown')
          setLoading(false)
        })
        return
      } catch (e) {
        console.error('Failed to parse error:', e)
      }
    } else if (storedOutput && storedGenerationId) {
      queueMicrotask(() => {
        setOutput(storedOutput)
        setGenerationId(storedGenerationId)
        setLoading(false)
      })
      return
      // Don't clear sessionStorage immediately - keep for potential refinement
    } else {
      // Check if coming back from refinement
      const refineOutput = sessionStorage.getItem('refineOutput')
      const refineGenerationId = sessionStorage.getItem('refineGenerationId')

      if (refineOutput && refineGenerationId) {
        queueMicrotask(() => {
          setOutput(refineOutput)
          setGenerationId(refineGenerationId)
          setLoading(false)
        })
        return
      } else {
        // If no output at all, redirect back to dashboard
        router.push('/dashboard')
        return
      }
    }
  }, [router])

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(output)
    alert('Newsletter copied to clipboard!')
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadHTML = () => {
    const htmlContent = generateStandaloneHTML(
      output,
      `Newsletter - ${new Date().toISOString().split('T')[0]}`
    )
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRefine = () => {
    sessionStorage.setItem('refineOutput', output)
    sessionStorage.setItem('refineGenerationId', generationId)
    router.push('/newsletters/refine')
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'html' ? 'markdown' : 'html')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {error ? 'Newsletter Generation Failed' : 'Generated Newsletter'}
          </h1>
          <p className="text-gray-600 mt-2">
            {error ? 'An error occurred during generation' : 'Review and refine your newsletter content'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Show error if present */}
      {error && (
        <div className="mb-6">
          <ErrorPromptDisplay error={error} />
        </div>
      )}

      {/* Only show content if no error */}
      {!error && output && (
        <>
          {/* Action Buttons */}
          <div className="mb-6 flex gap-3 flex-wrap">
            <button
              onClick={toggleViewMode}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {viewMode === 'html' ? '📝 View as Markdown' : '🎨 View as HTML'}
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              📋 Copy to Clipboard
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ⬇️ Download Markdown
            </button>
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ⬇️ Download HTML
            </button>
            <button
              onClick={handleRefine}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              ✨ Refine Content
            </button>
          </div>

          {/* Output Display */}
          <div className="bg-white rounded-lg shadow-md p-8">
            {viewMode === 'html' ? (
              <NewsletterRenderer content={output} />
            ) : (
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-6 rounded-lg border border-gray-200">
                  {output}
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-4 text-sm text-gray-500">
            Generation ID: {generationId} | Generated on: {new Date().toLocaleString()}
          </div>
        </>
      )}

      {/* If error and no output, show helpful message */}
      {error && !output && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            No content was generated due to the error above.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
