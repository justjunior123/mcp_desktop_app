// Add TextEncoder polyfill for Node.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add fetch polyfill for Node.js
const fetch = require('node-fetch');
global.fetch = fetch;

// Add ReadableStream polyfill
const { ReadableStream } = require('stream/web');
global.ReadableStream = ReadableStream;

// Mock process.env for tests
process.env.NODE_ENV = 'test'; 