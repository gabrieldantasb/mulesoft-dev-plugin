#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.env.PLUGIN_ROOT;
if (!pluginRoot) {
  process.stderr.write('RAML validation hook could not locate the plugin root (CLAUDE_PLUGIN_ROOT or PLUGIN_ROOT is unset).\n');
  process.exit(2);
}

const hookInput = readJson(fs.readFileSync(0, 'utf8'));
const projectRoot = hookInput.cwd;
if (!projectRoot || !fs.existsSync(projectRoot)) {
  process.stderr.write('RAML validation hook could not determine an existing project directory.\n');
  process.exit(2);
}

const changedRaml = changedRamlPaths(projectRoot);
if (changedRaml.length === 0) process.exit(0);

const validator = path.join(pluginRoot, 'tools', 'raml-validator', 'validate-affected-raml.cjs');
const child = spawnSync(process.execPath, [validator, '--project', projectRoot, '--changed', ...changedRaml], {
  cwd: projectRoot,
  encoding: 'utf8',
  windowsHide: true
});

if (child.error) {
  process.stderr.write(`RAML validation could not start: ${child.error.message}\n`);
  process.exit(2);
}

if (child.stdout) process.stderr.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);

if (child.status !== 0) {
  process.stderr.write('RAML validation failed or could not identify affected API entry points. Fix the diagnostics and rerun validation before completing this task.\n');
  process.exit(2);
}

function readJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function changedRamlPaths(projectRoot) {
  const status = spawnSync('git', ['-C', projectRoot, 'status', '--porcelain=v1', '-z'], {
    encoding: 'buffer',
    windowsHide: true
  });
  if (status.error || status.status !== 0) {
    process.stderr.write('RAML validation requires a Git worktree so it can identify changed RAML files. Run the validator explicitly with --changed, or report this blocker.\n');
    process.exit(2);
  }

  const fields = status.stdout.toString('utf8').split('\0');
  const changed = new Set();
  for (let index = 0; index < fields.length; index += 1) {
    const record = fields[index];
    if (!record) continue;
    const code = record.slice(0, 2);
    const file = record.slice(3);
    addIfRaml(projectRoot, file, changed);
    if (code[0] === 'R' || code[0] === 'C' || code[1] === 'R' || code[1] === 'C') {
      addIfRaml(projectRoot, fields[++index], changed);
    }
  }
  return [...changed];
}

function addIfRaml(projectRoot, relativePath, changed) {
  if (relativePath && relativePath.toLowerCase().endsWith('.raml')) {
    changed.add(path.resolve(projectRoot, relativePath));
  }
}
