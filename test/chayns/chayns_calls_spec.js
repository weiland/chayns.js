/* global describe, it, expect, afterEach */

import {cmd as chaynsCallsEnum, chaynsCall, chaynsCalls} from '../../src/chayns/chayns_calls';

describe('chayns calls enum', function() {

  //let count = -2;
  //let enumArray = ['setPullToRefresh', 'showWaitcursor'];

  //afterEach(function() {
  //  count++;
  //});

  it('should be defined', function() {
    expect(chaynsCallsEnum).toBeDefined();
  });

  it('should have setPullToRefresh', function() {
    expect(chaynsCallsEnum.setPullToRefresh).toBeDefined();
  });

  // here each enum is tested

  //let i, len = enumArray.length;
  //for(i=0; i < len ; i++) {
  //  let cc = enumArray[len];
  //  it('should have ' + cc +' which is ' + i, function() {
  //    expect(chaynsCallsEnum[cc]).toBe(i);
  //  });
  //}



});

describe('chayns calls', function() {

  it('should exist', function() {
    expect(chaynsCalls).toBeDefined();
  });

  it('should have setPullToRefresh', function() {
    expect(chaynsCalls.setPullToRefresh).toBeDefined();
  });

  it('should have android, ios and wp8.', function() {
    expect(chaynsCalls.setPullToRefresh.os).toEqual([0,1,2]);
  });


});

xdescribe('chaynsCall webkit', function() {
  // fake environment
  let url = null;
  let window = window || {};

  beforeEach(function() {

    window.webkit = {
      messageHandler: {
          chaynsCall: {
          postMessage: function(value) {
            url = value;
          }
        }
      }
    };

    spyOn(window.webkit.messageHandler.chaynsCall, 'postMessage');

    chaynsCall('chayns://test', false, window);

  });

  it('tracks that the spy was called', function() {
    expect(window.webkit.messageHandler.chaynsCall.postMessage).toHaveBeenCalled();
  });

});

describe('window.chaynsCall', function() {
  // fake environment
  var url = null;
  let window = window || {};

  beforeEach(function() {

    window.chaynsCall = {
      href: function(value) {
        url = value;
      }
    };

    spyOn(window.chaynsCall, 'href');

    chaynsCall('chayns://test', false, window);

  });

  it('tracks that the spy was called', function() {
    expect(window.chaynsCall.href).toHaveBeenCalled();
  });
});

xdescribe('chaynsCall location.href fallback', function() {
  // fake environment
  let window = window || {};

  var url = null;

  beforeEach(function() {
    window = {
      location: {
        href: function(value) {
          url = value;
        }
      }
    };

    spyOn(window.location, 'href');

  });

  it('tracks that the spy was called', function() {
    expect(window.location.href).toHaveBeenCalled();
  });
});
