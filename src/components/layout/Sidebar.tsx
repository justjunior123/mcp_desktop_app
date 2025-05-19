import React from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export const defaultNavItems: NavItem[] = [
  { label: 'Chat', href: '/chat' },
  { label: 'Models', href: '/models' },
  { label: 'Servers', href: '/servers' },
];

interface SidebarProps {
  navItems?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ navItems = defaultNavItems }) => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="mb-8">
        <img src="/logo.svg" alt="MCP Logo" className="h-8 w-auto" />
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
          >
            {item.icon && <div className="mr-3">{item.icon}</div>}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}; 