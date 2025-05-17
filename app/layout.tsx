import './globals.css';

export const metadata = {
  title: 'MCP Desktop App',
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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-100 dark:bg-gray-900">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
} 