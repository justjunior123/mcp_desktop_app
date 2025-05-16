# MCP Desktop App

Desktop application for managing local LLMs and MCP servers, built with Next.js and Electron.

## Project Structure

```
/
├── app/                    # Next.js app directory (frontend)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── electron/              # Electron main process code
│   ├── main.ts           # Main entry point
│   └── tsconfig.json     # Electron-specific TypeScript config
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   └── layout/      # Layout components
│   ├── lib/             # Core libraries
│   │   └── config.ts    # App configuration
│   ├── services/        # Core services
│   │   ├── database/    # Database service
│   │   └── logging/     # Logging service
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── prisma/              # Database schema and migrations
└── PROJECT_DOCS/        # Project documentation
```

## Tech Stack

- **Frontend**: Next.js 14
- **Desktop**: Electron
- **Language**: TypeScript
- **Database**: Prisma
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Development Tools**: ESLint, Prettier, Husky

## Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Initialize the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the development environment:
```bash
npm run dev
```

This will start:
- Next.js frontend on port 3002
- Electron app in development mode
- TypeScript compilation in watch mode

## Building

1. Build for production:
```bash
npm run build
```

2. Package the app:
```bash
npm run package      # For current platform
npm run package:all  # For all platforms
```

## Best Practices

1. **TypeScript**
   - Use strict mode
   - Define types in `src/types`
   - Use path aliases (@/components, etc.)

2. **Components**
   - Use functional components
   - Implement proper prop types
   - Keep components small and focused

3. **State Management**
   - Use React Context for global state
   - Implement proper state isolation
   - Use hooks for shared logic

4. **Error Handling**
   - Implement proper error boundaries
   - Use typed error handling
   - Log errors appropriately

5. **Testing**
   - Write unit tests for utilities
   - Write integration tests for features
   - Test electron functionality

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)
