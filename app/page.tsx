'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalSources: number
  activeSources: number
  totalNewsletters: number
  lastGenerated: string | null
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    totalSources: 0,
    activeSources: 0,
    totalNewsletters: 0,
    lastGenerated: null
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch sources
      const sourcesResponse = await fetch('/api/sources')
      const sources = await sourcesResponse.json()

      // Fetch newsletters
      const newslettersResponse = await fetch('/api/newsletters?limit=1')
      const newsletters = await newslettersResponse.json()

      setStats({
        totalSources: sources.length,
        activeSources: sources.filter((s: any) => s.active).length,
        totalNewsletters: newsletters.length,
        lastGenerated: newsletters[0]?.createdAt || null
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Newsletter Generator
        </h1>
        <p className="text-xl text-gray-600">
          AI-powered newsletter generation for HTA, HEOR, and Market Access professionals
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-inovintell-blue">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.totalSources}
          </div>
          <div className="text-sm text-gray-600">Total Sources</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-inovintell-green">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.activeSources}
          </div>
          <div className="text-sm text-gray-600">Active Sources</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.totalNewsletters}
          </div>
          <div className="text-sm text-gray-600">Newsletters</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <div className="text-sm font-bold text-gray-900">
            {loading
              ? '...'
              : stats.lastGenerated
              ? new Date(stats.lastGenerated).toLocaleDateString()
              : 'Never'}
          </div>
          <div className="text-sm text-gray-600">Last Generated</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
             onClick={() => router.push('/sources')}>
          <div className="w-12 h-12 bg-inovintell-gradient rounded-lg mb-4 flex items-center justify-center text-white text-2xl">
            🔗
          </div>
          <h3 className="text-lg font-semibold mb-2">Manage Sources</h3>
          <p className="text-gray-600 mb-4">
            Add and manage news sources from governmental, institutional, and company websites.
          </p>
          <span className="text-inovintell-blue hover:text-inovintell-green font-medium">
            Go to Sources →
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
             onClick={() => router.push('/dashboard')}>
          <div className="w-12 h-12 bg-gradient-to-r from-inovintell-green to-inovintell-blue rounded-lg mb-4 flex items-center justify-center text-white text-2xl">
            📰
          </div>
          <h3 className="text-lg font-semibold mb-2">Generate Newsletter</h3>
          <p className="text-gray-600 mb-4">
            Create comprehensive newsletters using AI to aggregate and analyze news from your sources.
          </p>
          <span className="text-inovintell-blue hover:text-inovintell-green font-medium">
            Start Generating →
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
             onClick={() => router.push('/newsletters')}>
          <div className="w-12 h-12 bg-gradient-to-r from-inovintell-blue to-inovintell-green rounded-lg mb-4 flex items-center justify-center text-white text-2xl">
            📚
          </div>
          <h3 className="text-lg font-semibold mb-2">View Archives</h3>
          <p className="text-gray-600 mb-4">
            Access previously generated newsletters and refine them for publication.
          </p>
          <span className="text-inovintell-blue hover:text-inovintell-green font-medium">
            View Newsletters →
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-inovintell-blue to-inovintell-green rounded-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <ol className="space-y-2">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Configure your news sources in the Sources section</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Select sources and parameters in the Dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Generate newsletter using Claude Opus 4.1 agent</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Refine and export your newsletter</span>
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Pro Tips</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                <span>Import sources from CSV for bulk setup</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎯</span>
                <span>Use importance levels to prioritize sources</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🔄</span>
                <span>Agent config auto-updates when sources change</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✨</span>
                <span>Refine newsletters with AI assistance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}