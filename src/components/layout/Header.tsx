import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
      <div className="flex-1 flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">MCP Desktop</h1>
      </div>
      <nav className="flex items-center space-x-4">
        <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
          Settings
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          New Chat
        </button>
      </nav>
    </header>
  );
}; 