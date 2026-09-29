// obix-config-jest/integration
// Integration-only Jest configuration.
// Node environment, 45 s timeout to accommodate I/O and async operations.
//
// Usage:
//   NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/integration/jest.config.js

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('jest').Config} */
export default {
  displayName: 'integration',
  rootDir: path.resolve(process.cwd()),
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.spec.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: path.resolve(__dirname, '../typescript/tsconfig.json'),
        diagnostics: { warnOnly: true },
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterFramework: [
    path.resolve(__dirname, '../jest.setup.js'),
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.types.ts',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports/junit',
      outputName: 'jest-junit-integration.xml',
      classNameTemplate: '{filepath}',
      titleTemplate: '{classname} > {title}',
    }],
  ],
  globals: {
    'ts-jest': { isolatedModules: false, useESM: true },
  },
  maxWorkers: '50%',
  maxConcurrency: 3,
  // 45 s — longer than unit (30 s) but shorter than performance (60 s)
  testTimeout: 45_000,
  verbose: true,
  bail: 0,
};
