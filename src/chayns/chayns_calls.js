import {getLogger, isPermitted, isFunction, isBlank, isArray,
          isObject, defer, isString, defer} from '../utils';
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
 * ## examples
 *
 * Native App Call and Chayns Web Call
 * ```js
  apiCall({
      app: {
        cmd: 8,
        support: { android: 1359, ios: 1366, wp: 2469 }
      },
      web: {
        fnName: 'facebookConnect',
        params: {
          ReloadParameter: 'ExecCommand=' + reloadParam
        }
      }
    });
 * ```
 * With custom web function (which can be used as fallback as well)
 * ```js
   apiCall({
      app: {
        cmd: 9,
        params: [`'${url}'`],
        support: { android: 2405, ios: 2466, wp: 2543 }
      },
      web: {
        fn: function openPopup() {

          return Promise();
        }
      }
 * ```
 *
 * With callback function (will be invoked multiple times)
 * ```js
   let callback = function() {};
   apiCall({
      app: {
        cmd: 10,
        params: [callbackName('backButtonCallback')],
        support: { android: 2405, ios: 2636, wp: 2469 }
      },
      callbackName: 'backButtonCallback',
      callbackFunction: callback
    });
 * ```
 *
 * @param {Object} obj ChaynsCall Object
 * @returns {Promise}
 */
export function apiCall(obj) {

  // chayns call (native app)
  if (environment.canChaynsCall && can(osMap.chaynsCall)) {
    log.debug('apiCall: attempt chayns call ');

    // make sure there is the app configuration
    if (!obj.app || !isObject(obj.app)) {
      return Promise.reject(new Error('There is no app config for the chayns call.'));
    }
    let appObj = obj.app;

    // determines whether the current version is supported
    if (isObject(appObj.support) && !can(appObj.support)) {
      log.info('apiCall: the chayns version is not supported');
      // if there is a fallback function
      if (isFunction(appObj.fallbackFn)) {
        log.info('apiCall: fallbackFn will be attempted to be invoked');
        try {
          return Promise.resolve(appObj.fallbackFn.call(undefined));
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(new Error('This Action is not supported in this Chayns Version.'));
    }

    // set callback if there should be a reply of the app (globally registered)
    let invokeChaynsCall = chaynsCall.bind(undefined, appObj.cmd, appObj.params);
    if (obj.callbackName) {
      if (isFunction(obj.callbackFunction)) {
        setCallback(obj.callbackName, obj.callbackFunction, true);
      } else {
        let deferred = defer();
        setCallback(obj.callbackName, deferred, true);
        invokeChaynsCall();
        return deferred.promise;
      }
    }
    return invokeChaynsCall();


  } else if (environment.canChaynsWebCall) {
    // chayns web call (chayns web iframe communication)

    log.debug('apiCall: chayns web call ');

    if (!obj.web || !isObject(obj.web)) {
      return Promise.reject(new Error('There is no web config for the chayns web call.'));
    }
    let webObj = obj.web;

    // if there is a function registered and no fnName, then it is no chayns web call but fn invoke
    if (!webObj.fnName && webObj.fn && isFunction(webObj.fn)) {
      return Promise.resolve(webObj.fn.call(undefined));
    }

    // set callback if there should be a reply of the app
    // TODO: refactor to one function (since the same code is above)
    let invokeChaynsWebCall = chaynsWebCall.bind(undefined, webObj.fnName, webObj.params);
    if (obj.callbackName) {
      if (isFunction(obj.callbackFunction)) {
        setCallback(obj.callbackName, obj.callbackFunction);
      } else {
        let deferred = defer();
        setCallback(obj.callbackName, deferred);
        invokeChaynsWebCall();
        return deferred.promise;
      }
    }
    return invokeChaynsWebCall();

  } else {
    // no chayns env
    log.info('apiCall: neither chayns call nor chayns web');

    // if the obj.web.fn is set, we will use it as fallback
    let webObj = obj.web;
    if (webObj && webObj.fn && isFunction(webObj.fn)) {
      log.debug('apiCall: invoking obj.web.fn as fallback');
      return Promise.resolve(webObj.fn.call(undefined));
    }

    return Promise.reject(new Error('There is no chayns environment'));
  }
}

let queue = [];
/**
 * Execute Chayns Call (only for native Apps)
 *
 * @private
 * @param {Integer} cmd Chayns call command id
 * @param {Array|undefined} params Optional Chayns call parameters Array

 * @returns {Promise} Resolved if chayns call succeeded, rejected on error
 */
function chaynsCall(cmd, params) {

  // TODO: implement call queue (with timeouts instead of interval) when location.href is used

  if (isBlank(cmd)) { // blank: 0 is a valid call, undefined, true, false and null are not
    log.warn('chaynsCall: missing cmd for chaynsCall');
    return Promise.reject(new Error('The chayns call is blank'));
  }

  let url = 'chayns://chaynsCall(' + cmd; // url protocol, host and cmd
  if (isArray(params) && params.length > 0) {
    url +=  ',' + params.join(','); // extend with existing parameters
  }
  url += ')'; // url suffix

  log.debug('chaynsCall: created url: ', url);

  let deferred = defer();
  queue.push({url, deferred});
  invokeQueue();
  return deferred.promise;
}

function invokeQueue() {
  log.debug('invokeQueue: start new cycle');
  let invoke = function() {
    let call = queue.shift();
    if (call) {
      executeChaynsCall(call);
      if (queue.length) {
        invokeQueue();
      } else {
        log.debug('invokeQueue: finished cycle');
      }
    }
  };
  setTimeout(invoke, 50);
}

function executeChaynsCall(call) {
  let {deferred, url} = call;
  log.debug('executeChaynsCall: invoke: ', url, deferred);
  try {
    // TODO: create an easier identification of the right environment
    // TODO(pascal): windows phone support
    // TODO(pascal): new json struct
    if ('chaynsCall' in window && isFunction(window.chaynsCall.href)) {
      window.chaynsCall.href(url);
    } else if ('webkit' in window
      && window.webkit.messageHandlers
      && window.webkit.messageHandlers.chaynsCall
      && window.webkit.messageHandlers.chaynsCall.postMessage) {
      window.webkit.messageHandlers.chaynsCall.postMessage(url);
    } else if ('external' in window && 'notify' in window.external && can({wp: 4085})) {
      window.external.notify(url);
    } else {
      window.location.href = url;
    }
    return deferred.resolve();
  } catch (e) {
    log.error('chaynsCall: Error: could not execute ChaynsCall: ', e);
    return deferred.reject(new Error(e));
  }
}

/**
 * Execute a ChaynsWeb Call in the parent window.
 *
 * @private
 * @param {String} fn Function name
 * @param {String\Object} params Additional Object will be stringified
 * @returns {Promise} True if chaynsWebCall succeeded
 */
function chaynsWebCall(fn, params) {
  if (!fn || !isString(fn)) { // TODO: isString required? actually no
    log.info('chaynsWebCall: no ChaynsWebCall fn');
    return Promise.reject(new Error('Missing or invalid chayns web call function name'));
  }
  if (!params) {
    params = '';
  }
  if (isObject(params)) {
    params = JSON.stringify(params);
  }

  var url = 'chayns.customTab.' + fn + ':' + params;

  log.debug('chaynsWabCall: ' + url);

  try {
    window.parent.postMessage(url, '*');
    return Promise.resolve();
  } catch (e) {
    log.error('chaynsWebCall: postMessage failed', e);
    return Promise.reject(e);
  }
}
