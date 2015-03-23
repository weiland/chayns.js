[![Build Status](https://travis-ci.org/weiland/chayns.js.svg?branch=master)](https://travis-ci.org/weiland/chayns.js)
[![Code Climate](https://codeclimate.com/github/weiland/chayns.js/badges/gpa.svg)](https://codeclimate.com/github/weiland/chayns.js)
[![devDependency Status](https://david-dm.org/weiland/chayns.js/dev-status.svg)](https://david-dm.org/weiland/chayns.js#info=devDependencies)
[![Test Coverage](https://codeclimate.com/github/weiland/chayns.js/badges/coverage.svg)](https://codeclimate.com/github/weiland/chayns.js)

# chayns.js - the most powerful cross platform app building framework

> currently wip

## Prerequisites
make sure to have installed [node.js](http://nodejs.org/dist/v0.12.0/x64/node-v0.12.0-x64.msi) (which ships with npm)  
  
```bash
# Install global dependencies
npm install -g gulp karma karma-cli browser-sync codeclimate-test-reporter browserify watch-run mkdirp rimraf
```
`karma` and `gulp` should be installed globally!

## Installation
```bash
# install dependencies
npm install
```

## Development

### Source
The source is located in `src/`.  
In `chayns.js` all modules are included and extend the global `chayns` Object.  


### Flow
- DOM Tree
- `window.chayns`
- `window.register({my: data});`
- `chayns.ready()` set callback when DOM and chayns are ready
- Event: DOM ready
- Event: AppInfos received => `callback` will receive the AppInfos

### `window.chayns`
- chayns
  - utils
  - getLogger (util shortcut)
  - environment
    - site
    - app
  - user
  -_callbacks (private, only used for communication)

### Tests
Tests are located in `test/`  
There are unit and e2e tests

    $ npm test


### js code validation
validating js code via jshint and jscs

    $ npm run validate

### Conventions
* BDD TDD (unit and e2e)
* use [caniuse](http://caniuse.com/)
* ES6 modules (transpiled to CommonJS ES5 + browserify)
* Mobile First (viewport, touch, offline appcache/sw)
* IE >= 9
* conventions over configuration
* no dependency on jQuery
* ponyfills over polyfills
* feature detection over browser detection 
* own modular helpers (james)
* obj param instead of arguments
* default values for obj param
* frameworkless js
* promises over "normal callbacks"
* karma jasmine
* travis ci
* jsdoc & markdown & english
* git & gitHub (& local GitBlit)
* independent, must work with AngularJS, React, Ember, Ampersand/Backbone, jQuery, Web components, coffeescript and TypeScript

## Technologies

### node & npm package & bower
This lib is going to be published as an npm and bower package to be easily included into projects

### jasmine
BDD DOM-less testing  
(alternatively mocha with chai)

### karma
test runner for TDD

### phantomjs
headless webkit. is used for karma instead of Chrome 

### selenium webdriver

### jsDoc and dgeni
documenting the js code with **jsDoc**

### travis ci 
continuous integration with travis ci

### code climate
check and verify code with codeclimate (code style and coverage)

### testling
unfortunately, testling is broken since a few months :(  
usually, it would test the code in multiple browsers

### editorconfig
basic configuration such as trailing whitespace, empty line on end and 2 soft tabs

### tasks
tasks and dependencies are defined in the package.json

### jshint
code quality and detects potential errors and problems

### jscs
code style linter. ensures that the code follows our conventions

### For Sublime
- package control
- enhanced sidebar
- jshint gutter plugin
- git gutter plugin
- jscs plugin
- a nice theme

### For Webstorm
- jshint: code quality: enable jshint, check `config file` option which includes the project's .jshintrc
- jscs: make sure to have `jscs` globally installed `npm install -g jscs`
- Settings -> Javascript -> Libraries -> Download and change to `TypeScript Community stubs` and look for `karma-jasmine` (for testing)
- alt + F12 to open console

## ToDo
- [ ] Find name for helpers/utils (sug: help, james, tobi, bit, hit)
- [ ] Separate helpers/utils from the chayns core
- [ ] module solution (ES6 -> CommonJS -> Browserify bundle, AMD requirejs, ES6 + SystemJS)
- [ ] good solution to documentation (jsDoc, dgeni, jsdoc, doccu)
- [ ] semantic version
- [ ] minify build (uglify-js) and external source maps exorcist
- [ ] publish to: npm, bower, (component), (ruby gems?)
- [ ] Diagrams
- [ ] Flow charts
- [ ] Dependency Map
- [ ] auto docs

## Contributing
1. Fork the repository [https://github.com/weiland/chayns.js/fork](https://github.com/weiland/chayns.js/fork)
2. Create a feature branch `git checkout -b cool-feature`
3. Commit all your changes `git commit -am 'add fancy feature'`
4. Push to the branch `git push origin cool-feature`
5. Create a new Pull Request on GitHub

[![browser support](https://ci.testling.com/weiland/chayns.js.png)](https://ci.testling.com/weiland/chayns.js)
