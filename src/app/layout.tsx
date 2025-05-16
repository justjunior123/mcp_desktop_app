import { Metadata } from 'next';
import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import './globals.css';

export const metadata: Metadata = {
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
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
} 