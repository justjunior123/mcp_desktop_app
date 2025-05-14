import * as fs from 'fs';
import * as path from 'path';
import { safeRemove, setPermissionsRecursive, PERMISSIONS, ensureDirectory } from './fs-utils';

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

// Test directories that need to be managed
const TEST_DIRECTORIES = [
  'test-configs',
  'test-server-configs',
  'test-results',
  'test-servers.json'
].map(dir => path.join(process.cwd(), dir));

// Global test setup
beforeAll(async () => {
  // Ensure all test directories exist with proper permissions
  await Promise.all(
    TEST_DIRECTORIES.map(async (dir) => {
      await ensureDirectory(dir);
      await setPermissionsRecursive(dir, PERMISSIONS.FULL);
    })
  );
});

// Global test teardown
afterAll(async () => {
  // Clean up test directories
  await Promise.all(
    TEST_DIRECTORIES.map(async (dir) => {
      if (fs.existsSync(dir)) {
        await safeRemove(dir);
      }
    })
  );
});

// Reset permissions before each test
beforeEach(async () => {
  await Promise.all(
    TEST_DIRECTORIES.map(dir => {
      if (fs.existsSync(dir)) {
        return setPermissionsRecursive(dir, PERMISSIONS.FULL);
      }
      return Promise.resolve();
    })
  );
}); 