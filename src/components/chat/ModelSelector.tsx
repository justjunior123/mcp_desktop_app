'use client'
import React, { useState } from 'react'
import { clsx } from 'clsx'
import { useChatStore, useSelectedModel } from '@/store/chat'

// Mock model data - in real implementation this would come from the API
const MOCK_MODELS = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    description: 'Latest Llama model with improved reasoning',
    size: '7B',
    status: 'ready' as const,
    capabilities: ['chat', 'code', 'reasoning']
  },
  {
    id: 'mistral:latest',
    name: 'Mistral 7B',
    description: 'Fast and efficient model for general tasks',
    size: '7B',
    status: 'ready' as const,
    capabilities: ['chat', 'code']
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    description: 'Specialized for code generation and understanding',
    size: '13B',
    status: 'downloading' as const,
    capabilities: ['code', 'reasoning']
  },
  {
    id: 'phi3',
    name: 'Phi-3',
    description: 'Compact yet powerful model from Microsoft',
    size: '3.8B',
    status: 'ready' as const,
    capabilities: ['chat', 'reasoning']
  }
]

// Icons
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const CpuIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 002 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ready': return 'text-success-500'
    case 'downloading': return 'text-warning-500'
    case 'error': return 'text-error-500'
    default: return 'text-slate-400'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'ready': return 'Ready'
    case 'downloading': return 'Downloading...'
    case 'error': return 'Error'
    default: return 'Unknown'
  }
}

export const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedModel = useSelectedModel()
  const { setSelectedModel } = useChatStore()

  const selectedModelData = MOCK_MODELS.find(m => m.id === selectedModel)

  const handleModelSelect = (modelId: string) => {
    const model = MOCK_MODELS.find(m => m.id === modelId)
    if (model && model.status === 'ready') {
      setSelectedModel(modelId)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          selectedModelData
            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            : 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-700',
          isOpen && 'ring-2 ring-primary-500 ring-offset-2'
        )}
      >
        <div className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-lg',
          selectedModelData
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        )}>
          <CpuIcon />
        </div>

        <div className="flex-1 text-left">
          {selectedModelData ? (
            <>
              <div className="font-medium text-slate-900 dark:text-white">
                {selectedModelData.name}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {selectedModelData.size} " {getStatusText(selectedModelData.status)}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-slate-700 dark:text-slate-300">
                Select a model
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Choose an AI model to start chatting
              </div>
            </>
          )}
        </div>

        <ChevronDownIcon />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-strong animate-slide-in">
            <div className="p-2">
              {/* Header */}
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Available Models
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select a model to start chatting
                </p>
              </div>

              {/* Model list */}
              <div className="py-2 max-h-80 overflow-y-auto">
                {MOCK_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    disabled={model.status !== 'ready'}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-left',
                      model.status === 'ready'
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed',
                      selectedModel === model.id && 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'
                    )}
                  >
                    {/* Model icon */}
                    <div className={clsx(
                      'flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0',
                      model.status === 'ready'
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    )}>
                      {model.status === 'downloading' ? <DownloadIcon /> : <CpuIcon />}
                    </div>

                    {/* Model info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900 dark:text-white truncate">
                          {model.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          {model.size}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {model.description}
                      </p>

                      {/* Capabilities */}
                      <div className="flex items-center gap-1 mt-1">
                        {model.capabilities.map((capability) => (
                          <span
                            key={capability}
                            className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status and selection indicator */}
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        'w-2 h-2 rounded-full',
                        getStatusColor(model.status)
                      )} />
                      
                      {selectedModel === model.id && (
                        <div className="text-primary-500">
                          <CheckIcon />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  More models can be downloaded from the Models page
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}