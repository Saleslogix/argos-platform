/* eslint-disable */
const antlr4 = require('antlr4/index');
const L20nParserListener = require('../tools/l20n-grammar/js/L20nParserListener').L20nParserListener;
const l20n = require('../tools/l20n-grammar');
const path = require('path');

class EntityGrabber extends L20nParserListener {
  constructor() {
    super();
    this.results = {};
    this.currentEntity = '';
  }

  enterEntity(ctx) {
    const entityName = ctx.entityName().getText();
    this.currentEntity = entityName; // Keep this state for entering properties within the entity (see enterEntityProperty)
    this.results[entityName] = {};
  }

  exitEntity(ctx) {
    this.currentEntity = '';
  }

  enterEntityProperty(ctx) {
    const key = ctx.Identifier().getText();
    let value = ctx.String().getText();

    // The string value will include the quotes, remove them.
    if (value.endsWith('"') && value.startsWith('"')) {
      value = value.slice(1, value.length - 1);
    }

    this.results[this.currentEntity][key] = value;
  }
}

module.exports = function convert(grunt) {
  grunt.registerMultiTask('convert-l20n', 'Convert L20n files to JSON.', function multi() {
    this.files.forEach((file) => {
      file.src.forEach((src) => {
        // grunt.file.read assumes utf8; l20n.read decodes by BOM (drops arrive as UTF-16).
        const { text } = l20n.read(src);
        const { tree, errors } = l20n.parse(text);
        if (errors.length) {
          const first = errors[0];
          grunt.fail.warn(`${src}: ${errors.length} parse error(s), first at ${first.line}:${first.column} ${first.message}`);
          return;
        }
        const listener = new EntityGrabber();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);
        const results = JSON.stringify(listener.results, null, 2);

        const basename = path.basename(src, '.l20n');
        const outfile = path.join(file.dest, path.dirname(src), basename + '.json');
        grunt.file.write(outfile, results);
      });
    });
  });
};
