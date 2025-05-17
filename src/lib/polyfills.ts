// Polyfill global object for browser environment
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = {
    env: {
      ELECTRON_HMR: process.env.ELECTRON_HMR,
      ...process.env
    },
    browser: true,
    version: process.version,
    platform: process.platform
  };
  (window as any).Buffer = Buffer;
  
  // Add any additional browser-specific polyfills here
  if (!window.requestIdleCallback) {
    (window as any).requestIdleCallback = (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ): number => {
      return Number(setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1));
    };
    (window as any).cancelIdleCallback = (id: number): void => {
      clearTimeout(id);
    };
  }

  // Ensure Symbol.iterator is available
  if (typeof Symbol !== 'undefined' && !Symbol.iterator) {
    (Symbol as any).iterator = Symbol('Symbol.iterator');
  }
} 