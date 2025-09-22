'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Newsletter {
  id: number
  title: string
  status: string
  createdAt: string
  content?: any
  parameters?: any
  type?: string
}

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()

  useEffect(() => {
    fetchNewsletters()
  }, [filter])

  const fetchNewsletters = async () => {
    try {
      const url = filter === 'all'
        ? '/api/newsletters'
        : `/api/newsletters?status=${filter}`

      const response = await fetch(url)
      const data = await response.json()
      setNewsletters(data)
    } catch (error) {
      console.error('Error fetching newsletters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this newsletter?')) return

    try {
      const response = await fetch(`/api/newsletters/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNewsletters(newsletters.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting newsletter:', error)
    }
  }

  const handleView = (newsletter: Newsletter) => {
    // Store newsletter in sessionStorage and navigate to output page
    sessionStorage.setItem('newsletterOutput', newsletter.content?.output || '')
    sessionStorage.setItem('generationId', newsletter.id.toString())
    router.push('/newsletters/output')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700'
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Newsletter Archive</h1>
          <p className="text-gray-600 mt-2">View and manage generated newsletters</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-gradient-to-r from-inovintell-blue to-inovintell-green text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          + Generate New
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-inovintell-blue text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'completed'
              ? 'bg-inovintell-blue text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'draft'
              ? 'bg-inovintell-blue text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Newsletters List */}
      {newsletters.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No newsletters found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-inovintell-blue hover:underline"
          >
            Generate your first newsletter →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {newsletters.map((newsletter) => (
                <tr key={`${newsletter.type}-${newsletter.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {newsletter.title}
                      </div>
                      {newsletter.parameters?.sourceCount && (
                        <div className="text-xs text-gray-500">
                          {newsletter.parameters.sourceCount} sources
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(newsletter.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {newsletter.parameters?.dateRange ? (
                      <span>
                        {new Date(newsletter.parameters.dateRange.from).toLocaleDateString()} -
                        {new Date(newsletter.parameters.dateRange.to).toLocaleDateString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(newsletter.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {newsletter.status === 'completed' && newsletter.content?.output && (
                        <button
                          onClick={() => handleView(newsletter)}
                          className="text-inovintell-blue hover:text-blue-700"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(newsletter.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}