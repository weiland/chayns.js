/* global describe, it, expect */

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

  it('should have chaynsCall.', function() {
    expect(chayns.chaynsCall).toBeDefined();
  });

});
