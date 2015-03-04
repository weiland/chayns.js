/* global describe, it, expect */
import * as utils from '../src/utils'; // jshint ignore:line

describe('chayns.utils', function() {

  it('should be defined', function() {
    expect(utils).toBeDefined();
  });

  it('should have getLogger', function() {
    expect(utils.getLogger).toBeDefined();
  });

  it('should have getLogger which returns Logger instance', function() {
    expect(utils.getLogger() instanceof utils.Logger).toBe(true);
  });
});
