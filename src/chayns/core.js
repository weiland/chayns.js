import {getLogger, isObject, DOM, defer} from '../utils';
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
    throw new Error('Invalid config object');
  }
  log.info('chayns.register');

  Config.set(config);

  // create a browser global logger object
  if (config.loggerName ||  config.appName) {
    window.log = getLogger(config.loggerName ||  config.appName);
  }
}

export function preChayns() {
  if ('preChayns' in window && isObject(window.preChayns)) {
    Object.keys(window.preChayns).forEach(function(setting) {
      log.debug('pre chayns: ', setting);
    });
  }
}

/**
 * @name chayns.ready
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @returns {Promise}
 */
export var ready = chaynsReadyDefer.promise;

let html = document.documentElement; // html document
let prefix = 'chayns-'; // chayns css prefix

/**
 * @name setup
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

  // chayns is running
  DOM.addClass(html, 'chayns');
  DOM.addClass(html, 'js');
  DOM.removeClass(html, 'no-js');

  // add vendor classes (OS, Browser, ColorScheme) which is already in chayns.env
  DOM.addClass(html, prefix + 'os--' + (environment.os));
  DOM.addClass(html, prefix + 'browser--' + environment.browser);
  if (environment.site.colorScheme) {
    DOM.addClass(html, prefix + 'color--' + environment.site.colorScheme);
  }

  // (run fastclick, too seldom usecase?) no?
  // (viewport setup) no?
  // (crate meta tags (colors, mobile icons etc)) v3.1
  // (do some SEO stuff (canonical etc)) v3.1

  // detect user (logged in?)

  // DOM  ready promise
  if (document.readyState === 'complete' ||
      document.readyState === 'interactive') { // can occur when chayns.js is dynamically loaded
    domReadySetup();
  } else {
    var domReady = function domReady() {
      domReadySetup();
      window.removeEventListener('DOMContentLoaded', domReady, true);
    };
    window.addEventListener('DOMContentLoaded', domReady, true);
  }
}

/**
 * When the DOM is ready
 * Chayns sets all the default classes and receives App/Chayns Web Information
 * @private
 */
function domReadySetup() {

  log.debug('DOM ready');

  // dom-ready class
  DOM.addClass(html, 'dom-ready');

  // Environment
  if (environment.isChaynsWeb) {
    DOM.addClass(html, prefix + '-' + 'web');
  }
  if (environment.isChaynsWebMobile) {
    DOM.addClass(html, prefix + '-' + 'mobile');
  }
  if (environment.isChaynsWebDesktop) {
    DOM.addClass(html, prefix + '-' + 'desktop');
  }
  if (environment.isChaynsParent) {
    DOM.addClass(html, prefix + '-' + 'parent');
  }
  if (environment.isApp) {
    DOM.addClass(html, prefix + '-' + 'app');
  }
  if (environment.isInFrame) {
    DOM.addClass(html, prefix + '-' + 'frame');
  }

  // start window.on('message') listener for iFrame Communication
  messageListener();

  // get chayns data (either from Chayns Web (parent frame) or chayns app)
  // get the App Information (TODO(lucian/uwe): has to be done when document ready? yes, should be the best)
  chaynsApiInterface.getGlobalData()
    .then(chaynsReadySetup)
    .catch(function rejected() {
      log.debug('Error: The App Information could not be received.');
      chaynsReadyDefer.reject('The App Information could not be received.');
  }).then(function always() {
    accordion.init();
  });
}

/**
 * When Chayns has received data from Chayns Web or an Chayns App
 * The data is passed to this function
 * @param data {AppInformation Object}
 * @private
 */
function chaynsReadySetup(data) {
  // now Chayns is officially ready
  if (!data) {
    chaynsReadyDefer.reject(new Error('There is no app Data'));
    return;
  }

  if (environment.isChaynsWebDesktop) { // TODO(lucian/uwe): desktop only or also mobile?
    resizeListener();
  }

  log.debug('appInformation callback', data);

  // store received information
  if (isObject(data.AppInfo)) {
    let appInfo = data.AppInfo;
    let site = {
      id: appInfo.SiteID,
      title: appInfo.Title,
      tapps: appInfo.Tapps.map(parseTapp),
      facebookAppId: appInfo.FacebookAppID,
      facebookPageId: appInfo.FacebookPageID,
      colorScheme: appInfo.ColorScheme || environment.site.colorScheme || 0,
      version: appInfo.Version,
      tapp: parseTapp(appInfo.TappSelected)
    };
    setEnv('site', site);
  }
  if (isObject(data.AppUser)) {
    let appUser = data.AppUser;
    let user = {
      name: appUser.FacebookUserName,
      id: appUser.TobitUserID, // TODO(pascal/uwe): or .userId?
      facebookId: appUser.FacebookID,
      personId: appUser.PersonID,
      accessToken: appUser.TobitAccessToken,
      facebookAccessToken: appUser.FacebookAccessToken,
      groups: (appUser.UACGroups || []).map(parseGroup)
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

  // add chayns root element
  // only used for popup fallback
  let chaynsRoot = DOM.createElement('div');
  chaynsRoot.setAttribute('id', prefix + 'root');
  chaynsRoot.setAttribute('class', 'chayns__root');
  DOM.appendChild(document.body, chaynsRoot);

  // chayns is ready
  DOM.addClass(html, prefix + 'ready');
  DOM.removeAttribute(DOM.query('[chayns-cloak]'), 'chayns-cloak');

  // update colorScheme
  DOM.addClass(html, prefix + 'color--' + (environment.site.colorScheme || 0));

  log.info('finished chayns setup');

  // TODO(pascal/uwe): create custom model?, no, don't use it, use env instead
  chaynsReadyDefer.resolve(data);
}


/**
 * Resize Listener (Height check interval)
 * Checks each 200ms whether the window heights did change
 * and sends the new height to the parent frame window (Chayns Web)
 * in order that it can update the iframe height
 * @private
 */
function resizeListener() {
  var heightCache;
  log.debug('start height observer interval ');
  chaynsWebInterface.setFixedHeight(500); // default value is 500, TODO(lucian/uwe): always 500?
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
  setInterval(resizeHandler, 200); // :(
}

// helper parser methods
function parseGroup(group) {
  return {
    id: group.GroupID,
    name: group.Name,
    isSystemGroup: group.IsSystemGroup,
    joinDate: group.JoiningDate // TODO(pascal): parse to Date() Object?
  };
}

function parseTapp(tapp) {
  return {
    showName: tapp.ShowName,
    internalName: tapp.InternalName,
    exclusiveMode: tapp.ExclusiveMode,
    sortId: tapp.SortID,
    userGroupIds: tapp.UserGroupIds
  };
}
