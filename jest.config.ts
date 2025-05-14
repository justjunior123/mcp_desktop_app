import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testTimeout: 30000,
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
      jsx: 'react-jsx',
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-.*)/)',
  ],
  projects: [
    {
      displayName: 'DOM',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.{ts,tsx}',
        '<rootDir>/tests/integration/**/*.test.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
    },
    {
      displayName: 'NODE',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'MCP',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/mcp/**/*.test.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.mcp.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json'
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@modelcontextprotocol)/)'
      ]
    }
  ],
};

export default config; 