// Add static Buffer import
import { Buffer } from 'buffer';

// Initialize required globals
(() => {
  // Ensure Symbol exists
  if (typeof Symbol === 'undefined') {
    (window as any).Symbol = function Symbol(description?: string | number) {
      return `Symbol(${description})`;
    };
  }

  // Ensure Symbol.iterator exists
  if (!Symbol.iterator) {
    Object.defineProperty(Symbol, 'iterator', {
      value: Symbol('iterator'),
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  // Make globalThis available and extensible
  const globalObj = globalThis as any;
  
  // Ensure global is available
  if (typeof global === 'undefined') {
    globalObj.global = globalThis;
  }

  // Make global object extensible for webpack HMR
  if (!Object.getOwnPropertyDescriptor(globalObj, '__webpack_require__')) {
    Object.defineProperty(globalObj, '__webpack_require__', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: undefined
    });
  }

  // Add iterator support to global object
  if (!globalObj[Symbol.iterator]) {
    Object.defineProperty(globalObj, Symbol.iterator, {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function* () {
        yield* Object.values(this);
      }
    });
  }

  // Ensure process is available with correct environment
  if (typeof process === 'undefined') {
    const currentProcess = process as NodeJS.Process | undefined;
    globalObj.process = { 
      env: { 
        NODE_ENV: currentProcess?.env?.NODE_ENV || 'development',
        ELECTRON_HMR: currentProcess?.env?.ELECTRON_HMR || 'true'
      },
      browser: true
    };
  }

  // Ensure Buffer is available
  if (typeof globalObj.Buffer === 'undefined') {
    globalObj.Buffer = Buffer;
  }

  // Make object extensible for HMR
  Object.defineProperty(globalObj, 'webpackHotUpdate_N_E', {
    configurable: true,
    writable: true,
    value: undefined
  });
})();

export {}; 
export {}; 