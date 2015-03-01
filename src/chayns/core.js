import {getLogger, setLevel, extend, isObject, DOM
  } from '../utils';
setLevel(3);
let log = getLogger('chayns.core');
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
  log.info('chayns.register');
  extend(this.config, config); // this reference to the chayns obj
  return this;
}

export function preChayns() {
  if ('preCahyns' in window && isObject(window.preChayns)) {

  }
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
  log.info('chayns.ready');
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
 * @name prepare
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @private
 * @param obj Reference to chayns Object
 * @returns {*}
 */
export function setup(chayns) {
  log.info('start chayns setup');

  // enable `chayns.css` by adding `chayns` class
  // remove `no-js` class and add `js` class
  DOM.addClass(document.body, 'chayns');
  DOM.addClass(document.body, 'js');
  DOM.removeClass(document.body, 'no-js');

  // run polyfill (if required)

  // run modernizer (feature detection)

  // run fastclick

  // (viewport setup)

  // detect user (logged in?)

  // run chayns setup (colors based on environment)

  // set DOM ready event
  window.addEventListener('DOMContentLoaded', function() {

    DOM.addClass(document.body, 'dom-ready');
    DOM.removeClass(document.body, 'chayns-cloak');

    readyCallbacks.forEach(function(callback) {
      domReady = true;
      callback.call(null, chayns.config);
    });
    readyCallbacks = [];
    log.info('finished chayns setup');
  });
}

/**
 * @description
 * Detect `Browser`, `OS` and 'Device`
 * as well as `Chayns Environment`, `Chayns User` and `Chayns Site`
 */
function setEnvironment() {

}
