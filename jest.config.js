/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Test Report',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true
    }]
  ],
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['**/tests/unit/**/*.test.ts', '**/tests/unit/**/*.spec.ts', '**/tests/e2e/**/*.e2e.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: false
        }]
      }
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['**/tests/integration/**/*.test.ts', '**/tests/integration/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: false
        }]
      }
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['**/tests/**/*.test.tsx', '**/tests/**/*.spec.tsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.jsdom.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: false,
          babelConfig: {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
              ['@babel/preset-react', { runtime: 'automatic' }]
            ]
          }
        }]
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@styles/(.*)$': '<rootDir>/src/styles/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1'
      }
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['**/tests/e2e/**/*.e2e.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: false
        }]
      }
    }
  ],
  testTimeout: 30000, // Global timeout of 2 minutes
  maxWorkers: 1 // Run tests sequentially
}; 