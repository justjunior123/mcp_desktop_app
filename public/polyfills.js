// Define global object
window.global = window;

// Define process object
window.process = window.process || {
  env: { 
    NODE_ENV: 'development'
  }
};

// Define Buffer object if not exists
if (typeof window.Buffer === 'undefined') {
  window.Buffer = {
    isBuffer: function(obj) { return false; },
    from: function() { return new Uint8Array(); }
  };
} 