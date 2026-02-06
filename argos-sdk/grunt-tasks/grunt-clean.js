module.exports = function gruntClean(grunt) {
  grunt.config('clean', {
    css: ['min/css/themes/crm/**/*.css'],
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
};
