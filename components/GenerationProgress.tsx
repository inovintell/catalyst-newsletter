'use client'

interface GenerationProgressProps {
  status: string
}

export default function GenerationProgress({ status }: GenerationProgressProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-8 h-8 border-4 border-inovintell-blue rounded-full animate-spin border-t-transparent"></div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-700">{status}</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-inovintell-blue to-inovintell-green h-2 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-inovintell-blue flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm text-gray-600">Configuration prepared</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-inovintell-blue animate-pulse"></div>
          <span className="text-sm font-medium">Generating newsletter content...</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gray-300"></div>
          <span className="text-sm text-gray-400">Formatting output</span>
        </div>
      </div>
    </div>
  )
}