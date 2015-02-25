[![Build Status](https://travis-ci.org/weiland/chayns.js.svg?branch=master)](https://travis-ci.org/weiland/chayns.js)
[![Code Climate](https://codeclimate.com/github/weiland/chayns.js/badges/gpa.svg)](https://codeclimate.com/github/weiland/chayns.js)
[![devDependency Status](https://david-dm.org/weiland/chayns.js/dev-status.svg)](https://david-dm.org/weiland/chayns.js#info=devDependencies)

# chayns.js - the most powerful cross platform app building framework

> currently wip

## Prerequisites
make sure to have installed node.js and npm  
`karma` and `gulp` should be installed globally!

## Installation
```bash
# install dependencies
npm install
```

## Development

### Source
The source is located in `src/`

### Tests
Tests are located in `test/`  
There are unit and e2e tests

    $ npm test


### js code validation
validating js code via jshint and jscs

    $ npm run validate

### Conventions
* BDD TDD (unit and e2e)
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
check and verify code with codeclimate

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
- jshint gutter plugin
- git gutter plugin
- jscs plugin

### For Webstorm
- jshint: code quality: enable jshint, check `config file` option which inlcudes the project's .jshintrc
- jscs: make sure to have `jscs` globally installed `npm install -g jscs`
- Settings -> Javascript -> Libraries -> Donwload change to `TypeScript Community stubs` and look for `karma-jasmine` (for testing)
- alt + F13 to open console

## Contributing
1. Fork the repository [https://github.com/weiland/chayns.js/fork](https://github.com/weiland/chayns.js/fork)
2. Create a feature branch `git checkout -b cool-feature`
3. Commit all your changes `git commit -am 'add fancy feature'`
4. Push to the branch `git push origin cool-feature`
5. Create a new Pull Request on GitHub

[![browser support](https://ci.testling.com/weiland/chayns.js.png)](https://ci.testling.com/weiland/chayns.js)
