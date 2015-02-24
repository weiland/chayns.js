'use strict';

var chayns = require('../src/chayns');


describe('chayns', function() {

  it('should have a VERSION', function() {
    expect(chayns.VERSION).toBeDefined();
  });

  it('should have the core module', function() {
    expect(chayns.core).toBeDefined();
  });



});
