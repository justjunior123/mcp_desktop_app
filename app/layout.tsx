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
      <body>{children}</body>
    </html>
  );
} 