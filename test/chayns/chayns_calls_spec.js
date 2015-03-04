/* global describe, it, xdescribe, xit, expect, beforeEach, spyOn */

import {window} from '../../src/utils/browser'; // TODO: refactor browser window
import {cmds as chaynsCallsEnum, apiCall, apiCalls, chaynsCall} from '../../src/chayns/chayns_calls';

describe('chayns calls enum', function() {

  //let count = -2;
  //let enumArray = ['setPullToRefresh', 'showWaitcursor'];

  //afterEach(function() {
  //  count++;
  //});

  it('should not be defined', function() {
    expect(chaynsCallsEnum).toBeUndefined();
  });

  xit('should have setPullToRefresh', function() {
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

describe('chayns apiCalls', function() {

  it('should not exist', function() {
    expect(apiCalls).toBeUndefined();
  });

  xit('should have setPullToRefresh', function() {
    expect(apiCalls.setPullToRefresh).toBeDefined();
  });

  xit('should have android, ios and wp8.', function() {
    expect(apiCalls.setPullToRefresh.os).toEqual([0,1,2]);
  });


});

xdescribe('chaynsCall webkit', function() {
  var url = null;

  beforeEach(function() {

    global.webkit = {
      messageHandler: {
          chaynsCall: {
          postMessage: function(value) {
            url = value;
          }
        }
      }
    };

    spyOn(global.webkit.messageHandler.chaynsCall, 'postMessage');

    chaynsCall('chayns://test', false);

  });

  it('should call postMessage', function() {
    expect(global.webkit.messageHandler.chaynsCall.postMessage).toHaveBeenCalled();
  });

});

describe('window.apiCall', function() {
  // fake environment
  var url = null;

  beforeEach(function() {

    global.chaynsCall = {
      href: function(value) {
        url = value;
      }
    };

    spyOn(global.chaynsCall, 'href');

    // TODO: refactor to apiCall?
    chaynsCall('chayns://test');

  });

  // TODO: refactor
  xit('should call the chaynsCall.href', function() {
    expect(global.chaynsCall.href).toHaveBeenCalled();
  });

  // does not work :(
  xit('tracks that the spy was called', function() {
    expect(url).toBe('chayns://test');
  });
});

// wanted to track the location.href
xdescribe('chaynsCall location.href fallback', function() {

  beforeEach(function() {
    global.location = {
      href: null
    };

    //spyOn(window.location, 'href');

  });

  it('tracks that the spy was called', function() {
    expect(global.location.href).toBe(null);
  });
});
