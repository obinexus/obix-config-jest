// A copy of the OBIX monorepo's tests/support/preset-contract.mjs, kept identical to it by scripts/release/prepare.mjs (so that these tests ship and run on their own).
/**
 * Shared checks for the tool-preset packages (config/*): every declared export must actually load, JSON presets must
 * be self-contained (an `extends` may not escape the package), and programmatic factories must return objects.
 * Test-only helper.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const packageDir = (testFileUrl) => path.resolve(path.dirname(fileURLToPath(testFileUrl)), '..');

export const readPackage = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

/** [subpath, absolute target] for every export except ./package.json and the programmatic root ('.'). */
export function presetExports(dir) {
  const pkg = readPackage(dir);
  return Object.entries(pkg.exports)
    .filter(([sub]) => sub !== './package.json' && sub !== '.')
    .map(([sub, t]) => [sub, path.join(dir, typeof t === 'string' ? t : t.import)]);
}

/** An `extends` in a JSON preset must resolve to an existing file INSIDE the package directory. */
export function assertSelfContained(dir, file, json, assert) {
  const ext = json.extends;
  if (ext === undefined) return;
  const target = path.resolve(path.dirname(file), ext);
  assert.ok(target.startsWith(dir + path.sep), `${path.relative(dir, file)} extends "${ext}", which resolves outside the package (${target})`);
  assert.ok(fs.existsSync(target), `${path.relative(dir, file)} extends "${ext}", which does not exist`);
}

export async function importModule(file, query = '') {
  return import(pathToFileURL(file).href + query);
}
