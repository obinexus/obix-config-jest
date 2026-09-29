// obix-config-jest
// Programmatic Jest configuration factory for OBIX SDK packages.
// NOTE: This module does NOT import Jest at compile time — Jest stays a
// peerDependency consumed at runtime. All config objects are plain objects
// matching Jest's Config shape via structural typing.

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Types ────────────────────────────────────────────────────────────────────

/** Test environment identifier */
export type JestEnv = 'unit' | 'integration' | 'performance' | 'full';

/** Jest testEnvironment values supported by OBIX */
export type JestTestEnvironment = 'node' | 'jsdom' | 'happy-dom';

/** Coverage reporters supported */
export type JestCoverageReporter = 'text' | 'lcov' | 'clover' | 'html' | 'json' | 'json-summary';

/** Options accepted by all factory functions */
export interface ObixJestOptions {
  /**
   * Root directory for jest to search from.
   * Default: `process.cwd()`
   */
  rootDir?: string;
  /**
   * Path to the tsconfig.json used by ts-jest.
   * Default: `'./tsconfig.json'`
   */
  tsconfig?: string;
  /**
   * Jest test environment.
   * Default: `'node'`
   */
  testEnvironment?: JestTestEnvironment;
  /**
   * Global coverage threshold percentage (applied to branches, functions, lines, statements).
   * Default: `80`
   */
  coverageThreshold?: number;
  /**
   * Default test timeout in milliseconds.
   * Default: `30000`
   */
  timeout?: number;
  /**
   * Extended timeout for performance tests in milliseconds.
   * Default: `60000`
   */
  performanceTimeout?: number;
  /**
   * Whether to run Jest in verbose mode.
   * Default: `true`
   */
  verbose?: boolean;
  /**
   * Number of failures before Jest bails out. `0` = never bail.
   * Default: `0`
   */
  bail?: number;
  /**
   * Additional module name mappings merged with OBIX defaults.
   * Default: `{ '^@/(.*)$': '<rootDir>/src/$1' }`
   */
  moduleNameMapper?: Record<string, string>;
}

/** Fully-resolved options — all fields present */
export type ResolvedObixJestOptions = Required<ObixJestOptions>;

/** Static descriptor used by obix-cli to introspect the config package */
export interface ObixJestConfig {
  env: JestEnv;
  options: ResolvedObixJestOptions;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Path to the sibling typescript config's tsconfig.json (resolved from dist/) */
const DEFAULT_TSCONFIG = path.resolve(__dirname, '../../typescript/tsconfig.json');

const DEFAULT_OPTIONS: ResolvedObixJestOptions = {
  rootDir: process.cwd(),
  tsconfig: DEFAULT_TSCONFIG,
  testEnvironment: 'node',
  coverageThreshold: 80,
  timeout: 30_000,
  performanceTimeout: 60_000,
  verbose: true,
  bail: 0,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

function resolveOptions(overrides?: ObixJestOptions): ResolvedObixJestOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...overrides,
    moduleNameMapper: {
      ...DEFAULT_OPTIONS.moduleNameMapper,
      ...(overrides?.moduleNameMapper ?? {}),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTransform(tsconfig: string): Record<string, unknown> {
  return {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig,
        diagnostics: { warnOnly: true },
        useESM: true,
      },
    ],
  };
}

function buildCoverageThreshold(pct: number): Record<string, Record<string, number>> {
  return {
    global: {
      branches: pct,
      functions: pct,
      lines: pct,
      statements: pct,
    },
  };
}

// ─── Static descriptors (for obix-cli indexing) ───────────────────────────────

export const baseConfig: ObixJestConfig = {
  env: 'full',
  options: { ...DEFAULT_OPTIONS },
};

export const unitConfig: ObixJestConfig = {
  env: 'unit',
  options: { ...DEFAULT_OPTIONS },
};

export const integrationConfig: ObixJestConfig = {
  env: 'integration',
  options: { ...DEFAULT_OPTIONS },
};

export const performanceConfig: ObixJestConfig = {
  env: 'performance',
  options: { ...DEFAULT_OPTIONS, timeout: DEFAULT_OPTIONS.performanceTimeout },
};

// ─── Factory functions ─────────────────────────────────────────────────────────

/**
 * Create a unit-only Jest configuration.
 * Fast, node environment, 30 s timeout.
 */
export function createUnitConfig(opts?: ObixJestOptions): Record<string, unknown> {
  const o = resolveOptions(opts);
  const threshold = buildCoverageThreshold(o.coverageThreshold);
  return {
    displayName: 'unit',
    rootDir: o.rootDir,
    testMatch: [
      '<rootDir>/tests/unit/**/*.test.ts',
      '<rootDir>/tests/unit/**/*.spec.ts',
      '<rootDir>/**/__tests__/**/*.test.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],
    testEnvironment: o.testEnvironment,
    preset: 'ts-jest',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: buildTransform(o.tsconfig),
    moduleNameMapper: o.moduleNameMapper,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFilesAfterFramework: [],
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/index.ts',
      '!src/**/*.types.ts',
    ],
    coverageDirectory: 'coverage/unit',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: threshold,
    testTimeout: o.timeout,
    verbose: o.verbose,
    bail: o.bail,
    maxWorkers: '50%',
  };
}

/**
 * Create an integration-only Jest configuration.
 * Node environment, 45 s timeout, slower rebuild acceptable.
 */
export function createIntegrationConfig(opts?: ObixJestOptions): Record<string, unknown> {
  const o = resolveOptions(opts);
  const threshold = buildCoverageThreshold(o.coverageThreshold);
  return {
    displayName: 'integration',
    rootDir: o.rootDir,
    testMatch: [
      '<rootDir>/tests/integration/**/*.test.ts',
      '<rootDir>/tests/integration/**/*.spec.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],
    testEnvironment: o.testEnvironment,
    preset: 'ts-jest',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: buildTransform(o.tsconfig),
    moduleNameMapper: o.moduleNameMapper,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/index.ts',
      '!src/**/*.types.ts',
    ],
    coverageDirectory: 'coverage/integration',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: threshold,
    testTimeout: 45_000,
    verbose: o.verbose,
    bail: o.bail,
    maxWorkers: '50%',
  };
}

/**
 * Create a performance-only Jest configuration.
 * 60 s timeout, sequential workers to avoid noise, custom reporter wired.
 */
export function createPerformanceConfig(opts?: ObixJestOptions): Record<string, unknown> {
  const o = resolveOptions(opts);
  return {
    displayName: 'performance',
    rootDir: o.rootDir,
    testMatch: [
      '<rootDir>/tests/performance/**/*.test.ts',
      '<rootDir>/tests/performance/**/*.spec.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],
    testEnvironment: o.testEnvironment,
    preset: 'ts-jest',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: buildTransform(o.tsconfig),
    moduleNameMapper: o.moduleNameMapper,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    reporters: [
      'default',
      path.resolve(__dirname, '../state-machine-performance-reporter.js'),
    ],
    testTimeout: o.performanceTimeout,
    verbose: o.verbose,
    bail: o.bail,
    // Single worker to avoid measurement interference between tests
    maxWorkers: 1,
    maxConcurrency: 1,
  };
}

/**
 * Create a full Jest configuration that runs all three project types
 * (unit, integration, performance) via Jest's `projects` array.
 * This is the default config used by `obix-config-jest/base`.
 */
export function createFullConfig(opts?: ObixJestOptions): Record<string, unknown> {
  const o = resolveOptions(opts);
  const threshold = buildCoverageThreshold(o.coverageThreshold);
  return {
    rootDir: o.rootDir,
    testEnvironment: o.testEnvironment,
    preset: 'ts-jest',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: buildTransform(o.tsconfig),
    testMatch: [
      '**/tests/**/*.test.ts',
      '**/tests/**/*.spec.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.history/'],
    moduleNameMapper: o.moduleNameMapper,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/index.ts',
      '!src/**/*.types.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover', 'html'],
    coverageThreshold: threshold,
    reporters: [
      'default',
      ['jest-junit', {
        outputDirectory: './reports/junit',
        outputName: 'jest-junit.xml',
        classNameTemplate: '{filepath}',
        titleTemplate: '{classname} > {title}',
      }],
    ],
    setupFilesAfterFramework: [
      path.resolve(__dirname, '../jest.setup.js'),
    ],
    globals: {
      'ts-jest': { isolatedModules: true, useESM: true },
    },
    maxWorkers: '50%',
    maxConcurrency: 5,
    testTimeout: o.timeout,
    verbose: o.verbose,
    bail: o.bail,
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
        testTimeout: o.performanceTimeout,
      },
    ],
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
      'jest-watch-select-projects',
    ],
  };
}

/**
 * Alias for `createFullConfig` — used as the base config exported at `./base`.
 */
export const createBaseConfig = createFullConfig;

/**
 * Resolve a Jest configuration by environment name.
 */
export function resolveConfig(
  env: JestEnv,
  opts?: ObixJestOptions,
): Record<string, unknown> {
  switch (env) {
    case 'unit':        return createUnitConfig(opts);
    case 'integration': return createIntegrationConfig(opts);
    case 'performance': return createPerformanceConfig(opts);
    case 'full':
    default:            return createFullConfig(opts);
  }
}
