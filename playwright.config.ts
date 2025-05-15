import { PlaywrightTestConfig, devices } from '@playwright/test';
import { resolve } from 'path';
import { register } from 'tsconfig-paths';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,
  workers: 1, // Run tests sequentially since we're using the same WebSocket server
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'integration',
      testMatch: /integration\/.*\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  globalSetup: resolve(__dirname, './tests/setup/global-setup.ts'),
  globalTeardown: resolve(__dirname, './tests/setup/global-teardown.ts'),
};

// Register path aliases for tests
const tsconfig = {
  compilerOptions: {
    paths: {
      '@/*': [resolve(process.cwd(), './src/*')]
    }
  }
};

register({
  baseUrl: process.cwd(),
  paths: tsconfig.compilerOptions.paths
});

export default config; 