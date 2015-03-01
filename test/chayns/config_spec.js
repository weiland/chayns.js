/* global describe, it, expect, afterEach */

import {Config} from '../../src/chayns/config';

describe('Config', function() {

  it('should exist', function() {
    expect(Config).toBeDefined();
  });

});

describe('Config.get', function() {

  it('should exist', function() {
    expect(Config.get('appVersion')).toBeDefined();

  });

  it('should get appVersion', function() {
    expect(Config.get('appVersion')).toBe(Config.get('appVersion'));
  });

  it('should get the appName', function() {
    expect(Config.get('appName')).toBe('Chayns App'); // default value
  });

  it('should not have appName2', function() {
    expect(Config.get('appName2')).toBe(undefined);
  });

  it('should return undefined when there was no valid reference passed', function() {
    expect(Config.get()).toBe(undefined);
    expect(Config.get(null)).toBe(undefined);
    expect(Config.get(false)).toBe(undefined);
    expect(Config.get(undefined)).toBe(undefined);
    expect(Config.get('')).toBe(undefined);

  });

});


describe('Config.set', function() {

  it('should exist', function() {
    expect(Config.set).toBeDefined();
  });

  it('should set appName to test', function() {
    expect(Config.set('appName', 'test')).toBeTruthy();
    expect(Config.get('appName')).toBe('test');
  });

  it('should set appName to test2', function() {
    expect(Config.set('appName', 'test2')).toBeTruthy();
    expect(Config.get('appName')).toBe('test2');
  });

  it('should set newVal to test3', function() {
    expect(Config.set('newVal', 'test3')).toBeTruthy();
    expect(Config.get('newVal')).toBe('test3');
  });

  it('should not save a blank value', function() {
    expect(Config.set('newVal2')).toBeFalsy();
    expect(Config.get('newVal2')).toBe(undefined);

    expect(Config.set('newVal3', undefined)).toBeFalsy();
    expect(Config.get('newVal3')).toBe(undefined);
  });

  it('should save false', function() {
    expect(Config.set('newVal4', false)).toBeTruthy();
    expect(Config.get('newVal4')).toBe(false);
  });

  it('should save null', function() {
    expect(Config.set('newVal5', null)).toBeTruthy();
    expect(Config.get('newVal5')).toBe(null);
  });

});
