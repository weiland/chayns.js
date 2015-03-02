import {native as os} from './os/native';

/**
 * @name chaynsCallsEnum
 * @module chayns.os
 *
 * @description
 * Chayns Calls Enums start at 0
 * TODO: consider using an `Array` and reverting keys and values
 *
 * Chayns Calls Enum
 * @type {{setPullToRefresh: number}}
 */
export var cmd = {
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
var _params = {
  none: 'none',
  bool: 'Boolean',
  int: 'Integer',
  string: 'String'
};


/**
 * @name chaynsCalls
 * @module chayns.os
 *
 * @description
 * Chayns Calls
 *
 * @type {{setPullToRefresh: {cmd: number, params: Array}}}
 */

let allOs = [os.android, os.ios, os.wp];
let androidIos = [os.android, os.ios];

export var chaynsCalls = {

  setPullToRefresh: {
    cmd: cmd.setPullToRefresh,
    params: [_params.bool],
    os: allOs
  },

  setWaitcursor: {
    cmd: cmd.setWaitcursor,
    params: [_params.bool],
    os: allOs
  },

  selectTab: {
    cmd: cmd.selectTab,
    params: [_params.string],
    os: allOs
  }
};

function chaynsCallString(call) {
  return 'chaynsCall(' + call + ')';
}

// protocol enum
let protocol = {
  slitte: 'slitte://',
  chayns: 'chayns://',
  http: 'http://',
  https: 'https://'
};

/**
 *
 * @param chaynsCallObj
 * @returns {*}
 */
function buildChaynsCall(chaynsCallObj) {
  if (!chaynsCallObj || !chaynsCallObj.cmd) {
    return null;
  }
  let cmd = chaynsCallObj.cmd,
    params = chaynsCallObj.params;
  // return cmd only if there is no param or 'none'
  if (params.length === 0 || params[0] === _params.none) {
    return chaynsCallString(cmd);
  }
  let callArgs = [cmd];

  let call =  callArgs.join(', ');
  return chaynsCallString(call);
}


/**
 * @name chayns.chaynsCall
 * @modeul chayns
 *
 * @description
 * Chayns Call
 * TODO: should return a promise
 *
 * @param {String} url either `chayns://` or `slitte://` url
 * @param {Boolean} debounce waits 100ms if true, always returns true
 * @returns {Boolean} True if chayns call succeeded, false on error (no url etc)
 */
export function chaynsCall(url, debounce = true, win = window) {
  if (!url) {
    return false;
  }

  function executeCall(url) {
    try {
      // TODO: create an easier identification of the right environment
      // TODO: consider to execute the browser fallback in here as well
      if ('chaynsCall' in win && typeof win.chaynsCall.href === 'function') {
        win.chaynsCall.href(url);
      } else if ('webkit' in win && win.webkit.messageHandlers &&
        win.webkit.messageHandlers.chaynsCall && win.webkit.messageHandlers.chaynsCall.postMessage) {
        win.webkit.messageHandlers.chaynsCall.postMessage(url);
      } else {
        win.location.href = url;
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
