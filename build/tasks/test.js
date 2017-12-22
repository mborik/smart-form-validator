var gulp = require('gulp');
var karma = require('karma');

/**
 * Run test once and exit
 */
gulp.task('test', function (done) {
  new karma.Server({
    configFile: __dirname + '/../../karma.conf.js',
    singleRun: true
  }, done).start();
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task('tdd', function (done) {
  new karma.Server({
    configFile: __dirname + '/../../karma.conf.js'
  }, done).start();
});
