module.exports = function (config) {
  config.set({
    basePath: '',
    autoWatch: true,
    frameworks: ['jasmine', 'browserify'],
    browsers: ['PhantomJS'],
    preprocessors: {
      'test/**/*spec.js': ['browserify', 'coverage']
    },
    files: [
      'test/**/*spec.js'
    ],
    browserify: {
      debug: true,
      transform: ['babelify']
    },
    reporters: ['progress', 'coverage'], // old spec
    colors: true,
    captureTimeout: 60000,
    singleRun: false,

    coverageReporter: {
      type: 'lcovonly',
      dir: 'coverage'
    }
  });
};
