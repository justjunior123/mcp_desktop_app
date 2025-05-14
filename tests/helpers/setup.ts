// Add custom jest matchers
expect.extend({
  toBeDirectory(received) {
    const pass = fs.existsSync(received) && fs.statSync(received).isDirectory();
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a directory`,
      pass,
    };
  },
  toBeFile(received) {
    const pass = fs.existsSync(received) && fs.statSync(received).isFile();
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a file`,
      pass,
    };
  },
});

// Global test setup
beforeAll(() => {
  // Any global setup needed before running tests
});

// Global test teardown
afterAll(() => {
  // Any cleanup needed after all tests complete
}); 