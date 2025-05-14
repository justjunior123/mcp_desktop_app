# Original Tome Analysis

## Project Overview

Tome is a desktop application for managing local Large Language Models (LLMs) and MCP (Model Context Protocol) servers.

## Key Features

1. Built with Tauri (Rust backend + TypeScript/SvelteKit frontend)
2. Integrates with Ollama for local LLM management
3. Manages MCP servers with no configuration needed
4. Has a Smithery marketplace integration for MCP servers
5. Provides a chat interface with customizable context window

## Architecture

### Frontend
- SvelteKit with TypeScript
- Static site generation
- Uses Tailwind CSS for styling
- Components in src/components/
- Routes in src/routes/
- Core logic in src/lib/

### Backend
- Tauri/Rust for system-level operations
- SQL database via tauri-plugin-sql
- Process management for MCP servers
- Deep link support for external integrations

### Models
- Uses static functions due to Svelte reactivity constraints
- Plain JS objects for data structures
- Global reactivity with repo pattern

## Dependencies

### Frontend
- SvelteKit v2
- TailwindCSS v4
- TypeScript
- Various Tauri plugins

### Backend
- Tauri v2
- Various Rust crates for functionality

## Current Limitations
- MacOS only (Windows/Linux planned)
- Requires Ollama for model management

## Project Structure

```
runebookai-tome/
├── README.md
├── ARCHITECTURE.md
├── eslint.config.js
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── src/
│   ├── app.css
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.client.ts
│   ├── markdown.css
│   ├── components/
│   ├── lib/
│   └── routes/
├── src-tauri/
│   ├── build.rs
│   ├── Cargo.toml
│   └── src/
└── static/
```

This analysis is based on the original Tome project and serves as a reference for our Node.js-based implementation.
