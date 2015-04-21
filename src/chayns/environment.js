/**
 * @module chayns.environment
 * @description
 * Chayns Environment
 */

import {getLogger} from '../utils';
let log = getLogger('chayns.environment');

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

// location query string
let internalParameters= ['appversion', 'os', 'tappid', 'colorscheme'];
let query = location.search.substr(1).split('&');
let parameters = {};
let publicParameters = {};
if (query[0] !== '') {
  query.forEach(function(part) {
    let item = part.split('=');
    let key = item[0];
    let value = decodeURIComponent(item[1]);
    if (internalParameters.indexOf(key.toLowerCase()) === -1) {
      publicParameters[key] = value;
    }
    parameters[key.toLowerCase()] = value.toLowerCase();
  });
}


let debugMode = !!parameters.debug;

// user agent detection
let userAgent = (window.navigator && navigator.userAgent) || '';

let is = {
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

// TODO(pascal): Browser Version and OS Version detection

//let orientation = Math.abs(window.orientation % 180) === 0 ? 'portrait' : 'landscape';
//let viewport = window.innerWidth + 'x' + window.innerHeight;

export var environment = {
  osVersion: 1,
  browser: 'cc',
  browserVersion: 1
};

environment.parameters = publicParameters;
environment._parameters = parameters;
environment.hash = location.hash.substr(1);

// WATCH OUT the OS is set by parameter (unfortunately)
environment.os = parameters.os || 'noOS';
if (is.mobile && ['android', 'ios', 'wp'].indexOf(parameters.os) !== -1) {
  parameters.os = types.chaynsOS.app;
}

// detection by user agent
environment.isIOS = is.ios;
environment.isAndroid = is.android;
environment.isWP = is.wp;

environment.isInFrame = (window !== window.top);

environment.isApp = (parameters.os === types.chaynsOS.app && is.mobile && !environment.isInFrame);
environment.appVersion = parameters.appversion;

environment.isBrowser = !environment.isApp;

environment.isDesktop = (!is.mobile && !is.tablet);

environment.isMobile = is.mobile;
environment.isTablet = is.tablet;

environment.isChaynsParent = !!window.ChaynsInfo && !environment.isInFrame;

// if chayns runs directly in the Chayns Web
let chaynsInfo = window.ChaynsInfo;
if (chaynsInfo) {
  environment.isChaynsWebMobile = chaynsInfo.IsMobile;
  environment.isChaynsWebDesktop = !chaynsInfo.IsMobile;
} else {
  environment.isChaynsWebMobile = (parameters.os === types.chaynsOS.webMobile) && environment.isInFrame;
  environment.isChaynsWebDesktop = (parameters.os === types.chaynsOS.web) && environment.isInFrame;
  // verify by chayns required parameters exist
  if (!parameters.appversion) {
    log.warn('no app version parameter');
  }
  if (!parameters.os) {
    log.warn('no os parameter');
  }
}

environment.isChaynsWeb = environment.isChaynsWebDesktop || environment.isChaynsWebMobile;

environment.canChaynsCall = environment.isApp;
environment.canChaynsWebCall = environment.isChaynsWeb;

//environment.viewport = viewport;
//environment.orientation = orientation;
//environment.ratio = window.devicePixelRatio;

environment.debugMode = debugMode;

environment.site = {};
environment.site.colorScheme = parameters.colorscheme;
if (chaynsInfo && !environment.site.colorScheme) {
  environment.site.colorScheme = chaynsInfo.ColorScheme.ID;
}

//environment.user = {
//  name: 'Pacal Weiland',
//  firstName: 'Pascal',
//  lastName: 'Weiland',
//  userId: 1234,
//  facebookId: 12345,
//  isAdmin: true,
//  uacGroups: [],
//  language: 'de_DE',
//  token: 'token'
//};


export function setEnv(key, value) {
  //extend(environment, prop);
  environment[key] = value;
}

