import '@testing-library/jest-dom';

// Mock environment variables
process.env = {
  ...process.env,
  API_PORT: '3100',
  API_HOST: 'localhost',
  NODE_ENV: 'test'
};

// Global test setup
beforeAll(() => {
  // Add any global setup here
});

afterAll(() => {
  // Add any global cleanup here
});

// Mock console methods to keep test output clean
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}; 