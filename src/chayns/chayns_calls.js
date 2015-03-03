import {getLogger, isPermitted} from '../utils';
import {environment} from './environment';
let log = getLogger('chayns.core.chayns_calls');

function can(versions) {
  return isPermitted(versions, environment.os, environment.appVersion);
}

// OS App Version Map
let osMap = {
  chaynsCall: { android: 2510, ios: 2483, wp: 2469, bb: 118 }
};

/**
 * @description
 * Native OS Enum
 * @type Enum
 */
export var os = {
  android: 0,
  ios: 1,
  wp: 2,
  web: 3,
  webMobile: 4 // TODO: consider to remove
};

/**
 * @name chaynsCallsEnum
 * @module chayns.os
 *
 * @description
 * Chayns Calls Enum
 * The Number represents the Chayns Call Number
 *
 * Chayns Calls Enum
 * @type {{setPullToRefresh: number}}
 */
export var cmds = {
  getGlobalData: 18,
  setPullToRefresh: 0,
  setWaitcursor: 1,
  selectTab: 2,
  selectAlbum: 3
};

/**
 * @name _paramsEnum
 *
 * @description
 * Available parameters for a chayns call
 *
 * @type {{none: number, Boolean: number, String: number}}
 * @private
 */
var params = {
  none: 'none',
  bool: 'Boolean',
  int: 'Integer',
  string: 'String',
  callback: 'callback' // extends String
};


let allOs = [os.android, os.ios, os.wp, os.web];
//let androidIos = [os.android, os.ios]; // TODO: not used
/**
 * @name chaynsCalls
 * @module chayns.os
 *
 * @description
 * Chayns Calls
 *
 * @type {Object}
 */
export var chaynsCalls = {

  getGlobalData: buildChaynsCall({
    cmd: cmds.getGlobalData,
    params: [params.callback],
    os: allOs,
    callback: 'getGlobalData' // callback is the same as cmd
  }),

  setPullToRefresh: {
    cmd: cmds.setPullToRefresh,
    params: [params.bool],
    os: allOs
  },

  setWaitcursor: {
    cmd: cmds.setWaitcursor,
    params: [params.bool],
    os: allOs
  },

  selectTab: {
    cmd: cmds.selectTab,
    params: [params.string],
    os: allOs
  }
};

/**
 * Build Chayns Call with Chayns Call `Object`.
 * @param {Object} chaynsCallObj ChaynsCallObject
 * @returns {string} Chayns call `URL` or null on error
 */
function buildChaynsCall(chaynsCallObj) {

  if (!can(osMap.chaynsCall)) {
    log.info('the OS is not capable of ChaynsCalls');
    return null;
  }

  if (!chaynsCallObj || !chaynsCallObj.cmd) {
    log.warn('no chaynsCallObj passed');
    return null;
  }

  let cmd = chaynsCallObj.cmd,
    chaynsParams = chaynsCallObj.params;

  // return cmd if there is no param or 'none'
  if (chaynsParams.length === 0 || chaynsParams[0] === params.none) {
    return chaynsCallString(cmd);
  }

  // add the params to the chayns call
  let callbackPrefix = 'chayns._callbacks.';
  let callArgs = [cmd];
  if (chaynsParams.length > 0) {
    chaynsParams.forEach(function(param) {
      if (param === params.callback) {
        callArgs.push('"' + callbackPrefix + chaynsCallObj.callback + '"');
      }
    });
  }

  // build call string
  let call = callArgs.join(', ');

  // add chayns protocol and host to the call
  return chaynsCallString(call);
}

/**
 * Add chayns `protocol` and chaynsCall `Host`
 * @private
 * @param {string} call Example: `1,jscallback("result")`
 * @returns {string} Chayns call `URL`
 */
function chaynsCallString(call) {
  return 'chayns://chaynsCall(' + call + ')';
}

/**
 * @name chayns.chaynsCall
 * @module chayns
 *
 * @description
 * Chayns Call
 * TODO: should return a promise
 *
 * @param {String} url `chayns://`
 * @param {Boolean} debounce waits 100ms if true, always returns true
 * @returns {Boolean} True if chayns call succeeded, false on error (no url etc)
 */
export function chaynsCall(url, debounce = true) {
  if (!url) {
    if(url === null) {
      log.info('chayns calls do not seem to be supported');
    }
    return false;
  }

  function executeCall(url) {
    try {
      // TODO: create an easier identification of the right environment
      // TODO: consider to execute the browser fallback in here as well
      if ('chaynsCall' in window && typeof window.chaynsCall.href === 'function') {
        window.chaynsCall.href(url);
      } else if ('webkit' in window
          && window.webkit.messageHandlers
          && window.webkit.messageHandlers.chaynsCall
          && window.webkit.messageHandlers.chaynsCall.postMessage) {
        window.webkit.messageHandlers.chaynsCall.postMessage(url);
      } else {
        window.location.href = url;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  if (debounce) {
    setTimeout(executeCall.bind(null, url), 100);
  } else {
    return executeCall(url);
  }
  return true;
}

export function chaynsWebCall(url, debounce) {

}

/**
 * Public Chayns Interface
 * @param url
 * @param debounce
 */
export function apiCall(url, debounce) {
  if (can(osMap.chaynsCall)) {
    chaynsCall(url, debounce);
  } else {
    chaynsWebCall(url, debounce);
  }
}
