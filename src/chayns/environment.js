/**
 * @module chayns.environment
 * @description
 * Chayns Environment
 */

import {getLogger, extend} from '../utils';
let log = getLogger('chayns.environment');

// TODO: import dependencies
var types = {};

types.browser = [
  'chrome',
  'firefox',
  'safari',
  'opera',
  'chrome mobile',
  'safari mobile',
  'firefox mobile'
];

types.os = [
  'windows',
  'macOS',
  'android',
  'ios',
  'wp'
];

types.chaynsOS = {
  web: 'webshadow',
  webMobile: 'webshadowmobile',
  app: 'webshadowmobile'
};

// TODO: hide internal parameters from the others
// TODO: offer user an `Object` with URL Parameters
// location query string
var query = location.search.substr(1);
var parameters = {};
query.split('&').forEach(function(part) {
  var item = part.split('=');
  parameters[item[0].toLowerCase()] = decodeURIComponent(item[1]).toLowerCase();
});

// verify by chayns required parameters exist
if (!parameters.appversion) {
  log.warn('no app version parameter');
}
if (!parameters.os) {
  log.warn('no os parameter');
}
if (parameters.debug) {
  // TODO: enable debug mode
}

// TODO: further params and colorscheme
// TODO: discuss role of URL params and try to replace them and only use AppData


function getFirstMatch(regex) {
  var match = ua.match(regex);
  return (match && match.length > 1 && match[1]) || '';
}

// user agent detection
var userAgent = (window.navigator && navigator.userAgent) || '';

var is = {
  ios: /iPhone|iPad|iPod/i.test(userAgent),
  android: /Android/i.test(userAgent),
  wp: /windows phone/i.test(userAgent),
  bb: /BlackBerry|BB10|RIM/i.test(userAgent),

  opera: (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0),
  firefox: (typeof InstallTrigger !== 'undefined'),
  safari: (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0),
  chrome: (!!window.chrome && !(!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)),
  ie: false || !!document.documentMode,
  ie11: /msie 11/i.test(userAgent),
  ie10: /msie 10/i.test(userAgent),
  ie9: /msie 9/i.test(userAgent),
  ie8: /msie 8/i.test(userAgent),

  mobile: /(iphone|ipod|((?:android)?.*?mobile)|blackberry|nokia)/i.test(userAgent),
  tablet: /(ipad|android(?!.*mobile)|tablet)/i.test(userAgent),
  kindle: /\W(kindle|silk)\W/i.test(userAgent),
  tv: /googletv|sonydtv/i.test(userAgent)
};

// TODO: Browser Version and OS Version detection

// TODO: add fallback
var orientation = Math.abs(window.orientation % 180) === 0 ? 'portrait' : 'landscape';
var viewport = window.innerWidth + 'x' + window.innerHeight;

export var environment = {

  //os: parameters.os,
  osVersion: 1,

  browser: 'cc',
  browserVersion: 1,

  //appVersion: parameters.appversion,

  //orientation: orientation,

  //viewport: viewport, // in 1x1 in px

  //ratio: 1, // pixel ratio

  //isInFrame: false,

  //isChaynsWeb: null, // desktop browser, no App, no mobile
  //isChaynsWebMobile: null, // mobile browser, no App, no desktop
  //isApp: false, // otherwise Browser
  //isMobile: null, // no desktop, but mobile browser and app
  //isTablet: null, // no desktop, kinda mobile, most likely no app
  //isDesktop: null, // no app, no mobile
  //isBrowser: null, // otherwise App

  //isIOS: is.ios,
  //isAndroid: is.android,
  //isWP: is.wp,
  //isBB: is.bb,

  //parameters: parameters,
  //hash: location.hash.substr(1),

  site: {
    //siteId: 1,
    //name: 'Tobit',
    //locationId: 1,
    //url: 'https://tobit.com/',
    //useSSL: true,
    //colorscheme: 1
    //editMode: false, // future edit mode for content
    //isAdminMode: true
  },

  // TODO: consider Tapp
  app: {
    appId: 1,
    config: {},
    //defaultContif: {},
    domReady: false,
    logs: {
      log: [],
      debug: [],
      warn: []
    },
    errors: []
  }
};

environment.parameters = parameters; // TODO strip 'secret params'
environment.hash = location.hash.substr(1);

// WATCH OUT the OS is set by parameter (unfortunately)
environment.os = parameters.os || 'noOS'; // TODO: refactor OS
if (is.mobile && ['android', 'ios', 'wp'].indexOf(parameters.os) !== -1) {
  parameters.os = types.chaynsOS.app;
}

// detection by user agent
environment.isIOS = is.ios;
environment.isAndroid = is.android;
environment.isWP = is.wp;
environment.isBB = is.bb;

// TODO: make sure that this always works! (TSPN, create iframe test page)
environment.isInFrame = (window !== window.top);

environment.isApp = (parameters.os === types.chaynsOS.app && is.mobile && !environment.isInFrame); // TODO: does this always work?
environment.appVersion = parameters.appversion;

environment.isBrowser = !environment.isApp;

environment.isDesktop = (!is.mobile && !is.tablet);

environment.isMobile = is.mobile;
environment.isTablet = is.tablet;

environment.isChaynsWebMobile = (parameters.os === types.chaynsOS.webMobile) && environment.isInFrame;
environment.isChaynsWebDesktop = (parameters.os === types.chaynsOS.web) && environment.isInFrame;
environment.isChaynsWeb = environment.isChaynsWebDesktop || environment.isChaynsWebMobile;

// internal TODO: make it private?
environment.canChaynsCall = environment.isApp;
environment.canChaynsWebCall = environment.isChaynsWeb;

environment.viewport = viewport; // TODO: update on resize? no, due performance
environment.orientation = orientation;
environment.ratio = window.devicePixelRatio;

export function setEnv(key, value) {
  //extend(environment, prop);
  environment[key] = value;
}

export function getEnv(key) {
  environment[key];
}
