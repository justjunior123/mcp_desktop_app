# Database Service Improvements

## Current Status

The MCP Desktop App uses Prisma as an ORM to interact with the database. Currently, we have:

1. **Working Service**: A functional DatabaseService class that handles database operations
2. **Mocked Tests**: Tests that use a Prisma mock to avoid real database operations
3. **Skipped Tests**: Some DatabaseService tests are currently skipped because of mock limitations

## Issues to Address

### 1. Inconsistent Mocking

The current Prisma mock implementation has several limitations:
- Lack of proper type safety
- Inconsistent return values
- Inability to properly simulate relationships
- Difficulty maintaining state across operations

### 2. Testing Isolation

Database tests should:
- Run in isolation from other tests
- Not affect the development/production database
- Be deterministic and repeatable

### 3. Test Coverage

Current database test coverage is insufficient, with several critical paths untested.

## Proposed Solutions

### 1. SQLite-based Test Database

Implement a SQLite in-memory database for tests:

```typescript
// Setup code for test database
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export async function setupTestDatabase() {
  // Use an in-memory SQLite database for tests
  process.env.DATABASE_URL = 'file::memory:?cache=shared';
  
  // Run migrations to create schema
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Create a new PrismaClient instance
  const prisma = new PrismaClient();
  
  return prisma;
}

export async function teardownTestDatabase(prisma: PrismaClient) {
  await prisma.$disconnect();
}
```

### 2. Improved Mock Implementation

For tests that still need mocking, improve the implementation:

```typescript
// Enhanced mock factory
export function createPrismaMock<T extends Record<string, any>>(initialData: T = {} as T) {
  const data = { ...initialData };
  
  return {
    create: jest.fn().mockImplementation(({ data: newData }) => {
      const id = newData.id || `mock-id-${Date.now()}`;
      const record = { id, ...newData };
      data[id] = record;
      return record;
    }),
    
    findUnique: jest.fn().mockImplementation(({ where }) => {
      return data[where.id] || null;
    }),
    
    // Additional methods...
    
    // Helper for tests to inspect internal state
    _getData: () => ({ ...data }),
    
    // Helper to reset state
    _reset: () => {
      Object.keys(data).forEach(key => delete data[key]);
      Object.assign(data, initialData);
    }
  };
}
```

### 3. Integration Test Suite

Create a dedicated integration test suite for database operations:

```typescript
// Example integration test
describe('DatabaseService Integration', () => {
  let prisma: PrismaClient;
  let db: DatabaseService;
  
  beforeAll(async () => {
    prisma = await setupTestDatabase();
    db = new DatabaseService(prisma);
  });
  
  afterAll(async () => {
    await teardownTestDatabase(prisma);
  });
  
  beforeEach(async () => {
    // Clear all tables
    await db.clearDatabase();
  });
  
  it('should create and retrieve a user', async () => {
    const user = await db.createUser({ name: 'Test User', email: 'test@example.com' });
    expect(user.name).toBe('Test User');
    
    const retrieved = await db.getUser(user.id);
    expect(retrieved).toEqual(user);
  });
  
  // More tests...
});
```

## Implementation Plan

### Phase 1: Setup Test Infrastructure

1. Configure Prisma for SQLite testing
2. Create helpers for test database setup/teardown
3. Set up separate test schema with minimal data requirements

### Phase 2: Enhance Mock Implementation

1. Create type-safe mock factory
2. Update jest.setup.ts to use the improved mock
3. Fix any type issues with the mock implementations

### Phase 3: Update Tests

1. Reenable skipped DatabaseService tests
2. Implement comprehensive test coverage for all database operations
3. Add tests for edge cases and error handling

### Phase 4: Continuous Integration

1. Add database tests to CI pipeline
2. Ensure tests run in isolated environments
3. Monitor and improve test performance

## Best Practices

1. **Database Design**:
   - Use Prisma migrations for schema changes
   - Include constraints and validation at the database level
   - Keep schemas in sync between environments

2. **Testing**:
   - Test both success and failure paths
   - Verify data integrity constraints
   - Test complex queries for performance

3. **Service Design**:
   - Use repository pattern for database access
   - Create domain-specific methods instead of exposing raw queries
   - Handle errors appropriately and provide meaningful messages 