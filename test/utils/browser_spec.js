/* global describe, it, expect, browser */

global.testEnv = true;

// direct access
import {window, document, location, navigator, console, gc}  from '../../src/utils/browser';

// direct access, different import approach
//noinspection BadExpressionStatementJS
//import * as browser from '../../src/utils/browser'; // jshint ignore: line
import {browser} from '../../src/utils';

describe('global test with testEnv', function() {
  // here we verify that `global` is also the `window`
  // however, window should only be used from 'utils/browser'
  // we can modify the `global` Object to specify a certain ENV
  it('should have a global object', function() {
    expect(global).toBeDefined();
  });

  it('should have a global object', function() {
    expect(window.testEnv).toBe(true);
  });

  it('should have global which is equal to window', function() {
    expect(global).toBe(window);
    global.asdf = true;
    expect(window.asdf).toBeTruthy();
    expect(window.document).toBe(document);
    expect(global.document).toBe(document);
  });
});

describe('utils.browser', function() {

  it('should have a window', function() {
    expect(browser.window).toBeDefined();
  });

  it('should have a document', function() {
    expect(browser.document).toBeDefined();
  });

  it('should have a location', function() {
    expect(browser.location).toBeDefined();
  });

  it('should have a navigator', function() {
    expect(browser.navigator).toBeDefined();
  });

  it('should have a console', function() {
    expect(browser.console).toBeDefined();
  });

  xit('should have a gc', function() {
    expect(browser.gc).toBeDefined();
  });
});

describe('utils.browser (single import)', function() {

  it('should have a window', function() {
    expect(window).toBeDefined();
  });

  it('should have a document', function() {
    expect(document).toBeDefined();
  });

  it('should have a location', function() {
    expect(location).toBeDefined();
  });

  it('should have a navigator', function() {
    expect(navigator).toBeDefined();
  });

  it('should have a console', function() {
    expect(console).toBeDefined();
  });

  xit('should have a gc', function() {
    expect(gc).toBeDefined();
  });
});

describe('utils.browser', function() {

  it('should be equal to window', function() {
    expect(browser.window).toBe(window);
  });

  it('should be equal to document', function() {
    expect(browser.document).toBe(document);
  });

  it('should be equal to location', function() {
    expect(browser.location).toBe(location);
  });

  it('should be equal to navigator', function() {
    expect(browser.navigator).toBe(navigator);
  });

  it('should be equal to console', function() {
    expect(browser.console).toBe(console);
  });

  xit('should be equal to gc', function() {
    expect(browser.gc).toBe(gc);
  });
});
