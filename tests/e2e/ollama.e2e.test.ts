beforeAll(() => {
  client = new OllamaClient('http://localhost:11434');
});

beforeAll(async () => {
  try {
    await client.pullModel('mistral:latest');
  } catch (error) {
    console.warn('Error pulling model:', error);
  }
});

afterEach(async () => {
  // ... existing code ...
}); 