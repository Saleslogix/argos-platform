/* eslint-disable */
// Self-check for tools/l20n-grammar read/parse. Run: node tools/lint-l20n.selfcheck.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const l20n = require('./l20n-grammar');

const good = '<dateField ""\n  emptyText: ""\n  errorText: "Field \'${0}\' is bad."\n>\n';

// A well-formed entity parses clean.
assert.strictEqual(l20n.parse(good).errors.length, 0, 'valid l20n should not report errors');

// An unterminated string is the failure the translation team keeps shipping.
assert.ok(l20n.parse('<dateField ""\n  emptyText: "oops\n>\n').errors.length > 0,
  'unbalanced quote must be reported');

// A stray quote mid-value is also caught.
assert.ok(l20n.parse('<dateField ""\n  emptyText: "a"b"\n>\n').errors.length > 0,
  'stray quote must be reported');

// Missing closing angle bracket.
assert.ok(l20n.parse('<dateField ""\n  emptyText: ""\n').errors.length > 0,
  'unclosed entity must be reported');

// Escaped quotes inside a value are legal and must not trip the grammar.
assert.strictEqual(l20n.parse('<a ""\n  t: "say \\"hi\\""\n>\n').errors.length, 0,
  'escaped quotes are valid');

// Encoding detection: each BOM decodes to the same text and parses clean.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l20n-'));
const cases = {
  'utf8': Buffer.from(good, 'utf8'),
  'utf8-bom': Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(good, 'utf8')]),
  'utf16le': Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(good, 'utf16le')]),
  'utf16be': Buffer.concat([Buffer.from([0xFE, 0xFF]), (() => {
    const b = Buffer.from(good, 'utf16le'); b.swap16(); return b;
  })()]),
};
try {
  Object.entries(cases).forEach(([expected, bytes]) => {
    const file = path.join(dir, `${expected}.l20n`);
    fs.writeFileSync(file, bytes);
    const { text, encoding } = l20n.read(file);
    assert.strictEqual(encoding, expected, `expected ${expected}, got ${encoding}`);
    assert.strictEqual(text, good, `${expected} did not round-trip`);
    assert.strictEqual(l20n.parse(text).errors.length, 0, `${expected} should parse clean`);
    assert.strictEqual(text.indexOf('\uFFFD'), -1, `${expected} should decode without U+FFFD`);
  });

  // Reading UTF-16 bytes as utf8 (the old grunt.file.read behaviour) produces U+FFFD,
  // which is what the linter flags as upstream damage.
  assert.notStrictEqual(cases['utf16le'].toString('utf8').indexOf('\uFFFD'), -1,
    'utf16 read as utf8 should yield replacement chars');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('lint-l20n selfcheck: ok');
