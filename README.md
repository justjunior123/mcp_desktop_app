# MCP Desktop App

Desktop application for managing local LLMs and MCP servers, built with Next.js and Electron.

## Project Structure

```
├── app/                  # Next.js app directory (frontend)
├── electron/            # Electron main process code
├── src/
│   ├── components/     # React components
│   │   ├── ServerStatusCard/
│   │   ├── models/
│   │   ├── ui/
│   │   └── layout/
│   ├── services/      # Core services
│   │   ├── database/
│   │   ├── logging/
│   │   └── ollama/
│   └── server/        # Server-side code
│       ├── api/
│       ├── process/
│       ├── services/
│       └── types/
├── prisma/             # Database schema and migrations
└── PROJECT_DOCS/       # Project documentation
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

3. Start the development environment:
```bash
npm run dev-all
```

This will start:
- Next.js frontend (port 3002)
- Express API server (port 3100)
- Electron app
- TypeScript compilation in watch mode

## Available Scripts

- `npm run dev-all` - Start all services in development mode
- `npm run dev` - Start Next.js development server only
- `npm run electron-dev` - Start Electron in development mode
- `npm run build:all` - Build all components for production
- `npm run clean` - Clean build artifacts
- `npm run prisma:studio` - Open Prisma database UI
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
