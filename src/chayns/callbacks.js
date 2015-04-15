import {getLogger, isFunction, isString, isDeferred} from '../utils';
let log = getLogger('chayns.callbacks');

let noop = Function.prototype; // no operation

let callbacks = {};
/**
 * Register a new callback function with it's name
 *
 * @param {String} name Callbacks with the same name are overwritten
 * @param {Function|Deferred} fn Callback Function to be invoked or Deferred
 * @param {Boolean} registerGlobal If true then the call will be assigned to `chayns._chaynsCallbacks`
 * @returns {Boolean} True if parameters are valid and the callback was saved
 */
export function setCallback(name, fn, registerGlobal) {

  if (!isString(name)) {
    log.warn('setCallback: name is no string');
    return false;
  }

  if (!isFunction(fn) && !isDeferred(fn)) {
    log.warn('setCallback: fn is neither a Function nor a Deferred');
    return false;
  }

  // TODO: can we get rid of this?
  if (name.indexOf('()') !== -1) { // strip '()'
    name = name.replace('()', '');
  }

  log.debug('setCallback: set Callback: ' + name);
  callbacks[name] = fn;

  // expose globally, used when the native app invokes a callback
  if (registerGlobal) {
    log.debug('setCallback: register fn as global callback');
    window._chaynsCallbacks[name] = callback(name);
  }
  return true;
}

/**
 * @description
 * Returns the callback function fot the matching callbackName
 *
 * @private
 * @param {string} callbackName Name of the Function
 * @returns {Function} handleData Receives callback data
 */
function callback(callbackName) {

  return function handleData() {

    if (callbackName in callbacks) {
      log.debug('invoke callback: ', callbackName);
      var fn = callbacks[callbackName]; // can be a Function or a Deferred
      if (isFunction(fn)) {
        fn.apply(null, arguments);
      } else if (isDeferred(fn)) {
        fn.resolve(arguments.length > 1 ? arguments : arguments[0]); // pass arguments as array since a Promise supports only one arg
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
 * will be assigned to the `chayns._chaynsCallbacks` object
 *
 * @type {Object} chaynsCallsCallbacks
 */
window._chaynsCallbacks = {
  getGeoLocationCallback: noop // has to exist due to weird GEO function behaviour
};

var messageListening = false;
/**
 * Used when the chayns web (parent window) communicates with the tapp
 * Will invoke the callback() method with the event's methodName and params
 */
export function messageListener() {
  if (messageListening) {
    log.info('there is already one message listener on window');
    return;
  }
  messageListening = true;
  log.debug('message listener is started');

  window.addEventListener('message', function onMessage(e) {

    log.debug('new message');

    var namespace = 'chayns.customTab.',
      data = e.data;

    if (!isString(data)) {
      return;
    }
    // strip namespace from data
    data = data.substr(namespace.length, data.length - namespace.length);
    var method = data.match(/[^:]*:/); // detect method
    if (method && method.length > 0) {
      method = method[0];

      // parse params
      var params = data.substr(method.length, data.length - method.length);
      if (params) {
        try {
          params = JSON.parse(params);
        } catch (e) {
          log.error('onMessage: params could not be parsed', e);
        }
      }

      // remove the last ')' from the method name
      method = method.substr(0, method.length - 1);
      log.debug('method name:', method);

      // the callback function can be invoked directly
      callback(method)(params);
    }
  });
}
