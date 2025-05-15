'use client';

import React, { useEffect, useState } from 'react';

interface ServiceStatus {
  database: 'healthy' | 'unhealthy';
  ollama: 'available' | 'unavailable';
}

export function ServerStatusCard() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Failed to fetch server status');
      }
      const data = await response.json();
      setStatus(data.services);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Server Status</h2>
      
      {error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : status ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Database</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status.database === 'healthy'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {status.database}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Ollama</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status.ollama === 'available'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {status.ollama}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No status available</div>
      )}
    </div>
  );
} 