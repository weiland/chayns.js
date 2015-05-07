/**
 * @name james or tobi
 * @module james
 *
 * @description
 * # james - tobit helper library
 * Helper library supporting the Chayns API
 */

// include helper as main module

import Promise from  './lib/promise_polyfill';
Promise.polyfill(); // autoload Promise polyfill

// TODO: import './lib/formdata_polyfill';
import './lib/fetch_polyfill';
import './lib/raf_polyfill';

export * from './utils/defer';

// important is* functions
export * from './utils/is';

// extend object function
export * from './utils/extend';

// Logger
export * from './utils/logger';

// TODO: do we even need modernizer?
//export * from './utils/modernizer';

export * from './utils/each';

export * from './utils/http'; // TODO: consider to remove

export * from './utils/live';

// DOM
export * from './utils/dom';

// CSS Vendor prefix
export * from './utils/browser_prefix';

// Analytics
//export * from './utils/analytics';

// Remote
// remote debugging and analysis

// front-end Error Handler (catches errors, identify and analyses them)
export * from './utils/error';

// auth & JWT handler
//export * from './utils/jwt';

// cookie handler (will be used in the local_storage as fallback)
//export * from './utils/cookie_handler';

// localStorage helper (which cookie fallback)
export * from './utils/local_storage';

// micro event library
export * from './utils/events';

// offline cache helper
//export * from './utils/offline_cache';

// notifications: toasts, alerts, modal popups, native push
//export * from './utils/notifications';

// iframe communication and helper (CORS)
//export * from './utils/iframe';

// page visibility API
//export * from './utils/page_visibility';

// DateTime helper (converts dates, C# date, timestamps, i18n, time ago)
export * from './utils/datetime';


// language API i18n langres
export * from './utils/language';

// critical css

// loadCSS

// lazy loading
//export * from './utils/lazy_loading';

// (image) preloader
//export * from '/utils/preloader';

// isPemitted App Version check
export * from './utils/is_permitted';

// equalizer for width and height
export * from './utils/equalizer';


// in Future
// immutable
// weak maps
// observer
// web sockets (ws, SignalR)
// worker (shared worker, later service worker as well)
// location, pushState, history handler
// chayns site and code analyser: find deprecated methods, bad code, issues and bottlenecks

