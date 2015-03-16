import {getLogger, isObject, DOM} from '../utils';
import {Config} from './config';
import {messageListener} from './callbacks';
import {chaynsApiInterface} from './chayns_api_interface';
import {environment, setEnv} from './environment';

// create new Logger instance
let log = getLogger('chayns.core');

// enable JS Errors in the console
Config.set('preventErrors', false);

var domReadyPromise;
var chaynsReadyPromise;

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
 * @returns {Promise}
 */
export function ready() {
  log.debug('chayns.ready()');
  return chaynsReadyPromise;
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

  // DOM  ready promise
  domReadyPromise = new Promise(function(resolve) {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      var domReady = function domReady() {
        resolve();
        window.removeEventListener('DOMContentLoaded', domReady, true);
      };
      window.addEventListener('DOMContentLoaded', domReady, true);
    }
  })
  .then(function() {
    // DOM ready actions
    log.debug('DOM ready'); // TODO: actually we can remove this
    // dom-ready class
    DOM.addClass(body, 'dom-ready');
    // start window.on('message') listener for iFrame Communication
    messageListener();

    // resize listener
    let heightCache;
    if (environment.isChaynsWebDesktop) {
      window.addEventListener('resize', resizeHandler);
      // TODO: is there any alternative to the DOMSubtree event?
      document.body.addEventListener('DOMSubtreeModified', resizeHandler.bind(true));
      chaynsApiInterface.setFixedHeight(); // default value is 500
      resizeHandler();
    }
    function resizeHandler(isDomMod) {
      window.requestAnimationFrame(function() {
        log.debug(isDomMod ? 'DOMSubtreeModified' : 'resize');
        if (heightCache === document.body.scrollHeight) {
          return;
        }
        heightCache = document.body.scrollHeight;
        chaynsApiInterface.setHeight();
      }, true);
    }

  });

  // chaynsReady Promise
  chaynsReadyPromise = new Promise(function(resolve, reject) {
    // get the App Information (TODO: has to be done when document ready?)
    chaynsApiInterface.getGlobalData().then(function resolved(data) {

      // now Chayns is officially ready
      // first set all env stuff
      if (!data) {
        return reject(new Error('There is no app Data'));
      }

      log.debug('appInformation callback', data);

      // store received information
      if (isObject(data.AppInfo)) {
        let appInfo = data.AppInfo;
        let site = {
          siteId: appInfo.SiteID,
          title: appInfo.Title,
          tapps: appInfo.Tapps,
          facebookAppId: appInfo.FacebookAppID,
          facebookPageId: appInfo.FacebookPageID,
          colorScheme: appInfo.ColorScheme || environment.site.colorScheme || 0,
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

      // don't worry this is no v2 thing
      cssSetup();
      log.info('finished chayns setup');

      // TODO: create custom model?
      resolve(data);

    }, function rejected() {
      log.debug('Error: The App Information could not be received.');
      reject('The App Information could not be received.');
      //return Promise.reject(new Error('The App Information could not be received.'));
    });

  });

}


/**
 * Adds vendor classes to the body in order to show that chayns is ready
 * and which OS, Browser and ColorScheme should be applied.
 * This function is invoked when the DOM and Chayns is ready.
 *
 * @private
 */
function cssSetup() {
  let html = document.documentElement;
  let suffix = 'chayns-';

  // add vendor classes (OS, Browser, ColorScheme)
  DOM.addClass(html, suffix + 'os--' + environment.os);
  DOM.addClass(html, suffix + 'browser--' + environment.browser);
  DOM.addClass(html, suffix + 'color--' + environment.site.colorScheme);

  // Environment
  if (environment.isChaynsWeb) {
    DOM.addClass(html, suffix + '-' + 'web');
  }
  if (environment.isChaynsWebMobile) {
    DOM.addClass(html, suffix + '-' + 'mobile');
  }
  if (environment.isChaynsWebDesktop) {
    DOM.addClass(html, suffix + '-' + 'desktop');
  }
  if (environment.isApp) {
    DOM.addClass(html, suffix + '-' + 'app');
  }
  if (environment.isInFrame) {
    DOM.addClass(html, suffix + '-' + 'frame');
  }

  // add chayns root element
  let chaynsRoot = DOM.createElement('div');
  chaynsRoot.setAttribute('id', 'chayns-root');
  chaynsRoot.setAttribute('class', 'chayns__root');
  DOM.appendChild(document.body, chaynsRoot);

  // chayns is ready
  DOM.addClass(html, 'chayns-ready');
  DOM.removeAttribute(DOM.query('[chayns-cloak]'), 'chayns-cloak');
}
