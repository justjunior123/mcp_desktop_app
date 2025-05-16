import { contextBridge, ipcRenderer } from 'electron';

// Function to handle Next.js HMR events
function setupHMRObserver() {
  // Watch for Next.js HMR events
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const isHMRUpdate = addedNodes.some((node) => {
          if (node instanceof HTMLElement) {
            return node.id === '__next' || node.id?.startsWith('__next-build-watcher');
          }
          return false;
        });

        if (isHMRUpdate) {
          console.log('HMR update detected, reloading window...');
          window.location.reload();
        }
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// Wait for document to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHMRObserver);
} else {
  setupHMRObserver();
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    send: (channel: string, data: any) => {
      // whitelist channels
      let validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
      let validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
); 