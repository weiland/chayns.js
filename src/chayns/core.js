import {extend} from '../utils';
/**
 *
 *
 * @description
 *
 *
 * @type {boolean} True if the DOM is loaded
 * @private
 */
var domReady = false;

/**
 *
 * @description
 *
 *
 * @type {array} Contains callbacks for the DOM ready event
 * @private
 */
var readyCallbacks = [];

/**
 * @name chayns.prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @param obj
 * @returns {*}
 */
export function register(config) {
  extend(this.config, config); // this reference to the chayns obj
  return this;
}

/**
 * @name chayns.prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @param obj
 * @returns {*}
 */
export function ready(cb) {
  if (arguments.length === 0) {
    return;
  }
  if(domReady) {
    cb(this.config);
    return;
  }
  readyCallbacks.push(arguments[0]);
}

/**
 * @name chayns.prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @param obj
 * @returns {*}
 */
export function prepare(chayns) {
  console.log('chayns');
  // run polyfill

  // set DOM ready event
  window.addEventListener('DOMContentLoaded', function() {
    readyCallbacks.forEach(function(callback) {
      domReady = true;
      callback.call(null, chayns.config);
    });
    readyCallbacks = [];
  });
}
