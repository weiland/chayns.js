module.exports = function (config) {
  config.set({
    basePath: '',
    autoWatch: true,
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    preprocessors: {
      'test/*.js': ['browserify', 'coverage']
    },
    files: [
      'test/*.js'
    ],
    //plugins : [
    //  'karma-spec-reporter',
    //  'karma-phantomjs-launcher',
    //  'karma-jasmine'
    //],
    browserify: {
      debug: true
    },
    reporters: ['progress', 'coverage'], // old spec
    colors: true,
    captureTimeout: 60000,
    singleRun: true
  });
};
