import {getLogger, isObject, DOM} from '../utils';
import {Config} from './config';
import {messageListener} from './callbacks';
import {chaynsApiInterface} from './chayns_api_interface';
import {environment, setEnv} from './environment';

// create new Logger instance
let log = getLogger('chayns.core');

// enable JS Errors in the console
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
export function register(config) {
  log.info('chayns.register');
  Config.set(config); // this reference to the chayns obj
  return this;
}

// TODO: register `Function` or preChayns `Object`?
export function preChayns() {
  if ('preChayns' in window && isObject(window.preChayns)) {
    Object.keys(window.preChayns).forEach(function(setting) {
      log.debug('pre chayns: ', setting);
    });
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
 * @returns {Promise}
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
    let getAppInformationCall = chaynsApiInterface.getGlobalData(function(data) {

      // now Chayns is officially ready
      // first set all env stuff
      if (!data) {
        throw new Error('There is no app Data');
      }

      if (isObject(data.AppInfo)) {
        let appInfo = data.AppInfo;
        let site = {
          siteId: appInfo.SiteID,
          title: appInfo.Title,
          tapps: appInfo.Tapps,
          facebookAppId: appInfo.FacebookAppID,
          facebookPageId: appInfo.FacebookPageID,
          colorScheme: appInfo.ColorScheme || 0,
          version: appInfo.Version,
          tapp: appInfo.TappSelected
        };
        setEnv('site', site);
      }
      if (isObject(data.AppUser)) {
        let appUser = data.AppUser;
        let user = {
          name: appUser.FacebookUserName,
          id: appUser.TobitUserID,
          facebookId: appUser.FacebookID,
          personId: appUser.PersonID,
          accessToken: appUser.TobitAccessToken,
          facebookAccessToken: appUser.FacebookAccessToken,
          groups: appUser.UACGroups
        };
        setEnv('user', user);
      }
      if (isObject(data.Device)) {
        let device = data.Device;
        let app = {
          languageId: device.LanguageID,
          model: device.Model,
          name: device.SystemName,
          version: device.SystemVersion,
          uid: device.UID, // TODO uuid? is it even used?
          metrics: device.Metrics // TODO: used?
        };
        setEnv('app', app);
      }


      log.debug('appInformation callback', data);

      readyCallbacks.forEach(function(callback) {

        callback.call(null, data);
      });
      readyCallbacks = [];

      DOM.addClass(document.body, 'chayns-ready');
      DOM.removeAttribute(DOM.query('[chayns-cloak]'), 'chayns-cloak');

      cssSetup();

      log.info('finished chayns setup');
    });

    if (!getAppInformationCall) {
      log.error('The App Information could not be retrieved.');
    }
  });

  // start window.on('message') listener for Frame Communication
  messageListener();


}

function cssSetup() {
  let body = document.body;
  let suffix = 'chayns-';

  DOM.addClass(body, suffix + 'os--' + environment.os);
  DOM.addClass(body, suffix + 'browser--' + environment.browser);
  DOM.addClass(body, suffix + 'color--' + environment.browser);

  if (environment.isChaynsWeb) {
    DOM.addClass(body, suffix + '-' + 'web');
  }
  if (environment.isChaynsWebMobile) {
    DOM.addClass(body, suffix + '-' + 'mobile');
  }
  if (environment.isChaynsWebDesktop) {
    DOM.addClass(body, suffix + '-' + 'desktop');
  }
  if (environment.isApp) {
    DOM.addClass(body, suffix + '-' + 'app');
  }
  if (environment.isInFrame) {
    DOM.addClass(body, suffix + '-' + 'frame');
  }
}
