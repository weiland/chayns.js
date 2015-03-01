/* global describe, it, expect, afterEach */

import {DOM} from '../../src/utils';

describe('DOM', function() {

  it('should exist', function() {
    expect(DOM).toBeDefined();
  });

});

describe('DOM.querySelector', function() {

  it('should find ele', function() {
    let el = {
      querySelector: function(query) {
        return 'ele' + query;
      }
    };
    expect(DOM.querySelector(el, 'ele')).toBe('eleele');

  });


});
