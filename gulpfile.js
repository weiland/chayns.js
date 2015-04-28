var gulp = require('gulp');
var watchify = require('watchify');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

var del = require('rimraf');

var karma = require('karma').server;
var jsdoc = require('gulp-jsdoc');

function bundler() {
  return watchify(browserify('./src/chayns.js', {debug: true}))
    .transform(babelify)
    .bundle()
    .on('error', function(err) {
      console.log('Error: ' + err.message);
    })
    .pipe(source('./chayns.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(reload({ stream: true }));
}

gulp.task('watch-build', function() {
  return bundler();
});

gulp.task('build', ['watch-build'], function() {
  process.exit(0);
});

gulp.task('test', function(cb) {
  karma.start({
    configFile: __dirname + '/../test/karma.conf.js',
    files: [
      // we need to add ../ cause the conf file is in /test
      '../bower_components/angular/angular.js',
      '../bower_components/angular-route/angular-route.js',
      '../bower_components/angular-mocks/angular-mocks.js',
      '../dist/js/app.js',
      './unit/*.js',
      './e2e/*.js'
    ],
    singleRun: true // ohterwise the server continues
  }, cb);
});

gulp.task('server', function () {
  browserSync({
    server: {
      baseDir: './'
    }
  });
});

gulp.task('dev', ['watch-build'], function() {
  gulp.start('server');
  bundler().on('update', function() {
    gulp.start('watch-build');
  });
});

gulp.task('clean', function(cb) {
  del('dist', cb);
});

gulp.task('jsdoc', function() {
  gulp.src(['./src/*.js'])
  .pipe(jsdoc('./docs'));
});


gulp.task('qa', function() {
  gulp.src('./dist/*.*')
    .pipe(gulp.dest('//chayns1/SlitteRessource/API/v3/js/qa/test'));
  gulp.src('./index.html')
    .pipe(gulp.dest('//chayns1/SlitteRessource/API/v3'));
});

gulp.task('deploy', function() {
  gulp.src('./dist/*.*')
    .pipe(gulp.dest('//chayns1/SlitteRessource/API/v3/js'));
  gulp.src('./index.html')
    .pipe(gulp.dest('//chayns1/SlitteRessource/API/v3'));
});
