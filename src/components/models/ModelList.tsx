import React, { useEffect, useRef } from 'react';
import { Card } from '@components/ui/Card';
import { OllamaModelDetails } from '@services/ollama/ModelManager';

function formatBytes(bytes: bigint | number): string {
  if (bytes === 0n || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  const i = Math.floor(Math.log(bytesNum) / Math.log(k));
  return `${parseFloat((bytesNum / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

interface ModelListProps {
  models: OllamaModelDetails[];
  onViewDetails: (modelId: string) => void;
  onConfigureModel: (modelId: string) => void;
  onPullModel: (modelName: string) => void;
  onDeleteModel: (modelId: string) => void;
}

export const ModelList: React.FC<ModelListProps> = ({
  models = [],
  onViewDetails,
  onConfigureModel,
  onPullModel,
  onDeleteModel,
}) => {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);

  useEffect(() => {
    // Handle WebView errors
    const handleWebViewError = (e: Event) => {
      const error = e as { message?: string };
      if (error.message?.includes('Symbol.iterator')) {
        // Ignore Symbol.iterator errors
        return;
      }
      console.error('WebView error:', error);
    };

    // Handle WebView crashes
    const handleWebViewCrash = () => {
      if (webviewRef.current) {
        webviewRef.current.reload();
      }
    };

    const webview = webviewRef.current;
    if (webview) {
      webview.addEventListener('error', handleWebViewError);
      webview.addEventListener('crashed', handleWebViewCrash);
    }

    return () => {
      if (webview) {
        webview.removeEventListener('error', handleWebViewError);
        webview.removeEventListener('crashed', handleWebViewCrash);
      }
    };
  }, []);

  if (!Array.isArray(models)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">No models available</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((model) => (
        <Card
          key={model.id}
          className="hover:shadow-lg transition-shadow"
          onClick={() => onViewDetails(model.id)}
        >
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {model.size ? formatBytes(model.size) : 'Size unknown'}
              </p>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">
                Status: {model.status}
                {model.downloadProgress && model.downloadProgress > 0 && model.downloadProgress < 100 && (
                  <span className="ml-2">({Math.round(model.downloadProgress)}%)</span>
                )}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPullModel(model.name);
                  }}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                  disabled={model.status === 'DOWNLOADING'}
                >
                  {model.status === 'DOWNLOADING' ? 'Pulling...' : 'Pull'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteModel(model.id);
                  }}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  disabled={model.status === 'DOWNLOADING'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}; 