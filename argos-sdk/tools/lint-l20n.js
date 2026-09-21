#!/usr/bin/env node
/* eslint-disable */
// Validates *.l20n files: encoding, decode damage, and grammar (unbalanced quotes,
// malformed entities). Exits non-zero on error so it can gate a build.
//
// Usage: node argos-sdk/tools/lint-l20n.js <dir-or-file> [...]
const fs = require('fs');
const path = require('path');
const l20n = require('./l20n-grammar');

function collect(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.l20n'))
    .map(e => path.join(e.parentPath || e.path, e.name));
}

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('usage: lint-l20n.js <dir-or-file> [...]');
  process.exit(2);
}

const files = targets.flatMap(collect).sort();
let errors = 0;
let warnings = 0;

files.forEach((file) => {
  const problems = [];
  const { text, encoding } = l20n.read(file);

  // Every other source file in the repo is utf8. UTF-16 parses at runtime (the browser
  // honours the BOM) but breaks grunt-convert, git diffs, and grep.
  if (encoding === 'utf16le' || encoding === 'utf16be') {
    problems.push({ level: 'error', message: `encoded as ${encoding}, expected utf8` });
  } else if (encoding === 'utf8-bom') {
    problems.push({ level: 'warn', message: 'utf8 with BOM, prefer no BOM' });
  }

  // U+FFFD means the text was already mangled before it reached us.
  const replacement = text.indexOf('\uFFFD');
  if (replacement !== -1) {
    const line = text.slice(0, replacement).split('\n').length;
    problems.push({ level: 'error', message: `U+FFFD replacement character at line ${line} (upstream encoding damage)` });
  }

  l20n.parse(text).errors.forEach(({ line, column, message }) => {
    problems.push({ level: 'error', message: `${line}:${column} ${message}` });
  });

  const failed = problems.filter(p => p.level === 'error').length;
  errors += failed;
  warnings += problems.length - failed;

  if (problems.length) {
    console.log(`${failed ? 'ERROR' : 'WARN '} ${file}`);
    // A single bad quote cascades into hundreds of parse errors; the first few locate it.
    problems.slice(0, 10).forEach(p => console.log(`      ${p.message}`));
    if (problems.length > 10) console.log(`      ... ${problems.length - 10} more`);
  }
});

console.log(`\nl20n: checked ${files.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
