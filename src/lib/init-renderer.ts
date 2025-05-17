declare global {
  interface Window {
    __ELECTRON_GLOBAL__: {
      Symbol: typeof Symbol;
      iteratorImpl: () => Iterator<any>;
      defineIterator: (obj: any) => void;
    };
    initializeRenderer: () => void;
  }
}

export function initializeRenderer() {
  if (typeof window !== 'undefined' && window.initializeRenderer) {
    try {
      window.initializeRenderer();
      
      // Initialize any objects that need iterators
      if (window.__ELECTRON_GLOBAL__?.defineIterator) {
        const objectsNeedingIterator = [
          Object.prototype,
          Array.prototype,
          String.prototype,
          Set.prototype,
          Map.prototype
        ];

        objectsNeedingIterator.forEach(obj => {
          window.__ELECTRON_GLOBAL__.defineIterator(obj);
        });
      }
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  }
}

// Auto-initialize when imported
initializeRenderer(); 