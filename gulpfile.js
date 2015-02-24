var gulp = require('gulp');

var karma = require('karma').server;

/**
 *
 * @param singleRun True if the task is done after all test run
 */
function test( singleRun ) {

  karma.start({
    configFile: __dirname + '/karma.conf.js',
    browsers: ['PhantomJS'],
    singleRun: !!singleRun
  }, console.log.bind(console, 'done testing'));
}

// Run test once and exit or run test and continue with watch server
gulp.task('test', test(false));
gulp.task('testserver', test(true));
