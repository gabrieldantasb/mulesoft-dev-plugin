#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const validatorDir = path.resolve(__dirname, '..');
const validate = path.join(validatorDir, 'validate-raml.cjs');
const affected = path.join(validatorDir, 'validate-affected-raml.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raml validator with spaces-'));

try {
  write('api.raml', `#%RAML 1.0\ntitle: Orders\nuses:\n  common: libraries/common.raml\n/orders:\n  get:\n    is: [ common.traceable ]\n    responses:\n      200:\n        body:\n          application/json:\n            type: common.Order\n`);
  write('libraries/common.raml', `#%RAML 1.0 Library\ntraits:\n  traceable:\n    headers:\n      X-Correlation-Id?: string\ntypes:\n  Order:\n    type: object\n    properties:\n      id: string\n`);
  write('second-api.raml', `#%RAML 1.0\ntitle: Order Search\nuses:\n  common: libraries/common.raml\n/search:\n  get:\n    responses:\n      200:\n        body:\n          application/json:\n            type: common.Order\n`);
  write('schema-api.raml', `#%RAML 1.0\ntitle: Schema API\ntypes:\n  Customer: !include schemas/customer.json\n/customers:\n  get:\n    responses:\n      200:\n        body:\n          application/json:\n            type: Customer\n`);
  write('schemas/customer.json', `{"$schema":"http://json-schema.org/draft-04/schema#","type":"object","properties":{"id":{"type":"string"}}}`);
  expectSuccess('valid API with library', [validate, path.join(root, 'api.raml')]);
  expectSuccess('API with an external JSON schema', [validate, path.join(root, 'schema-api.raml')]);
  const sharedLibraryResult = expectSuccess('affected shared library validation', [affected, '--project', root, '--changed', 'libraries/common.raml']);
  assert.match(sharedLibraryResult.stdout, /api\.raml/);
  assert.match(sharedLibraryResult.stdout, /second-api\.raml/);

  write('invalid.raml', `#%RAML 1.0\ntitle: Broken\n/orders:\n  get:\n    responses:\n      200:\n        body:\n          application/json:\n            type: object\n            properties:\n              id string\n`);
  expectFailure('invalid RAML', [validate, path.join(root, 'invalid.raml')]);

  write('missing-include.raml', `#%RAML 1.0\ntitle: Missing\ntypes:\n  Order: !include types/not-found.raml\n`);
  expectFailure('unresolved include', [validate, path.join(root, 'missing-include.raml')]);

  git('init', '--quiet');
  git('config', 'user.email', 'raml-validator-test@example.invalid');
  git('config', 'user.name', 'RAML Validator Test');
  git('add', '.');
  git('commit', '--quiet', '-m', 'baseline');

  git('mv', 'schema-api.raml', 'renamed-schema-api.raml');
  const renamedApiResult = expectHookSuccess('Stop hook validates a renamed API entry point');
  assert.match(renamedApiResult.stderr, /renamed-schema-api\.raml/);
  git('add', '.');
  git('commit', '--quiet', '-m', 'rename API entry point');

  write('libraries/common.raml', `#%RAML 1.0 Library\n# Modified shared library\ntraits:\n  traceable:\n    headers:\n      X-Correlation-Id?: string\ntypes:\n  Order:\n    type: object\n    properties:\n      id: string\n`);
  const hookResult = expectHookSuccess('Stop hook validates a modified shared library');
  assert.match(hookResult.stderr, /api\.raml/);
  assert.match(hookResult.stderr, /second-api\.raml/);

  write('libraries/common.raml', `#%RAML 1.0 Library\ntypes:\n  Order:\n    type: object\n    properties:\n      id string\n`);
  expectFailure('invalid imported library', [affected, '--project', root, '--changed', 'libraries/common.raml']);
  expectHookFailure('Stop hook blocks completion after invalid RAML changes');

  write('libraries/common.raml', `#%RAML 1.0 Library\ntraits:\n  traceable:\n    headers:\n      X-Correlation-Id?: string\ntypes:\n  Order:\n    type: object\n    properties:\n      id: string\n`);
  git('rm', '--quiet', 'libraries/common.raml');
  expectHookFailure('Stop hook blocks completion after deleting a shared library');

  process.stdout.write(`RAML integration tests passed in ${root}\n`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function write(relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function expectSuccess(name, args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `${name} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

function expectFailure(name, args) {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.notEqual(result.status, 0, `${name} unexpectedly passed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

function expectHookSuccess(name) {
  const result = runHook();
  assert.equal(result.status, 0, `${name} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

function expectHookFailure(name) {
  const result = runHook();
  assert.equal(result.status, 2, `${name} unexpectedly passed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

function runHook() {
  return spawnSync(process.execPath, ['-e', "require(process.env.CLAUDE_PLUGIN_ROOT + '/hooks/raml-stop-hook.cjs')"], {
    input: JSON.stringify({ cwd: root, hook_event_name: 'Stop' }),
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: path.join(validatorDir, '..', '..') }
  });
}

function git(...args) {
  execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', windowsHide: true });
}
