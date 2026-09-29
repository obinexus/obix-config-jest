# obix-config-jest

> Previous name: `@obinexusltd/obix-config-jest` — OBIX packages are named without an npm scope since decision D-102 (2026-09-29); the package, its version and its exports are unchanged.

> Jest 29 test configuration for OBIX SDK packages — part of [OBIX](https://github.com/obinexus/obix).

Provides typed factory functions, ready-to-use config files, custom Jest matchers for automaton state machine testing, a global performance metrics API, and a purpose-built performance reporter.

---

## Installation

Registered automatically as an npm workspace package:

```bash
# From monorepo root
npm install
```

To add it as a dependency in a consumer package:

```json
{
  "devDependencies": {
    "obix-config-jest": "workspace:*"
  }
}
```

---

## ESM requirement

> **Important:** This package uses `"type": "module"`. Jest 29 requires the `--experimental-vm-modules` Node flag when running ESM Jest configs.

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "test":             "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:unit":        "NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/unit/jest.config.js",
    "test:integration": "NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/integration/jest.config.js",
    "test:performance": "NODE_OPTIONS=--experimental-vm-modules jest --config node_modules/obix-config-jest/performance/jest.config.js"
  }
}
```

---

## Package Structure

```
packages/config/jest/
├── jest.config.js                        ← Base config (all 3 project types)
├── jest.setup.js                         ← Custom matchers + global utilities
├── state-machine-performance-reporter.js ← Custom Jest reporter
├── unit/
│   └── jest.config.js                    ← Unit-only (30 s timeout)
├── integration/
│   └── jest.config.js                    ← Integration-only (45 s timeout)
├── performance/
│   └── jest.config.js                    ← Performance-only (60 s, reporter wired)
└── src/
    └── index.ts                          ← TypeScript programmatic API (→ dist/)
```

---

## Programmatic API

```ts
import {
  createFullConfig,
  createUnitConfig,
  createIntegrationConfig,
  createPerformanceConfig,
  resolveConfig,
} from 'obix-config-jest';

// Full config — all three project types
export default createFullConfig({
  rootDir: process.cwd(),
  coverageThreshold: 90,
});

// Resolve by environment string
export default resolveConfig('unit');
export default resolveConfig('integration', { timeout: 50_000 });
export default resolveConfig('performance');
export default resolveConfig('full');
```

### Factory Functions

| Function | Description |
|----------|-------------|
| `createBaseConfig(opts?)` | Alias for `createFullConfig` |
| `createUnitConfig(opts?)` | Unit tests only, 30 s timeout |
| `createIntegrationConfig(opts?)` | Integration tests only, 45 s timeout |
| `createPerformanceConfig(opts?)` | Performance tests only, 60 s, reporter wired |
| `createFullConfig(opts?)` | All three project types via `projects` array |
| `resolveConfig(env, opts?)` | Delegates by `'unit'|'integration'|'performance'|'full'` |

### `ObixJestOptions`

```ts
interface ObixJestOptions {
  rootDir?:             string;             // default: process.cwd()
  tsconfig?:            string;             // default: sibling typescript/tsconfig.json
  testEnvironment?:     'node'|'jsdom'|'happy-dom'; // default: 'node'
  coverageThreshold?:   number;             // default: 80 (all 4 axes)
  timeout?:             number;             // default: 30000 ms
  performanceTimeout?:  number;             // default: 60000 ms
  verbose?:             boolean;            // default: true
  bail?:                number;             // default: 0
  moduleNameMapper?:    Record<string,string>; // merged with defaults
}
```

### Static Descriptors

```ts
import { baseConfig, unitConfig, integrationConfig, performanceConfig } from 'obix-config-jest';
```

---

## Using Config Files Directly

### Base config (all project types)

```bash
NODE_OPTIONS=--experimental-vm-modules jest --config ./node_modules/obix-config-jest/jest.config.js
```

### Unit only

```bash
NODE_OPTIONS=--experimental-vm-modules jest --config ./node_modules/obix-config-jest/unit/jest.config.js
```

### Integration only

```bash
NODE_OPTIONS=--experimental-vm-modules jest --config ./node_modules/obix-config-jest/integration/jest.config.js
```

### Performance only (with reporter)

```bash
NODE_OPTIONS=--experimental-vm-modules jest --config ./node_modules/obix-config-jest/performance/jest.config.js
```

---

## Setup File — Custom Matchers

The setup file (`obix-config-jest/setup`) provides two OBIX-specific Jest matchers:

### `toBeMinimizedStateMachine(expected?)`

Asserts that a state machine has been minimized. Optional `expected` argument verifies counts.

```ts
// Simple check
expect(minimizedSM).toBeMinimizedStateMachine();

// Verify specific counts
expect(minimizedSM).toBeMinimizedStateMachine({
  stateCount: 3,
  transitionCount: 6,
  equivalenceClassCount: 3,
});
```

### `toBeEquivalentState(other)`

Asserts that two states are behaviourally equivalent (same equivalence class or same transition alphabet).

```ts
expect(state1).toBeEquivalentState(state2);
```

---

## Global Test Utilities

### `global.createTestStateMachine(stateCount, transitionsPerState?)`

Factory that creates a mock OBIX state machine for testing.

```ts
const sm = global.createTestStateMachine(5, 2);
// → { states: Map(5), initialState: 'state0', equivalenceClasses: Map(), isMinimized: false }
```

### `global.__STATE_MACHINE_METRICS__`

Performance timing API for measuring state machine operations in tests.

```ts
global.__STATE_MACHINE_METRICS__.startOperation('minimizeStateMachine');
const result = minimizeStateMachine(sm);
global.__STATE_MACHINE_METRICS__.endOperation();

const report = global.__STATE_MACHINE_METRICS__.getReport();
// → { operations: [{ name, startTime, endTime, duration }], totalDuration }

global.__STATE_MACHINE_METRICS__.reset(); // clear between tests
```

---

## Performance Reporter

`StateMachinePerformanceReporter` is a custom Jest reporter that:

- Tracks per-test timing for `minimizeStateMachine`, `computeEquivalenceClasses`, `optimizeTransitions`
- Categorises machines as small (≤10), medium (11–100), or large (>100 states)
- Prints a console summary after each test run
- Writes `reports/performance/state-machine-performance-<timestamp>.json`

Wire it up manually:

```js
// jest.config.js
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default {
  reporters: [
    'default',
    new URL('obix-config-jest/reporter', import.meta.url).pathname,
  ],
};
```

Or use `obix-config-jest/performance` — it's pre-wired.

---

## Coverage Thresholds

All configs enforce **80% minimum** globally across branches, functions, lines, and statements.

Override via the programmatic API:

```ts
createFullConfig({ coverageThreshold: 90 })
```

Coverage is collected from `src/**/*.{ts,tsx}`, excluding `.d.ts`, `index.ts`, and `.types.ts` files.

---

## Timeout Reference

| Config | Timeout | Use case |
|--------|---------|----------|
| `unit` | 30 s | Fast synchronous logic |
| `integration` | 45 s | I/O, async, multi-module |
| `performance` | 60 s | Automaton state minimization |

---

## Peer Dependencies

```json
{
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

Optional:

```json
{
  "devDependencies": {
    "jest-junit": "^16.0.0",
    "jest-watch-typeahead": "^2.0.0",
    "jest-watch-select-projects": "^2.0.0"
  }
}
```

---

## Author

**Nnamdi Michael Okpala** — OBINexus &lt;okpalan@protonmail.com&gt;

Part of the [OBIX Heart/Soul UI/UX SDK](https://github.com/obinexus/obix); the source of this package is [github.com/obinexus/obix-config-jest](https://github.com/obinexus/obix-config-jest).

<!-- obix-release:begin — generated by scripts/release/prepare.mjs; edit the text above this line -->

## Installation

```bash
npm install obix-config-jest
```

## API surface

- `obix-config-jest` — 10 value exports: `baseConfig`, `createBaseConfig`, `createFullConfig`, `createIntegrationConfig`, `createPerformanceConfig`, `createUnitConfig`, `integrationConfig`, `performanceConfig`, `resolveConfig`, `unitConfig`
- `obix-config-jest/base` — 1 value export: `default`
- `obix-config-jest/unit` — 1 value export: `default`
- `obix-config-jest/integration` — 1 value export: `default`
- `obix-config-jest/performance` — 1 value export: `default`
- `obix-config-jest/setup` — an entry point that needs its peer tooling to load
- `obix-config-jest/reporter` — 1 value export: `default`
- Type declarations: `./dist/index.d.ts` (and a declaration next to every JS entry point).

## Architecture role

`obix-config-jest` is a **tool preset**: shared configuration for the tooling of an OBIX project (development-time only).

The architecture of OBIX — the package families and which packages are public API — is indexed in the umbrella: [docs/architecture.md](https://github.com/obinexus/obix/blob/main/docs/architecture.md).

## Package relationships

- Depends on (OBIX): no other OBIX package.
- Used by (OBIX): no other OBIX package.
- Third-party: `@types/jest`, `jest`, `ts-jest`.

## Testing

- 2 test files ship in the npm package (`test/`): the evidence of the package's contract, published so that its verification can be inspected — not runtime code (no entry point reaches them).
- **Standalone**: 2 of 2 — they read nothing outside the package.
- Run them with `npm test` (`node --test "test/*.test.mjs"`) in the OBIX monorepo, which provides the test tooling (Node's test runner, TypeScript) and the harness.

## Documentation

- [CHANGELOG.md](CHANGELOG.md)
- The OBIX architecture index: [obix/docs/architecture.md](https://github.com/obinexus/obix/blob/main/docs/architecture.md)

## Repository

- https://github.com/obinexus/obix-config-jest — `git@github.com:obinexus/obix-config-jest.git`
- Issues: https://github.com/obinexus/obix-config-jest/issues
- The repository is a clean export of the package from the OBIX monorepo. Its lineage — the sources it was recovered from and its earlier names — is `PROVENANCE.json`, shipped in this package; the repository's copy also records the monorepo commit it was exported from.

## License

MIT — see [LICENSE](LICENSE).

<!-- obix-release:end -->
