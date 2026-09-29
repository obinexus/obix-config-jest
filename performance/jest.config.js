// obix-config-jest/performance
// Performance-only Jest configuration.
// 60 s timeout, single worker to minimise noise, StateMachinePerformanceReporter wired.
//
// Usage:
//   NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/performance/jest.config.js

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('jest').Config} */
export default {
  displayName: 'performance',
  rootDir: path.resolve(process.cwd()),
  testMatch: [
    '<rootDir>/tests/performance/**/*.test.ts',
    '<rootDir>/tests/performance/**/*.spec.ts',
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
  reporters: [
    'default',
    // StateMachinePerformanceReporter writes to reports/performance/*.json
    path.resolve(__dirname, '../state-machine-performance-reporter.js'),
  ],
  globals: {
    'ts-jest': { isolatedModules: true, useESM: true },
  },
  // Single worker — prevents measurement interference between concurrent tests
  maxWorkers: 1,
  maxConcurrency: 1,
  // 60 s — automaton state minimization can be expensive on large machines
  testTimeout: 60_000,
  verbose: true,
  bail: 0,
};
