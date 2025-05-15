import React from 'react';
import Link from 'next/link';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-6">
      <div className="flex-1 flex items-center">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">MCP Desktop</h1>
      </div>
      <nav className="flex items-center space-x-4">
        <Link 
          href="/models" 
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          Models
        </Link>
        <Link 
          href="/settings" 
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          Settings
        </Link>
        <Link 
          href="/chat" 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          New Chat
        </Link>
      </nav>
    </header>
  );
}; 