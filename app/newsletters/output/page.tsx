'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OutputPage() {
  const [output, setOutput] = useState<string>('')
  const [generationId, setGenerationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get output from sessionStorage
    const storedOutput = sessionStorage.getItem('newsletterOutput')
    const storedGenerationId = sessionStorage.getItem('generationId')

    if (storedOutput && storedGenerationId) {
      setOutput(storedOutput)
      setGenerationId(storedGenerationId)
      // Don't clear sessionStorage immediately - keep for potential refinement
    } else {
      // Check if coming back from refinement
      const refineOutput = sessionStorage.getItem('refineOutput')
      const refineGenerationId = sessionStorage.getItem('refineGenerationId')

      if (refineOutput && refineGenerationId) {
        setOutput(refineOutput)
        setGenerationId(refineGenerationId)
      } else {
        // If no output at all, redirect back to dashboard
        router.push('/dashboard')
        return
      }
    }
    setLoading(false)
  }, [router])

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(output)
    alert('Newsletter copied to clipboard!')
  }

  const handleDownload = () => {
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

  const handleRefine = () => {
    sessionStorage.setItem('refineOutput', output)
    sessionStorage.setItem('refineGenerationId', generationId)
    router.push('/newsletters/refine')
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
          <h1 className="text-3xl font-bold text-gray-900">Generated Newsletter</h1>
          <p className="text-gray-600 mt-2">Review and refine your newsletter content</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleCopyToClipboard}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          📋 Copy to Clipboard
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ⬇️ Download Markdown
        </button>
        <button
          onClick={handleRefine}
          className="px-4 py-2 bg-gradient-to-r from-inovintell-blue to-inovintell-green text-white rounded-lg hover:shadow-lg transition-all"
        >
          ✨ Refine Content
        </button>
      </div>

      {/* Output Display */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="prose prose-lg max-w-none">
          <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-6 rounded-lg">
            {output}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 text-sm text-gray-500">
        Generation ID: {generationId} | Generated on: {new Date().toLocaleString()}
      </div>
    </div>
  )
}