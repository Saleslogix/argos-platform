/* eslint-disable */
// Shared read/parse helpers for *.l20n files, wrapping the generated ANTLR grammar
// in this directory. Used by tools/lint-l20n.js and grunt-tasks/grunt-convert.js.
const fs = require('fs');
const antlr4 = require('antlr4/index');
const { L20nLexer } = require('./js/L20nLexer');
const { L20nParser } = require('./js/L20nParser');

// Translation drops have arrived as UTF-16, so decode by BOM rather than assuming utf8.
function read(file) {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { text: bytes.slice(2).toString('utf16le'), encoding: 'utf16le' };
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    // Node has no utf16be decoder; byte-swap into utf16le.
    const swapped = Buffer.from(bytes.slice(2));
    swapped.swap16();
    return { text: swapped.toString('utf16le'), encoding: 'utf16be' };
  }
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { text: bytes.slice(3).toString('utf8'), encoding: 'utf8-bom' };
  }
  return { text: bytes.toString('utf8'), encoding: 'utf8' };
}

// Returns { tree, errors }. ANTLR's default listener only logs to stderr, so swap in
// one that collects, otherwise a malformed file parses "successfully" into partial output.
function parse(text) {
  const errors = [];
  const collector = {
    syntaxError(recognizer, offendingSymbol, line, column, message) {
      errors.push({ line, column, message });
    },
    reportAmbiguity() {},
    reportAttemptingFullContext() {},
    reportContextSensitivity() {},
  };

  const lexer = new L20nLexer(new antlr4.InputStream(text));
  lexer.removeErrorListeners();
  lexer.addErrorListener(collector);

  const parser = new L20nParser(new antlr4.CommonTokenStream(lexer));
  parser.removeErrorListeners();
  parser.addErrorListener(collector);
  parser.buildParseTrees = true;

  return { tree: parser.document(), errors };
}

module.exports = { read, parse };
