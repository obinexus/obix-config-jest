// obix-config-jest — base shared config (ESM)
// Converted from CJS to ESM to align with the monorepo's "type": "module" standard.
//
// Direct usage:
//   NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/jest.config.js
//
// Or import the programmatic API:
//   import { createFullConfig } from 'obix-config-jest';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-compatible __dirname polyfill (Node >=18)
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

/** @type {import('jest').Config} */
const config = {
  // Resolve rootDir relative to the consumer's project root (cwd)
  rootDir: path.resolve(process.cwd()),
  testEnvironment: 'node',
  preset: 'ts-jest',

  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Transform TypeScript via ts-jest — references the sibling typescript config
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

  // File patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports/junit',
      outputName: 'jest-junit.xml',
      classNameTemplate: '{filepath}',
      titleTemplate: '{classname} > {title}',
    }],
  ],

  // Setup
  setupFilesAfterFramework: [
    path.resolve(__dirname, './jest.setup.js'),
  ],

  // ts-jest global options
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: true,
    },
  },

  // Performance
  maxWorkers: '50%',
  maxConcurrency: 5,
  testTimeout: 30_000,

  // Multi-project configuration
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60_000,
    },
  ],

  // Watch plugins for TDD workflow
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects',
  ],

  // Error handling
  bail: 0,
  verbose: true,
};

export default config;
