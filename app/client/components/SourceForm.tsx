'use client'

import { useState, useEffect } from 'react'

interface SourceFormProps {
  source?: any
  onSave: (source: any) => void
  onCancel: () => void
}

const TOPICS = [
  'Market Access',
  'HTA',
  'EU HTA',
  'JCA',
  'Joint Clinical Assessment',
  'Joint Scientific Consultation',
  'HTA Regulation',
  'Pricing',
  'Reimbursement',
  'Pricing and reimbursement',
  'Health Technology Assessment',
  'HEOR',
  'Health economics',
  'Outcomes research',
  'HTA reports',
  'HTA news',
  'Health policy and regulation',
  'Pharmacoeconomics',
  'Clinical data',
  'Biotech news',
  'Pharma news',
  'Gene therapy news',
  'Cell & gene therapies news',
  'Oncology news',
  'Policy',
  'Industry news',
  'Regulatory',
  'Value assessment',
  'Drug pricing',
  'Cost-effectiveness',
  'Value communication',
  'Rare diseases/Orphan drugs'
]

const GEO_SCOPES = [
  'Global',
  'Europe',
  'US',
  'Asia',
  'UK',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Sweden',
  'Canada',
  'Japan'
]

const IMPORTANCE_LEVELS = [
  'Important',
  'Less important',
  'Requires screening of the content'
]

export default function SourceForm({ source, onSave, onCancel }: SourceFormProps) {
  const [formData, setFormData] = useState({
    website: '',
    topic: '',
    link: '',
    comment: '',
    geoScope: '',
    importanceLevel: '',
    requiresScreening: false,
    active: true
  })

  useEffect(() => {
    if (source) {
      setFormData(source)
    }
  }, [source])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {source ? 'Edit Source' : 'Add New Source'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website/Organization *
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic *
              </label>
              <select
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              >
                <option value="">Select a topic</option>
                {TOPICS.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link/URL *
              </label>
              <input
                type="url"
                name="link"
                value={formData.link}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geographic Scope *
              </label>
              <select
                name="geoScope"
                value={formData.geoScope}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              >
                <option value="">Select geographic scope</option>
                {GEO_SCOPES.map(scope => (
                  <option key={scope} value={scope}>{scope}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Importance Level
              </label>
              <select
                name="importanceLevel"
                value={formData.importanceLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              >
                <option value="">Select importance level</option>
                {IMPORTANCE_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment/Notes
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-inovintell-blue"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requiresScreening"
                  checked={formData.requiresScreening}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Requires content screening</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Active source</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-inovintell-blue rounded-lg hover:bg-blue-600 transition-colors"
              >
                {source ? 'Update' : 'Add'} Source
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}