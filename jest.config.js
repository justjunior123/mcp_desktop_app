module.exports = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/**/*.test.ts'
      ],
      setupFilesAfterEnv: [
        './tests/utils/jest-setup.ts'
      ]
    },
    {
      displayName: 'react',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/**/*.test.tsx'
      ],
      transform: {
        '^.+\\.(t|j)sx?$': ['@swc/jest']
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        './tests/utils/jest-setup.ts',
        './tests/utils/jest-setup-react.ts'
      ]
    }
  ]
}; 