# grunt-argos-deps
Scans your ES6 source files and outputs the release.jsb2 with the files in the correct order. No more manually managing your dependencies!

## Install
`npm isntall --save-dev git+ssh://git@github.com:Saleslogix/grunt-argos-deps.git#v0.1.0`

## Example Configuration
```
  grunt.config('argos-deps', {
    files: '../src/**/*.js',
    cwd: './build',
    template: 'release.tmpl',
    output: 'release.jsb2',
    modules: [{
      name: 'crm',
      location: '../src'
    }]
  });

  grunt.loadNpmTasks('grunt-argos-deps');
  ```
