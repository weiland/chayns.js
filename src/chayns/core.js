import {getLogger, isObject, DOM} from '../utils';
import {Config} from './config';
import {messageListener} from './callbacks';
import {chaynsApiInterface} from './chayns_api_interface';

// create new Logger instance
let log = getLogger('chayns.core');

// disable JS Errors in the console
Config.set('preventErrors', false);

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
export function register(userConfig) {
  log.info('chayns.register');
  Config.set(userConfig); // this reference to the chayns obj
  return this;
}

// TODO: register `Function` or preChayns `Object`?
export function preChayns() {
  if ('preChayns' in window && isObject(window.preChayns)) {
    // fill config
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
  if (domReady) {
    // TODO: return a custom Model Object instead of `config`
    cb({
      appName:Config.get('appName'),
      appVersion: Config.get('appVersion')
    });
    return;
  }
  readyCallbacks.push(arguments[0]);
}

/**
 * @name prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @private
 * @param obj Reference to chayns Object
 * @returns {*}
 */
export function setup() {
  log.info('start chayns setup');

  // enable `chayns.css` by adding `chayns` class
  // remove `no-js` class and add `js` class
  let body = document.body;
  DOM.addClass(body, 'chayns');
  DOM.addClass(body, 'js');
  DOM.removeClass(body, 'no-js');


  // run polyfill (if required)

  // run modernizer (feature detection)

  // run fastclick

  // (viewport setup)

  // crate meta tags (colors, mobile icons etc)

  // do some SEO stuff (canonical etc)

  // detect user (logged in?)

  // run chayns setup (colors based on environment)



  // set DOM ready event
  window.addEventListener('DOMContentLoaded', function() {

    domReady = true;
    log.debug('DOM ready');

    // add chayns root element
    let chaynsRoot = DOM.createElement('div');
    chaynsRoot.setAttribute('id', 'chayns-root');
    chaynsRoot.setAttribute('class', 'chayns__root');
    DOM.appendChild(body, chaynsRoot);

    // dom-ready class
    DOM.addClass(document.body, 'dom-ready');

    // get the App Information, has to be done when document ready
    let getAppInformationCall = !chaynsApiInterface.getGlobalData(function(data) {

      // now Chayns is officially ready

      log.debug('appInformation callback', data);

      readyCallbacks.forEach(function(callback) {

        callback.call(null, data);
      });
      readyCallbacks = [];

      DOM.addClass(document.body, 'chayns-ready');
      DOM.removeAttribute(DOM.query('[chayns-cloak]'), 'chayns-cloak');

      log.info('finished chayns setup');
    });

    if (getAppInformationCall) {
      log.error('The App Information could not be retrieved.');
    }
  });

  // start window.on('message') listener for Frame Communication
  messageListener();


}

/**
 * @description
 * Detect `Browser`, `OS` and 'Device`
 * as well as `Chayns Environment`, `Chayns User` and `Chayns Site`
 * and assign the data into the environment object
 */
function setEnvironment() {

}
