// Minimal type definitions for our polyfills
declare global {
  interface Window {
    global: typeof globalThis;
    process: typeof process;
    Buffer: typeof Buffer;
  }
}

// Ensure global is defined in browser environment
if (typeof window !== 'undefined') {
  // Set up global
  window.global = window.global || window;

  // Set up process
  window.process = window.process || {
    env: { 
      NODE_ENV: process.env.NODE_ENV || 'development',
      // Add any other required env variables here
      PORT: process.env.PORT || '3002',
      API_PORT: process.env.API_PORT || '3100'
    },
    platform: process.platform,
    versions: process.versions,
    cwd: () => process.cwd(),
    // Add other commonly used process properties
    nextTick: (callback: (...args: any[]) => void, ...args: any[]) => {
      Promise.resolve().then(() => callback(...args));
    }
  };

  // Set up Buffer
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = {
      isBuffer: (obj: any): obj is Buffer => Buffer.isBuffer(obj),
      from: (data: string | ArrayBuffer | SharedArrayBuffer | Array<any>, 
             encoding?: string): Uint8Array => {
        if (typeof data === 'string') {
          return new TextEncoder().encode(data);
        }
        if (Array.isArray(data)) {
          return new Uint8Array(data);
        }
        return new Uint8Array(data);
      },
      alloc: (size: number): Uint8Array => new Uint8Array(size),
      allocUnsafe: (size: number): Uint8Array => new Uint8Array(size),
      toString: (buffer: Uint8Array, encoding?: string): string => {
        return new TextDecoder(encoding).decode(buffer);
      }
    } as any;
  }
}

export {}; 