import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { importModule, packageDir, presetExports } from './support/preset-contract.mjs';

const dir = packageDir(import.meta.url);
const exportsMap = Object.fromEntries(presetExports(dir));

test('base, unit, integration and performance presets load as Jest config objects', async () => {
  for (const sub of ['./base', './unit', './integration', './performance']) {
    const { default: cfg } = await importModule(exportsMap[sub]);
    assert.equal(typeof cfg, 'object', sub);
    assert.ok(Array.isArray(cfg.testMatch) && cfg.testMatch.length > 0, `${sub} testMatch`);
    assert.equal(typeof cfg.testEnvironment, 'string', `${sub} testEnvironment`);
  }
  const unit = (await importModule(exportsMap['./unit'])).default;
  const integration = (await importModule(exportsMap['./integration'])).default;
  assert.notDeepEqual(unit.testMatch, integration.testMatch, 'unit and integration select different tests');
});

test('the reporter export is a class-like function', async () => {
  const { default: Reporter } = await importModule(exportsMap['./reporter']);
  assert.equal(typeof Reporter, 'function');
});

test('the setup file registers the documented custom matchers when Jest provides `expect`', async () => {
  let registered;
  globalThis.expect = { extend: (matchers) => { registered = matchers; } };
  globalThis.jest = { fn: () => () => undefined, spyOn: () => ({}), setTimeout() {} };
  try {
    await importModule(exportsMap['./setup'], '?fresh=' + Date.now());
  } finally { delete globalThis.expect; delete globalThis.jest; }
  assert.equal(typeof registered.toBeMinimizedStateMachine, 'function');
  assert.equal(typeof registered.toBeEquivalentState, 'function');
});

test('programmatic factories return Jest config objects', async () => {
  const api = await importModule(path.join(dir, 'dist', 'index.js'));
  assert.equal(api.createUnitConfig().displayName !== undefined, true);
  for (const make of [api.createBaseConfig, api.createFullConfig, api.createUnitConfig, api.createIntegrationConfig, api.createPerformanceConfig, api.resolveConfig]) {
    assert.equal(typeof make(), 'object');
  }
});
