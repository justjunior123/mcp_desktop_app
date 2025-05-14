import { Application } from 'spectron';
import { beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';

interface GlobalWithApp {
  app?: Application;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global extends GlobalWithApp {}
  }
}

const globalWithApp = global as unknown as GlobalWithApp;

beforeAll(async () => {
  const electronPath = path.join(__dirname, '../../node_modules/.bin/electron');
  const appPath = path.join(__dirname, '../../electron/main.js');

  const app = new Application({
    path: electronPath,
    args: [appPath],
    env: {
      NODE_ENV: 'test'
    },
    startTimeout: 10000,
    waitTimeout: 10000
  });

  try {
    await app.start();
    globalWithApp.app = app;
  } catch (error) {
    console.error('Failed to start application:', error);
    throw error;
  }
});

afterAll(async () => {
  if (globalWithApp.app?.isRunning()) {
    await globalWithApp.app.stop();
  }
}); 