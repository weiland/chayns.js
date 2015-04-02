import {getLogger, isFunction, isUndefined} from '../utils';
import {window} from '../utils/browser';
let log = getLogger('chayns.callbacks');

let noop = Function.prototype;

let callbacks = {};
/**
 *
 * @param {String} name
 * @param {Function} fn Callback Function to be invoked
 * @param {Boolean} isChaynsCall If true then the call will be assigned to `chayns._callbacks`
 * @returns {Boolean} True if parameters are valid and the callback was saved
 */
export function setCallback(name, fn, isChaynsCall) {

  if (isUndefined(name)) {
    log.warn('setCallback: name is undefined');
    return false;
  }

  if (isFunction(name)) {
    log.warn('setCallback: name is a function');
    return false;
  }

  if (!isFunction(fn)) {
    log.warn('setCallback: fn is no Function');
    return false;
  }

  if (name.indexOf('()') !== -1) { // strip '()'
    name = name.replace('()', '');
  }

  log.debug('setCallback: set Callback: ' + name);
  //if (name in callbacks) {
  //  callbacks[name].push(fn); // TODO: reconsider Array support
  //} else {
    callbacks[name] = fn; // Attention: we save an Array
  //}

  if (isChaynsCall) {
    log.debug('setCallback: register fn as global callback');
    window._chaynsCallbacks[name] = callback(name, 'ChaynsCall');
  }
  return true;
}

/**
 * @description
 * Register callbacks for ChaynsCalls and ChaynsWebCalls
 *
 * @private
 * @param {string} callbackName Name of the Function
 * @param {string} type Either 'ChaynsWebCall' or 'ChaynsCall'
 * @returns {Function} handleData Receives callback data
 */
function callback(callbackName, type) {

  return function handleData() {

    if (callbackName in callbacks) {
      log.debug('invoke callback: ', callbackName, 'type:', type);
      var fn = callbacks[callbackName];
      if (isFunction(fn)) {
        fn.apply(null, arguments);
        //delete callbacks[callbackName]; // TODO: cannot be like that, remove array?
      } else {
        log.warn('callback is no function', callbackName, fn);
      }
    } else {
      log.info('callback ' + callbackName + ' did not exist in callbacks array');
    }
  };
}

/**
 * @name chayns._callbacks
 * @module chayns
 *
 * @description
 * Chayns Call Callbacks
 * will be assigned to the `chayns._callbacks` object
 *
 * @type {Object} chaynsCallsCallbacks
 */
window._chaynsCallbacks = {
  //// TODO: wrap callback function (DRY)
  //getGlobalData: callback('getGlobalData', 'ChaynsCall') // example
  getGeoLocationCallback: noop
};


// TODO: move to another file? core, chayns_calls
var messageListening = false;
export function messageListener() {
  if (messageListening) {
    log.info('there is already one message listener on window');
    return;
  }
  messageListening = true;
  log.debug('message listener is started');

  window.addEventListener('message', function onMessage(e) {

    log.debug('new message ');

    var namespace = 'chayns.customTab.',
      data = e.data;

    if (typeof data !== 'string') {
      return;
    }
    // strip namespace from data
    data = data.substr(namespace.length, data.length - namespace.length);
    var method = data.match(/[^:]*:/); // detect method
    if (method && method.length > 0) {
      method = method[0];

      var params = data.substr(method.length, data.length - method.length);
      if (params) {
        try {
          params = JSON.parse(params);
        } catch (e) {}
      }

      // remove the last ')'
      method = method.substr(0, method.length - 1);

      // the callback function can be invoked directly
      callback(method, 'ChaynsWebCall')(params);
    }
  });
}
