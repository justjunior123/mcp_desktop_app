import { resolve } from 'path';
import { register } from 'tsconfig-paths';

async function globalSetup() {
  // Register path aliases
  register({
    baseUrl: process.cwd(),
    paths: {
      '@/*': [resolve(process.cwd(), './src/*')]
    }
  });
}

export default globalSetup; 