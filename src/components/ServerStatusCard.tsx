import React from 'react';

interface ServerStatusCardProps {
  isConnected: boolean;
  onRefresh: () => void;
}

export const ServerStatusCard: React.FC<ServerStatusCardProps> = ({
  isConnected,
  onRefresh,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
          <span className="font-medium">
            Server Status: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}; 