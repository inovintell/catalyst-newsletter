'use client'

import { useState } from 'react'

interface ExcelImportProps {
  onImportComplete: () => void
  onCancel: () => void
}

export default function ExcelImport({ onImportComplete, onCancel }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('duplicateAction', duplicateAction)

    try {
      const response = await fetch('/api/sources/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)

      if (data.imported > 0 || data.updated > 0) {
        setTimeout(() => {
          onImportComplete()
        }, 3000)
      }
    } catch (error) {
      console.error('Error importing Excel:', error)
      setResult({ error: 'Failed to import Excel file' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Import Sources from Excel</h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Upload an Excel file (.xlsx or .xls) with the following format:
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-2">
              Website | Topic | Link | Comment | Geo scope
            </div>
            <p className="text-xs text-gray-500">
              URLs can be entered as plain text or Excel hyperlinks. Hyperlinked cells will automatically extract the URL.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-inovintell-blue file:text-white
                hover:file:bg-blue-600"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duplicate Handling
            </label>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="skip"
                  checked={duplicateAction === 'skip'}
                  onChange={(e) => setDuplicateAction(e.target.value as 'skip' | 'update')}
                  className="mt-1 mr-3 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Skip duplicates</span>
                  <p className="text-xs text-gray-500 mt-1">Keep existing sources unchanged</p>
                </div>
              </label>
              <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="update"
                  checked={duplicateAction === 'update'}
                  onChange={(e) => setDuplicateAction(e.target.value as 'skip' | 'update')}
                  className="mt-1 mr-3 h-4 w-4 text-inovintell-blue focus:ring-inovintell-blue"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Update duplicates</span>
                  <p className="text-xs text-gray-500 mt-1">Replace existing sources with new data</p>
                </div>
              </label>
            </div>
          </div>

          {result && (
            <div className={`mb-6 p-4 rounded-lg ${
              result.error ? 'bg-red-50 text-red-800' :
              result.errors > 0 ? 'bg-yellow-50 text-yellow-800' :
              'bg-green-50 text-green-800'
            }`}>
              {result.error ? (
                <p>{result.error}</p>
              ) : (
                <>
                  <p className="font-semibold mb-2">Import Summary</p>
                  <div className="space-y-1 text-sm">
                    {result.imported > 0 && (
                      <p className="text-green-700">✅ {result.imported} new sources imported</p>
                    )}
                    {result.updated > 0 && (
                      <p className="text-blue-700">🔄 {result.updated} sources updated</p>
                    )}
                    {result.skipped > 0 && (
                      <p className="text-yellow-700">⏭️ {result.skipped} duplicates skipped</p>
                    )}
                    {result.errors > 0 && (
                      <p className="text-red-700">❌ {result.errors} errors occurred</p>
                    )}
                  </div>

                  {result.skipped > 0 && result.skippedDetails && (
                    <details className="mt-3">
                      <summary className="text-sm cursor-pointer hover:text-yellow-900">
                        View skipped sources
                      </summary>
                      <ul className="text-xs mt-2 space-y-1">
                        {result.skippedDetails.map((item: any, index: number) => (
                          <li key={index} className="ml-4">
                            {item.website} - {item.topic}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {result.errors > 0 && result.errorDetails && (
                    <details className="mt-3">
                      <summary className="text-sm cursor-pointer hover:text-red-900">
                        View errors
                      </summary>
                      <ul className="text-xs mt-2 space-y-1">
                        {result.errorDetails.map((error: string, index: number) => (
                          <li key={index} className="ml-4">{error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={importing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="px-4 py-2 text-white bg-inovintell-blue rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
