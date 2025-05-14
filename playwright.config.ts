import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  use: {
    viewport: { width: 1200, height: 800 },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.e2e\.ts/,
    },
  ],
};

export default config; 