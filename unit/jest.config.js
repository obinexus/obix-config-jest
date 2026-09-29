// obix-config-jest/unit
// Unit-only Jest configuration.
// Fast, node environment, 30 s timeout, no performance reporter.
//
// Usage:
//   NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/unit/jest.config.js

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('jest').Config} */
export default {
  displayName: 'unit',
  rootDir: path.resolve(process.cwd()),
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.spec.ts',
    '<rootDir>/**/__tests__/**/*.test.ts',
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
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  reporters: ['default'],
  globals: {
    'ts-jest': { isolatedModules: true, useESM: true },
  },
  maxWorkers: '50%',
  maxConcurrency: 5,
  testTimeout: 30_000,
  verbose: true,
  bail: 0,
};
