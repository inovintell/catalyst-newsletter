'use client'

import { ensureArray } from '@/lib/validation'

interface Source {
  id: number
  website: string
  topic: string
  link: string
  comment?: string
  geoScope: string
  importanceLevel?: string
  requiresScreening: boolean
  active: boolean
}

interface SourceTableProps {
  sources: Source[]
  onEdit: (source: Source) => void
  onDelete: (id: number) => void
}

export default function SourceTable({ sources, onEdit, onDelete }: SourceTableProps) {
  // Ensure sources is always an array to prevent crashes
  const safeSources = ensureArray<Source>(sources, 'SourceTable')

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Website
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Topic
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Geo Scope
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Importance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {safeSources.map((source) => (
            <tr key={source.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {source.website}
                  </div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    <a
                      href={source.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-inovintell-blue hover:underline"
                      title={source.link}
                    >
                      {source.link}
                    </a>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {source.topic}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {source.geoScope}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {source.importanceLevel && (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    source.importanceLevel === 'Important'
                      ? 'bg-green-100 text-green-800'
                      : source.importanceLevel === 'Less important'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {source.importanceLevel}
                  </span>
                )}
                {source.requiresScreening && (
                  <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                    Screening
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  source.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(source)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit source"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(source.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete source"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {safeSources.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No sources found. Add your first source to get started.
        </div>
      )}
    </div>
  )
}