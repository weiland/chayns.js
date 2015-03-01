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

  it('should have a config obj', function() {
    expect(chayns.config).toBeDefined();
  });

  it('should have a environment obj', function() {
    expect(chayns.environment).toBeDefined();
  });

  it('should have a user obj', function() {
    expect(chayns.user).toBeDefined();
  });

  it('should have a register', function() {
    expect(chayns.register).toBeDefined();
    expect(isFunction(chayns.register)).toBe(true);
  });

  it('should have a ready function', function() {
    expect(chayns.ready).toBeDefined();
    expect(isFunction(chayns.ready)).toBe(true);
  });

  it('should have chaynsCall.', function() {
    expect(chayns.chaynsCall).toBeDefined();
  });

  it('should not have private method setup.', function() {
    expect(chayns.setup).not.toBeDefined();
  });

});
