module.exports = function gruntJasmine(grunt) {
  const path = require('path');

  grunt.config('jasmine', {
    basic: {
      src: ['src/**/*.js', 'configuration/**/*.js', 'localization/**/*.js'],
      options: {
        // Pinned: GruntRunnerBasic.tmpl loads boot0.js/boot1.js, which jasmine-core dropped in
        // favour of a single boot.js in 7.x. Leaving this at the default ("latest") silently
        // 404s both boot files, so jasmine never installs its globals and the run hangs.
        version: '5.5.0',
        specs: 'tests/**/*.spec.js',
        host: 'http://127.0.0.1:8002/products/argos-saleslogix/',
        template: 'GruntRunnerBasic.tmpl',
        summary: true,
        sandboxArgs: {
          args: [
            '--aggressive-cache-discard',
          ],
          dumpio: true,
        },
      },
    },
  });

  // loadNpmTasks resolves against ./node_modules and only falls back to Node resolution when
  // nothing exists at that path. npm workspaces hoists this plugin to the monorepo root, and the
  // task itself then creates a node_modules/grunt-contrib-jasmine/.jasmine cache dir here, which
  // is enough to defeat that fallback on every run after the first. Resolve it outright instead.
  grunt.loadTasks(path.join(path.dirname(require.resolve('grunt-contrib-jasmine/package.json')), 'tasks'));
};
