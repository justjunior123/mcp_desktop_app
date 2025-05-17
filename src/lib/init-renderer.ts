import '../lib/polyfills';  // Import polyfills first, using relative path

declare global {
  interface Window {
    global: typeof globalThis;
    process: NodeJS.Process;
    Buffer: typeof Buffer;
    __ELECTRON_GLOBAL__: {
      Symbol: typeof Symbol;
      iteratorImpl: () => Iterator<any>;
      defineIterator: (obj: any) => void;
    };
    initializeRenderer: () => void;
  }
}

interface IterablePrototype {
  [Symbol.iterator]?: () => Iterator<any>;
}

type Constructor = {
  prototype: IterablePrototype;
}

export function initializeRenderer() {
  if (typeof window === 'undefined') return;

  try {
    // Ensure global is defined
    if (!window.global) {
      (window as any).global = window;
    }

    // Initialize renderer-specific functionality
    if (window.initializeRenderer) {
      window.initializeRenderer();
    }

    // Initialize iterators if needed
    if (window.__ELECTRON_GLOBAL__?.defineIterator) {
      const objectsNeedingIterator = [
        Object,
        Array,
        String,
        Set,
        Map
      ] as Constructor[];

      objectsNeedingIterator.forEach(Type => {
        const proto = Type.prototype;
        if (!proto[Symbol.iterator]) {
          window.__ELECTRON_GLOBAL__.defineIterator(proto);
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize renderer:', error);
  }
}

// Auto-initialize when imported
initializeRenderer(); 