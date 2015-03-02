import {isPresent, isBlank, isUndefined, isArray, extend} from '../utils';

/**
 * Store internal chayns configuration
 * @type {{appName: string, appVersion: number, loadModernizer: boolean, loadPolyfills: boolean, useFetch: boolean, promises: string, useOfflineCaching: boolean, useLocalStorage: boolean, hasAdmin: boolean, multiLingual: boolean, isPublished: boolean, debugMode: boolean, useAjax: boolean}}
 * @private
 */
var _config = {
  appName: 'Chayns App',   // app Name
  appVersion: 1,           // app Version
  loadModernizer: true,    // load modernizer
  loadPolyfills: true,     // load polyfills
  useFetch: true,          // use window.fetch and it's polyfills
  promises: 'q',           // promise Service: Q is standard
  useOfflineCaching: false,// is offline caching used? inlcude offline helper
  useLocalStorage: false,  // is localStorage used? include helper
  hasAdmin: false,         // does this app/page have an admin?
  multiLingual: true,      // enable i18n?
  isPublished: true,       // only in internal tobit available
  debugMode: true,         // show console output, debug param for logging
  useAjax: false,
  isInternal: false        // use internal routing
  //framework: ['Ember', 'Angular', 'Backbone', 'Ampersand', 'React', 'jQuery']
};

// TODO: remove
/*export function config() {
  if (arguments.length === 2) {
    return Config.set(arguments[0], arguments[1]); // TODO: refactor this
  } else if (arguments.length === 1) {
    return Config.get(arguments);
  }
  return Config.get();
}*/

// TODO: refactor to Map
export class Config {

  /**
   * @method get
   * @class Config
   * @module chayns.config
   *
   * @param {string} key Reference the `key` in the config `Object`
   * @returns {null} Value of the `key` in the config `Object`
   *                 `undefined` if the `key` was not found
   */
  static get(key) {
    if (isPresent(key)) {
      return _config[key];
    }
    return undefined;
  }

  /**
   *
   * @param key
   * @param value
   * @returns {boolean}
   */
  static set(key, value) {
    if (isBlank(key) || isUndefined(value)) {
      return false;
    }
    // TODO: good idea? one should be careful i suppose
    if (isArray(value)) {
      extend(_config, value);
    }
    _config[key] = value;
    return true;
  }

  /**
   *
   * @param key
   * @returns {boolean}
   */
  static has(key) {
    return !!key && (key in _config);
  }
}
