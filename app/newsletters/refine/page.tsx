'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RefinePage() {
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [generationId, setGenerationId] = useState<string>('')
  const [refinementPrompt, setRefinementPrompt] = useState<string>('')
  const [isRefining, setIsRefining] = useState(false)
  const [refinementStatus, setRefinementStatus] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    // Get content from sessionStorage
    const storedContent = sessionStorage.getItem('refineOutput')
    const storedGenerationId = sessionStorage.getItem('refineGenerationId')

    if (storedContent && storedGenerationId) {
      setContent(storedContent)
      setOriginalContent(storedContent)
      setGenerationId(storedGenerationId)
      // Keep sessionStorage for navigation back
    } else {
      // If no content, redirect to dashboard
      console.log('No refine content found, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [router])

  const sections = [
    { id: 'all', label: 'Entire Newsletter' },
    { id: 'executive', label: 'Executive Summary' },
    { id: 'regulatory', label: 'Regulatory Updates' },
    { id: 'market', label: 'Market Access' },
    { id: 'clinical', label: 'Clinical Trials' },
    { id: 'regional', label: 'Regional Updates' }
  ]

  const refinementSuggestions = [
    'Make it more concise',
    'Add more detail about pricing implications',
    'Focus on US market only',
    'Include competitor analysis',
    'Add data and statistics',
    'Make it more technical',
    'Simplify for executive audience',
    'Add action items and recommendations'
  ]

  const handleRefine = async () => {
    if (!refinementPrompt.trim()) {
      alert('Please provide refinement instructions')
      return
    }

    setIsRefining(true)
    setRefinementStatus('Processing refinement request...')

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generationId,
          content,
          refinementPrompt,
          selectedSection
        })
      })

      if (!response.ok) {
        throw new Error('Refinement failed')
      }

      const { refinedContent } = await response.json()

      setRefinementStatus('Refinement complete!')
      setContent(refinedContent)
      setRefinementPrompt('')

      setTimeout(() => {
        setRefinementStatus('')
      }, 3000)

    } catch (error) {
      console.error('Refinement error:', error)
      setRefinementStatus('Error during refinement')
    } finally {
      setIsRefining(false)
    }
  }

  const handleSave = () => {
    sessionStorage.setItem('newsletterOutput', content)
    sessionStorage.setItem('generationId', generationId)
    router.push('/newsletters/output')
  }

  const handleReset = () => {
    if (confirm('Reset to original content? Your changes will be lost.')) {
      setContent(originalContent)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refine Newsletter</h1>
          <p className="text-gray-600 mt-2">Edit and improve your newsletter content</p>
        </div>
        <button
          onClick={() => router.push('/newsletters/output')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Output
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Refinement Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Section Selector */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-3">Select Section</h3>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
            >
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refinement Prompt */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-3">Refinement Instructions</h3>
            <textarea
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="Describe how you want to refine the content..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue resize-none"
            />

            {/* Quick Suggestions */}
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {refinementSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setRefinementPrompt(suggestion)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRefine}
              disabled={isRefining || !refinementPrompt.trim()}
              className="mt-4 w-full bg-gradient-to-r from-inovintell-blue to-inovintell-green text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefining ? 'Refining...' : 'Apply Refinement'}
            </button>

            {refinementStatus && (
              <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded text-sm">
                {refinementStatus}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-4 space-y-2">
            <button
              onClick={handleSave}
              className="w-full bg-inovintell-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              💾 Save Changes
            </button>
            <button
              onClick={handleReset}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ↺ Reset to Original
            </button>
          </div>
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold">Newsletter Content</h3>
              <span className="text-sm text-gray-500">
                {content.length} characters
              </span>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[600px] px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-inovintell-blue resize-none"
              placeholder="Newsletter content will appear here..."
            />

            {/* Preview Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                💡 Tip: You can directly edit the content above or use AI refinement
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}