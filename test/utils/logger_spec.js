/* global describe, it, expect */

import {Logger, setLevel, getLogger} from '../../src/utils/logger';

describe('Logger', function() {

  it('should exist', function() {
    expect(Logger).toBeDefined();
  });

});

describe('logger.setLevel', function() {

  it('should exist', function() {
    expect(setLevel).toBeDefined();
  });

  it('should set the level', function() {
    expect(setLevel(1)).toEqual(undefined);
  });

});

describe('logger.getLogger', function() {

  it('should exist', function() {
    expect(getLogger).toBeDefined();
  });

  it('should be an instance of Logger"', function() {
    let name = 'test1';
    expect(getLogger(name) instanceof Logger).toBeTruthy();
  });

  it('should be a singleton instance', function() {
    let name = 'test2';
    expect(getLogger(name)).toEqual(getLogger(name));
  });

});

describe('logger', function() {

  //it('should not log', function() {
  //  let log = getLogger('test3');
  //  log('dont log me');
  //});

});
