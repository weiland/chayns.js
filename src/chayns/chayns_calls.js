import {getLogger, isPermitted, isFunction, isBlank, isArray, isObject, isDefined} from '../utils';
import {window, parent} from '../utils/browser';
import {environment} from './environment';
import {setCallback} from './callbacks';
let log = getLogger('chayns.core.chayns_calls');


function can(versions) {
  return isPermitted(versions, environment.os, environment.appVersion);
}

// OS App Version Map for Chayns Calls Support
// TODO: move into environment? (or just remove cause it is only used one time in here)
let osMap = {
  chaynsCall: { android: 2510, ios: 2483, wp: 2469, bb: 118 }
};

/**
 * Public Chayns Interface
 * Execute API Call
 *
 * @param url
 * @param params
 * @param debounce
 * // TODO: left of callback as promise
 */
export function apiCall(obj) {

  let debounce = obj.debounce || false;

  // TODO: check obj.os VERSION

  function executeCall(chaynsCallObj) {

    if (environment.canChaynsCall && can(osMap.chaynsCall)) {
      // TODO: consider callQueue and Interval to prevent errors
      log.debug('executeCall: chayns call ', chaynsCallObj.cmd);

      if ('cb' in chaynsCallObj && isFunction(chaynsCallObj.cb)) {
        setCallback(chaynsCallObj.callbackName || chaynsCallObj.params[0].callback, chaynsCallObj.cb, true);
      }
      if (isObject(chaynsCallObj.support) && !can(chaynsCallObj.support)) {
        log.info('executeCall: the chayns version is not supported');
        if (chaynsCallObj.fallbackCmd) {
          log.info('executeCall: fallback chayns call will be invoked');
          return chaynsCall(chaynsCallObj.fallbackCmd);
        }
        if (isFunction(chaynsCallObj.fallbackFn)) {
          log.info('executeCall: fallbackFn will be invoked');
          return chaynsCallObj.fallbackFn.call(null, chaynsCallObj.cb, chaynsCallObj.onError);
        }
        return false;
      }
      return chaynsCall(chaynsCallObj.cmd, chaynsCallObj.params);

    } else if (environment.canChaynsWebCall) {

      if ('cb' in chaynsCallObj && isFunction(chaynsCallObj.cb)) {
        setCallback(chaynsCallObj.webFn, chaynsCallObj.cb);
      }
      if (!chaynsCallObj.webFn) {
        log.info('executeCall: This Call has no webFn');
        return false;
      }

      log.debug('executeCall: chayns web call ', chaynsCallObj.webFn.name || chaynsCallObj.webFn);

      return chaynsWebCall(chaynsCallObj.webFn, chaynsCallObj.webParams);

    } else {
      log.info('executeCall: neither chayns call nor chayns web');
      // TODO: don't use the fallbackFn since this is actually only for chaynCalls
      if (isFunction(obj.fallbackFn)) {
        log.info('executeCall: (no web nor native) fallbackFn will be invoked');
        return chaynsCallObj.fallbackFn.call(null, chaynsCallObj.cb, chaynsCallObj.onError);
      }
      if (isFunction(obj.onError)) {
        obj.onError.call(undefined, new Error('Neither in Chayns Web nor in Chayns App'));
      }
    }
  }

  if (debounce) {
    setTimeout(executeCall.bind(null, obj), 100); // TODO: error?
  } else {
    return executeCall(obj);
  }
}

/**
 * Build Chayns Call (only for native Apps)
 * @private

 * @returns {Boolean} True if chayns call succeeded, false on error (no url etc)
 */
function chaynsCall(cmd, params) {

  if (isBlank(cmd)) { // 0 is a valid call, undefined and null are not
    log.warn('chaynsCall: missing cmd for chaynsCall');
    return false;
  }
  let url = null;

  // if there is no param or 'none' which means no callback
  if (!params) {

    url = 'chayns://chaynsCall(' + cmd + ')';

  } else {

    // params exist however, it is no array
    if (!isArray(params)) {
      log.error('chaynsCall: params are no Array');
      return false;
    }

    // add the params to the chayns call
    let callbackPrefix = '_chaynsCallbacks.';
    let callString = '';
    if (params.length > 0) {
      let callArgs = [];
      params.forEach(function(param) {
        let name = Object.keys(param)[0];
        let value = param[name];
        if (name === 'callback') {
          callArgs.push('\'' + callbackPrefix + value + '\'');
        } else if (name === 'bool' || name === 'Function' || name === 'Integer') {
          callArgs.push(value);
        } else if (isDefined(value)) {
          callArgs.push('\'' + value + '\'');
        }
      });
      callString = ',' + callArgs.join(',');
    }

    // add chayns protocol and host and join array
    url = 'chayns://chaynsCall(' + cmd + callString + ')';
  }

  log.debug('chaynsCall: url: ', url);

  try {
    // TODO: create an easier identification of the right environment
    // TODO: consider to execute the browser fallback in here as well
    if ('chaynsCall' in window && isFunction(window.chaynsCall.href)) {
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
    log.warn('chaynsCall: Error: could not execute ChaynsCall: ', e);
  }

  return false;
}

/**
 * @description
 * Execute a ChaynsWeb Call in the parent window.
 *
 * @param {String} fn Function name
 * @param {String} params Additional
 * @returns {boolean} True if chaynsWebbCall succeeded
 */
function chaynsWebCall(fn, params) {
  if (!fn) {
    log.info('chaynsWebCall: no ChaynsWebCall fn');
    return null;
  }
  if (!params) {
    params = '';
  }
  if (isObject(params)) { // an Array is also seen as Object, however it will be reset before
    params = JSON.stringify(params);
  }

  if (isFunction(fn)) {
    return fn.call(null);
  }

  var namespace = 'chayns.customTab.';
  var url = namespace + fn + ':' + params;

  log.debug('chaynsWabCall: ' + url);

  try {
    parent.postMessage(url, '*');
    return true;
  } catch (e) {
    log.warn('chaynsWebCall: postMessgae failed');
  }
  return false;
}
