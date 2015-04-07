import {getLogger, isObject, DOM, isNumber, defer} from '../utils';
import {Config} from './config';
import {messageListener} from './callbacks';
import {chaynsApiInterface} from './chayns_api_interface';
import {chaynsWebInterface} from './chayns_web_interface';
import {accordion} from './accordion';
import {environment, setEnv} from './environment';

// create new Logger instance
let log = getLogger('chayns.core');

// enable JS Errors in the console
Config.set('preventErrors', false);

//var domReadyPromise;
var chaynsReadyDefer = defer();

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
  if (!isObject(config)) {
    return false;// TODO: throw error?
  }
  log.info('chayns.register');

  Config.set(config); // this reference to the chayns obj

  if (config.loggerName ||  config.appName) {
    window.log = getLogger(config.loggerName ||  config.appName);
  }

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
  return chaynsReadyDefer.promise;
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

  let html = document.documentElement;
  let body = document.body;
  // chayns is running
  DOM.addClass(body, 'chayns');
  DOM.addClass(body, 'js');
  DOM.removeClass(html, 'no-js');

  // if there is already a colorScheme (via GET parameters)
  //if (environment.site && isNumber(parseInt(environment.site.colorScheme))) {
  //  DOM.addClass(document.documentElement, 'chayns-color--' + environment.site.colorScheme);
  //}

  // (run fastclick, too seldom usecase?)
  // (viewport setup)
  // (crate meta tags (colors, mobile icons etc))
  // (do some SEO stuff (canonical etc))

  // detect user (logged in?)

  // DOM  ready promise
  let domReadyDefer = defer();
  if (document.readyState === 'complete') {
    domReadyDefer.resolve();
  } else {
    var domReady = function domReady() {
      domReadyDefer.resolve();
      window.removeEventListener('DOMContentLoaded', domReady, true);
    };
    window.addEventListener('DOMContentLoaded', domReady, true);
  }

  // setup when DOM is ready
  domReadyDefer.promise.then(domReadySetup);
}

/**
 * When the DOM is ready
 * Chayns sets all the default classes and receives App/Chayns Web Information
 */
function domReadySetup() {

  log.debug('DOM ready');
  let suffix = 'chayns-';
  let html = document.documentElement;
  let body = document.body;

  // dom-ready class
  DOM.addClass(body, 'dom-ready');

  // add vendor classes (OS, Browser, ColorScheme)
  DOM.addClass(html, suffix + 'os--' + (environment.os || 0));
  DOM.addClass(html, suffix + 'browser--' + environment.browser);
  DOM.addClass(html, suffix + 'color--' + (environment.site.colorScheme || 0));

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

  // start window.on('message') listener for iFrame Communication
  messageListener();

  // get chayns data (either from Chayns Web (parent frame) or chayns app)
  // get the App Information (TODO: has to be done when document ready?)
  chaynsApiInterface.getGlobalData()
    .then(chaynsReadySetup)
    .catch(function rejected() {
      log.debug('Error: The App Information could not be received.');
      chaynsReadyDefer.reject('The App Information could not be received.');
  }).then(function always() {
    accordion.init();
    if (environment.isChaynsWebDesktop) {
      resizeListener();
    }
  });
}

function resizeListener() {
  var heightCache;
  log.debug('start height observer interval ');
  chaynsWebInterface.setFixedHeight(500); // default value is 500
  var resizeHandler = function resizeHandler() {
    window.requestAnimationFrame(function() {
      if (heightCache === document.body.offsetHeight) {
        return;
      }
      log.debug('old height', heightCache, 'new height: ', document.body.offsetHeight);
      heightCache = document.body.offsetHeight;
      chaynsWebInterface.setHeight(heightCache);
    });
  };
  setInterval(resizeHandler, 100); // :(
}

/**
 * When Chayns has received data from Chayns Web or an Chayns App
 * The data is passed to this function
 * @param data {AppInformation Object}
 */
function chaynsReadySetup(data) {
  // now Chayns is officially ready
  // first set all env stuff
  if (!data) {
    chaynsReadyDefer.reject(new Error('There is no app Data'));
    return;
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
  // add chayns root element
  // only used for popup fallback
  let chaynsRoot = DOM.createElement('div');
  chaynsRoot.setAttribute('id', 'chayns-root');
  chaynsRoot.setAttribute('class', 'chayns__root');
  DOM.appendChild(document.body, chaynsRoot);

  let html = document.documentElement;
  let body = document.body;
  // chayns is ready
  DOM.addClass(html, 'chayns-ready');
  DOM.removeAttribute(DOM.query('[chayns-cloak]'), 'chayns-cloak');

  // update colorScheme again
  DOM.addClass(html, 'chayns-os--' + (environment.os || 0));

  log.info('finished chayns setup');

  // TODO: create custom model?
  chaynsReadyDefer.resolve(data);
}
