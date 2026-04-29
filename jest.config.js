/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '^azure-devops-extension-sdk$': '<rootDir>/tests/__mocks__/azure-devops-extension-sdk.js',
    '^azure-devops-ui/(.*)$': '<rootDir>/tests/__mocks__/azure-devops-ui.js',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
