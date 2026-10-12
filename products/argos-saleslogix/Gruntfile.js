module.exports = function(grunt) {
  const path = require('path');
  const sdkPath = path.dirname(require.resolve('argos-sdk/package.json'));
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    products: {
      'argos-saleslogix': {
        basePath: '.',
      },
      'argos-sdk': {
        basePath: sdkPath,
      },
    },
    'lang-pack': {
      'nl': {
        bundleName: "Mobile 4.4.0 NL",
      }
    },
    jsb: {
      file: grunt.file.readJSON('./build/release.jsb2'),
      options: {
      },
    },
  });

  // Load per-task config from separate files
  grunt.loadTasks('grunt-tasks');

  // Register alias tasks
  grunt.registerTask('test', ['connect', 'jasmine:basic']);
  grunt.registerTask('bundle', ['shell:bundle:<%= pkg.version %>']);
};
