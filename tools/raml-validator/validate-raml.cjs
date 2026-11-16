#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { RAMLConfiguration } = require('amf-client-js');

const inputFiles = process.argv.slice(2).filter((value) => !value.startsWith('-'));
if (inputFiles.length === 0) {
  process.stderr.write('Usage: node validate-raml.cjs <api-entry-point.raml> [...]\n');
  process.exit(64);
}

Promise.all(inputFiles.map(validate)).then((results) => {
  process.exit(results.every(Boolean) ? 0 : 1);
});

async function validate(inputFile) {
  const file = path.resolve(inputFile);
  const client = RAMLConfiguration.RAML10().baseUnitClient();

  try {
    // AMF's Node file loader uses its own file URI handling. On Windows it requires
    // `file://C:/...`; WHATWG's `file:///C:/...` gains a second drive prefix here.
    const amfUri = `file://${file.replace(/\\/g, '/')}`;
    const parsed = await client.parseDocument(amfUri);
    const parseDiagnostics = parsed.results || [];
    if (!parsed.conforms || parseDiagnostics.some(isError)) {
      printDiagnostics(file, 'parse', parseDiagnostics);
      return false;
    }

    const report = await client.validate(parsed.document);
    const diagnostics = report.results || [];
    if (!report.conforms || diagnostics.some(isError)) {
      printDiagnostics(file, 'validate', diagnostics);
      return false;
    }

    process.stdout.write(`RAML valid: ${file}\n`);
    return true;
  } catch (error) {
    process.stderr.write(`RAML validation error: ${file}\n${formatError(error)}\n`);
    return false;
  }
}

function isError(result) {
  return !result.level || !/warning|info/i.test(String(result.level));
}

function printDiagnostics(file, phase, diagnostics) {
  process.stderr.write(`RAML ${phase} failed: ${file}\n`);
  if (diagnostics.length === 0) {
    process.stderr.write('  AMF reported a non-conforming document without individual diagnostics.\n');
    return;
  }
  for (const diagnostic of diagnostics) {
    const location = diagnostic.location || diagnostic.targetNode || diagnostic.source || file;
    const line = diagnostic.position?.start?.line ?? diagnostic.line;
    const column = diagnostic.position?.start?.column ?? diagnostic.column;
    const suffix = line == null ? '' : `:${line}${column == null ? '' : `:${column}`}`;
    const message = diagnostic.message || diagnostic.description || JSON.stringify(diagnostic);
    process.stderr.write(`  ${location}${suffix} — ${message}\n`);
  }
}

function formatError(error) {
  return error?.stack || error?.message || String(error);
}
