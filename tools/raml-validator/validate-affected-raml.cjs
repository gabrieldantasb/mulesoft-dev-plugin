#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const parsed = parseArgs(process.argv.slice(2));
if (!parsed.project || parsed.changed.length === 0) {
  process.stderr.write('Usage: node validate-affected-raml.cjs --project <project-root> --changed <raml-path> [...]\n');
  process.exit(64);
}

const projectRoot = path.resolve(parsed.project);
const changed = new Set(parsed.changed.map((file) => path.resolve(projectRoot, file)));
const entries = discoverApiEntries(projectRoot);
if (entries.length === 0) {
  process.stderr.write(`No #%RAML 1.0 API entry points were discoverable under ${projectRoot}. Validation cannot be skipped.\n`);
  process.exit(3);
}

const affected = entries.filter((entry) => {
  const dependencies = collectDependencies(entry);
  return [...changed].some((file) => dependencies.has(file));
});

if (affected.length === 0) {
  process.stdout.write('No discoverable RAML API entry point depends on the changed RAML files.\n');
  process.exit(0);
}

process.stdout.write(`Validating ${affected.length} affected RAML API entr${affected.length === 1 ? 'y' : 'ies'}:\n${affected.map((file) => `  ${file}`).join('\n')}\n`);
const validator = path.join(__dirname, 'validate-raml.cjs');
const result = spawnSync(process.execPath, [validator, ...affected], {
  cwd: projectRoot,
  encoding: 'utf8',
  windowsHide: true
});
if (result.error) {
  process.stderr.write(`Could not start the RAML validator: ${result.error.message}\n`);
  process.exit(2);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 2);

function parseArgs(args) {
  const result = { project: null, changed: [] };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--project') result.project = args[++index];
    else if (args[index] === '--changed') result.changed.push(...args.slice(index + 1));
  }
  return result;
}

function discoverApiEntries(root) {
  return walk(root).filter((file) => /^#%RAML 1\.0\s*$/m.test(read(file)));
}

function collectDependencies(entry) {
  const visited = new Set();
  const visit = (file) => {
    const resolved = path.resolve(file);
    if (visited.has(resolved)) return;
    visited.add(resolved);
    if (!fs.existsSync(resolved)) return;
    for (const reference of localReferences(read(resolved))) {
      visit(path.resolve(path.dirname(resolved), reference));
    }
  };
  visit(entry);
  return visited;
}

function localReferences(source) {
  const references = new Set();
  for (const match of source.matchAll(/!include\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))/g)) {
    addReference(references, match[1] || match[2] || match[3]);
  }
  const lines = source.split(/\r?\n/);
  let usesIndent = null;
  for (const line of lines) {
    const uses = line.match(/^(\s*)uses:\s*(?:#.*)?$/);
    if (uses) {
      usesIndent = uses[1].length;
      continue;
    }
    if (usesIndent != null) {
      const indentation = (line.match(/^(\s*)/) || ['', ''])[1].length;
      if (line.trim() && indentation <= usesIndent) usesIndent = null;
      const library = line.match(/^\s+[^:#]+:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*(?:#.*)?$/);
      if (usesIndent != null && library) addReference(references, library[1] || library[2] || library[3]);
    }
  }
  return references;
}

function addReference(references, value) {
  if (!value || /^(?:https?:|file:|#)/i.test(value)) return;
  references.add(value);
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.mule') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.raml')) files.push(fullPath);
  }
  return files;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
