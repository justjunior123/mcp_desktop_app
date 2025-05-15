# Testing Approach for MCP Desktop App

## Overview

The MCP Desktop App uses a comprehensive testing strategy that includes unit tests, integration tests, and component tests. This document outlines our approach to testing, with a focus on our mocking strategies.

## Testing Stack

- **Jest**: Primary test runner and assertion library
- **Testing Library**: For React component testing
- **Supertest**: For API endpoint testing
- **Mock Service Worker (MSW)**: For mocking HTTP requests
- **Custom Mocks**: For database and system services

## Mocking Strategy

### Database Mocking

We use a custom mock implementation for Prisma in `jest.setup.ts`. This approach provides several benefits:

1. **Test Isolation**: Tests don't depend on a real database, ensuring consistency across environments
2. **Speed**: Tests run much faster without actual database operations
3. **Predictability**: Mock responses are consistent and controllable

The mock implementation:
- Simulates all Prisma client methods (`create`, `findUnique`, `update`, etc.)
- Returns realistic data structures that match actual database responses
- Handles relationships between entities
- Maintains state for operations like delete (returning null after deletion)

Example of our mock implementation:

```typescript
const mockPrisma = {
  user: {
    create: jest.fn().mockImplementation((params: DataParam) => ({ 
      id: 'user-id', 
      ...params.data 
    })),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => {
      if (params.where.id === 'deleted-user-id') {
        return null;
      }
      return { 
        id: params.where.id, 
        name: 'Test User', 
        email: 'test@example.com' 
      };
    }),
    // Other methods...
  },
  // Other models...
};
```

### API Mocking

For API endpoints, we use a combination of approaches:

1. **Supertest**: For testing Express routes directly
2. **MSW**: For intercepting and mocking HTTP requests in component tests
3. **Jest mocks**: For lower-level service mocking

### Component Testing

React components are tested using React Testing Library with the following approach:

1. **Render Testing**: Verify components render correctly
2. **Interaction Testing**: Test user interactions like clicks and input
3. **State Testing**: Verify component state changes appropriately
4. **Integration**: Test component integration with services using mocks

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, classes, and components in isolation. We use heavy mocking to ensure true isolation.

Example:
```typescript
describe('UserService', () => {
  it('should format user names correctly', () => {
    const service = new UserService();
    expect(service.formatName('john', 'doe')).toBe('John Doe');
  });
});
```

### Integration Tests

Integration tests verify that different parts of the application work together correctly. We typically test:

1. API endpoints with their controllers
2. Components with their services
3. Services with their dependencies

### Component Tests

Component tests focus on React components and ensure they:

1. Render correctly
2. Respond to user interactions
3. Update based on state changes
4. Integrate with services via mocks

## Best Practices

1. **Test Structure**:
   - Clear descriptions in `describe` and `it` blocks
   - Setup and teardown in `beforeEach`/`afterEach`
   - Isolation of test cases

2. **Mocking**:
   - Use typed mock implementations
   - Reset mocks between tests
   - Verify mock calls when appropriate

3. **Assertions**:
   - Use precise assertions
   - Test both positive and negative cases
   - Handle async operations properly

## Handling Flaky Tests

Some tests, particularly those involving timing or external resources, can be flaky. Our approach to handling them:

1. **Isolate the cause**: Determine why the test is flaky
2. **Fix when possible**: Improve the test to make it more reliable
3. **Skip when necessary**: Use `it.skip()` for tests that cannot be reliable
4. **Document skipped tests**: Always document why a test is skipped

Example:
```typescript
// This test is skipped due to inconsistent rate limiting behavior in test environment
it.skip('handles rate limiting', async () => {
  // Test implementation...
});
```

## Continuous Improvement

Our testing approach is continuously evolving. Areas for improvement include:

1. **Database Tests**: Implement SQLite-based tests for DatabaseService
2. **End-to-End Testing**: Add Playwright for full E2E testing
3. **Performance Testing**: Add dedicated performance test suite
4. **Coverage**: Increase test coverage to >90%

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Run tests with coverage
npm test -- --coverage

# Skip specific tests
npm test -- --testPathIgnorePatterns=path/to/skip
``` 