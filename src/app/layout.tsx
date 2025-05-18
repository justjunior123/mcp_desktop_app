import React from 'react';
import { MainLayout } from '../components/layout/MainLayout.tsx';
import './globals.css';

export const metadata = {
  title: 'MCP Desktop',
  description: 'Desktop application for managing local LLMs and MCP servers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() { window.global = window; })();`,
          }}
        />
      </head>
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
} 