/* global describe, it, expect */

import {isFunction} from '../src/utils';
import {chayns} from '../src/chayns';

// chayns spec
// verify that the main modules exist
describe('chayns', function() {

  it('should exist', function() {
    expect(chayns).toBeDefined();
  });

  it('should have a VERSION', function() {
    expect(chayns.VERSION).toBeDefined();
  });

  // when removing an object from the chayns `Object`
  // make sure that it is undefined
  it('should not have a config obj', function() {
    expect(chayns.config).toBeUndefined();
  });

  it('should have an env obj', function() {
    expect(chayns.env).toBeDefined();
  });

  it('should not have an environment obj', function() {
    expect(chayns.environment).toBeUndefined();
  });

  it('should not have a user obj', function() {
    expect(chayns.user).toBeUndefined();
  });

  it('should have a register', function() {
    expect(chayns.register).toBeDefined();
    expect(isFunction(chayns.register)).toBe(true);
  });

  it('should have a ready function', function() {
    expect(chayns.ready).toBeDefined();
    expect(isFunction(chayns.ready)).toBe(true);
  });

  it('should have apiCall.', function() {
    expect(chayns.apiCall).toBeDefined();
  });

  it('should not have private method setup.', function() {
    expect(chayns.setup).not.toBeDefined();
  });

});
